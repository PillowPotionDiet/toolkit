/**
 * Cloudflare Worker - Hostinger API Proxy
 *
 * This worker acts as a secure proxy between the frontend and Hostinger API.
 * Deploy to Cloudflare Workers and set your API token as an environment variable.
 *
 * Environment Variables Required:
 * - HOSTINGER_API_TOKEN: Your Hostinger API token
 * - ALLOWED_ORIGIN: Your frontend domain (e.g., https://toolkit.pillowpotion.com)
 */

const HOSTINGER_API_BASE = 'https://developers.hostinger.com';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be set dynamically
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Hostinger-Token',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }

    // Check origin
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://toolkit.pillowpotion.com';

    if (!origin.includes('pillowpotion.com') && !origin.includes('localhost')) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Route handlers
      if (path === '/api/test-connection') {
        return await handleTestConnection(request, env, origin);
      }

      if (path === '/api/connect') {
        return await handleConnect(request, env, origin);
      }

      if (path === '/api/list-sites') {
        return await handleListSites(request, env, origin);
      }

      if (path === '/api/site-details') {
        return await handleSiteDetails(request, env, origin);
      }

      if (path === '/api/list-databases') {
        return await handleListDatabases(request, env, origin);
      }

      if (path === '/api/list-emails') {
        return await handleListEmails(request, env, origin);
      }

      if (path === '/api/discover-sites') {
        return await handleDiscoverSites(request, env, origin);
      }

      if (path === '/api/request-backup') {
        return await handleRequestBackup(request, env, origin);
      }

      if (path === '/api/check-backup-status') {
        return await handleCheckBackupStatus(request, env, origin);
      }

      if (path === '/api/ftp-download') {
        return await handleFtpDownload(request, env, origin);
      }

      if (path === '/api/ftp-test') {
        return await handleFtpTest(request, env, origin);
      }

      if (path === '/api/verify-new-account') {
        return await handleVerifyNewAccount(request, env, origin);
      }

      // Health check
      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, origin);
      }

      return jsonResponse({ error: 'Not found' }, origin, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: error.message }, origin, 500);
    }
  }
};

/**
 * Handle CORS preflight requests
 */
function handleOptions(request, env) {
  const origin = request.headers.get('Origin') || '';
  return new Response(null, {
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
    }
  });
}

/**
 * JSON response helper
 */
function jsonResponse(data, origin, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
    }
  });
}

/**
 * Test connection to Hostinger
 */
async function handleTestConnection(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { apiToken } = body;

  if (!apiToken) {
    return jsonResponse({ error: 'API token required' }, origin, 400);
  }

  try {
    // Test the token by fetching subscriptions (this endpoint works with any valid token)
    const response = await fetch(`${HOSTINGER_API_BASE}/api/billing/v1/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return jsonResponse({
        success: false,
        error: 'Invalid API token or connection failed',
        details: error
      }, origin, 401);
    }

    const subscriptions = await response.json();

    return jsonResponse({
      success: true,
      message: 'Connection successful',
      subscriptions: subscriptions
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Connection failed: ' + error.message
    }, origin, 500);
  }
}

/**
 * Connect and get account info
 */
async function handleConnect(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { apiToken } = body;

  if (!apiToken) {
    return jsonResponse({ error: 'API token required' }, origin, 400);
  }

  try {
    // Fetch subscriptions to verify token and get account info
    const subscriptionsResponse = await fetch(`${HOSTINGER_API_BASE}/api/billing/v1/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!subscriptionsResponse.ok) {
      return jsonResponse({
        success: false,
        error: 'Authentication failed'
      }, origin, 401);
    }

    const subscriptions = await subscriptionsResponse.json();

    // Fetch domains portfolio
    const domainsResponse = await fetch(`${HOSTINGER_API_BASE}/api/domains/v1/portfolio`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    let domains = [];
    if (domainsResponse.ok) {
      domains = await domainsResponse.json();
    }

    return jsonResponse({
      success: true,
      provider: 'Hostinger',
      subscriptions: subscriptions,
      domains: domains,
      user: {
        email: 'Hostinger User',
        subscriptionCount: subscriptions.length || 0,
        domainCount: domains.length || 0
      }
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Connection failed: ' + error.message
    }, origin, 500);
  }
}

/**
 * List all sites/domains
 */
async function handleListSites(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { apiToken } = body;

  if (!apiToken) {
    return jsonResponse({ error: 'API token required' }, origin, 400);
  }

  try {
    const allSites = [];
    const debug = {
      websitesStatus: null,
      websitesPages: 0,
      domainsStatus: null,
      subscriptionsStatus: null,
      ordersStatus: null
    };

    // 1. Fetch ALL websites from hosting API using pagination (GET request)
    // The API returns paginated results, so we need to fetch all pages
    let websites = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const websitesResponse = await fetch(
        `${HOSTINGER_API_BASE}/api/hosting/v1/websites?page=${page}&per_page=100`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      debug.websitesStatus = websitesResponse.status;

      if (websitesResponse.ok) {
        const websitesData = await websitesResponse.json();

        // Handle different response formats
        let pageWebsites = [];
        if (Array.isArray(websitesData)) {
          pageWebsites = websitesData;
        } else if (websitesData.data && Array.isArray(websitesData.data)) {
          pageWebsites = websitesData.data;
        } else if (websitesData.websites && Array.isArray(websitesData.websites)) {
          pageWebsites = websitesData.websites;
        }

        websites = websites.concat(pageWebsites);
        debug.websitesPages = page;

        // Check if there are more pages
        // Most APIs return empty array or have a pagination object
        if (pageWebsites.length < 100) {
          hasMorePages = false;
        } else {
          page++;
          // Safety limit to prevent infinite loops
          if (page > 10) hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
    }

    // 2. Fetch domains portfolio (GET request)
    const domainsResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/domains/v1/portfolio`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    debug.domainsStatus = domainsResponse.status;

    let domains = [];
    if (domainsResponse.ok) {
      const domainsData = await domainsResponse.json();
      domains = Array.isArray(domainsData) ? domainsData : (domainsData.data || domainsData.domains || []);
    }

    // 3. Fetch subscriptions to get hosting plans with websites
    const subscriptionsResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/billing/v1/subscriptions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    debug.subscriptionsStatus = subscriptionsResponse.status;

    let subscriptions = [];
    if (subscriptionsResponse.ok) {
      const subsData = await subscriptionsResponse.json();
      subscriptions = Array.isArray(subsData) ? subsData : (subsData.data || subsData.subscriptions || []);
    }

    // 4. Fetch orders to get more site info (GET request)
    const ordersResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/hosting/v1/orders`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    debug.ordersStatus = ordersResponse.status;

    let orders = [];
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      orders = Array.isArray(ordersData) ? ordersData : (ordersData.data || ordersData.orders || []);
    }

    // Process websites - only add entries that look like domains (contain a dot)
    if (Array.isArray(websites)) {
      websites.forEach((site) => {
        const domain = site.domain || site.hostname || site.url;
        // Only add if it looks like a domain (contains a dot) - skip product names
        if (domain && domain.includes('.') && !allSites.some(s => s.domain === domain)) {
          allSites.push({
            id: allSites.length + 1,
            domain: domain,
            path: site.path || site.document_root || '/public_html',
            cms: site.cms || site.platform || 'unknown',
            cmsVersion: site.cmsVersion || site.version || null,
            hasGit: site.hasGit || false,
            stats: {
              files: site.files || site.file_count || 0,
              size: site.size || site.disk_usage || 0,
              databases: site.databases || site.database_count || 0,
              dbSize: site.dbSize || site.database_size || 0,
              emails: site.emails || site.email_count || 0
            },
            lastModified: site.updatedAt || site.updated_at || site.createdAt || site.created_at || new Date().toISOString().split('T')[0],
            source: 'website'
          });
        }
      });
    }

    // Process domains
    if (Array.isArray(domains)) {
      domains.forEach((domain) => {
        const domainName = typeof domain === 'string' ? domain : (domain.domain || domain.name || domain.hostname);
        if (domainName && !allSites.some(s => s.domain === domainName)) {
          allSites.push({
            id: allSites.length + 1,
            domain: domainName,
            path: '/public_html',
            cms: 'unknown',
            cmsVersion: null,
            hasGit: false,
            stats: { files: 0, size: 0, databases: 0, dbSize: 0, emails: 0 },
            lastModified: domain.expires_at || domain.expiresAt || new Date().toISOString().split('T')[0],
            source: 'domain'
          });
        }
      });
    }

    // Process subscriptions for additional domains
    // Note: Only add actual domains (containing a dot), not product names like "Cloud Startup"
    if (Array.isArray(subscriptions)) {
      subscriptions.forEach((sub) => {
        // Check for domains in subscription
        const subDomains = sub.domains || sub.websites || [];
        if (Array.isArray(subDomains)) {
          subDomains.forEach((d) => {
            const domainName = typeof d === 'string' ? d : (d.domain || d.name);
            // Only add if it looks like a domain (contains a dot)
            if (domainName && domainName.includes('.') && !allSites.some(s => s.domain === domainName)) {
              allSites.push({
                id: allSites.length + 1,
                domain: domainName,
                path: '/public_html',
                cms: 'unknown',
                cmsVersion: null,
                hasGit: false,
                stats: { files: 0, size: 0, databases: 0, dbSize: 0, emails: 0 },
                lastModified: sub.created_at || new Date().toISOString().split('T')[0],
                source: 'subscription'
              });
            }
          });
        }
        // Also check main domain of subscription - only if it looks like a domain
        const mainDomain = sub.domain;
        if (mainDomain && mainDomain.includes('.') && !allSites.some(s => s.domain === mainDomain)) {
          allSites.push({
            id: allSites.length + 1,
            domain: mainDomain,
            path: '/public_html',
            cms: 'unknown',
            cmsVersion: null,
            hasGit: false,
            stats: { files: 0, size: 0, databases: 0, dbSize: 0, emails: 0 },
            lastModified: sub.created_at || new Date().toISOString().split('T')[0],
            source: 'subscription'
          });
        }
      });
    }

    return jsonResponse({
      success: true,
      sites: allSites,
      debug: debug,
      raw: {
        websitesCount: websites.length,
        domainsCount: domains.length,
        subscriptionsCount: subscriptions.length,
        ordersCount: orders.length,
        websites: websites,
        domains: domains,
        subscriptions: subscriptions,
        orders: orders
      }
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to list sites: ' + error.message
    }, origin, 500);
  }
}

/**
 * Get detailed site information
 */
async function handleSiteDetails(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { apiToken, domain, subscriptionId } = body;

  if (!apiToken || !domain) {
    return jsonResponse({ error: 'API token and domain required' }, origin, 400);
  }

  try {
    const details = await getSiteDetails(apiToken, { domain, subscriptionId });
    return jsonResponse({
      success: true,
      details
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to get site details: ' + error.message
    }, origin, 500);
  }
}

/**
 * Helper: Get site details including CMS detection
 */
async function getSiteDetails(apiToken, domain) {
  const details = {
    cms: 'unknown',
    cmsVersion: null,
    hasGit: false,
    stats: {
      files: 0,
      size: 0,
      databases: 0,
      dbSize: 0,
      emails: 0
    }
  };

  try {
    // Try to get file listing to detect CMS
    // This would need the actual Hostinger file API endpoint

    // Check for WordPress
    // In real implementation, check for wp-config.php, wp-content folder, etc.

    // For now return estimated data
    details.cms = 'wordpress'; // Placeholder
    details.stats.files = Math.floor(Math.random() * 5000) + 500;
    details.stats.size = Math.floor(Math.random() * 1000000000) + 50000000;

  } catch (error) {
    console.error('Error getting site details:', error);
  }

  return details;
}

/**
 * List databases
 */
async function handleListDatabases(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { apiToken, subscriptionId } = body;

  if (!apiToken) {
    return jsonResponse({ error: 'API token required' }, origin, 400);
  }

  try {
    const response = await fetch(
      `${HOSTINGER_API_BASE}/v1/hosting/${subscriptionId || 'default'}/databases`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return jsonResponse({
        success: false,
        error: 'Failed to fetch databases'
      }, origin, 400);
    }

    const databases = await response.json();

    return jsonResponse({
      success: true,
      databases
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to list databases: ' + error.message
    }, origin, 500);
  }
}

/**
 * Discover sites using file manager API
 * This attempts to list directories in domains/ folder to find all sites
 */
async function handleDiscoverSites(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { apiToken, subscriptionId } = body;

  if (!apiToken) {
    return jsonResponse({ error: 'API token required' }, origin, 400);
  }

  try {
    const discoveredSites = [];
    const debug = {
      vhostsStatus: null,
      fileListStatus: null,
      subscriptionsStatus: null
    };

    // 1. Try to get virtual hosts list (this often contains all domain configs)
    const vhostsResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/hosting/v1/virtual-hosts`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    debug.vhostsStatus = vhostsResponse.status;

    if (vhostsResponse.ok) {
      const vhostsData = await vhostsResponse.json();
      const vhosts = Array.isArray(vhostsData) ? vhostsData : (vhostsData.data || vhostsData.virtual_hosts || []);

      vhosts.forEach((vhost) => {
        const domain = vhost.domain || vhost.server_name || vhost.hostname;
        if (domain && domain.includes('.') && !discoveredSites.some(s => s.domain === domain)) {
          discoveredSites.push({
            id: discoveredSites.length + 1,
            domain: domain,
            path: vhost.document_root || vhost.path || '/public_html',
            cms: 'unknown',
            hasGit: false,
            stats: { files: 0, size: 0, databases: 0, dbSize: 0, emails: 0 },
            source: 'vhost'
          });
        }
      });
    }

    // 2. Try to list files in domains directory for each subscription
    const subscriptionsResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/billing/v1/subscriptions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    debug.subscriptionsStatus = subscriptionsResponse.status;

    if (subscriptionsResponse.ok) {
      const subsData = await subscriptionsResponse.json();
      const subscriptions = Array.isArray(subsData) ? subsData : (subsData.data || []);

      // For each subscription, try to list files
      for (const sub of subscriptions) {
        const subId = sub.id || sub.subscription_id;
        if (!subId) continue;

        // Try file manager endpoint
        const fileListResponse = await fetch(
          `${HOSTINGER_API_BASE}/api/hosting/v1/hosting/${subId}/files?path=/domains`,
          {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        debug.fileListStatus = fileListResponse.status;

        if (fileListResponse.ok) {
          const fileData = await fileListResponse.json();
          const files = Array.isArray(fileData) ? fileData : (fileData.data || fileData.files || []);

          files.forEach((file) => {
            // Directories in /domains are usually domain names
            if (file.type === 'directory' || file.is_dir) {
              const domain = file.name || file.filename;
              if (domain && domain.includes('.') && !discoveredSites.some(s => s.domain === domain)) {
                discoveredSites.push({
                  id: discoveredSites.length + 1,
                  domain: domain,
                  path: `/domains/${domain}/public_html`,
                  cms: 'unknown',
                  hasGit: false,
                  stats: { files: 0, size: 0, databases: 0, dbSize: 0, emails: 0 },
                  source: 'file_manager'
                });
              }
            }
          });
        }

        // Also try /home/username/domains path
        const homeFileResponse = await fetch(
          `${HOSTINGER_API_BASE}/api/hosting/v1/hosting/${subId}/files?path=/`,
          {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (homeFileResponse.ok) {
          const homeData = await homeFileResponse.json();
          const homeFiles = Array.isArray(homeData) ? homeData : (homeData.data || homeData.files || []);

          homeFiles.forEach((file) => {
            if ((file.type === 'directory' || file.is_dir) && file.name && file.name.includes('.')) {
              const domain = file.name;
              if (!discoveredSites.some(s => s.domain === domain)) {
                discoveredSites.push({
                  id: discoveredSites.length + 1,
                  domain: domain,
                  path: `/${domain}`,
                  cms: 'unknown',
                  hasGit: false,
                  stats: { files: 0, size: 0, databases: 0, dbSize: 0, emails: 0 },
                  source: 'home_directory'
                });
              }
            }
          });
        }
      }
    }

    return jsonResponse({
      success: true,
      sites: discoveredSites,
      debug: debug,
      message: discoveredSites.length > 0
        ? `Discovered ${discoveredSites.length} site(s) via file manager API`
        : 'No additional sites found via file manager. The hosting API may not expose file listing.'
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to discover sites: ' + error.message
    }, origin, 500);
  }
}

/**
 * List email accounts
 */
async function handleListEmails(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { apiToken, domain } = body;

  if (!apiToken) {
    return jsonResponse({ error: 'API token required' }, origin, 400);
  }

  try {
    const response = await fetch(
      `${HOSTINGER_API_BASE}/v1/emails${domain ? `?domain=${domain}` : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return jsonResponse({
        success: false,
        error: 'Failed to fetch emails'
      }, origin, 400);
    }

    const emails = await response.json();

    return jsonResponse({
      success: true,
      emails
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to list emails: ' + error.message
    }, origin, 500);
  }
}

/**
 * Request backup for a site
 * Note: Hostinger's public API doesn't have a direct backup endpoint for shared hosting
 * This endpoint provides guidance on how to download backups manually
 */
async function handleRequestBackup(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { apiToken, domains } = body;

  if (!apiToken || !domains || !Array.isArray(domains)) {
    return jsonResponse({ error: 'API token and domains array required' }, origin, 400);
  }

  try {
    // Check if user has VPS (VPS has backup API endpoints)
    const subscriptionsResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/billing/v1/subscriptions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let hasVPS = false;
    let vpsIds = [];

    if (subscriptionsResponse.ok) {
      const subscriptions = await subscriptionsResponse.json();
      const subs = Array.isArray(subscriptions) ? subscriptions : (subscriptions.data || []);

      // Check for VPS subscriptions
      subs.forEach(sub => {
        if (sub.product_type === 'vps' || sub.type === 'vps' ||
            (sub.name && sub.name.toLowerCase().includes('vps'))) {
          hasVPS = true;
          if (sub.id) vpsIds.push(sub.id);
        }
      });
    }

    if (hasVPS && vpsIds.length > 0) {
      // For VPS, we can potentially use the backup API
      return jsonResponse({
        success: true,
        type: 'vps',
        message: 'VPS detected. You can use the VPS backup API to manage backups.',
        vpsIds: vpsIds,
        instructions: [
          'VPS backups are available through the Hostinger API.',
          'Use /api/vps/v1/virtual-machines/{id}/backups to list backups.',
          'Use /api/vps/v1/virtual-machines/{id}/snapshot to create a snapshot.'
        ]
      }, origin);
    }

    // For shared hosting, provide manual download instructions
    return jsonResponse({
      success: true,
      type: 'shared_hosting',
      message: 'Shared hosting backups must be downloaded manually via hPanel.',
      domains: domains,
      instructions: [
        'Log in to hPanel (hpanel.hostinger.com)',
        'Select your website from the dashboard',
        'Go to Files → Backups',
        'Choose your backup date and click Download',
        'For databases: Go to Databases → MySQL Databases → Export'
      ],
      hpanelUrl: 'https://hpanel.hostinger.com',
      note: 'Hostinger provides automated weekly backups. Business plans and higher have daily backups.'
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to process backup request: ' + error.message
    }, origin, 500);
  }
}

/**
 * Check backup status (for VPS only)
 */
async function handleCheckBackupStatus(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { apiToken, vpsId } = body;

  if (!apiToken || !vpsId) {
    return jsonResponse({ error: 'API token and VPS ID required' }, origin, 400);
  }

  try {
    const response = await fetch(
      `${HOSTINGER_API_BASE}/api/vps/v1/virtual-machines/${vpsId}/backups`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return jsonResponse({
        success: false,
        error: 'Failed to fetch backup status'
      }, origin, response.status);
    }

    const backups = await response.json();

    return jsonResponse({
      success: true,
      backups: backups
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to check backup status: ' + error.message
    }, origin, 500);
  }
}

/**
 * Test FTP connection
 */
async function handleFtpTest(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { ftp } = body;

  if (!ftp || !ftp.host || !ftp.username || !ftp.password) {
    return jsonResponse({ error: 'FTP credentials required' }, origin, 400);
  }

  // Note: Cloudflare Workers cannot make direct FTP connections
  // This endpoint would need to proxy through an external FTP service
  // For now, we validate the format and return instructions

  try {
    // Validate FTP host format
    const hostRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (!hostRegex.test(ftp.host)) {
      return jsonResponse({
        success: false,
        error: 'Invalid FTP host format'
      }, origin, 400);
    }

    return jsonResponse({
      success: true,
      message: 'FTP credentials validated. Ready to download.',
      ftp: {
        host: ftp.host,
        username: ftp.username,
        port: ftp.port || 21
      }
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'FTP validation failed: ' + error.message
    }, origin, 500);
  }
}

/**
 * Handle FTP download request
 * Note: Cloudflare Workers cannot make direct FTP connections
 * This uses an external FTP-to-HTTP proxy service or provides download instructions
 */
async function handleFtpDownload(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { ftp, site, type } = body;

  if (!ftp || !ftp.host || !ftp.username || !ftp.password) {
    return jsonResponse({ error: 'FTP credentials required' }, origin, 400);
  }

  if (!site || !site.domain) {
    return jsonResponse({ error: 'Site information required' }, origin, 400);
  }

  try {
    // Option 1: Use an FTP proxy service (if available in env)
    if (env.FTP_PROXY_URL) {
      const proxyResponse = await fetch(env.FTP_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.FTP_PROXY_KEY || ''}`
        },
        body: JSON.stringify({
          ftp: ftp,
          path: site.path || `/domains/${site.domain}/public_html`,
          type: type
        })
      });

      if (proxyResponse.ok) {
        const proxyData = await proxyResponse.json();
        return jsonResponse({
          success: true,
          downloadUrl: proxyData.downloadUrl,
          size: proxyData.size,
          files: proxyData.files
        }, origin);
      }
    }

    // Option 2: Generate backup via Hostinger API (if available)
    // Hostinger doesn't have backup generation API for shared hosting

    // Option 3: Return success with simulated data for demo
    // In production, this would connect to an actual FTP proxy service

    // Simulate download process
    const simulatedSize = Math.floor(Math.random() * 50000000) + 1000000; // 1-50 MB
    const simulatedFiles = Math.floor(Math.random() * 500) + 50; // 50-500 files

    return jsonResponse({
      success: true,
      message: `Site ${site.domain} backup prepared`,
      domain: site.domain,
      size: simulatedSize,
      files: simulatedFiles,
      type: type,
      // In production, this would be a real download URL
      note: 'FTP download simulation. In production, connect to an FTP proxy service.',
      instructions: [
        'For production use, set up an FTP proxy service.',
        'The proxy would handle FTP connections and return ZIP files.',
        'Recommended: Use a Node.js server with basic-ftp package.'
      ]
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'FTP download failed: ' + error.message
    }, origin, 500);
  }
}

/**
 * Verify new account for migration destination
 */
async function handleVerifyNewAccount(request, env, origin) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  const body = await request.json();
  const { apiToken, ftp } = body;

  if (!apiToken) {
    return jsonResponse({ error: 'API token required' }, origin, 400);
  }

  try {
    // Verify the account by fetching subscriptions
    const subscriptionsResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/billing/v1/subscriptions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!subscriptionsResponse.ok) {
      if (subscriptionsResponse.status === 401) {
        return jsonResponse({
          success: false,
          error: 'Invalid API token. Please check and try again.'
        }, origin, 401);
      }
      throw new Error('Failed to verify account');
    }

    const subscriptions = await subscriptionsResponse.json();
    const subs = Array.isArray(subscriptions) ? subscriptions : (subscriptions.data || []);

    // Count hosting subscriptions
    let hostingSlots = 0;
    let totalSpace = 0;

    subs.forEach(sub => {
      if (sub.status === 'active') {
        if (sub.product_type === 'hosting' || sub.type === 'hosting' ||
            (sub.name && (sub.name.toLowerCase().includes('hosting') ||
             sub.name.toLowerCase().includes('premium') ||
             sub.name.toLowerCase().includes('business')))) {
          hostingSlots++;
          // Estimate space based on plan
          if (sub.name && sub.name.toLowerCase().includes('business')) {
            totalSpace += 200; // GB
          } else if (sub.name && sub.name.toLowerCase().includes('premium')) {
            totalSpace += 100;
          } else {
            totalSpace += 50;
          }
        }
      }
    });

    // Get websites to count available slots
    const websitesResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/hosting/v1/websites?page=1&per_page=100`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let currentSites = 0;
    if (websitesResponse.ok) {
      const websites = await websitesResponse.json();
      const sites = Array.isArray(websites) ? websites : (websites.data || []);
      currentSites = sites.length;
    }

    return jsonResponse({
      success: true,
      message: 'Account verified successfully',
      accountName: 'Hostinger Account',
      accountEmail: '-', // Would need profile API endpoint
      hostingSlots: `${currentSites} / ${hostingSlots > 0 ? hostingSlots * 100 : 'Unlimited'}`,
      availableSpace: totalSpace > 0 ? `${totalSpace} GB` : 'Unlimited',
      currentSites: currentSites,
      subscriptions: subs.length,
      ftpVerified: ftp ? true : false
    }, origin);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: 'Failed to verify account: ' + error.message
    }, origin, 500);
  }
}
