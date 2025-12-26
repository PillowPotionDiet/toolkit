/**
 * Step 3 - Connect New Hostinger Account
 * Connects to the destination account for migration
 */

// API Configuration
const API_CONFIG = {
  workerUrl: 'https://migration-assistant-api.legharifarmsryk.workers.dev',
  demoMode: false
};

// State
let newAccountConnected = false;
let newAccountData = null;

/**
 * Initialize Step 3
 */
document.addEventListener('DOMContentLoaded', () => {
  loadMigrationSummary();
  setupFormHandlers();
  checkExistingConnection();
});

/**
 * Load migration summary from previous steps
 */
function loadMigrationSummary() {
  const selectedSites = Utils.getStorage('migration_selected_sites') || [];
  const migrationData = Utils.getStorage('migration_data') || {};

  // Update counts
  document.getElementById('sitesCount').textContent = selectedSites.length;
  document.getElementById('filesCount').textContent = migrationData.downloadStats?.files || 0;
  document.getElementById('totalSize').textContent = Utils.formatBytes(migrationData.downloadStats?.size || 0);

  // Populate site list
  const siteList = document.getElementById('siteList');
  if (selectedSites.length > 0) {
    siteList.innerHTML = selectedSites.map(site => `
      <div class="site-item">
        <span class="site-item-icon">✓</span>
        <span>${site.domain}</span>
      </div>
    `).join('');
  } else {
    siteList.innerHTML = `
      <div style="text-align: center; padding: 1rem; color: var(--text-secondary);">
        No sites selected. <a href="step2.html">Go back to Step 2</a>
      </div>
    `;
  }

  // Check if downloads are complete
  if (!migrationData.downloadCompleted) {
    Utils.showAlert(`
      <strong>⚠️ Downloads Not Complete</strong><br><br>
      Please complete downloading your sites in Step 2 before connecting your new account.
      <br><br>
      <a href="step2.html" class="btn btn-primary btn-sm">← Back to Step 2</a>
    `, 'warning');
  }
}

/**
 * Setup form handlers
 */
function setupFormHandlers() {
  document.getElementById('newAccountForm').addEventListener('submit', handleConnect);
  document.getElementById('nextStepBtn').addEventListener('click', goToNextStep);
}

/**
 * Check for existing connection
 */
function checkExistingConnection() {
  const newProvider = Utils.getStorage('migration_new_provider');
  if (newProvider && newProvider.apiToken && newProvider.verified) {
    newAccountConnected = true;
    newAccountData = newProvider;
    updateConnectionStatus('connected', `Connected to ${newProvider.accountName || 'Hostinger'}`);
    showAccountDetails(newProvider);
    document.getElementById('nextStepBtn').disabled = false;
  }
}

/**
 * Handle form submission - connect to new account
 */
async function handleConnect(e) {
  e.preventDefault();

  const apiToken = document.getElementById('newApiToken').value.trim();
  const ftpHost = document.getElementById('newFtpHost').value.trim();
  const ftpUsername = document.getElementById('newFtpUsername').value.trim();
  const ftpPassword = document.getElementById('newFtpPassword').value;

  if (!apiToken) {
    Utils.showAlert('Please enter your new account API token.', 'warning');
    return;
  }

  // Check if this is the same as old account
  const oldProvider = Utils.getStorage('migration_provider') || {};
  if (oldProvider.apiToken === apiToken) {
    Utils.showAlert(`
      <strong>❌ Same Account Detected</strong><br><br>
      You've entered the same API token as your old account.
      Please use your <strong>NEW</strong> Hostinger account's API token.
    `, 'error');
    return;
  }

  const connectBtn = document.getElementById('connectBtn');
  const btnText = document.getElementById('connectBtnText');
  const btnIcon = document.getElementById('connectBtnIcon');

  try {
    connectBtn.disabled = true;
    btnText.textContent = 'Connecting...';
    btnIcon.innerHTML = '<div class="loading" style="width: 16px; height: 16px;"></div>';
    updateConnectionStatus('pending', 'Verifying account...');

    // Verify the new account via API
    const response = await fetch(`${API_CONFIG.workerUrl}/api/verify-new-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiToken: apiToken,
        ftp: ftpHost ? { host: ftpHost, username: ftpUsername, password: ftpPassword } : null
      })
    });

    const result = await response.json();

    if (result.success) {
      newAccountConnected = true;
      newAccountData = {
        apiToken: apiToken,
        accountName: result.accountName || 'Hostinger Account',
        accountEmail: result.accountEmail || '-',
        hostingSlots: result.hostingSlots || '-',
        availableSpace: result.availableSpace || '-',
        ftp: ftpHost ? { host: ftpHost, username: ftpUsername } : null,
        verified: true,
        verifiedAt: new Date().toISOString()
      };

      // Save to localStorage
      Utils.setStorage('migration_new_provider', newAccountData);

      updateConnectionStatus('connected', `Connected to ${newAccountData.accountName}`);
      showAccountDetails(newAccountData);
      document.getElementById('nextStepBtn').disabled = false;

      Utils.showAlert(`
        <strong>✅ New Account Connected!</strong><br><br>
        Successfully verified your new Hostinger account.<br>
        You can now proceed to start the migration.
      `, 'success');

    } else {
      throw new Error(result.error || 'Failed to verify account');
    }

  } catch (error) {
    updateConnectionStatus('error', `Connection failed: ${error.message}`);
    Utils.showAlert(`<strong>Connection Error:</strong> ${error.message}`, 'error');
  } finally {
    connectBtn.disabled = false;
    btnText.textContent = 'Connect & Verify Account';
    btnIcon.textContent = '🔌';
  }
}

/**
 * Update connection status display
 */
function updateConnectionStatus(status, message) {
  const statusEl = document.getElementById('connectionStatus');
  statusEl.className = `connection-status ${status}`;

  const icons = {
    connected: '✅',
    pending: '⏳',
    error: '❌'
  };

  statusEl.innerHTML = `<span>${icons[status]}</span><span>${message}</span>`;
}

/**
 * Show account details after successful connection
 */
function showAccountDetails(account) {
  document.getElementById('accountDetails').classList.remove('hidden');
  document.getElementById('newAccountName').textContent = account.accountName || '-';
  document.getElementById('newAccountEmail').textContent = account.accountEmail || '-';
  document.getElementById('newAccountSlots').textContent = account.hostingSlots || '-';
  document.getElementById('newAccountSpace').textContent = account.availableSpace || '-';
}

/**
 * Go to next step
 */
function goToNextStep() {
  if (!newAccountConnected) {
    Utils.showAlert('Please connect your new account first.', 'warning');
    return;
  }

  // Navigate to step 4
  window.location.href = 'step4.html';
}
