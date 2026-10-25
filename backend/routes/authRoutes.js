const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Standard credentials login (Demo / Admin / Faculty)
router.post('/login', authController.login);

// Real Student Institutional Logins (@karunya.edu.in)
router.post('/google-student-login', authController.googleStudentLogin);
router.post('/request-institutional-otp', authController.requestInstitutionalOtp);
router.post('/verify-institutional-otp', authController.verifyInstitutionalOtp);

// Session & Profile
router.get('/me', authenticateToken, authController.getMe);
router.post('/forgot-password', authController.forgotPassword);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
