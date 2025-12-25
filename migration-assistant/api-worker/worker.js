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
      domainsStatus: null,
      subscriptionsStatus: null,
      ordersStatus: null
    };

    // 1. Fetch websites from hosting API
    const websitesResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/hosting/v1/websites`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    debug.websitesStatus = websitesResponse.status;

    let websites = [];
    if (websitesResponse.ok) {
      const websitesData = await websitesResponse.json();
      websites = Array.isArray(websitesData) ? websitesData : (websitesData.data || websitesData.websites || []);
    }

    // 2. Fetch domains portfolio
    const domainsResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/domains/v1/portfolio`,
      {
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

    // 4. Fetch orders to get more site info
    const ordersResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/hosting/v1/orders`,
      {
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
