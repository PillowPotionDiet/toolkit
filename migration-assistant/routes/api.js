/**
 * Main API Router - Combines all route modules
 */

const express = require('express');
const router = express.Router();

// Import route modules
const step1Routes = require('./step1');
// Step 2-7 routes will be added in later phases

// Mount routes
router.use('/', step1Routes); // Step 1 routes
// router.use('/', step2Routes); // Coming in Phase 2
// router.use('/', step3Routes); // Coming in Phase 3
// router.use('/', step4Routes); // Coming in Phase 4
// router.use('/', step5Routes); // Coming in Phase 5
// router.use('/', step6Routes); // Coming in Phase 6
// router.use('/', step7Routes); // Coming in Phase 7

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API info endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'Website Migration Assistant API',
    version: '1.0.0',
    phase: 'Phase 1 - Step 1 Implemented',
    endpoints: {
      step1: [
        'POST /api/connect-old',
        'GET /api/providers',
        'GET /api/providers/:providerId',
        'POST /api/test-connection',
        'GET /api/connection-status'
      ]
    }
  });
});

module.exports = router;
