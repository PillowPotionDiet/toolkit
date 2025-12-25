/**
 * Step 2 - Site Selection
 * Lists sites from connected hosting, detects CMS, allows selection
 * Supports both demo mode and real Hostinger API
 */

// API Configuration (should match step1.js)
const API_CONFIG = {
  workerUrl: '', // Set to your Cloudflare Worker URL
  demoMode: true
};

// Mock site data for demo
const MOCK_SITES = [
  {
    id: 1,
    domain: 'mystore.com',
    path: '/home/user/public_html',
    cms: 'wordpress',
    cmsVersion: '6.4.2',
    hasGit: false,
    stats: {
      files: 2847,
      size: 524288000, // 500 MB
      databases: 1,
      dbSize: 52428800, // 50 MB
      emails: 5
    },
    lastModified: '2024-12-20'
  },
  {
    id: 2,
    domain: 'blog.mystore.com',
    path: '/home/user/blog.mystore.com',
    cms: 'wordpress',
    cmsVersion: '6.3.1',
    hasGit: true,
    stats: {
      files: 1523,
      size: 157286400, // 150 MB
      databases: 1,
      dbSize: 31457280, // 30 MB
      emails: 2
    },
    lastModified: '2024-12-18'
  },
  {
    id: 3,
    domain: 'portfolio.dev',
    path: '/home/user/portfolio.dev',
    cms: 'static',
    cmsVersion: null,
    hasGit: true,
    stats: {
      files: 156,
      size: 15728640, // 15 MB
      databases: 0,
      dbSize: 0,
      emails: 1
    },
    lastModified: '2024-12-22'
  },
  {
    id: 4,
    domain: 'clientproject.org',
    path: '/home/user/clientproject.org',
    cms: 'laravel',
    cmsVersion: '10.x',
    hasGit: true,
    stats: {
      files: 4521,
      size: 314572800, // 300 MB
      databases: 2,
      dbSize: 104857600, // 100 MB
      emails: 10
    },
    lastModified: '2024-12-15'
  },
  {
    id: 5,
    domain: 'oldsite.net',
    path: '/home/user/oldsite.net',
    cms: 'custom',
    cmsVersion: null,
    hasGit: false,
    stats: {
      files: 892,
      size: 78643200, // 75 MB
      databases: 1,
      dbSize: 20971520, // 20 MB
      emails: 3
    },
    lastModified: '2024-11-01'
  },
  {
    id: 6,
    domain: 'shop.example.com',
    path: '/home/user/shop.example.com',
    cms: 'wordpress',
    cmsVersion: '6.4.2',
    hasGit: false,
    stats: {
      files: 5234,
      size: 1073741824, // 1 GB
      databases: 1,
      dbSize: 209715200, // 200 MB
      emails: 8
    },
    lastModified: '2024-12-23'
  }
];

let sites = [];
let selectedSites = new Set();
let currentFilter = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadConnectionInfo();
  setupEventListeners();
  loadSites();
});

/**
 * Load connection info from localStorage
 */
function loadConnectionInfo() {
  const provider = Utils.getStorage('migration_provider');
  if (provider) {
    document.getElementById('connectedProvider').textContent = provider.name;
    document.getElementById('connectedUser').textContent = provider.username || 'demo_user';
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search
  document.getElementById('searchInput').addEventListener('input', Utils.debounce(filterSites, 300));

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      filterSites();
    });
  });

  // Select all / Deselect all
  document.getElementById('selectAllBtn').addEventListener('click', selectAll);
  document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);

  // Next step button
  document.getElementById('nextStepBtn').addEventListener('click', goToNextStep);

  // Download buttons
  document.getElementById('downloadFilesBtn').addEventListener('click', () => downloadSites('files'));
  document.getElementById('downloadDbBtn').addEventListener('click', () => downloadSites('databases'));
  document.getElementById('downloadAllBtn').addEventListener('click', () => downloadSites('all'));
}

/**
 * Load sites from API or demo data
 */
async function loadSites() {
  const provider = Utils.getStorage('migration_provider');

  if (API_CONFIG.workerUrl && !API_CONFIG.demoMode && provider?.apiToken) {
    // Real API mode
    try {
      const response = await fetch(`${API_CONFIG.workerUrl}/api/list-sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: provider.apiToken })
      });

      const data = await response.json();

      if (data.success && data.sites) {
        sites = data.sites.map((site, index) => ({
          id: index + 1,
          domain: site.domain || site.name,
          path: site.path || `/home/user/${site.domain}`,
          cms: site.cms || 'unknown',
          cmsVersion: site.cmsVersion || null,
          hasGit: site.hasGit || false,
          stats: {
            files: site.stats?.files || 0,
            size: site.stats?.size || 0,
            databases: site.stats?.databases || 0,
            dbSize: site.stats?.dbSize || 0,
            emails: site.stats?.emails || 0
          },
          lastModified: site.lastModified || new Date().toISOString().split('T')[0]
        }));
      } else {
        Utils.showAlert(`Failed to load sites: ${data.error || 'Unknown error'}`, 'error');
        sites = MOCK_SITES; // Fallback to demo
      }
    } catch (error) {
      Utils.showAlert(`API Error: ${error.message}. Showing demo data.`, 'warning');
      sites = MOCK_SITES;
    }
  } else {
    // Demo mode - simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    sites = MOCK_SITES;
  }

  renderSites(sites);
  document.getElementById('selectionBar').style.display = 'flex';
}

/**
 * Filter sites based on search and filter
 */
function filterSites() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();

  let filtered = sites.filter(site => {
    // Search filter
    const matchesSearch = site.domain.toLowerCase().includes(searchTerm);

    // Category filter
    let matchesFilter = true;
    if (currentFilter === 'wordpress') {
      matchesFilter = site.cms === 'wordpress';
    } else if (currentFilter === 'custom') {
      matchesFilter = ['custom', 'static', 'laravel', 'joomla', 'drupal'].includes(site.cms) && site.cms !== 'wordpress';
    } else if (currentFilter === 'git') {
      matchesFilter = site.hasGit;
    }

    return matchesSearch && matchesFilter;
  });

  renderSites(filtered);
}

/**
 * Render sites list
 */
function renderSites(sitesToRender) {
  const container = document.getElementById('sitesList');

  if (sitesToRender.length === 0) {
    container.innerHTML = `
      <div class="no-sites">
        <p>No sites found matching your criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sitesToRender.map(site => createSiteCard(site)).join('');

  // Add event listeners to checkboxes
  container.querySelectorAll('.site-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const siteId = parseInt(e.target.dataset.siteId);
      toggleSiteSelection(siteId, e.target.checked);
    });
  });

  // Add event listeners to site cards
  container.querySelectorAll('.site-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
        const checkbox = card.querySelector('.site-checkbox');
        checkbox.checked = !checkbox.checked;
        const siteId = parseInt(checkbox.dataset.siteId);
        toggleSiteSelection(siteId, checkbox.checked);
      }
    });
  });
}

/**
 * Create site card HTML
 */
function createSiteCard(site) {
  const isSelected = selectedSites.has(site.id);
  const cmsInfo = getCmsInfo(site.cms);

  return `
    <div class="site-card ${isSelected ? 'selected' : ''}" data-site-id="${site.id}">
      <div class="site-header">
        <input type="checkbox" class="site-checkbox" data-site-id="${site.id}" ${isSelected ? 'checked' : ''}>
        <div class="site-info">
          <div class="site-domain">
            ${site.domain}
            <span class="cms-badge cms-${site.cms}">${cmsInfo.icon} ${cmsInfo.name}${site.cmsVersion ? ' ' + site.cmsVersion : ''}</span>
            ${site.hasGit ? '<span class="git-badge">Git</span>' : ''}
          </div>
          <div class="site-path">${site.path}</div>
        </div>
      </div>
      <div class="site-stats">
        <div class="stat-item">
          <div class="stat-value">${site.stats.files.toLocaleString()}</div>
          <div class="stat-label">Files</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${Utils.formatBytes(site.stats.size)}</div>
          <div class="stat-label">Size</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${site.stats.databases}</div>
          <div class="stat-label">Databases</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${Utils.formatBytes(site.stats.dbSize)}</div>
          <div class="stat-label">DB Size</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${site.stats.emails}</div>
          <div class="stat-label">Emails</div>
        </div>
      </div>
      <div class="site-actions">
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); viewSiteDetails(${site.id})">
          👁️ View Details
        </button>
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); previewSite('${site.domain}')">
          🌐 Preview
        </button>
      </div>
    </div>
  `;
}

/**
 * Get CMS display info
 */
function getCmsInfo(cms) {
  const info = {
    wordpress: { name: 'WordPress', icon: 'W' },
    joomla: { name: 'Joomla', icon: 'J' },
    drupal: { name: 'Drupal', icon: 'D' },
    laravel: { name: 'Laravel', icon: 'L' },
    static: { name: 'Static', icon: '📄' },
    custom: { name: 'Custom', icon: '⚙️' }
  };
  return info[cms] || { name: 'Unknown', icon: '?' };
}

/**
 * Toggle site selection
 */
function toggleSiteSelection(siteId, isSelected) {
  if (isSelected) {
    selectedSites.add(siteId);
  } else {
    selectedSites.delete(siteId);
  }

  // Update card visual
  const card = document.querySelector(`.site-card[data-site-id="${siteId}"]`);
  if (card) {
    card.classList.toggle('selected', isSelected);
  }

  updateSelectionInfo();
}

/**
 * Select all visible sites
 */
function selectAll() {
  const visibleCheckboxes = document.querySelectorAll('.site-checkbox');
  visibleCheckboxes.forEach(checkbox => {
    checkbox.checked = true;
    const siteId = parseInt(checkbox.dataset.siteId);
    selectedSites.add(siteId);
    const card = checkbox.closest('.site-card');
    if (card) card.classList.add('selected');
  });
  updateSelectionInfo();
}

/**
 * Deselect all sites
 */
function deselectAll() {
  selectedSites.clear();
  document.querySelectorAll('.site-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
  document.querySelectorAll('.site-card').forEach(card => {
    card.classList.remove('selected');
  });
  updateSelectionInfo();
}

/**
 * Update selection info
 */
function updateSelectionInfo() {
  const count = selectedSites.size;
  let totalSize = 0;

  selectedSites.forEach(id => {
    const site = sites.find(s => s.id === id);
    if (site) {
      totalSize += site.stats.size + site.stats.dbSize;
    }
  });

  document.getElementById('selectedCount').textContent = count;
  document.getElementById('selectedSize').textContent = Utils.formatBytes(totalSize);

  // Enable/disable buttons
  const hasSelection = count > 0;
  document.getElementById('nextStepBtn').disabled = !hasSelection;
  document.getElementById('downloadFilesBtn').disabled = !hasSelection;
  document.getElementById('downloadDbBtn').disabled = !hasSelection;
  document.getElementById('downloadAllBtn').disabled = !hasSelection;
}

/**
 * View site details
 */
function viewSiteDetails(siteId) {
  const site = sites.find(s => s.id === siteId);
  if (!site) return;

  Utils.showAlert(`
    <strong>Site Details: ${site.domain}</strong><br><br>
    <strong>Path:</strong> ${site.path}<br>
    <strong>CMS:</strong> ${getCmsInfo(site.cms).name} ${site.cmsVersion || ''}<br>
    <strong>Git:</strong> ${site.hasGit ? 'Yes' : 'No'}<br>
    <strong>Files:</strong> ${site.stats.files.toLocaleString()}<br>
    <strong>Total Size:</strong> ${Utils.formatBytes(site.stats.size + site.stats.dbSize)}<br>
    <strong>Last Modified:</strong> ${site.lastModified}<br>
    <strong>Email Accounts:</strong> ${site.stats.emails}
  `, 'info');
}

/**
 * Preview site in new tab
 */
function previewSite(domain) {
  window.open(`https://${domain}`, '_blank');
}

/**
 * Download sites (demo)
 */
async function downloadSites(type) {
  if (selectedSites.size === 0) {
    Utils.showAlert('Please select at least one site to download.', 'warning');
    return;
  }

  const typeLabels = {
    files: 'files',
    databases: 'databases',
    all: 'files and databases'
  };

  Utils.showLoading(`Preparing ${typeLabels[type]} for download...`);

  // Simulate download preparation
  await new Promise(resolve => setTimeout(resolve, 2000));

  Utils.hideLoading();

  Utils.showAlert(`
    <strong>Demo Mode</strong><br><br>
    In the full version, ${selectedSites.size} site(s) would be downloaded as ${typeLabels[type]}.<br><br>
    <strong>Selected sites:</strong><br>
    ${Array.from(selectedSites).map(id => {
      const site = sites.find(s => s.id === id);
      return site ? `• ${site.domain}` : '';
    }).join('<br>')}
  `, 'info');
}

/**
 * Go to next step
 */
function goToNextStep() {
  if (selectedSites.size === 0) {
    Utils.showAlert('Please select at least one site to migrate.', 'warning');
    return;
  }

  // Save selected sites to localStorage
  Utils.setStorage('migration_selected_sites', Array.from(selectedSites));

  Utils.showAlert(`
    <strong>Demo Mode</strong><br><br>
    ${selectedSites.size} site(s) selected for migration.<br><br>
    Step 3 (Connect New Account) is coming in Phase 3.<br>
    This demo ends here for now.
  `, 'info');
}
