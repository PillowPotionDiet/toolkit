# Quick Start Guide

Get the Website Migration Assistant up and running in 3 minutes!

## 🚀 Installation & Setup

### Step 1: Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required packages (~50MB download, 2-3 minutes).

### Step 2: Configure Environment (Optional)

The tool works with default settings, but you can customize:

```bash
# Copy example environment file
cp .env.example .env

# Edit .env if needed (optional)
# Default values work fine for development
```

### Step 3: Start the Server

**Development mode** (with auto-restart on file changes):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

You should see:
```
🚀 Server is running!

📍 URL: http://localhost:3000
🌐 Environment: development

Available endpoints:
  • GET  /           - Home page
  • GET  /step1      - Old account connection
  • POST /api/connect-old - Connect to old hosting
  • GET  /api/providers   - Get all providers
  • GET  /api/health      - Health check
```

### Step 4: Open in Browser

Navigate to: **http://localhost:3000**

## 📋 Using Step 1 (Old Account Connection)

### For cPanel Hosts (Bluehost, SiteGround, HostGator, etc.)

1. **Get your API credentials:**
   - Login to cPanel
   - Go to **Security → Manage API Tokens**
   - Click **Create** and give it a name
   - Copy the generated token
   - Note your cPanel username and server URL

2. **In the Migration Assistant:**
   - Select your provider (e.g., "Bluehost")
   - Enter:
     - **API Token**: Paste the token you copied
     - **Server URL**: `https://your-server.bluehost.com:2083`
     - **Username**: Your cPanel username
   - Click **Test Connection** (optional)
   - Click **Connect & Scan Sites**

### For Hostinger

1. **Get your API key:**
   - Login to hPanel
   - Go to **Advanced → API**
   - Create API key
   - Copy the key

2. **In the Migration Assistant:**
   - Select "Hostinger"
   - Enter **API Key**
   - Click **Connect & Scan Sites**

## 🎯 What Works Now (Phase 1)

✅ **Step 1: Connect to Old Hosting Account**
- All cPanel-based providers (13+ providers)
- Provider selection with dynamic forms
- Test connection functionality
- Session management
- Beautiful, responsive UI

## 🔜 Coming Next (Phase 2)

📋 **Step 2: Select Sites**
- List all sites from your hosting
- CMS detection (WordPress, Joomla, etc.)
- Site size calculation
- Git detection
- Select sites for migration

## 🛠 Troubleshooting

### Server won't start

**Issue**: `Error: Cannot find module 'express'`

**Solution**: Run `npm install` again

---

**Issue**: `Port 3000 is already in use`

**Solution**:
```bash
# Use a different port
PORT=3001 npm start
```

### Connection fails

**Issue**: "No response from server"

**Solutions**:
1. Check server URL format: `https://server.example.com:2083`
2. Include port `:2083` for cPanel
3. Ensure API access is enabled in your hosting
4. Check if your IP needs to be whitelisted

**Issue**: "Authentication failed"

**Solutions**:
1. Verify API token is correct
2. Check username is correct
3. Ensure API token hasn't expired
4. Verify you're using correct credentials for the selected provider

## 📝 Getting API Credentials

### cPanel Hosts (Most Providers)

1. Login to cPanel
2. Search for "Manage API Tokens" or "Terminal"
3. Create a new API token
4. Server URL is usually: `https://servername.yourhost.com:2083`
5. Username is your cPanel username

### Provider-Specific Guides

- **Bluehost**: [API Documentation](https://www.bluehost.com/help/article/cpanel-api-tokens)
- **SiteGround**: [API Guide](https://world.siteground.com/kb/cpanel-api/)
- **HostGator**: [API Access](https://www.hostgator.com/help/article/how-to-use-the-cpanel-api)
- **Hostinger**: [API Docs](https://support.hostinger.com/en/articles/1583245-how-to-use-cpanel-api)

## 🔍 Checking Logs

If something goes wrong, check the logs:

```bash
# View all logs
cat logs/combined.log

# View error logs only
cat logs/error.log

# View migration logs
cat logs/migration.log
```

On Windows:
```bash
type logs\combined.log
type logs\error.log
type logs\migration.log
```

## 📞 Need Help?

1. Check [README.md](README.md) for detailed documentation
2. Check [Troubleshooting](README.md#troubleshooting) section
3. Review logs in `./logs/` directory
4. Check that your provider is supported (see [README.md](README.md#supported-hosting-providers))

## ✨ Next Steps

Once Step 1 is working:

1. **Phase 2**: Implement site listing and selection
2. **Phase 3**: Connect to new hosting account
3. **Phase 4**: Automatic migration
4. **Phase 5**: Email migration
5. **Phase 6**: DNS updates
6. **Phase 7**: Complete summary

---

**Happy Migrating! 🚀**
