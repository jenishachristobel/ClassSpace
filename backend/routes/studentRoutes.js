const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Student routes require student role
router.use(authenticateToken);
router.use(requireRole('student'));

router.get('/dashboard', studentController.getStudentDashboard);
router.get('/subjects', studentController.getMySubjects);
router.get('/subjects/:subjectId', studentController.getSubjectDetail);
router.get('/assignments', studentController.getStudentAssignments);
router.get('/submissions', studentController.getStudentSubmissions);
router.get('/assignments/:assignmentId', studentController.getAssignmentDetail);
router.post('/assignments/:assignmentId/submit', upload.single('document'), studentController.submitAssignment);
router.post('/assignments/:assignmentId/submissions', upload.single('document'), studentController.submitAssignment);
router.get('/grades', studentController.getStudentGrades);
router.get('/calendar', studentController.getStudentCalendar);

module.exports = router;

