/**
 * Main Application JavaScript
 * Global functionality and utilities
 */

// Global app state
const App = {
  version: '1.0.0',
  phase: 'Phase 1',
  socket: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  console.log(`Website Migration Assistant v${App.version} - ${App.phase}`);

  // Check for WebSocket support (only when backend is running)
  if (typeof io !== 'undefined') {
    initializeWebSocket();
  }

  // Auto-save session periodically (only if Utils is available)
  if (typeof Utils !== 'undefined') {
    startAutoSave();
  }
});

/**
 * Initialize WebSocket connection
 */
function initializeWebSocket() {
  try {
    App.socket = io();

    App.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    App.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    App.socket.on('progress-update', (data) => {
      console.log('Progress update:', data);
      // Handle progress updates (will be used in Step 4)
    });
  } catch (error) {
    console.error('WebSocket initialization failed:', error);
  }
}

/**
 * Start auto-save timer
 */
function startAutoSave() {
  // Save session state every 30 seconds
  setInterval(() => {
    if (typeof Utils !== 'undefined' && Utils.setStorage) {
      const state = {
        timestamp: Date.now(),
        path: window.location.pathname
      };
      Utils.setStorage('migration_session', state);
    }
  }, 30000);
}

// Make App available globally
window.App = App;
