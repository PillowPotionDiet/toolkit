# Migration Assistant API Worker

Cloudflare Worker that acts as a secure proxy between the frontend and Hostinger API.

## Setup Instructions

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Deploy the Worker

```bash
cd migration-assistant/api-worker
wrangler deploy
```

### 4. Set Environment Variables

Set your allowed origin in Cloudflare Dashboard:
- Go to Workers & Pages > migration-assistant-api > Settings > Variables
- Add: `ALLOWED_ORIGIN` = `https://toolkit.pillowpotion.com`

### 5. Get Your Hostinger API Token

1. Log in to Hostinger Dashboard
2. Go to Account Settings > API
3. Generate a new API token
4. Copy the token (you'll need it in the frontend)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/test-connection` | POST | Test API token validity |
| `/api/connect` | POST | Connect and get account info |
| `/api/list-sites` | POST | List all sites/domains |
| `/api/site-details` | POST | Get detailed site information |
| `/api/list-databases` | POST | List databases |
| `/api/list-emails` | POST | List email accounts |

## Request Format

All POST endpoints expect JSON body with `apiToken`:

```json
{
  "apiToken": "your-hostinger-api-token",
  "subscriptionId": "optional-subscription-id"
}
```

## Response Format

```json
{
  "success": true,
  "data": { ... }
}
```

Or on error:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Local Development

```bash
wrangler dev
```

This starts a local server at `http://localhost:8787`

## Security Notes

- API tokens are passed from frontend, not stored in worker
- CORS restricted to pillowpotion.com domains
- All requests validated before forwarding to Hostinger API
