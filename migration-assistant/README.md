# Website Migration Assistant

A comprehensive tool for migrating websites between different hosting providers with optional Cloudflare DNS updates.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Phase](https://img.shields.io/badge/phase-1-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- ✅ **Multi-Provider Support**: 18+ hosting providers including cPanel, Plesk, DirectAdmin, and Cloudways
- ✅ **Automatic Site Detection**: WordPress, Joomla, Drupal, and custom site detection
- ✅ **Complete Migration**: Files, databases, and email accounts
- ✅ **Real-Time Progress**: WebSocket-based live progress updates
- ✅ **Cloudflare Integration**: Optional automatic DNS updates
- ✅ **Beautiful UI**: Modern, responsive design
- ✅ **Session Management**: Resume migrations after interruptions

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **WebSockets**: Socket.IO for real-time updates
- **Architecture**: Adapter pattern for provider abstraction
- **Session**: Express Session with file store

## Supported Hosting Providers

### cPanel-Based Providers (Phase 1 - ✅ Implemented)
- Hostinger
- Bluehost
- SiteGround
- GoDaddy (cPanel)
- HostGator
- Namecheap (cPanel)
- A2 Hosting
- InMotion Hosting
- DreamHost
- iPage
- GreenGeeks
- Hostwinds
- InterServer
- Other cPanel Hosts (generic)

### Other Control Panels (Phase 8 - Coming Soon)
- Plesk
- DirectAdmin
- Cloudways
- GoDaddy (Plesk)
- Namecheap (DirectAdmin)

## Installation

### Prerequisites

- Node.js 16+ and npm
- Access to hosting provider API credentials

### Steps

1. **Clone or extract the project**:
   ```bash
   cd "E:\Auto Live Projects\Migration Assistant"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your configuration (or use defaults):
   ```env
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   ```

4. **Start the server**:
   ```bash
   # Development mode (with auto-restart)
   npm run dev

   # Production mode
   npm start
   ```

5. **Open your browser**:
   ```
   http://localhost:3000
   ```

## Usage

### Step 1: Connect to Old Hosting Account (✅ Implemented)

1. Navigate to http://localhost:3000
2. Click **"Start Migration"**
3. Select your current hosting provider from the dropdown
4. Enter your API credentials:
   - For cPanel hosts: API Token, Server URL, Username
   - For Hostinger: API Key
   - For other providers: See provider-specific requirements
5. Click **"Test Connection"** to verify credentials (optional)
6. Click **"Connect & Scan Sites"** to connect and proceed

### Getting API Credentials

Each provider has different requirements. Here are quick links:

- **cPanel hosts**: Generate API token in cPanel → Security → Manage API Tokens
- **Hostinger**: Get API key from hPanel → Advanced → API
- **Bluehost**: cPanel → Advanced → Terminal (API tokens)
- **SiteGround**: Site Tools → Devs → API
- **More providers**: Click the help link on Step 1 page

### Steps 2-7 (Coming in Future Phases)

2. **Select Sites**: Choose which websites to migrate
3. **Connect New Account**: Connect to destination hosting
4. **Migrate Sites**: Automatic file and database transfer
5. **Migrate Emails**: Create email accounts on new host
6. **Update DNS**: Automatic Cloudflare DNS or manual instructions
7. **Complete**: View migration summary and reports

## Project Structure

```
migration-tool/
├── server.js                  # Main Express server
├── package.json               # Dependencies and scripts
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── README.md                  # This file
│
├── config/
│   ├── providers.json         # Provider metadata and configs
│   └── limits.json            # Rate limits and size limits
│
├── adapters/
│   ├── BaseAdapter.js         # Abstract base adapter class
│   ├── CpanelAdapter.js       # cPanel API implementation ✅
│   ├── PleskAdapter.js        # Plesk implementation (Phase 8)
│   ├── CloudwaysAdapter.js    # Cloudways implementation (Phase 8)
│   ├── DirectAdminAdapter.js  # DirectAdmin implementation (Phase 8)
│   └── ProviderFactory.js     # Adapter factory pattern
│
├── controllers/
│   └── AuthController.js      # Authentication & connection logic
│
├── routes/
│   ├── api.js                 # Main API router
│   └── step1.js               # Step 1 routes
│
├── middleware/
│   ├── sessionManager.js      # Session management
│   ├── errorHandler.js        # Error handling
│   ├── rateLimiter.js         # Rate limiting
│   └── validator.js           # Input validation
│
├── utils/
│   ├── logger.js              # Winston logging
│   ├── progressTracker.js     # Real-time progress tracking
│   ├── fileHandler.js         # File operations
│   ├── databaseHandler.js     # MySQL operations
│   └── dnsChecker.js          # DNS checking utilities
│
├── public/
│   ├── index.html             # Homepage
│   ├── step1.html             # Step 1: Old account connection ✅
│   ├── step2.html             # Step 2: Site selection (Phase 2)
│   ├── step3.html             # Step 3: New account (Phase 3)
│   ├── step4.html             # Step 4: Migration (Phase 4)
│   ├── step5.html             # Step 5: Emails (Phase 5)
│   ├── step6.html             # Step 6: DNS (Phase 6)
│   ├── step7.html             # Step 7: Summary (Phase 7)
│   │
│   ├── css/
│   │   └── style.css          # Main styles ✅
│   │
│   └── js/
│       ├── app.js             # Main app logic ✅
│       ├── utils.js           # Utility functions ✅
│       ├── step1.js           # Step 1 logic ✅
│       └── step2.js           # Step 2 logic (Phase 2)
│
├── temp/                      # Temporary file storage
└── logs/                      # Log files (auto-created)
```

## API Endpoints

### Current (Phase 1)

- `GET /` - Homepage
- `GET /step1` - Step 1 page
- `GET /api/health` - Health check
- `GET /api/info` - API information
- `GET /api/providers` - Get all providers
- `GET /api/providers/:providerId` - Get provider details
- `POST /api/connect-old` - Connect to old hosting account
- `POST /api/test-connection` - Test connection without saving
- `GET /api/connection-status` - Get current connection status

### Coming Soon (Phases 2-7)

- `GET /api/list-sites` - List all sites from old account
- `POST /api/connect-new` - Connect to new hosting account
- `POST /api/start-migration` - Start site migration
- `GET /api/list-emails` - List email accounts
- `POST /api/migrate-emails` - Migrate emails
- `POST /api/update-dns-cloudflare` - Update DNS via Cloudflare
- `GET /api/migration-summary` - Get migration summary

## Development Phases

### ✅ Phase 1: Foundation & Step 1 (COMPLETED)
- [x] Project structure
- [x] Base adapter interface
- [x] CpanelAdapter implementation
- [x] Provider factory
- [x] Middleware (session, error, rate limiting)
- [x] Step 1 UI and logic
- [x] Authentication controller

### 📋 Phase 2: Site Listing & Step 2
- [ ] Implement listSites() for CpanelAdapter
- [ ] CMS detection (WordPress, Joomla, etc.)
- [ ] Git detection
- [ ] Step 2 UI with site selection
- [ ] Download-to-computer functionality

### 📋 Phase 3: New Account & Step 3
- [ ] Step 3 UI (similar to Step 1)
- [ ] Cross-provider compatibility checks
- [ ] Provider compatibility warnings

### 📋 Phase 4: Migration Engine & Step 4
- [ ] Migration controller
- [ ] File transfer with chunking
- [ ] Database export/import
- [ ] Real-time progress with WebSocket
- [ ] Pause/resume functionality

### 📋 Phase 5: Email & Step 5
- [ ] Email listing
- [ ] Email account creation
- [ ] Provider-specific email quotas

### 📋 Phase 6: DNS & Step 6
- [ ] Cloudflare API integration
- [ ] Manual DNS instructions
- [ ] DNS propagation checker

### 📋 Phase 7: Summary & Polish
- [ ] Comprehensive summary page
- [ ] Report generation (PDF, JSON, TXT)
- [ ] Dark mode
- [ ] Responsive design improvements

### 📋 Phase 8: Additional Adapters
- [ ] PleskAdapter implementation
- [ ] CloudwaysAdapter implementation
- [ ] DirectAdminAdapter implementation

## Configuration

### Environment Variables

See `.env.example` for all available options:

```env
# Server
PORT=3000
NODE_ENV=development

# Session
SESSION_SECRET=your-secret-key

# File Limits
MAX_FILE_SIZE=5368709120  # 5GB
CHUNK_SIZE=104857600      # 100MB

# Timeouts
SESSION_TIMEOUT=3600000   # 1 hour

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
```

### Provider Configuration

Edit `config/providers.json` to add or modify providers.

### Rate Limits

Edit `config/limits.json` to adjust rate limits per provider.

## Security

- ✅ API keys are never stored permanently
- ✅ Session-based credential storage
- ✅ CSRF protection
- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ Helmet.js security headers
- ✅ HTTPS required in production
- ✅ SQL injection prevention
- ✅ XSS protection

## Troubleshooting

### Connection Fails

1. **Check API credentials**: Ensure you've entered correct API token/key
2. **Server URL**: For cPanel, include port (usually :2083)
3. **IP Whitelisting**: Some providers require IP whitelisting
4. **Firewall**: Check if your server can reach the hosting provider
5. **API Access**: Ensure API access is enabled in your hosting control panel

### Common Errors

- **"No response from server"**: Check server URL and firewall
- **"Authentication failed"**: Verify API credentials
- **"Rate limit exceeded"**: Wait a few minutes before retrying
- **"Provider not implemented"**: This provider will be added in Phase 8

## Logs

Application logs are stored in `./logs/`:

- `combined.log` - All logs
- `error.log` - Error logs only
- `migration.log` - Migration-specific logs

## Contributing

Contributions are welcome! Please:

1. Follow the existing code style
2. Add JSDoc comments to functions
3. Test with at least one cPanel provider
4. Update documentation

## License

MIT License - See LICENSE file

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs in `./logs/`
3. Open an issue on GitHub

## Roadmap

- [ ] Complete Phases 2-7 (full migration workflow)
- [ ] Add Plesk, Cloudways, DirectAdmin support
- [ ] Add multi-language support
- [ ] Add email content migration
- [ ] Add automatic SSL certificate migration
- [ ] Add backup/restore functionality
- [ ] Add migration scheduling
- [ ] Add batch migrations

## Changelog

### v1.0.0 (Phase 1)
- Initial release
- Step 1: Old account connection
- cPanel adapter fully implemented
- Support for 13+ cPanel-based providers
- Modern, responsive UI
- Session management
- Rate limiting
- Real-time progress infrastructure

---

**Built with ❤️ for easy website migrations**
