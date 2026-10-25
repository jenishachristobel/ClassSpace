const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All admin routes require authentication and 'admin' role
router.use(authenticateToken);
router.use(requireRole('admin'));

// Dashboard Stats
router.get('/dashboard-stats', adminController.getDashboardStats);

// Manage Students
router.get('/students', adminController.getStudents);
router.post('/students', adminController.createStudent);
router.put('/students/:id', adminController.updateStudent);
router.get('/students/:id/enrollments', adminController.getStudentEnrollments);
router.post('/students/:id/enrollments', adminController.enrollStudentInSubject);
router.delete('/students/:id/enrollments/:subjectId', adminController.unenrollStudentFromSubject);

// Manage Teachers
router.get('/teachers', adminController.getTeachers);
router.post('/teachers', adminController.createTeacher);
router.put('/teachers/:id', adminController.updateTeacher);
router.get('/teachers/:id/assignments', adminController.getTeacherAssignments);
router.post('/teachers/:id/assignments', adminController.assignTeacherToSubject);
router.delete('/teachers/:id/assignments/:subjectId', adminController.removeTeacherFromSubject);

// Manage Subjects
router.get('/subjects', adminController.getSubjects);
router.post('/subjects', adminController.createSubject);
router.put('/subjects/:id', adminController.updateSubject);
router.delete('/subjects/:id', adminController.deleteSubject);

// Manage Classes
router.get('/classes', adminController.getClasses);
router.post('/classes', adminController.createClass);

// Assignments, Audit Logs & Login Activity
router.get('/all-assignments', adminController.getAllAssignments);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/login-activity', adminController.getLoginActivityLogs);
router.get('/login-summary', adminController.getLoginSummary);

module.exports = router;
