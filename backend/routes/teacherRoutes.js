const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Teacher routes require teacher role
router.use(authenticateToken);
router.use(requireRole('teacher'));

router.get('/dashboard', teacherController.getTeacherDashboard);
router.get('/subjects', teacherController.getMySubjects);
router.get('/subjects/:subjectId', teacherController.getSubjectDetail);
router.post('/assignments', teacherController.createAssignment);
router.post('/announcements', teacherController.postAnnouncement);
router.post('/materials', upload.single('material'), teacherController.addMaterial);

// Submissions review & grading
router.get('/submissions', teacherController.getAllTeacherSubmissions);
router.get('/assignments/:assignmentId/submissions', teacherController.getAssignmentSubmissions);
router.post('/submissions/:submissionId/grade', teacherController.gradeSubmission);
router.post('/submissions/:submissionId/grades', teacherController.gradeSubmission);
router.post('/submissions/:submissionId/request-resubmission', teacherController.requestResubmission);
router.get('/gradebook', teacherController.getGradebook);

module.exports = router;

