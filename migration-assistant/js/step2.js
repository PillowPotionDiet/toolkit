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

  // Proceed button in selection bar
  document.getElementById('proceedBtn').addEventListener('click', () => downloadSites('all'));

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
  document.getElementById('proceedBtn').disabled = !hasSelection;
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

// Store current download type
let currentDownloadType = 'all';
let ftpCredentials = null;
let downloadStartTime = null;
let downloadStats = { files: 0, size: 0 };

/**
 * Download sites - opens hPanel backup pages directly
 */
async function downloadSites(type) {
  if (selectedSites.size === 0) {
    Utils.showAlert('Please select at least one site to download.', 'warning');
    return;
  }

  currentDownloadType = type;

  // Get selected site data
  const selectedSiteData = Array.from(selectedSites).map(id => {
    const site = sites.find(s => s.id === id);
    return site ? { id: site.id, domain: site.domain, path: site.path, cms: site.cms } : null;
  }).filter(Boolean);

  // Save selected sites for migration
  Utils.setStorage('migration_selected_sites', selectedSiteData);

  // Start the download process (opens hPanel pages)
  startBackupDownload(selectedSiteData, type);
}

/**
 * Show FTP credentials modal
 */
function showFtpModal() {
  const modal = document.getElementById('ftpModal');
  modal.classList.remove('hidden');

  // Pre-fill if we have saved credentials
  const provider = Utils.getStorage('migration_provider') || {};
  if (provider.ftp) {
    document.getElementById('ftpHost').value = provider.ftp.host || '';
    document.getElementById('ftpUsername').value = provider.ftp.username || '';
    document.getElementById('ftpPort').value = provider.ftp.port || 21;
  }

  // Focus first empty input
  const firstEmpty = modal.querySelector('input:not([value])') || document.getElementById('ftpHost');
  firstEmpty.focus();

  // Setup form handler
  document.getElementById('ftpForm').onsubmit = handleFtpSubmit;
}

/**
 * Close FTP modal
 */
function closeFtpModal() {
  document.getElementById('ftpModal').classList.add('hidden');
}

/**
 * Handle FTP form submission
 */
async function handleFtpSubmit(e) {
  e.preventDefault();

  const host = document.getElementById('ftpHost').value.trim();
  const username = document.getElementById('ftpUsername').value.trim();
  const password = document.getElementById('ftpPassword').value;
  const port = parseInt(document.getElementById('ftpPort').value) || 21;

  if (!host || !username || !password) {
    Utils.showAlert('Please fill in all FTP credentials.', 'warning');
    return;
  }

  ftpCredentials = { host, username, password, port };

  // Save FTP credentials
  const provider = Utils.getStorage('migration_provider') || {};
  provider.ftp = { host, username, port }; // Don't save password for security
  Utils.setStorage('migration_provider', provider);

  // Close FTP modal
  closeFtpModal();

  // Get selected sites
  const selectedSiteData = Array.from(selectedSites).map(id => {
    const site = sites.find(s => s.id === id);
    return site ? { id: site.id, domain: site.domain, path: site.path, cms: site.cms } : null;
  }).filter(Boolean);

  // Start download
  startFtpDownload(selectedSiteData, currentDownloadType);
}

/**
 * Start backup download process - opens hPanel pages for each site
 */
async function startBackupDownload(sitesToDownload, type) {
  // Show download modal
  const downloadModal = document.getElementById('downloadModal');
  downloadModal.classList.remove('hidden');

  // Reset stats
  downloadStartTime = Date.now();
  downloadStats = { files: 0, size: 0 };

  // Initialize progress list
  const progressList = document.getElementById('sitesProgressList');
  progressList.innerHTML = sitesToDownload.map(site => `
    <div class="site-progress-item" id="progress-${site.domain.replace(/\./g, '-')}">
      <div class="site-progress-icon">⏳</div>
      <div class="site-progress-info">
        <div class="site-progress-name">${site.domain}</div>
        <div class="site-progress-status">Waiting...</div>
      </div>
    </div>
  `).join('');

  // Start elapsed time counter
  const timeInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - downloadStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    document.getElementById('statTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }, 1000);

  try {
    const provider = Utils.getStorage('migration_provider') || {};

    for (let i = 0; i < sitesToDownload.length; i++) {
      const site = sitesToDownload[i];
      const siteEl = document.getElementById(`progress-${site.domain.replace(/\./g, '-')}`);

      // Update UI - processing
      siteEl.classList.add('downloading');
      siteEl.querySelector('.site-progress-icon').textContent = '🔄';
      siteEl.querySelector('.site-progress-status').textContent = 'Opening hPanel...';

      // Update overall progress
      const percent = Math.round(((i) / sitesToDownload.length) * 100);
      document.getElementById('overallProgressBar').style.width = `${percent}%`;
      document.getElementById('overallProgressPercent').textContent = `${percent}%`;
      document.getElementById('overallProgressText').textContent = `Processing ${site.domain}...`;
      document.getElementById('currentFileName').textContent = site.domain;

      try {
        // Call API to get hPanel URLs
        const response = await fetch(`${API_CONFIG.workerUrl}/api/ftp-download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site: site,
            type: type,
            apiToken: provider.apiToken
          })
        });

        const result = await response.json();

        if (result.success) {
          // Open hPanel backup page in new tab
          if (result.redirectUrl || result.hpanelUrls?.backups) {
            const backupUrl = result.redirectUrl || result.hpanelUrls.backups;
            window.open(backupUrl, '_blank');
          }

          // Update UI - success
          siteEl.classList.remove('downloading');
          siteEl.classList.add('completed');
          siteEl.querySelector('.site-progress-icon').textContent = '✅';
          siteEl.querySelector('.site-progress-status').textContent = 'hPanel opened - download backup';

          downloadStats.files += 1;
        } else {
          throw new Error(result.error || 'Failed to get backup URL');
        }
      } catch (error) {
        // Fallback - open hPanel directly
        const fallbackUrl = `https://hpanel.hostinger.com/websites/${site.domain}/files/backups`;
        window.open(fallbackUrl, '_blank');

        siteEl.classList.remove('downloading');
        siteEl.classList.add('completed');
        siteEl.querySelector('.site-progress-icon').textContent = '✅';
        siteEl.querySelector('.site-progress-status').textContent = 'hPanel opened (fallback)';

        downloadStats.files += 1;
        console.log('Using fallback URL for', site.domain);
      }

      // Update stats
      document.getElementById('statFiles').textContent = downloadStats.files;
      document.getElementById('statSize').textContent = 'See hPanel';

      // Small delay between opening tabs to avoid popup blocker
      if (i < sitesToDownload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Complete
    clearInterval(timeInterval);
    document.getElementById('overallProgressBar').style.width = '100%';
    document.getElementById('overallProgressPercent').textContent = '100%';
    document.getElementById('overallProgressText').textContent = 'All hPanel pages opened!';
    document.getElementById('currentFileSection').classList.add('hidden');
    document.getElementById('downloadCompleteActions').classList.remove('hidden');
    document.getElementById('downloadCompleteActions').style.display = 'flex';

    // Save download status
    const migrationData = Utils.getStorage('migration_data') || {};
    migrationData.downloadedSites = sitesToDownload.map(s => s.domain);
    migrationData.downloadCompleted = true;
    migrationData.downloadDate = new Date().toISOString();
    migrationData.downloadStats = downloadStats;
    Utils.setStorage('migration_data', migrationData);

  } catch (error) {
    clearInterval(timeInterval);
    document.getElementById('overallProgressText').textContent = `Error: ${error.message}`;
    document.getElementById('downloadCompleteActions').classList.remove('hidden');
    document.getElementById('downloadCompleteActions').style.display = 'flex';
  }
}

/**
 * Close download modal
 */
function closeDownloadModal() {
  document.getElementById('downloadModal').classList.add('hidden');
  // Reset state
  document.getElementById('currentFileSection').classList.remove('hidden');
  document.getElementById('downloadCompleteActions').classList.add('hidden');
  document.getElementById('overallProgressBar').style.width = '0%';
  document.getElementById('overallProgressPercent').textContent = '0%';
}

/**
 * Proceed to next step after download
 */
function proceedToNextStep() {
  closeDownloadModal();
  // Navigate to step 3
  window.location.href = 'step3.html';
}

/**
 * Go to next step - requires FTP credentials first
 */
function goToNextStep() {
  if (selectedSites.size === 0) {
    Utils.showAlert('Please select at least one site to migrate.', 'warning');
    return;
  }

  // Save selected sites to localStorage
  const selectedSiteData = Array.from(selectedSites).map(id => {
    const site = sites.find(s => s.id === id);
    return site ? { id: site.id, domain: site.domain, path: site.path, cms: site.cms } : null;
  }).filter(Boolean);

  Utils.setStorage('migration_selected_sites', selectedSiteData);

  // Check if downloads are already complete
  const migrationData = Utils.getStorage('migration_data') || {};
  if (migrationData.downloadCompleted) {
    // Proceed to step 3
    window.location.href = 'step3.html';
  } else {
    // Show FTP modal - required before proceeding
    currentDownloadType = 'all';
    showFtpModal();
  }
}
