/**
 * ProgressTracker - Real-time progress tracking for migrations
 * Emits events for WebSocket updates
 */

const EventEmitter = require('events');

class ProgressTracker extends EventEmitter {
  constructor(sessionId) {
    super();
    this.sessionId = sessionId;
    this.migrations = new Map(); // Map of siteName -> progress data
    this.overallProgress = {
      totalSites: 0,
      completedSites: 0,
      failedSites: 0,
      currentSite: null,
      startTime: null,
      endTime: null,
      status: 'idle' // idle, running, paused, completed, failed
    };
  }

  /**
   * Initialize tracking for multiple sites
   * @param {Array<string>} siteNames - List of site names to track
   */
  initializeSites(siteNames) {
    this.overallProgress.totalSites = siteNames.length;
    this.overallProgress.startTime = Date.now();
    this.overallProgress.status = 'running';

    for (const siteName of siteNames) {
      this.migrations.set(siteName, {
        siteName: siteName,
        status: 'pending', // pending, in_progress, completed, failed
        progress: 0,
        currentOperation: null,
        startTime: null,
        endTime: null,
        error: null,
        operations: {
          createDomain: { status: 'pending', progress: 0 },
          downloadFiles: { status: 'pending', progress: 0 },
          exportDatabase: { status: 'pending', progress: 0 },
          uploadFiles: { status: 'pending', progress: 0 },
          importDatabase: { status: 'pending', progress: 0 },
          configure: { status: 'pending', progress: 0 }
        }
      });
    }

    this.emitUpdate();
  }

  /**
   * Start tracking a specific site
   * @param {string} siteName - Site name
   */
  startSite(siteName) {
    const migration = this.migrations.get(siteName);
    if (!migration) return;

    migration.status = 'in_progress';
    migration.startTime = Date.now();
    this.overallProgress.currentSite = siteName;

    this.emitUpdate();
  }

  /**
   * Update operation progress for a site
   * @param {string} siteName - Site name
   * @param {string} operation - Operation name
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Optional status message
   */
  updateOperation(siteName, operation, progress, message = null) {
    const migration = this.migrations.get(siteName);
    if (!migration) return;

    migration.currentOperation = operation;
    migration.operations[operation].status = 'in_progress';
    migration.operations[operation].progress = progress;

    // Calculate overall site progress based on operation weights
    const weights = {
      createDomain: 5,
      downloadFiles: 30,
      exportDatabase: 15,
      uploadFiles: 30,
      importDatabase: 15,
      configure: 5
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let weightedProgress = 0;

    for (const [op, weight] of Object.entries(weights)) {
      weightedProgress += (migration.operations[op].progress * weight) / totalWeight;
    }

    migration.progress = Math.round(weightedProgress);

    this.emitUpdate({
      type: 'operation',
      siteName,
      operation,
      progress,
      message
    });
  }

  /**
   * Complete an operation
   * @param {string} siteName - Site name
   * @param {string} operation - Operation name
   */
  completeOperation(siteName, operation) {
    const migration = this.migrations.get(siteName);
    if (!migration) return;

    migration.operations[operation].status = 'completed';
    migration.operations[operation].progress = 100;

    this.emitUpdate({
      type: 'operation_complete',
      siteName,
      operation
    });
  }

  /**
   * Mark a site as completed
   * @param {string} siteName - Site name
   */
  completeSite(siteName) {
    const migration = this.migrations.get(siteName);
    if (!migration) return;

    migration.status = 'completed';
    migration.progress = 100;
    migration.endTime = Date.now();
    migration.currentOperation = null;

    this.overallProgress.completedSites++;

    this.emitUpdate({
      type: 'site_complete',
      siteName
    });

    // Check if all sites are done
    if (this.overallProgress.completedSites + this.overallProgress.failedSites === this.overallProgress.totalSites) {
      this.completeAll();
    }
  }

  /**
   * Mark a site as failed
   * @param {string} siteName - Site name
   * @param {string} error - Error message
   */
  failSite(siteName, error) {
    const migration = this.migrations.get(siteName);
    if (!migration) return;

    migration.status = 'failed';
    migration.endTime = Date.now();
    migration.error = error;

    this.overallProgress.failedSites++;

    this.emitUpdate({
      type: 'site_failed',
      siteName,
      error
    });

    // Check if all sites are done
    if (this.overallProgress.completedSites + this.overallProgress.failedSites === this.overallProgress.totalSites) {
      this.completeAll();
    }
  }

  /**
   * Complete all migrations
   */
  completeAll() {
    this.overallProgress.status = 'completed';
    this.overallProgress.endTime = Date.now();
    this.overallProgress.currentSite = null;

    this.emitUpdate({
      type: 'all_complete'
    });
  }

  /**
   * Pause migration
   */
  pause() {
    this.overallProgress.status = 'paused';
    this.emitUpdate({ type: 'paused' });
  }

  /**
   * Resume migration
   */
  resume() {
    this.overallProgress.status = 'running';
    this.emitUpdate({ type: 'resumed' });
  }

  /**
   * Get current state
   */
  getState() {
    return {
      sessionId: this.sessionId,
      overall: this.overallProgress,
      migrations: Array.from(this.migrations.values()),
      estimatedTimeRemaining: this.calculateETA()
    };
  }

  /**
   * Calculate estimated time remaining
   */
  calculateETA() {
    if (this.overallProgress.completedSites === 0) {
      return null;
    }

    const elapsed = Date.now() - this.overallProgress.startTime;
    const avgTimePerSite = elapsed / this.overallProgress.completedSites;
    const remainingSites = this.overallProgress.totalSites - this.overallProgress.completedSites - this.overallProgress.failedSites;

    return avgTimePerSite * remainingSites;
  }

  /**
   * Emit update event
   */
  emitUpdate(additionalData = {}) {
    this.emit('update', {
      ...this.getState(),
      ...additionalData
    });
  }

  /**
   * Format time duration
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted duration
   */
  static formatDuration(ms) {
    if (!ms) return 'Unknown';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

module.exports = ProgressTracker;
