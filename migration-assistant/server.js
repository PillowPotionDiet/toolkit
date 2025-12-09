/**
 * Main Express Server with WebSocket support
 * Website Migration Assistant
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Import middleware
const SessionManager = require('./middleware/sessionManager');
const ErrorHandler = require('./middleware/errorHandler');
const RateLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Import routes
const apiRoutes = require('./routes/api');

// Create Express app
const app = express();
const server = http.createServer(app);

// Create Socket.IO instance
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST']
  },
  pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 25000,
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 60000
});

// ========== Middleware ==========

// Security headers
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}));

// CORS
app.use(cors());

// Compression
app.use(compression());

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session management
app.use(SessionManager.createSessionMiddleware());

// Rate limiting
app.use(RateLimiter.createGeneralLimiter());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ========== Routes ==========

// API routes
app.use('/api', apiRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/step1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'step1.html'));
});

app.get('/step2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'step2.html'));
});

app.get('/step3', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'step3.html'));
});

app.get('/step4', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'step4.html'));
});

app.get('/step5', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'step5.html'));
});

app.get('/step6', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'step6.html'));
});

app.get('/step7', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'step7.html'));
});

// ========== Error Handling ==========

// 404 handler
app.use(ErrorHandler.notFound);

// Global error handler
app.use(ErrorHandler.handleError);

// ========== WebSocket Connection ==========

io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  // Join session room
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    logger.info(`Client ${socket.id} joined session ${sessionId}`);
  });

  // Handle migration progress updates
  socket.on('request-progress', (sessionId) => {
    // Progress updates will be sent from migration process
    logger.info(`Progress requested for session ${sessionId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });

  // Heartbeat
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Make io accessible to routes (for progress updates)
app.set('io', io);

// ========== Server Startup ==========

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`
=====================================
  Website Migration Assistant
=====================================
  Server running on: http://localhost:${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  Phase: 1 (Step 1 Implemented)
=====================================
  `);

  console.log(`
🚀 Server is running!

📍 URL: http://localhost:${PORT}
🌐 Environment: ${process.env.NODE_ENV || 'development'}
📝 Logs: ./logs/

Available endpoints:
  • GET  /           - Home page
  • GET  /step1      - Old account connection
  • POST /api/connect-old - Connect to old hosting
  • GET  /api/providers   - Get all providers
  • GET  /api/health      - Health check

Press Ctrl+C to stop the server
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app, server, io };
