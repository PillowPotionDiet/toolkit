# Migration Assistant Desktop App

A beautiful desktop application to download your Hostinger websites via FTP.

## Features

- **Beautiful Dark UI** - Modern, clean interface
- **Auto-detect Site Folders** - Scans FTP for all your domain folders
- **Recursive Download** - Downloads complete site structure
- **Progress Tracking** - Real-time progress with file counts and sizes
- **Multi-site Support** - Download 1 or 100+ sites at once
- **Cross-platform** - Works on Windows, Mac, and Linux

## Installation

### Quick Start (Development)

1. Install Node.js (v18+)
2. Open terminal in this folder
3. Run:
   ```bash
   npm install
   npm start
   ```

### Build Portable App

```bash
npm run build:win    # Windows portable .exe
npm run build:mac    # macOS .dmg
npm run build:linux  # Linux AppImage
```

## Usage

1. **Connect** - Enter your Hostinger FTP credentials
   - Find these in hPanel → Files → FTP Accounts
   - Use the main FTP account (not per-site accounts)

2. **Select Sites** - Check the domains you want to download
   - The app auto-detects all site folders
   - Select one or multiple sites

3. **Download** - Watch the progress as files are downloaded
   - Files are saved to your Desktop in `migration-backups/`
   - Each site gets its own folder

## FTP Structure

On Hostinger, all sites share one FTP account:
```
/
├── public_html/
│   ├── site1.com/
│   ├── site2.com/
│   └── site3.com/
└── ...
```

## What This Downloads

✅ Website files (HTML, PHP, images, etc.)
✅ wp-content folder for WordPress
✅ Configuration files

## What This Does NOT Download

❌ Databases - Export from phpMyAdmin
❌ Emails - Back up via IMAP or webmail
❌ DNS settings - Configure on new host

## Troubleshooting

**Connection Failed**
- Check FTP credentials are correct
- Try using IP address instead of hostname
- Ensure port 21 is not blocked

**No Sites Found**
- Your FTP might use a different folder structure
- Try connecting with FileZilla to see the structure

**Download Errors**
- Some files may have permission issues
- The app will skip and continue with other files
