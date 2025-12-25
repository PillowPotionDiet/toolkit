/**
 * Step 2 - Site Selection
 * Lists sites from connected hosting, detects CMS, allows selection
 * Supports both demo mode and real Hostinger API
 */

// API Configuration (should match step1.js)
const API_CONFIG = {
  workerUrl: 'https://migration-assistant-api.legharifarmsryk.workers.dev',
  demoMode: false
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
    document.getElementById('connectedProvider').textContent = provider.name || 'Hostinger';
    // Use email from user object, or show subscription count
    const userDisplay = provider.user?.email ||
                        (provider.user?.subscriptionCount ? `${provider.user.subscriptionCount} subscription(s)` : 'Connected');
    document.getElementById('connectedUser').textContent = userDisplay;
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
    // Real API mode - fetch from both list-sites and discover-sites endpoints
    try {
      console.log('Fetching sites from API...');

      // Fetch from both endpoints in parallel
      const [listResponse, discoverResponse] = await Promise.all([
        fetch(`${API_CONFIG.workerUrl}/api/list-sites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiToken: provider.apiToken })
        }),
        fetch(`${API_CONFIG.workerUrl}/api/discover-sites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiToken: provider.apiToken })
        })
      ]);

      const data = await listResponse.json();
      const discoverData = await discoverResponse.json();

      console.log('List Sites Response:', data);
      console.log('Discover Sites Response:', discoverData);

      // Log debug info
      if (data.debug) {
        console.log('API Debug Info:', data.debug);
      }
      if (data.raw) {
        console.log('Raw API Data:', data.raw);
      }
      if (discoverData.debug) {
        console.log('Discover Debug Info:', discoverData.debug);
      }

      // Merge sites from both endpoints
      const allSitesMap = new Map();

      // Add sites from list-sites endpoint
      if (data.success && data.sites) {
        data.sites.forEach((site) => {
          const domain = site.domain || site.name;
          if (domain && !allSitesMap.has(domain)) {
            allSitesMap.set(domain, {
              domain: domain,
              path: site.path || `/public_html`,
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
              lastModified: site.lastModified || new Date().toISOString().split('T')[0],
              source: site.source || 'api'
            });
          }
        });
      }

      // Add sites from discover-sites endpoint (merge new ones)
      if (discoverData.success && discoverData.sites) {
        discoverData.sites.forEach((site) => {
          const domain = site.domain;
          if (domain && !allSitesMap.has(domain)) {
            allSitesMap.set(domain, {
              domain: domain,
              path: site.path || `/public_html`,
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
              lastModified: new Date().toISOString().split('T')[0],
              source: site.source || 'discovered'
            });
          }
        });
      }

      // Convert map to array with IDs
      if (allSitesMap.size > 0) {
        sites = Array.from(allSitesMap.values()).map((site, index) => ({
          id: index + 1,
          ...site
        }));

        console.log('Merged sites:', sites);
        console.log(`Total: ${sites.length} sites (${data.sites?.length || 0} from API, ${discoverData.sites?.length || 0} discovered)`);

        // Show info about what was loaded
        if (data.raw) {
          const sources = [];
          if (data.raw.websitesCount > 0) sources.push(`${data.raw.websitesCount} website(s)`);
          if (data.raw.domainsCount > 0) sources.push(`${data.raw.domainsCount} domain(s)`);
          if (data.raw.subscriptionsCount > 0) sources.push(`${data.raw.subscriptionsCount} subscription(s)`);

          if (sources.length > 0) {
            console.log(`Loaded: ${sources.join(', ')}`);
          }
        }
      } else if (data.success && (!data.sites || data.sites.length === 0)) {
        // API succeeded but no sites found - show helpful message
        Utils.showAlert(`
          <strong>No sites found</strong><br>
          The API returned 0 sites. This could mean:<br>
          • Your hosting plan has no websites configured<br>
          • The API doesn't have permission to list websites<br>
          <br>Check console for raw API response.
        `, 'warning');
        sites = [];
      } else {
        Utils.showAlert(`Failed to load sites: ${data.error || 'Unknown error'}`, 'error');
        sites = MOCK_SITES; // Fallback to demo
      }
    } catch (error) {
      console.error('API Error:', error);
      Utils.showAlert(`API Error: ${error.message}. Showing demo data.`, 'warning');
      sites = MOCK_SITES;
    }
  } else {
    // Demo mode - simulate loading delay
    console.log('Running in demo mode');
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

  // Update total count display
  updateTotalCount(sitesToRender.length);

  if (sitesToRender.length === 0) {
    container.innerHTML = `
      <div class="no-sites">
        <p>No sites found matching your criteria.</p>
      </div>
    `;
    return;
  }

  // Wrap site cards in a 2-column grid
  container.innerHTML = `
    <div class="sites-grid">
      ${sitesToRender.map((site, index) => createSiteCard(site, index)).join('')}
    </div>
  `;

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
function createSiteCard(site, index) {
  const isSelected = selectedSites.has(site.id);
  const cmsInfo = getCmsInfo(site.cms);

  // Only show CMS badge if it's known (not 'unknown')
  const cmsBadge = site.cms && site.cms !== 'unknown'
    ? `<span class="cms-badge cms-${site.cms}">${cmsInfo.icon} ${cmsInfo.name}${site.cmsVersion ? ' ' + site.cmsVersion : ''}</span>`
    : '';

  // Show source badge instead if no CMS detected
  const sourceBadge = site.source ? `<span class="source-badge">${site.source}</span>` : '';

  return `
    <div class="site-card ${isSelected ? 'selected' : ''}" data-site-id="${site.id}">
      <div class="site-header">
        <span class="site-sr-no">${index + 1}</span>
        <input type="checkbox" class="site-checkbox" data-site-id="${site.id}" ${isSelected ? 'checked' : ''}>
        <div class="site-info">
          <div class="site-domain">
            <span class="site-domain-name">${site.domain}</span>
            ${cmsBadge}
            ${site.hasGit ? '<span class="git-badge">Git</span>' : ''}
          </div>
          <div class="site-path">${site.path}</div>
        </div>
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

  document.getElementById('selectedCount').textContent = count;

  // Enable/disable buttons
  const hasSelection = count > 0;
  document.getElementById('nextStepBtn').disabled = !hasSelection;
  document.getElementById('downloadFilesBtn').disabled = !hasSelection;
  document.getElementById('downloadDbBtn').disabled = !hasSelection;
  document.getElementById('downloadAllBtn').disabled = !hasSelection;

  // Show/hide selection bar
  document.getElementById('selectionBar').style.display = hasSelection ? 'flex' : 'none';
}

/**
 * Update total sites count display
 */
function updateTotalCount(count) {
  const totalCountEl = document.getElementById('totalSitesCount');
  if (totalCountEl) {
    totalCountEl.textContent = count;
  }
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
 * Download sites - shows hPanel download guide with direct links
 */
async function downloadSites(type) {
  if (selectedSites.size === 0) {
    Utils.showAlert('Please select at least one site to download.', 'warning');
    return;
  }

  // Get selected site data
  const selectedSiteData = Array.from(selectedSites).map(id => {
    const site = sites.find(s => s.id === id);
    return site ? { id: site.id, domain: site.domain, path: site.path, cms: site.cms } : null;
  }).filter(Boolean);

  // Save selected sites for migration
  Utils.setStorage('migration_selected_sites', selectedSiteData);

  // Show download guide modal
  showDownloadGuide(selectedSiteData, type);
}

/**
 * Show download guide with step-by-step instructions
 */
function showDownloadGuide(sites, type) {
  const typeConfig = {
    files: {
      title: 'Download Website Files',
      icon: '📁',
      steps: [
        'Click on a site below to open it in hPanel',
        'Navigate to <strong>Files → Backups</strong>',
        'Select the most recent backup date',
        'Click <strong>Download</strong> and choose <strong>Files</strong>',
        'Save the .tar.gz file to your computer'
      ],
      hpanelPath: '/hosting/backups'
    },
    databases: {
      title: 'Download Databases',
      icon: '🗄️',
      steps: [
        'Click on a site below to open it in hPanel',
        'Navigate to <strong>Databases → MySQL Databases</strong>',
        'Click <strong>Enter phpMyAdmin</strong> for your database',
        'Go to <strong>Export</strong> tab',
        'Click <strong>Export</strong> to download the .sql file'
      ],
      hpanelPath: '/hosting/mysql'
    },
    all: {
      title: 'Download Complete Backup',
      icon: '📦',
      steps: [
        'Click on a site below to open it in hPanel',
        'Navigate to <strong>Files → Backups</strong>',
        'Download both <strong>Files</strong> and <strong>Databases</strong>',
        'Repeat for each selected site',
        'Keep all files organized by domain name'
      ],
      hpanelPath: '/hosting/backups'
    }
  };

  const config = typeConfig[type];

  // Build site links HTML
  const siteLinksHtml = sites.map((site, index) => `
    <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: white; border-radius: 6px; margin-bottom: 0.5rem; border: 1px solid var(--border-color);">
      <span style="background: var(--primary-color); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600;">${index + 1}</span>
      <span style="flex: 1; font-weight: 500;">${site.domain}</span>
      <a href="https://hpanel.hostinger.com/websites/${site.domain}${config.hpanelPath}" target="_blank"
         class="btn btn-sm btn-outline" style="text-decoration: none; font-size: 0.8rem;">
        Open in hPanel →
      </a>
    </div>
  `).join('');

  // Create and show modal
  const modalHtml = `
    <div id="downloadGuideModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h2>${config.icon} ${config.title}</h2>
          <button class="modal-close" onclick="closeDownloadGuide()">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Steps -->
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-secondary);">Steps to Download:</h3>
            <ol style="margin: 0; padding-left: 1.25rem; line-height: 1.8;">
              ${config.steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>

          <!-- Site List -->
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-secondary);">Your Selected Sites (${sites.length}):</h3>
            <div style="max-height: 250px; overflow-y: auto;">
              ${siteLinksHtml}
            </div>
          </div>

          <!-- Important Note -->
          <div style="padding: 1rem; background: #FEF3C7; border-radius: var(--radius-md); margin-bottom: 1rem;">
            <strong>💡 Important:</strong>
            <ul style="margin: 0.5rem 0 0 1rem; padding: 0; font-size: 0.9rem;">
              <li>Save files in a folder named after each domain</li>
              <li>Keep both files and database backups together</li>
              <li>You'll need these files in Step 3 to upload to your new account</li>
            </ul>
          </div>

          <!-- Tracking Checklist -->
          <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
            <h4 style="font-size: 0.9rem; margin-bottom: 0.75rem;">Track Your Downloads:</h4>
            <div id="downloadChecklist">
              ${sites.map(site => `
                <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;">
                  <input type="checkbox" class="download-check" data-domain="${site.domain}" style="width: 18px; height: 18px;">
                  <span>${site.domain}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Actions -->
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="closeDownloadGuide()">Close</button>
            <button class="btn btn-success" id="markDownloadsComplete" onclick="markDownloadsComplete()">
              ✓ I've Downloaded All Files
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal styles if not present
  if (!document.getElementById('downloadGuideStyles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'downloadGuideStyles';
    styleEl.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }
      .modal-content {
        background: white;
        border-radius: var(--radius-lg);
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
      }
      .modal-header h2 {
        font-size: 1.25rem;
        margin: 0;
      }
      .modal-close {
        background: none;
        border: none;
        font-size: 1.75rem;
        cursor: pointer;
        color: var(--text-secondary);
        line-height: 1;
        padding: 0;
      }
      .modal-close:hover {
        color: var(--text-primary);
      }
      .modal-body {
        padding: 1.5rem;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Remove existing modal if any
  const existingModal = document.getElementById('downloadGuideModal');
  if (existingModal) existingModal.remove();

  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Setup checklist change handler
  document.querySelectorAll('.download-check').forEach(checkbox => {
    checkbox.addEventListener('change', updateDownloadProgress);
  });
}

/**
 * Close download guide modal
 */
function closeDownloadGuide() {
  const modal = document.getElementById('downloadGuideModal');
  if (modal) modal.remove();
}

/**
 * Update download progress based on checklist
 */
function updateDownloadProgress() {
  const checkboxes = document.querySelectorAll('.download-check');
  const checked = document.querySelectorAll('.download-check:checked');
  const allChecked = checkboxes.length === checked.length;

  const completeBtn = document.getElementById('markDownloadsComplete');
  if (completeBtn) {
    completeBtn.disabled = false; // Always allow marking complete
    if (allChecked) {
      completeBtn.classList.add('pulse');
    }
  }
}

/**
 * Mark downloads as complete and save state
 */
function markDownloadsComplete() {
  const checkedDomains = [];
  document.querySelectorAll('.download-check:checked').forEach(cb => {
    checkedDomains.push(cb.dataset.domain);
  });

  // Save download status
  const migrationData = Utils.getStorage('migration_data') || {};
  migrationData.downloadedSites = checkedDomains;
  migrationData.downloadCompleted = true;
  migrationData.downloadDate = new Date().toISOString();
  Utils.setStorage('migration_data', migrationData);

  closeDownloadGuide();

  Utils.showAlert(`
    <strong>✅ Downloads Marked Complete!</strong><br><br>
    ${checkedDomains.length} site(s) ready for migration.<br><br>
    <strong>Next Step:</strong> Click "Next: Connect New Account" to continue with Step 3.
  `, 'success');

  // Enable next button if not already
  document.getElementById('nextStepBtn').disabled = false;
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
  const selectedSiteData = Array.from(selectedSites).map(id => {
    const site = sites.find(s => s.id === id);
    return site ? { id: site.id, domain: site.domain, path: site.path } : null;
  }).filter(Boolean);

  Utils.setStorage('migration_selected_sites', selectedSiteData);

  Utils.showAlert(`
    <strong>✅ ${selectedSites.size} site(s) selected!</strong><br><br>
    Step 3 (Connect New Hostinger Account) is coming soon.<br>
    You can download the selected sites using the Download Options below.
  `, 'success');
}
