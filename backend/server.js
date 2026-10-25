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

// Initialize DB schema
try {
  initializeDatabase();
} catch (err) {
  console.error('[ClassSpace] Database initialization failure:', err);
}

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5001'],
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ClassSpace Centralized Classroom Management Platform',
    version: '1.0.0'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/plagiarism', plagiarismRoutes);
app.use('/api/notifications', notificationRoutes);

// Direct authenticated submission file download & browser preview
app.get('/api/submissions/:submissionId/file', authenticateToken, fileController.downloadSubmissionFile);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Start Main API Server
let server = null;

function startServer(port = env.PORT) {
  if (server) return server;
  server = app.listen(port, () => {
    console.log(`=======================================================`);
    console.log(`[ClassSpace API] Server running on http://localhost:${port}`);
    console.log(`[ClassSpace API] Database client: ${env.DB_CLIENT}`);
    console.log(`=======================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[ClassSpace API] Port ${port} is already active; reusing existing instance.`);
    }
  });

  // Also launch the mock external plagiarism service on port 5001 if enabled (skip in test mode)
  if (process.env.NODE_ENV !== 'test') {
    try {
      const mockPlag = require('./mock-plagiarism-service/server');
      if (mockPlag.startServer) mockPlag.startServer();
    } catch (e) {
      console.log('[Notice] Mock plagiarism service initialization note:', e.message);
    }
  }

  app.server = server;
  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

function closeServer() {
  if (server) {
    server.close();
    server = null;
  }
}

app.startServer = startServer;
app.closeServer = closeServer;

module.exports = app;
