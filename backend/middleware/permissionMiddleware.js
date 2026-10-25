const db = require('../config/database');

/**
 * Ensures the authenticated teacher is assigned to the subject in req.params.subjectId
 */
function requireTeacherSubjectAccess(req, res, next) {
  if (req.user.role === 'admin') {
    return next(); // Admin has central authority
  }

  if (req.user.role !== 'teacher' || !req.user.teacherId) {
    return res.status(403).json({ success: false, message: 'Teacher credentials required.' });
  }

  const subjectId = req.params.subjectId || req.body.subjectId;
  if (!subjectId) {
    return res.status(400).json({ success: false, message: 'Subject ID parameter is required.' });
  }

  const assignment = db.get(
    'SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?',
    [req.user.teacherId, subjectId]
  );

  if (!assignment) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You are not assigned to teach this subject.'
    });
  }

  next();
}

/**
 * Ensures the authenticated student is enrolled in the subject in req.params.subjectId
 */
function requireStudentSubjectAccess(req, res, next) {
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role !== 'student' || !req.user.studentId) {
    return res.status(403).json({ success: false, message: 'Student credentials required.' });
  }

  const subjectId = req.params.subjectId || req.body.subjectId;
  if (!subjectId) {
    return res.status(400).json({ success: false, message: 'Subject ID parameter is required.' });
  }

  const enrollment = db.get(
    'SELECT id, status FROM student_enrollments WHERE student_id = ? AND subject_id = ? AND status = "enrolled"',
    [req.user.studentId, subjectId]
  );

  if (!enrollment) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You are not enrolled in this subject.'
    });
  }

  next();
}

/**
 * Ensures the teacher is authorized to access the specific assignment in req.params.assignmentId
 */
function requireTeacherAssignmentAccess(req, res, next) {
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role !== 'teacher' || !req.user.teacherId) {
    return res.status(403).json({ success: false, message: 'Teacher credentials required.' });
  }

  const assignmentId = req.params.assignmentId || req.body.assignmentId;
  if (!assignmentId) {
    return res.status(400).json({ success: false, message: 'Assignment ID parameter is required.' });
  }

  const assignment = db.get(
    `SELECT a.id, a.subject_id, a.teacher_id, s.name as subject_name
     FROM assignments a
     JOIN subjects s ON a.subject_id = s.id
     JOIN teacher_subject_assignments tsa ON tsa.subject_id = a.subject_id
     WHERE a.id = ? AND tsa.teacher_id = ?`,
    [assignmentId, req.user.teacherId]
  );

  if (!assignment) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You are not authorized to view or manage this assignment.'
    });
  }

  req.assignmentContext = assignment;
  next();
}

module.exports = {
  requireTeacherSubjectAccess,
  requireStudentSubjectAccess,
  requireTeacherAssignmentAccess
};

