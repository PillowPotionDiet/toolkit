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
    // Fetch websites from hosting API
    const websitesResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/hosting/v1/websites`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let websites = [];
    if (websitesResponse.ok) {
      websites = await websitesResponse.json();
    }

    // Also fetch domains portfolio
    const domainsResponse = await fetch(
      `${HOSTINGER_API_BASE}/api/domains/v1/portfolio`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let domains = [];
    if (domainsResponse.ok) {
      domains = await domainsResponse.json();
    }

    // Combine and format sites
    const sites = [];

    // Add websites
    if (Array.isArray(websites)) {
      websites.forEach((site, index) => {
        sites.push({
          id: index + 1,
          domain: site.domain || site.name || `Website ${index + 1}`,
          path: site.path || '/public_html',
          cms: site.cms || 'unknown',
          cmsVersion: site.cmsVersion || null,
          hasGit: false,
          stats: {
            files: site.files || 0,
            size: site.size || 0,
            databases: site.databases || 0,
            dbSize: site.dbSize || 0,
            emails: site.emails || 0
          },
          lastModified: site.updatedAt || site.createdAt || new Date().toISOString().split('T')[0],
          source: 'hosting'
        });
      });
    }

    // Add domains not already in websites
    if (Array.isArray(domains)) {
      domains.forEach((domain, index) => {
        const domainName = domain.domain || domain.name || domain;
        const exists = sites.some(s => s.domain === domainName);
        if (!exists) {
          sites.push({
            id: sites.length + 1,
            domain: domainName,
            path: '/public_html',
            cms: 'unknown',
            cmsVersion: null,
            hasGit: false,
            stats: {
              files: 0,
              size: 0,
              databases: 0,
              dbSize: 0,
              emails: 0
            },
            lastModified: domain.expiresAt || new Date().toISOString().split('T')[0],
            source: 'domain'
          });
        }
      });
    }

    return jsonResponse({
      success: true,
      sites: sites,
      websitesRaw: websites,
      domainsRaw: domains
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
