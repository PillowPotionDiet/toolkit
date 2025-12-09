/**
 * FileHandler - Utilities for file operations, compression, and validation
 */

const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');
const crypto = require('crypto');

class FileHandler {
  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   */
  static async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  /**
   * Compress directory to zip file
   * @param {string} sourceDir - Source directory
   * @param {string} outputPath - Output zip file path
   * @param {function} progressCallback - Progress callback
   * @returns {Promise<{success: boolean, path: string, size: number}>}
   */
  static async compressDirectory(sourceDir, outputPath, progressCallback = null) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      let totalBytes = 0;

      output.on('close', () => {
        resolve({
          success: true,
          path: outputPath,
          size: archive.pointer()
        });
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.on('progress', (progress) => {
        totalBytes = progress.fs.processedBytes;
        if (progressCallback) {
          progressCallback({
            processedBytes: totalBytes,
            totalBytes: progress.fs.totalBytes,
            percentage: Math.round((totalBytes / progress.fs.totalBytes) * 100)
          });
        }
      });

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Extract zip file to directory
   * @param {string} zipPath - Zip file path
   * @param {string} destDir - Destination directory
   * @param {function} progressCallback - Progress callback
   * @returns {Promise<{success: boolean, path: string}>}
   */
  static async extractArchive(zipPath, destDir, progressCallback = null) {
    try {
      await this.ensureDir(destDir);

      return new Promise((resolve, reject) => {
        require('fs').createReadStream(zipPath)
          .pipe(unzipper.Extract({ path: destDir }))
          .on('close', () => {
            resolve({
              success: true,
              path: destDir
            });
          })
          .on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to extract archive: ${error.message}`);
    }
  }

  /**
   * Get directory size recursively
   * @param {string} dirPath - Directory path
   * @returns {Promise<number>} Size in bytes
   */
  static async getDirectorySize(dirPath) {
    let size = 0;

    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          size += await this.getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }

      return size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get file size
   * @param {string} filePath - File path
   * @returns {Promise<number>} Size in bytes
   */
  static async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Delete file
   * @param {string} filePath - File path
   */
  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete directory recursively
   * @param {string} dirPath - Directory path
   */
  static async deleteDirectory(dirPath) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean temporary files older than specified age
   * @param {string} tempDir - Temporary directory
   * @param {number} maxAgeMs - Maximum age in milliseconds
   */
  static async cleanTempFiles(tempDir, maxAgeMs = 3600000) {
    try {
      const files = await fs.readdir(tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAgeMs) {
          if (stats.isDirectory()) {
            await this.deleteDirectory(filePath);
          } else {
            await this.deleteFile(filePath);
          }
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate file type (basic security check)
   * @param {string} filename - File name
   * @param {Array<string>} allowedExtensions - Allowed extensions
   * @returns {boolean}
   */
  static validateFileType(filename, allowedExtensions = ['.zip', '.tar', '.gz', '.sql']) {
    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(ext);
  }

  /**
   * Sanitize filename
   * @param {string} filename - File name
   * @returns {string} Sanitized filename
   */
  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9._-]/gi, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Generate unique filename
   * @param {string} prefix - Filename prefix
   * @param {string} extension - File extension
   * @returns {string} Unique filename
   */
  static generateUniqueFilename(prefix, extension) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}_${timestamp}_${random}${extension}`;
  }

  /**
   * Copy file
   * @param {string} source - Source file path
   * @param {string} destination - Destination file path
   */
  static async copyFile(source, destination) {
    try {
      await fs.copyFile(source, destination);
      return true;
    } catch (error) {
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  /**
   * Move file
   * @param {string} source - Source file path
   * @param {string} destination - Destination file path
   */
  static async moveFile(source, destination) {
    try {
      await fs.rename(source, destination);
      return true;
    } catch (error) {
      // If rename fails (different filesystems), try copy + delete
      await this.copyFile(source, destination);
      await this.deleteFile(source);
      return true;
    }
  }

  /**
   * Check if file exists
   * @param {string} filePath - File path
   * @returns {Promise<boolean>}
   */
  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file content
   * @param {string} filePath - File path
   * @param {string} encoding - File encoding
   * @returns {Promise<string>}
   */
  static async readFile(filePath, encoding = 'utf8') {
    try {
      return await fs.readFile(filePath, encoding);
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Write file content
   * @param {string} filePath - File path
   * @param {string} content - File content
   */
  static async writeFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content);
      return true;
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  /**
   * Format bytes to human-readable size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = FileHandler;
