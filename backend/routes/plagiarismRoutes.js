const express = require('express');
const router = express.Router();
const plagiarismController = require('../controllers/plagiarismController');
const fileController = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Teacher / Admin only: Generate secure signed launch token
router.post('/launch-token', authenticateToken, requireRole('teacher', 'admin'), plagiarismController.generateLaunchToken);

// Teacher / Admin only: Verify external service health status
router.get('/service-status', authenticateToken, requireRole('teacher', 'admin'), plagiarismController.checkServiceStatus);

// Reports query for a submission
router.get('/reports/:submissionId', authenticateToken, requireRole('teacher', 'admin'), plagiarismController.getReportForSubmission);

// Secure file access for review
router.get('/submissions/:submissionId/file', authenticateToken, fileController.downloadSubmissionFile);

// External Integration Endpoints (used by external plagiarism service)
router.get('/validate-token', plagiarismController.validateToken);
router.get('/document-text/:tokenId/:submissionId', plagiarismController.getDocumentText);
router.post('/callback', plagiarismController.recordReportCallback);

module.exports = router;
