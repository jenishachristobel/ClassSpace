const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { logAuditAction } = require('../middleware/auditMiddleware');
const { createNotification, broadcastToUser } = require('../services/realtimeService');

// Student Dashboard Overview
async function getStudentDashboard(req, res) {
  try {
    const studentId = req.user.studentId;
    if (!studentId) {
      return res.status(403).json({ success: false, message: 'Student profile not linked.' });
    }

    // 1. Enrolled Subjects
    const enrolledSubjects = db.query(
      `SELECT s.id, s.code, s.name, s.department, s.color, s.icon,
              (SELECT COUNT(*) FROM assignments a WHERE a.subject_id = s.id AND a.status = 'published') as total_assignments,
              (SELECT COUNT(*) FROM assignments a
               WHERE a.subject_id = s.id AND a.status = 'published'
               AND a.id NOT IN (SELECT sub.assignment_id FROM submissions sub WHERE sub.student_id = ?)) as pending_assignments
       FROM student_enrollments se
       JOIN subjects s ON se.subject_id = s.id
       WHERE se.student_id = ? AND se.status = 'enrolled'`,
      [studentId, studentId]
    );

    // 2. Pending Assignments across enrolled subjects
    const pendingAssignments = db.query(
      `SELECT a.id, a.title, a.due_date, a.max_marks, a.subject_id,
              s.name as subject_name, s.code as subject_code, s.color
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       JOIN student_enrollments se ON se.subject_id = s.id AND se.student_id = ? AND se.status = 'enrolled'
       WHERE a.status = 'published'
         AND a.id NOT IN (SELECT sub.assignment_id FROM submissions sub WHERE sub.student_id = ?)
       ORDER BY a.due_date ASC
       LIMIT 6`,
      [studentId, studentId]
    );

    // 3. Recently Submitted Assignments
    const recentSubmissions = db.query(
      `SELECT sub.id, sub.submitted_at, sub.status, sub.version,
              a.id as assignment_id, a.title as assignment_title, a.max_marks,
              s.name as subject_name, s.code as subject_code, s.color,
              g.marks_obtained, g.is_published
       FROM submissions sub
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN subjects s ON a.subject_id = s.id
       LEFT JOIN grades g ON g.submission_id = sub.id
       WHERE sub.student_id = ?
       ORDER BY sub.submitted_at DESC
       LIMIT 5`,
      [studentId]
    );

    // 4. Recently Published Grades
    const recentGrades = db.query(
      `SELECT g.id, g.marks_obtained, g.feedback, g.published_at,
              a.id as assignment_id, a.title as assignment_title, a.max_marks,
              s.name as subject_name, s.code as subject_code, s.color
       FROM grades g
       JOIN submissions sub ON g.submission_id = sub.id
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN subjects s ON a.subject_id = s.id
       WHERE sub.student_id = ? AND g.is_published = 1
       ORDER BY g.published_at DESC
       LIMIT 5`,
      [studentId]
    );

    // 5. Announcements from enrolled subjects
    const announcements = db.query(
      `SELECT an.id, an.title, an.content, an.created_at,
              s.name as subject_name, s.code as subject_code, s.color,
              u.first_name || ' ' || u.last_name as author_name
       FROM announcements an
       JOIN subjects s ON an.subject_id = s.id
       JOIN student_enrollments se ON se.subject_id = s.id AND se.student_id = ? AND se.status = 'enrolled'
       JOIN users u ON an.author_id = u.id
       ORDER BY an.created_at DESC
       LIMIT 6`,
      [studentId]
    );

    return res.json({
      success: true,
      stats: {
        enrolledSubjectsCount: enrolledSubjects.length,
        pendingAssignmentsCount: pendingAssignments.length,
        submittedCount: recentSubmissions.length,
        gradedCount: recentGrades.length
      },
      enrolledSubjects,
      pendingAssignments,
      recentSubmissions,
      recentGrades,
      announcements
    });
  } catch (err) {
    console.error('[Student] getStudentDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load student dashboard.' });
  }
}

// My Subjects (strictly personalized to the enrolled student)
async function getMySubjects(req, res) {
  try {
    const studentId = req.user.studentId;

    const subjects = db.query(
      `SELECT s.id, s.code, s.name, s.department, s.description, s.credits, s.color, s.icon,
              se.enrolled_at,
              (SELECT COUNT(*) FROM assignments a WHERE a.subject_id = s.id AND a.status = 'published') as assignment_count,
              (SELECT COUNT(*) FROM assignments a
               WHERE a.subject_id = s.id AND a.status = 'published'
               AND a.id NOT IN (SELECT sub.assignment_id FROM submissions sub WHERE sub.student_id = ?)) as pending_count,
              (SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name, ', ')
               FROM teacher_subject_assignments tsa
               JOIN teachers t ON tsa.teacher_id = t.id
               JOIN users u ON t.user_id = u.id
               WHERE tsa.subject_id = s.id) as teacher_name,
              (SELECT an.title FROM announcements an WHERE an.subject_id = s.id ORDER BY an.created_at DESC LIMIT 1) as latest_announcement,
              (SELECT an.created_at FROM announcements an WHERE an.subject_id = s.id ORDER BY an.created_at DESC LIMIT 1) as latest_announcement_date
       FROM student_enrollments se
       JOIN subjects s ON se.subject_id = s.id
       WHERE se.student_id = ? AND se.status = 'enrolled'
       ORDER BY s.code ASC`,
      [studentId, studentId]
    );

    return res.json({ success: true, subjects });
  } catch (err) {
    console.error('[Student] getMySubjects error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch enrolled subjects.' });
  }
}

// Subject Detail
async function getSubjectDetail(req, res) {
  try {
    const studentId = req.user.studentId;
    const { subjectId } = req.params;

    // Verify enrollment
    const isEnrolled = db.get(
      'SELECT id FROM student_enrollments WHERE student_id = ? AND subject_id = ? AND status = \'enrolled\'',
      [studentId, subjectId]
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not enrolled in this course.'
      });
    }

    const subject = db.get(
      `SELECT s.id, s.code, s.name, s.department, s.description, s.credits, s.color, s.icon
       FROM subjects s
       WHERE s.id = ?`,
      [subjectId]
    );

    const teachers = db.query(
      `SELECT t.id, t.employee_id, t.department, t.designation, t.office_room,
              u.first_name, u.last_name, u.email
       FROM teacher_subject_assignments tsa
       JOIN teachers t ON tsa.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE tsa.subject_id = ?`,
      [subjectId]
    );

    const announcements = db.query(
      `SELECT an.id, an.title, an.content, an.created_at,
              u.first_name || ' ' || u.last_name as author_name
       FROM announcements an
       JOIN users u ON an.author_id = u.id
       WHERE an.subject_id = ?
       ORDER BY an.created_at DESC`,
      [subjectId]
    );

    const materials = db.query(
      `SELECT lm.id, lm.title, lm.description, lm.file_name, lm.file_size, lm.file_type, lm.created_at,
              u.first_name || ' ' || u.last_name as uploaded_by
       FROM learning_materials lm
       JOIN teachers t ON lm.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE lm.subject_id = ?
       ORDER BY lm.created_at DESC`,
      [subjectId]
    );

    const assignments = db.query(
      `SELECT a.id, a.title, a.description, a.due_date, a.max_marks, a.allow_resubmission,
              a.allowed_file_types, a.max_file_size_mb, a.created_at,
              u.first_name || ' ' || u.last_name as teacher_name,
              sub.id as submission_id, sub.submitted_at, sub.status as submission_status, sub.version,
              sf.file_name as submitted_file_name,
              g.marks_obtained, g.is_published
       FROM assignments a
       LEFT JOIN teachers t ON a.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
       LEFT JOIN submission_files sf ON sf.submission_id = sub.id
       LEFT JOIN grades g ON g.submission_id = sub.id
       WHERE a.subject_id = ? AND a.status = 'published'
       ORDER BY a.due_date ASC`,
      [studentId, subjectId]
    );

    return res.json({
      success: true,
      subject,
      teachers,
      announcements,
      materials,
      assignments
    });
  } catch (err) {
    console.error('[Student] getSubjectDetail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load subject details.' });
  }
}

// Assignment Detail & Submission status
async function getAssignmentDetail(req, res) {
  try {
    const studentId = req.user.studentId;
    const { assignmentId } = req.params;

    const assignment = db.get(
      `SELECT a.id, a.subject_id, a.title, a.description, a.due_date, a.max_marks,
              a.allow_resubmission, a.allowed_file_types, a.max_file_size_mb, a.status,
              s.name as subject_name, s.code as subject_code, s.color, s.icon,
              u.first_name || ' ' || u.last_name as teacher_name
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       JOIN teachers t ON a.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE a.id = ?`,
      [assignmentId]
    );

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    // Verify student is enrolled in this subject
    const isEnrolled = db.get(
      'SELECT id FROM student_enrollments WHERE student_id = ? AND subject_id = ? AND status = \'enrolled\'',
      [studentId, assignment.subject_id]
    );

    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: 'Access Denied: You are not enrolled in this course.' });
    }

    // Fetch this student's submission (never other students' submissions)
    const submission = db.get(
      `SELECT sub.id, sub.submitted_at, sub.status, sub.remarks, sub.version
       FROM submissions sub
       WHERE sub.assignment_id = ? AND sub.student_id = ?`,
      [assignmentId, studentId]
    );

    let submissionFile = null;
    let versions = [];
    let grade = null;

    if (submission) {
      submissionFile = db.get(
        `SELECT id, file_name, file_size, mime_type, uploaded_at, file_path
         FROM submission_files
         WHERE submission_id = ?`,
        [submission.id]
      );

      versions = db.query(
        `SELECT id, version_number, file_name, file_path, file_size, mime_type, remarks, submitted_at, status
         FROM submission_versions
         WHERE submission_id = ?
         ORDER BY version_number DESC`,
        [submission.id]
      );

      // Only return grade if published by teacher
      const rawGrade = db.get(
        `SELECT marks_obtained, feedback, is_published, published_at
         FROM grades
         WHERE submission_id = ?`,
        [submission.id]
      );

      if (rawGrade && rawGrade.is_published === 1) {
        grade = rawGrade;
      }
    }

    return res.json({
      success: true,
      assignment,
      submission,
      submissionFile,
      versions,
      grade
    });
  } catch (err) {
    console.error('[Student] getAssignmentDetail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load assignment details.' });
  }
}

// Submit or Resubmit Assignment
async function submitAssignment(req, res) {
  try {
    const studentId = req.user.studentId;
    const { assignmentId } = req.params;
    const { remarks } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Please attach a document (PDF, DOCX, or TXT).' });
    }

    const assignment = db.get(
      'SELECT id, subject_id, due_date, allow_resubmission, status FROM assignments WHERE id = ?',
      [assignmentId]
    );

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    // Verify enrollment
    const isEnrolled = db.get(
      'SELECT id FROM student_enrollments WHERE student_id = ? AND subject_id = ? AND status = \'enrolled\'',
      [studentId, assignment.subject_id]
    );

    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: 'Access Denied: You are not enrolled in this course.' });
    }

    const isLate = new Date() > new Date(assignment.due_date);
    const existingSubmission = db.get(
      'SELECT id, version FROM submissions WHERE assignment_id = ? AND student_id = ?',
      [assignmentId, studentId]
    );

    let submissionId;
    const relFilePath = path.relative(path.resolve(__dirname, '..'), file.path).replace(/\\/g, '/');

    if (existingSubmission) {
      if (assignment.allow_resubmission !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Resubmission is not permitted for this assignment.'
        });
      }

      submissionId = existingSubmission.id;
      const newVersion = (existingSubmission.version || 1) + 1;

      db.run(
        `UPDATE submissions
         SET submitted_at = CURRENT_TIMESTAMP,
             status = ?,
             remarks = ?,
             version = ?
         WHERE id = ?`,
        [isLate ? 'late' : 'resubmitted', remarks || null, newVersion, submissionId]
      );

      // Update current submission file
      db.run('DELETE FROM submission_files WHERE submission_id = ?', [submissionId]);
      db.run(
        `INSERT INTO submission_files (submission_id, file_name, file_path, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?)`,
        [submissionId, file.originalname, relFilePath, file.size, file.mimetype]
      );

      // Preserve version history in submission_versions
      db.run(
        `INSERT INTO submission_versions (submission_id, version_number, file_name, file_path, file_size, mime_type, remarks, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [submissionId, newVersion, file.originalname, relFilePath, file.size, file.mimetype, remarks || null, isLate ? 'late' : 'resubmitted']
      );
    } else {
      const subRes = db.run(
        `INSERT INTO submissions (assignment_id, student_id, submitted_at, status, remarks, version)
         VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, 1)`,
        [assignmentId, studentId, isLate ? 'late' : 'submitted', remarks || null]
      );
      submissionId = subRes.lastInsertRowid;

      db.run(
        `INSERT INTO submission_files (submission_id, file_name, file_path, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?)`,
        [submissionId, file.originalname, relFilePath, file.size, file.mimetype]
      );

      // Record version 1 in submission_versions
      db.run(
        `INSERT INTO submission_versions (submission_id, version_number, file_name, file_path, file_size, mime_type, remarks, status)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?)`,
        [submissionId, file.originalname, relFilePath, file.size, file.mimetype, remarks || null, isLate ? 'late' : 'submitted']
      );
    }

    // Real-time notification to the course instructor
    try {
      const teacher = db.get('SELECT user_id FROM teachers WHERE id = ?', [assignment.teacher_id]);
      if (teacher) {
        createNotification({
          userId: teacher.user_id,
          title: existingSubmission ? 'Assignment Resubmitted' : 'New Assignment Submission',
          message: `${req.user.firstName} ${req.user.lastName} submitted work for "${assignment.title || 'Assignment'}".`,
          type: 'submission',
          link: `/teacher/assignments/${assignmentId}/submissions`
        });
        broadcastToUser(teacher.user_id, 'SUBMISSION_RECEIVED', {
          assignmentId,
          submissionId,
          studentName: `${req.user.firstName} ${req.user.lastName}`
        });
      }
    } catch (e) {
      console.warn('Teacher notification error:', e.message);
    }

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'student',
      action: existingSubmission ? 'RESUBMIT_ASSIGNMENT' : 'SUBMIT_ASSIGNMENT',
      entityType: 'Submission',
      entityId: submissionId,
      details: { assignmentId, fileName: file.originalname, isLate },
      req
    });

    return res.status(201).json({
      success: true,
      message: existingSubmission ? 'Assignment resubmitted successfully.' : 'Assignment submitted successfully!',
      submissionId,
      isLate,
      submittedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Student] submitAssignment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process assignment submission.' });
  }
}

// Student Grades
async function getStudentGrades(req, res) {
  try {
    const studentId = req.user.studentId;

    const grades = db.query(
      `SELECT g.id, g.marks_obtained, g.feedback, g.published_at,
              a.id as assignment_id, a.title as assignment_title, a.max_marks,
              s.name as subject_name, s.code as subject_code, s.color,
              u.first_name || ' ' || u.last_name as teacher_name
       FROM grades g
       JOIN submissions sub ON g.submission_id = sub.id
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN subjects s ON a.subject_id = s.id
       JOIN teachers t ON g.graded_by = t.id
       JOIN users u ON t.user_id = u.id
       WHERE sub.student_id = ? AND g.is_published = 1
       ORDER BY g.published_at DESC`,
      [studentId]
    );

    return res.json({ success: true, grades });
  } catch (err) {
    console.error('[Student] getStudentGrades error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch student grades.' });
  }
}

// Student Calendar
async function getStudentCalendar(req, res) {
  try {
    const studentId = req.user.studentId;

    const events = db.query(
      `SELECT a.id, a.title, a.due_date as date, a.max_marks, 'assignment' as type,
              s.name as subject_name, s.code as subject_code, s.color,
              sub.id as submission_id, sub.status as submission_status
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       JOIN student_enrollments se ON se.subject_id = s.id AND se.student_id = ? AND se.status = 'enrolled'
       LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
       WHERE a.status = 'published'
       ORDER BY a.due_date ASC`,
      [studentId, studentId]
    );

    return res.json({ success: true, events });
  } catch (err) {
    console.error('[Student] getStudentCalendar error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch calendar events.' });
  }
}

// Retrieve all assignments available across enrolled subjects
async function getStudentAssignments(req, res) {
  try {
    const studentId = req.user.studentId;
    if (!studentId) {
      return res.status(403).json({ success: false, message: 'Student profile not linked.' });
    }

    const assignments = db.query(
      `SELECT a.id, a.subject_id, a.title, a.description, a.due_date, a.max_marks,
              a.allow_resubmission, a.allowed_file_types, a.max_file_size_mb, a.created_at, a.status,
              s.name as subject_name, s.code as subject_code, s.color, s.icon,
              u.first_name || ' ' || u.last_name as teacher_name,
              sub.id as submission_id, sub.submitted_at, sub.status as submission_status, sub.version,
              sf.file_name as submitted_file_name, sf.file_size,
              g.marks_obtained, g.is_published
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       JOIN student_enrollments se ON se.subject_id = s.id AND se.student_id = ? AND se.status = 'enrolled'
       LEFT JOIN teachers t ON a.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
       LEFT JOIN submission_files sf ON sf.submission_id = sub.id
       LEFT JOIN grades g ON g.submission_id = sub.id
       WHERE a.status = 'published'
       ORDER BY a.due_date ASC`,
      [studentId, studentId]
    );

    return res.json({ success: true, assignments });
  } catch (err) {
    console.error('[Student] getStudentAssignments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments.' });
  }
}

// Retrieve student's own submissions
async function getStudentSubmissions(req, res) {
  try {
    const studentId = req.user.studentId;
    if (!studentId) {
      return res.status(403).json({ success: false, message: 'Student profile not linked.' });
    }

    const submissions = db.query(
      `SELECT sub.id, sub.assignment_id, sub.submitted_at, sub.status, sub.remarks, sub.version,
              a.title as assignment_title, a.max_marks, a.due_date,
              s.id as subject_id, s.name as subject_name, s.code as subject_code, s.color,
              u.first_name || ' ' || u.last_name as teacher_name,
              sf.file_name, sf.file_size, sf.mime_type,
              g.marks_obtained, g.is_published, g.feedback, g.published_at
       FROM submissions sub
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN subjects s ON a.subject_id = s.id
       LEFT JOIN teachers t ON a.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN submission_files sf ON sf.submission_id = sub.id
       LEFT JOIN grades g ON g.submission_id = sub.id
       WHERE sub.student_id = ?
       ORDER BY sub.submitted_at DESC`,
      [studentId]
    );

    return res.json({ success: true, submissions });
  } catch (err) {
    console.error('[Student] getStudentSubmissions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch submissions.' });
  }
}

module.exports = {
  getStudentDashboard,
  getMySubjects,
  getSubjectDetail,
  getStudentAssignments,
  getStudentSubmissions,
  getAssignmentDetail,
  submitAssignment,
  getStudentGrades,
  getStudentCalendar
};
