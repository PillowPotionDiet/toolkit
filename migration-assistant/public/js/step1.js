/**
 * Step 1 - Old Account Connection
 * Static version with embedded provider data
 * Only Hostinger is currently functional
 */

// Embedded provider configuration
const PROVIDERS = {
  hostinger: {
    id: 'hostinger',
    name: 'Hostinger',
    type: 'cpanel',
    enabled: true,
    notes: 'Hostinger uses hPanel which provides cPanel-compatible API access.',
    features: ['cPanel API', 'File Manager', 'MySQL', 'Email'],
    credentialFields: [
      {
        name: 'hostname',
        label: 'cPanel/hPanel URL',
        type: 'url',
        placeholder: 'https://your-server.hostinger.com:2083',
        required: true
      },
      {
        name: 'username',
        label: 'cPanel Username',
        type: 'text',
        placeholder: 'Your cPanel username',
        required: true
      },
      {
        name: 'apiToken',
        label: 'API Token',
        type: 'password',
        placeholder: 'Your cPanel API token',
        required: true
      }
    ],
    helpUrl: 'https://support.hostinger.com/en/articles/1583249-how-to-create-an-api-token-on-hpanel'
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
});

/**
 * Update provider dropdown with Coming Soon labels
 */
function updateProviderDropdown() {
  const select = document.getElementById('providerSelect');
  if (!select) return;

  // Clear existing options except the first one
  select.innerHTML = '<option value="">-- Choose Provider --</option>';

  // Add cPanel providers group
  const cpanelGroup = document.createElement('optgroup');
  cpanelGroup.label = 'Popular cPanel Hosts';

  const cpanelProviders = ['hostinger', 'bluehost', 'siteground', 'godaddy-cpanel', 'hostgator',
    'namecheap-cpanel', 'a2hosting', 'inmotion', 'dreamhost', 'ipage', 'greengeeks',
    'hostwinds', 'interserver', 'cpanel-generic'];

  cpanelProviders.forEach(id => {
    const provider = PROVIDERS[id];
    const option = document.createElement('option');
    option.value = id;

    if (provider.enabled) {
      option.textContent = provider.name;
    } else {
      option.textContent = `${provider.name} (Coming Soon)`;
      option.disabled = true;
      option.style.color = '#999';
    }

    cpanelGroup.appendChild(option);
  });

  select.appendChild(cpanelGroup);

  // Add other control panels group
  const otherGroup = document.createElement('optgroup');
  otherGroup.label = 'Other Control Panels';

  const otherProviders = ['plesk', 'directadmin', 'cloudways', 'godaddy-plesk', 'namecheap-directadmin'];

  otherProviders.forEach(id => {
    const provider = PROVIDERS[id];
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${provider.name} (Coming Soon)`;
    option.disabled = true;
    option.style.color = '#999';
    otherGroup.appendChild(option);
  });

  select.appendChild(otherGroup);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const providerSelect = document.getElementById('providerSelect');
  const credentialsForm = document.getElementById('credentialsForm');
  const testConnectionBtn = document.getElementById('testConnectionBtn');

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
  const provider = PROVIDERS[providerId];

  if (!provider) {
    Utils.showAlert('Provider not found', 'error');
    return;
  }

  if (!provider.enabled) {
    Utils.showAlert(`
      <strong>Coming Soon</strong><br>
      ${provider.name} support is coming in a future update. Currently only <strong>Hostinger</strong> is fully supported.
    `, 'warning');
    return;
  }

  selectedProvider = provider;

  // Show provider info
  displayProviderInfo(provider);

  // Build credential form
  buildCredentialForm(provider);

  // Show form
  Utils.toggleElement('credentialsForm', true);
  Utils.toggleElement('notImplementedWarning', false);

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
  const providerLogo = document.getElementById('providerLogo');
  const providerName = document.getElementById('providerName');
  const providerNotes = document.getElementById('providerNotes');
  const providerFeatures = document.getElementById('providerFeatures');

  // Show provider info card
  Utils.toggleElement('providerInfo', true);

  // Set provider name
  providerName.textContent = provider.name;

  // Set provider logo
  const logoColors = {
    hostinger: '#673DE6'
  };

  providerLogo.innerHTML = `
    <div style="width: 60px; height: 60px; background: ${logoColors[provider.id] || 'var(--bg-tertiary)'}; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; font-weight: bold;">
      ${provider.name.charAt(0)}
    </div>
  `;

  // Set provider notes
  providerNotes.textContent = provider.notes || 'No additional notes.';

  // Set provider features
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
  if (!selectedProvider) return false;

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
 * Test connection - Static demo mode
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

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    Utils.hideLoading();

    // For demo: validate that fields look reasonable
    const hostnameValid = credentials.hostname && credentials.hostname.includes('http');
    const usernameValid = credentials.username && credentials.username.length >= 3;
    const tokenValid = credentials.apiToken && credentials.apiToken.length >= 10;

    if (hostnameValid && usernameValid && tokenValid) {
      Utils.showAlert(`
        <strong>Connection Test Mode</strong><br>
        This is a demo version. In the full version, your credentials would be validated against ${selectedProvider.name}'s API.
        <br><br>
        <strong>Your entered details:</strong><br>
        - Host: ${Utils.sanitize(credentials.hostname)}<br>
        - Username: ${Utils.sanitize(credentials.username)}<br>
        - API Token: ****${credentials.apiToken.slice(-4)}
      `, 'info');
    } else {
      Utils.showAlert(`
        <strong>Invalid Credentials Format</strong><br>
        Please check your inputs:<br>
        ${!hostnameValid ? '- Hostname should be a valid URL (e.g., https://server.hostinger.com:2083)<br>' : ''}
        ${!usernameValid ? '- Username should be at least 3 characters<br>' : ''}
        ${!tokenValid ? '- API Token should be at least 10 characters<br>' : ''}
      `, 'warning');
    }
  } catch (error) {
    Utils.hideLoading();
    Utils.showAlert(`
      <strong>Error</strong><br>
      ${Utils.sanitize(error.message)}
    `, 'error');
  } finally {
    // Restore button state
    testBtn.disabled = false;
    testBtnText.textContent = originalText;
    testBtnIcon.textContent = originalIcon;
    validateCredentials();
  }
}

/**
 * Connect to provider - Static demo mode
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

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    Utils.hideLoading();

    // For demo: validate that fields look reasonable
    const hostnameValid = credentials.hostname && credentials.hostname.includes('http');
    const usernameValid = credentials.username && credentials.username.length >= 3;
    const tokenValid = credentials.apiToken && credentials.apiToken.length >= 10;

    if (hostnameValid && usernameValid && tokenValid) {
      // Show success message
      Utils.showAlert(`
        <strong>Demo Mode - Connection Simulated</strong><br>
        In the full version, you would now be connected to ${selectedProvider.name} and ready to scan your sites.
        <br><br>
        <em>Backend server required for actual connection functionality.</em>
      `, 'success');

      // Display connection status (simulated)
      displayConnectionStatus({
        provider: selectedProvider.name,
        serverInfo: {
          username: credentials.username,
          email: `${credentials.username}@example.com`,
          diskUsed: '2500000',
          diskLimit: '10000000'
        }
      });

      // Show next step button
      Utils.toggleElement('nextStepBtn', true);

      // Save state to localStorage
      Utils.setStorage('migration_provider', {
        id: selectedProvider.id,
        name: selectedProvider.name,
        demo: true
      });
    } else {
      Utils.showAlert(`
        <strong>Invalid Credentials Format</strong><br>
        Please ensure all fields are filled correctly.
      `, 'error');

      // Re-enable form
      Utils.toggleFormElements('credentialsForm', false);
      connectBtnText.textContent = originalText;
      connectBtnIcon.textContent = originalIcon;
    }
  } catch (error) {
    Utils.hideLoading();
    Utils.showAlert(`
      <strong>Error</strong><br>
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
