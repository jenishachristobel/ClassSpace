const express = require('express');
const cors = require('cors');
const path = require('path');
const env = require('./config/env');
const { initializeDatabase } = require('./db/init');

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const plagiarismRoutes = require('./routes/plagiarismRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const fileController = require('./controllers/fileController');
const { authenticateToken } = require('./middleware/authMiddleware');

const app = express();

// Allowed frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
  'https://class-space-dusky.vercel.app'
];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ClassSpace Centralized Classroom Management Platform',
    version: '1.0.0'
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/plagiarism', plagiarismRoutes);
app.use('/api/notifications', notificationRoutes);

// Submission file download
app.get(
  '/api/submissions/:submissionId/file',
  authenticateToken,
  fileController.downloadSubmissionFile
);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err);

  const status = err.status || 500;

  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint '" + req.originalUrl + "' not found."
  });
});

// Server configuration
let server = null;
let mockPlagiarismServerStarted = false;

function startServer(port = env.PORT) {
  if (server) {
    return server;
  }

  server = app.listen(port, () => {
    console.log('=======================================================');
    console.log('[ClassSpace API] Server listening on port ' + port);
    console.log('[ClassSpace API] Database client: ' + env.DB_CLIENT);
    console.log('=======================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('[ClassSpace API] Port ' + port + ' is already in use.');
    } else {
      console.error('[ClassSpace API] Server error:', err);
    }
  });

  // Optional mock plagiarism service
  if (
    process.env.NODE_ENV !== 'test' &&
    process.env.ENABLE_MOCK_PLAGIARISM === 'true' &&
    !mockPlagiarismServerStarted
  ) {
    try {
      const mockPlagiarism = require('./mock-plagiarism-service/server');

      if (mockPlagiarism.startServer) {
        mockPlagiarism.startServer();
        mockPlagiarismServerStarted = true;
      }
    } catch (err) {
      console.error(
        '[ClassSpace] Mock plagiarism service could not start:',
        err.message
      );
    }
  }

  app.server = server;
  return server;
}

// Initialize database before starting the API
if (process.env.NODE_ENV !== 'test') {
  initializeDatabase()
    .then(() => {
      console.log('[ClassSpace] Database initialization completed.');
      startServer();
    })
    .catch((err) => {
      console.error('[ClassSpace] Database initialization failure:', err);
      process.exit(1);
    });
}

// Close server
function closeServer() {
  if (server) {
    server.close();
    server = null;
    app.server = null;
  }
}

app.startServer = startServer;
app.closeServer = closeServer;

module.exports = app;