/**
 * Step 1 - Old Account Connection
 * Supports both demo mode and real Hostinger API via Cloudflare Worker
 */

// API Configuration
const API_CONFIG = {
  workerUrl: 'https://migration-assistant-api.legharifarmsryk.workers.dev',
  demoMode: false
};

// Embedded provider configuration
const PROVIDERS = {
  hostinger: {
    id: 'hostinger',
    name: 'Hostinger',
    type: 'api',
    enabled: true,
    notes: 'Connect using your Hostinger API token from Account Settings.',
    features: ['API Access', 'Websites', 'Databases', 'Emails'],
    credentialFields: [
      {
        name: 'apiToken',
        label: 'Hostinger API Token',
        type: 'password',
        placeholder: 'Paste your API token from Hostinger dashboard',
        required: true
      }
    ],
    helpUrl: 'https://support.hostinger.com/en/articles/6307182-how-to-create-an-api-token'
  },
  // Coming Soon Providers
  bluehost: { id: 'bluehost', name: 'Bluehost', enabled: false },
  siteground: { id: 'siteground', name: 'SiteGround', enabled: false },
  'godaddy-cpanel': { id: 'godaddy-cpanel', name: 'GoDaddy (cPanel)', enabled: false },
  hostgator: { id: 'hostgator', name: 'HostGator', enabled: false },
  'namecheap-cpanel': { id: 'namecheap-cpanel', name: 'Namecheap (cPanel)', enabled: false },
  a2hosting: { id: 'a2hosting', name: 'A2 Hosting', enabled: false },
  inmotion: { id: 'inmotion', name: 'InMotion Hosting', enabled: false },
  dreamhost: { id: 'dreamhost', name: 'DreamHost', enabled: false },
  ipage: { id: 'ipage', name: 'iPage', enabled: false },
  greengeeks: { id: 'greengeeks', name: 'GreenGeeks', enabled: false },
  hostwinds: { id: 'hostwinds', name: 'Hostwinds', enabled: false },
  interserver: { id: 'interserver', name: 'InterServer', enabled: false },
  'cpanel-generic': { id: 'cpanel-generic', name: 'Other cPanel Host', enabled: false },
  plesk: { id: 'plesk', name: 'Plesk', enabled: false },
  directadmin: { id: 'directadmin', name: 'DirectAdmin', enabled: false },
  cloudways: { id: 'cloudways', name: 'Cloudways', enabled: false },
  'godaddy-plesk': { id: 'godaddy-plesk', name: 'GoDaddy (Plesk)', enabled: false },
  'namecheap-directadmin': { id: 'namecheap-directadmin', name: 'Namecheap (DirectAdmin)', enabled: false }
};

let selectedProvider = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  updateProviderDropdown();
  setupEventListeners();
  checkApiMode();
});

/**
 * Check if API mode is available
 */
function checkApiMode() {
  if (API_CONFIG.workerUrl && !API_CONFIG.demoMode) {
    console.log('API Mode: Real Hostinger API via Worker');
  } else {
    console.log('API Mode: Demo Mode (no backend)');
    // Show demo mode notice
    Utils.showAlert(`
      <strong>Demo Mode Active</strong><br>
      This is a demonstration. To use real Hostinger API, deploy the Cloudflare Worker.
    `, 'info');
  }
}

/**
 * Update provider dropdown with Coming Soon labels
 */
function updateProviderDropdown() {
  const select = document.getElementById('providerSelect');
  if (!select) return;

  // Clear existing options
  select.innerHTML = '<option value="">-- Choose Provider --</option>';

  // Add cPanel providers group
  const cpanelGroup = document.createElement('optgroup');
  cpanelGroup.label = 'Supported Providers';

  // Add Hostinger first (enabled)
  const hostingerOption = document.createElement('option');
  hostingerOption.value = 'hostinger';
  hostingerOption.textContent = 'Hostinger';
  cpanelGroup.appendChild(hostingerOption);

  select.appendChild(cpanelGroup);

  // Add coming soon providers
  const comingSoonGroup = document.createElement('optgroup');
  comingSoonGroup.label = 'Coming Soon';

  const comingSoonProviders = ['bluehost', 'siteground', 'godaddy-cpanel', 'hostgator',
    'namecheap-cpanel', 'a2hosting', 'inmotion', 'dreamhost', 'ipage', 'greengeeks',
    'hostwinds', 'interserver', 'cpanel-generic', 'plesk', 'directadmin', 'cloudways'];

  comingSoonProviders.forEach(id => {
    const provider = PROVIDERS[id];
    if (provider) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = `${provider.name} (Coming Soon)`;
      option.disabled = true;
      option.style.color = '#999';
      comingSoonGroup.appendChild(option);
    }
  });

  select.appendChild(comingSoonGroup);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const providerSelect = document.getElementById('providerSelect');
  const credentialsForm = document.getElementById('credentialsForm');
  const testConnectionBtn = document.getElementById('testConnectionBtn');

  providerSelect.addEventListener('change', (e) => {
    const providerId = e.target.value;
    if (providerId) {
      selectProvider(providerId);
    } else {
      clearProvider();
    }
  });

  testConnectionBtn.addEventListener('click', async () => {
    await testConnection();
  });

  credentialsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await connectToProvider();
  });

  credentialsForm.addEventListener('input', () => {
    validateCredentials();
  });
}

/**
 * Select a provider
 */
function selectProvider(providerId) {
  const provider = PROVIDERS[providerId];

  if (!provider) {
    Utils.showAlert('Provider not found', 'error');
    return;
  }

  if (!provider.enabled) {
    Utils.showAlert(`
      <strong>Coming Soon</strong><br>
      ${provider.name} support is coming in a future update. Currently only <strong>Hostinger</strong> is supported.
    `, 'warning');
    document.getElementById('providerSelect').value = '';
    return;
  }

  selectedProvider = provider;
  displayProviderInfo(provider);
  buildCredentialForm(provider);
  Utils.toggleElement('credentialsForm', true);
  Utils.toggleElement('notImplementedWarning', false);
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
  const providerLogo = document.getElementById('providerLogo');
  const providerName = document.getElementById('providerName');
  const providerNotes = document.getElementById('providerNotes');
  const providerFeatures = document.getElementById('providerFeatures');

  Utils.toggleElement('providerInfo', true);
  providerName.textContent = provider.name;

  providerLogo.innerHTML = `
    <div style="width: 60px; height: 60px; background: #673DE6; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; font-weight: bold;">
      H
    </div>
  `;

  providerNotes.textContent = provider.notes || '';

  providerFeatures.innerHTML = '';
  if (provider.features && provider.features.length > 0) {
    provider.features.forEach(feature => {
      const badge = document.createElement('span');
      badge.style.cssText = 'padding: 4px 8px; background: var(--primary-color); color: white; border-radius: 4px; font-size: 0.75rem; margin-right: 4px;';
      badge.textContent = feature;
      providerFeatures.appendChild(badge);
    });
  }
}

/**
 * Build credential form
 */
function buildCredentialForm(provider) {
  const credentialFields = document.getElementById('credentialFields');
  const helpSection = document.getElementById('helpSection');
  const helpLink = document.getElementById('helpLink');

  credentialFields.innerHTML = '';

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

  if (provider.helpUrl) {
    helpLink.href = provider.helpUrl;
    Utils.toggleElement('helpSection', true);
  } else {
    Utils.toggleElement('helpSection', false);
  }

  validateCredentials();
}

/**
 * Validate credentials
 */
function validateCredentials() {
  if (!selectedProvider) return false;

  const credentialFields = document.getElementById('credentialFields');
  const inputs = credentialFields.querySelectorAll('input[required]');
  let allFilled = true;

  inputs.forEach(input => {
    if (!input.value.trim()) {
      allFilled = false;
    }
  });

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
 * Test connection
 */
async function testConnection() {
  if (!selectedProvider || !validateCredentials()) return;

  const testBtn = document.getElementById('testConnectionBtn');
  const testBtnText = document.getElementById('testBtnText');
  const testBtnIcon = document.getElementById('testBtnIcon');

  const originalText = testBtnText.textContent;
  const originalIcon = testBtnIcon.textContent;

  try {
    testBtn.disabled = true;
    testBtnText.textContent = 'Testing...';
    testBtnIcon.innerHTML = '<div class="loading"></div>';

    Utils.showLoading(`Testing connection to ${selectedProvider.name}...`);

    const credentials = getCredentials();

    if (API_CONFIG.workerUrl && !API_CONFIG.demoMode) {
      // Real API call via Cloudflare Worker
      const response = await fetch(`${API_CONFIG.workerUrl}/api/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: credentials.apiToken })
      });

      const data = await response.json();
      Utils.hideLoading();

      if (data.success) {
        Utils.showAlert(`
          <strong>✅ Connection Successful!</strong><br>
          Successfully connected to Hostinger API.
          ${data.user ? `<br>Account: ${data.user.email || 'N/A'}` : ''}
        `, 'success');
      } else {
        Utils.showAlert(`
          <strong>❌ Connection Failed</strong><br>
          ${Utils.sanitize(data.error || 'Unknown error')}
        `, 'error');
      }
    } else {
      // Demo mode
      await new Promise(resolve => setTimeout(resolve, 1500));
      Utils.hideLoading();

      if (credentials.apiToken && credentials.apiToken.length >= 20) {
        Utils.showAlert(`
          <strong>✅ Demo Mode - Connection Simulated</strong><br>
          API Token format looks valid. In production, this would verify against Hostinger API.
          <br><br>
          <strong>Token:</strong> ****${credentials.apiToken.slice(-8)}
        `, 'success');
      } else {
        Utils.showAlert(`
          <strong>⚠️ Invalid Token Format</strong><br>
          API token should be at least 20 characters. Get your token from Hostinger Dashboard > Account Settings > API.
        `, 'warning');
      }
    }
  } catch (error) {
    Utils.hideLoading();
    Utils.showAlert(`<strong>❌ Error</strong><br>${Utils.sanitize(error.message)}`, 'error');
  } finally {
    testBtn.disabled = false;
    testBtnText.textContent = originalText;
    testBtnIcon.textContent = originalIcon;
    validateCredentials();
  }
}

/**
 * Connect to provider
 */
async function connectToProvider() {
  if (!selectedProvider || !validateCredentials()) return;

  const connectBtn = document.getElementById('connectBtn');
  const connectBtnText = document.getElementById('connectBtnText');
  const connectBtnIcon = document.getElementById('connectBtnIcon');

  const originalText = connectBtnText.textContent;
  const originalIcon = connectBtnIcon.textContent;

  try {
    Utils.toggleFormElements('credentialsForm', true);
    connectBtnText.textContent = 'Connecting...';
    connectBtnIcon.innerHTML = '<div class="loading"></div>';

    Utils.showLoading(`Connecting to ${selectedProvider.name}...`);

    const credentials = getCredentials();

    if (API_CONFIG.workerUrl && !API_CONFIG.demoMode) {
      // Real API call
      const response = await fetch(`${API_CONFIG.workerUrl}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: credentials.apiToken })
      });

      const data = await response.json();
      Utils.hideLoading();

      if (data.success) {
        Utils.showAlert(`
          <strong>✅ Connected to Hostinger!</strong><br>
          Ready to scan your sites.
        `, 'success');

        displayConnectionStatus({
          provider: 'Hostinger',
          serverInfo: {
            username: data.user?.email || 'User',
            email: data.user?.email || 'N/A',
            subscriptions: data.subscriptions?.length || 0
          }
        });

        // Save to localStorage
        Utils.setStorage('migration_provider', {
          id: selectedProvider.id,
          name: selectedProvider.name,
          apiToken: credentials.apiToken, // Stored for subsequent API calls
          user: data.user
        });

        Utils.toggleElement('nextStepBtn', true);
      } else {
        Utils.showAlert(`<strong>❌ Connection Failed</strong><br>${Utils.sanitize(data.error)}`, 'error');
        Utils.toggleFormElements('credentialsForm', false);
        connectBtnText.textContent = originalText;
        connectBtnIcon.textContent = originalIcon;
      }
    } else {
      // Demo mode
      await new Promise(resolve => setTimeout(resolve, 2000));
      Utils.hideLoading();

      if (credentials.apiToken && credentials.apiToken.length >= 20) {
        Utils.showAlert(`
          <strong>✅ Demo Mode - Connected!</strong><br>
          In production, you would now be connected to Hostinger and ready to scan sites.
        `, 'success');

        displayConnectionStatus({
          provider: 'Hostinger',
          serverInfo: {
            username: 'demo_user',
            email: 'demo@example.com',
            subscriptions: 2
          }
        });

        Utils.setStorage('migration_provider', {
          id: selectedProvider.id,
          name: selectedProvider.name,
          apiToken: credentials.apiToken,
          demo: true
        });

        Utils.toggleElement('nextStepBtn', true);
      } else {
        Utils.showAlert(`<strong>❌ Invalid Token</strong><br>Please enter a valid API token.`, 'error');
        Utils.toggleFormElements('credentialsForm', false);
        connectBtnText.textContent = originalText;
        connectBtnIcon.textContent = originalIcon;
      }
    }
  } catch (error) {
    Utils.hideLoading();
    Utils.showAlert(`<strong>❌ Error</strong><br>${Utils.sanitize(error.message)}`, 'error');
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

  Utils.toggleElement('connectionStatus', true);
  statusProvider.textContent = response.provider || 'N/A';

  if (response.serverInfo) {
    statusUsername.textContent = response.serverInfo.username || 'N/A';
    statusEmail.textContent = response.serverInfo.email || 'N/A';
    statusDisk.textContent = response.serverInfo.subscriptions
      ? `${response.serverInfo.subscriptions} subscription(s)`
      : 'N/A';
  }

  statusCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
