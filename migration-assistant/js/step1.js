/**
 * Step 1 - Old Account Connection
 * Handles provider selection, credential input, and connection testing
 */

let providers = {};
let selectedProvider = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  await loadProviders();
  setupEventListeners();
  checkConnectionStatus();
});

/**
 * Load providers from API
 */
async function loadProviders() {
  try {
    const response = await Utils.apiRequest('/api/providers');
    if (response.success) {
      providers = response.providers;
      console.log('Providers loaded:', providers);
    }
  } catch (error) {
    Utils.showAlert(`Failed to load providers: ${error.message}`, 'error');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const providerSelect = document.getElementById('providerSelect');
  const credentialsForm = document.getElementById('credentialsForm');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const connectBtn = document.getElementById('connectBtn');

  // Provider selection change
  providerSelect.addEventListener('change', (e) => {
    const providerId = e.target.value;
    if (providerId) {
      selectProvider(providerId);
    } else {
      clearProvider();
    }
  });

  // Test connection button
  testConnectionBtn.addEventListener('click', async () => {
    await testConnection();
  });

  // Form submit (Connect & Scan)
  credentialsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await connectToProvider();
  });

  // Real-time validation on credential fields
  credentialsForm.addEventListener('input', () => {
    validateCredentials();
  });
}

/**
 * Select a provider
 */
function selectProvider(providerId) {
  // Find provider in both cpanel and other categories
  let provider = null;
  if (providers.cpanel) {
    provider = providers.cpanel.find(p => p.id === providerId);
  }
  if (!provider && providers.other) {
    provider = providers.other.find(p => p.id === providerId);
  }

  if (!provider) {
    Utils.showAlert('Provider not found', 'error');
    return;
  }

  selectedProvider = provider;

  // Show provider info
  displayProviderInfo(provider);

  // Check if provider is implemented
  if (provider.adapter === 'PleskAdapter' || provider.adapter === 'CloudwaysAdapter' || provider.adapter === 'DirectAdminAdapter') {
    // Show not implemented warning
    Utils.toggleElement('credentialsForm', false);
    Utils.toggleElement('notImplementedWarning', true);
    return;
  }

  // Hide not implemented warning
  Utils.toggleElement('notImplementedWarning', false);

  // Build credential form
  buildCredentialForm(provider);

  // Show form
  Utils.toggleElement('credentialsForm', true);

  // Clear previous alerts
  Utils.clearAlerts();
}

/**
 * Clear provider selection
 */
function clearProvider() {
  selectedProvider = null;
  Utils.toggleElement('providerInfo', false);
  Utils.toggleElement('credentialsForm', false);
  Utils.toggleElement('notImplementedWarning', false);
  Utils.toggleElement('helpSection', false);
}

/**
 * Display provider information
 */
function displayProviderInfo(provider) {
  const providerInfo = document.getElementById('providerInfo');
  const providerLogo = document.getElementById('providerLogo');
  const providerName = document.getElementById('providerName');
  const providerNotes = document.getElementById('providerNotes');
  const providerFeatures = document.getElementById('providerFeatures');

  // Show provider info card
  Utils.toggleElement('providerInfo', true);

  // Set provider name
  providerName.textContent = provider.name;

  // Set provider logo (placeholder or actual logo)
  providerLogo.innerHTML = `
    <div style="width: 60px; height: 60px; background: var(--bg-tertiary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
      🌐
    </div>
  `;

  // Set provider notes
  providerNotes.textContent = provider.notes || 'No additional notes.';

  // Set provider features
  providerFeatures.innerHTML = '';
  if (provider.features && provider.features.length > 0) {
    provider.features.forEach(feature => {
      const badge = document.createElement('span');
      badge.className = 'provider-badge';
      badge.textContent = feature;
      providerFeatures.appendChild(badge);
    });
  }
}

/**
 * Build credential form dynamically
 */
function buildCredentialForm(provider) {
  const credentialFields = document.getElementById('credentialFields');
  const helpSection = document.getElementById('helpSection');
  const helpLink = document.getElementById('helpLink');

  // Clear existing fields
  credentialFields.innerHTML = '';

  // Build fields based on provider config
  if (provider.credentialFields && provider.credentialFields.length > 0) {
    provider.credentialFields.forEach(field => {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';

      const label = document.createElement('label');
      label.className = `form-label ${field.required ? 'form-label-required' : ''}`;
      label.textContent = field.label;
      label.setAttribute('for', field.name);

      const input = document.createElement('input');
      input.type = field.type || 'text';
      input.id = field.name;
      input.name = field.name;
      input.className = 'form-input';
      input.placeholder = field.placeholder || '';
      input.required = field.required || false;

      formGroup.appendChild(label);
      formGroup.appendChild(input);

      credentialFields.appendChild(formGroup);
    });
  }

  // Set help link
  if (provider.helpUrl) {
    helpLink.href = provider.helpUrl;
    Utils.toggleElement('helpSection', true);
  } else {
    Utils.toggleElement('helpSection', false);
  }

  // Enable/disable buttons
  validateCredentials();
}

/**
 * Validate credential fields
 */
function validateCredentials() {
  if (!selectedProvider) return;

  const credentialFields = document.getElementById('credentialFields');
  const inputs = credentialFields.querySelectorAll('input[required]');
  let allFilled = true;

  inputs.forEach(input => {
    if (!input.value.trim()) {
      allFilled = false;
    }
  });

  // Enable/disable buttons
  const testBtn = document.getElementById('testConnectionBtn');
  const connectBtn = document.getElementById('connectBtn');

  testBtn.disabled = !allFilled;
  connectBtn.disabled = !allFilled;

  return allFilled;
}

/**
 * Get credentials from form
 */
function getCredentials() {
  const credentials = {};
  const credentialFields = document.getElementById('credentialFields');
  const inputs = credentialFields.querySelectorAll('input');

  inputs.forEach(input => {
    credentials[input.name] = input.value.trim();
  });

  return credentials;
}

/**
 * Test connection (without saving)
 */
async function testConnection() {
  if (!selectedProvider || !validateCredentials()) return;

  const testBtn = document.getElementById('testConnectionBtn');
  const testBtnText = document.getElementById('testBtnText');
  const testBtnIcon = document.getElementById('testBtnIcon');

  const originalText = testBtnText.textContent;
  const originalIcon = testBtnIcon.textContent;

  try {
    // Update button state
    testBtn.disabled = true;
    testBtnText.textContent = 'Testing...';
    testBtnIcon.innerHTML = '<div class="loading"></div>';

    // Show loading
    Utils.showLoading(`Testing connection to ${selectedProvider.name}...`);

    // Get credentials
    const credentials = getCredentials();

    // Make API request
    const response = await Utils.apiRequest('/api/test-connection', {
      method: 'POST',
      body: JSON.stringify({
        providerId: selectedProvider.id,
        credentials: credentials
      })
    });

    Utils.hideLoading();

    if (response.success) {
      Utils.showAlert(`
        <strong>✅ Connection Successful!</strong><br>
        Successfully connected to ${response.provider}.
        ${response.serverInfo ? `<br><small>Server: ${response.serverInfo.username || 'N/A'}</small>` : ''}
      `, 'success');
    } else {
      Utils.showAlert(`
        <strong>❌ Connection Failed</strong><br>
        ${Utils.sanitize(response.message)}
      `, 'error');
    }
  } catch (error) {
    Utils.hideLoading();
    Utils.showAlert(`
      <strong>❌ Connection Failed</strong><br>
      ${Utils.sanitize(error.message)}
    `, 'error');
  } finally {
    // Restore button state
    testBtn.disabled = false;
    testBtnText.textContent = originalText;
    testBtnIcon.textContent = originalIcon;
  }
}

/**
 * Connect to provider and save to session
 */
async function connectToProvider() {
  if (!selectedProvider || !validateCredentials()) return;

  const connectBtn = document.getElementById('connectBtn');
  const connectBtnText = document.getElementById('connectBtnText');
  const connectBtnIcon = document.getElementById('connectBtnIcon');

  const originalText = connectBtnText.textContent;
  const originalIcon = connectBtnIcon.textContent;

  try {
    // Update button state
    Utils.toggleFormElements('credentialsForm', true);
    connectBtnText.textContent = 'Connecting...';
    connectBtnIcon.innerHTML = '<div class="loading"></div>';

    // Show loading
    Utils.showLoading(`Connecting to ${selectedProvider.name}...`);

    // Get credentials
    const credentials = getCredentials();

    // Make API request
    const response = await Utils.apiRequest('/api/connect-old', {
      method: 'POST',
      body: JSON.stringify({
        providerId: selectedProvider.id,
        credentials: credentials
      })
    });

    Utils.hideLoading();

    if (response.success) {
      // Show success message
      Utils.showAlert(`
        <strong>✅ Successfully Connected!</strong><br>
        Connected to ${response.provider}. Ready to scan sites.
      `, 'success');

      // Display connection status
      displayConnectionStatus(response);

      // Show next step button
      Utils.toggleElement('nextStepBtn', true);

      // Save state to localStorage
      Utils.setStorage('migration_provider', {
        id: selectedProvider.id,
        name: selectedProvider.name
      });
    } else {
      Utils.showAlert(`
        <strong>❌ Connection Failed</strong><br>
        ${Utils.sanitize(response.message)}
      `, 'error');

      // Re-enable form
      Utils.toggleFormElements('credentialsForm', false);
      connectBtnText.textContent = originalText;
      connectBtnIcon.textContent = originalIcon;
    }
  } catch (error) {
    Utils.hideLoading();
    Utils.showAlert(`
      <strong>❌ Connection Failed</strong><br>
      ${Utils.sanitize(error.message)}
    `, 'error');

    // Re-enable form
    Utils.toggleFormElements('credentialsForm', false);
    connectBtnText.textContent = originalText;
    connectBtnIcon.textContent = originalIcon;
  }
}

/**
 * Display connection status
 */
function displayConnectionStatus(response) {
  const statusCard = document.getElementById('connectionStatus');
  const statusProvider = document.getElementById('statusProvider');
  const statusUsername = document.getElementById('statusUsername');
  const statusEmail = document.getElementById('statusEmail');
  const statusDisk = document.getElementById('statusDisk');

  // Show status card
  Utils.toggleElement('connectionStatus', true);

  // Fill in details
  statusProvider.textContent = response.provider || 'N/A';

  if (response.serverInfo) {
    statusUsername.textContent = response.serverInfo.username || 'N/A';
    statusEmail.textContent = response.serverInfo.email || 'N/A';
    statusDisk.textContent = response.serverInfo.diskUsed
      ? `${Utils.formatBytes(parseInt(response.serverInfo.diskUsed) * 1024)} / ${Utils.formatBytes(parseInt(response.serverInfo.diskLimit || 0) * 1024)}`
      : 'N/A';
  } else {
    statusUsername.textContent = 'N/A';
    statusEmail.textContent = 'N/A';
    statusDisk.textContent = 'N/A';
  }

  // Scroll to status card
  statusCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Check if already connected (on page load)
 */
async function checkConnectionStatus() {
  try {
    const response = await Utils.apiRequest('/api/connection-status');

    if (response.success && response.oldProvider && response.oldProvider.connected) {
      // Already connected, show status
      const savedProvider = Utils.getStorage('migration_provider');

      if (savedProvider) {
        Utils.showAlert(`
          <strong>ℹ️ Already Connected</strong><br>
          You are currently connected to ${response.oldProvider.name}.
          You can proceed to the next step or reconnect to a different provider.
        `, 'info');

        // Show next step button
        Utils.toggleElement('nextStepBtn', true);
      }
    }
  } catch (error) {
    console.error('Failed to check connection status:', error);
  }
}
