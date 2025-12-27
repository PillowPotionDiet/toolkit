const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ftp = require('basic-ftp');
const fs = require('fs');

let mainWindow;

// Register custom protocol for deep linking
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('migration-assistant', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('migration-assistant');
}

// Handle deep link on Windows
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Handle the protocol URL
    const url = commandLine.find(arg => arg.startsWith('migration-assistant://'));
    if (url) {
      handleDeepLink(url);
    }
  });
}

// Handle deep link URL
function handleDeepLink(url) {
  if (!mainWindow) return;

  // Parse URL parameters
  // Format: migration-assistant://start?host=xxx&user=xxx&sites=xxx
  try {
    const urlObj = new URL(url);
    const params = Object.fromEntries(urlObj.searchParams);

    // Send to renderer
    mainWindow.webContents.send('deep-link-data', params);
  } catch (e) {
    console.error('Failed to parse deep link:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // Handle deep link on app start (Windows)
  if (process.platform === 'win32') {
    const url = process.argv.find(arg => arg.startsWith('migration-assistant://'));
    if (url) {
      mainWindow.webContents.on('did-finish-load', () => {
        handleDeepLink(url);
      });
    }
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Window controls
ipcMain.on('minimize-window', () => mainWindow.minimize());
ipcMain.on('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('close-window', () => mainWindow.close());

// Select output directory
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  return result.filePaths[0] || null;
});

// FTP Connection Test
ipcMain.handle('test-ftp', async (event, config) => {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access({
      host: config.host,
      port: config.port || 21,
      user: config.username,
      password: config.password,
      secure: false
    });

    // List root directory to verify connection
    const list = await client.list('/');
    client.close();

    return { success: true, directories: list.filter(f => f.isDirectory).map(f => f.name) };
  } catch (error) {
    client.close();
    return { success: false, error: error.message };
  }
});

// List FTP directories to find site folders
ipcMain.handle('list-site-folders', async (event, config) => {
  const client = new ftp.Client();

  try {
    await client.access({
      host: config.host,
      port: config.port || 21,
      user: config.username,
      password: config.password,
      secure: false
    });

    // Try to find site folders in various locations
    const siteFolders = [];
    const possiblePaths = ['/', '/public_html', '/domains', '/www'];

    for (const basePath of possiblePaths) {
      try {
        const list = await client.list(basePath);
        const folders = list.filter(f => f.isDirectory && !f.name.startsWith('.'));

        for (const folder of folders) {
          // Check if it looks like a domain folder
          if (folder.name.includes('.') || basePath !== '/') {
            siteFolders.push({
              name: folder.name,
              path: `${basePath}/${folder.name}`.replace('//', '/'),
              size: folder.size
            });
          }
        }
      } catch (e) {
        // Path doesn't exist, skip
      }
    }

    client.close();
    return { success: true, folders: siteFolders };
  } catch (error) {
    client.close();
    return { success: false, error: error.message };
  }
});

// Download a site
let downloadAborted = false;

ipcMain.handle('download-site', async (event, config) => {
  const client = new ftp.Client();
  downloadAborted = false;

  const { ftpConfig, sitePath, siteName, outputDir } = config;
  const localDir = path.join(outputDir, siteName);

  // Create local directory
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  let totalFiles = 0;
  let downloadedFiles = 0;
  let totalSize = 0;
  let downloadedSize = 0;

  try {
    await client.access({
      host: ftpConfig.host,
      port: ftpConfig.port || 21,
      user: ftpConfig.username,
      password: ftpConfig.password,
      secure: false
    });

    // Track progress
    client.trackProgress(info => {
      if (downloadAborted) {
        client.close();
        return;
      }

      mainWindow.webContents.send('download-progress', {
        site: siteName,
        file: info.name,
        bytes: info.bytes,
        bytesOverall: downloadedSize + info.bytes
      });
    });

    // Count files first
    async function countFiles(remotePath) {
      if (downloadAborted) return;
      try {
        const list = await client.list(remotePath);
        for (const item of list) {
          if (downloadAborted) return;
          if (item.isDirectory && !item.name.startsWith('.')) {
            await countFiles(`${remotePath}/${item.name}`);
          } else if (item.isFile) {
            totalFiles++;
            totalSize += item.size;
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    }

    mainWindow.webContents.send('download-status', {
      site: siteName,
      status: 'counting',
      message: 'Counting files...'
    });

    await countFiles(sitePath);

    mainWindow.webContents.send('download-status', {
      site: siteName,
      status: 'downloading',
      message: `Found ${totalFiles} files (${formatBytes(totalSize)})`,
      totalFiles,
      totalSize
    });

    // Download recursively
    async function downloadDir(remotePath, localPath) {
      if (downloadAborted) return;

      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true });
      }

      try {
        const list = await client.list(remotePath);

        for (const item of list) {
          if (downloadAborted) return;

          const remoteFile = `${remotePath}/${item.name}`;
          const localFile = path.join(localPath, item.name);

          if (item.isDirectory && !item.name.startsWith('.')) {
            await downloadDir(remoteFile, localFile);
          } else if (item.isFile) {
            try {
              await client.downloadTo(localFile, remoteFile);
              downloadedFiles++;
              downloadedSize += item.size;

              mainWindow.webContents.send('download-file-complete', {
                site: siteName,
                file: item.name,
                downloadedFiles,
                totalFiles,
                downloadedSize,
                totalSize
              });
            } catch (e) {
              mainWindow.webContents.send('download-file-error', {
                site: siteName,
                file: item.name,
                error: e.message
              });
            }
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    }

    await downloadDir(sitePath, localDir);

    client.close();

    if (downloadAborted) {
      return { success: false, error: 'Download aborted' };
    }

    return {
      success: true,
      downloadedFiles,
      totalFiles,
      downloadedSize,
      outputPath: localDir
    };
  } catch (error) {
    client.close();
    return { success: false, error: error.message };
  }
});

// Abort download
ipcMain.on('abort-download', () => {
  downloadAborted = true;
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
