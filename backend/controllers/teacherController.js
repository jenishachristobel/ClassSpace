const db = require('../config/database');
const { logAuditAction } = require('../middleware/auditMiddleware');
const { createNotification, notifyEnrolledStudents, broadcastToUser } = require('../services/realtimeService');

// Teacher Dashboard Overview
async function getTeacherDashboard(req, res) {
  try {
    const teacherId = req.user.teacherId;
    if (!teacherId) {
      return res.status(403).json({ success: false, message: 'Teacher profile not linked.' });
    }

    // 1. Assigned Subjects
    const assignedSubjects = db.query(
      `SELECT s.id, s.code, s.name, s.department, s.color, s.icon,
              (SELECT COUNT(*) FROM student_enrollments se WHERE se.subject_id = s.id AND se.status = 'enrolled') as student_count,
              (SELECT COUNT(*) FROM assignments a WHERE a.subject_id = s.id AND a.status = 'published') as assignment_count,
              (SELECT COUNT(*) FROM submissions sub
               JOIN assignments a ON sub.assignment_id = a.id
               LEFT JOIN grades g ON g.submission_id = sub.id
               WHERE a.subject_id = s.id AND (g.id IS NULL OR g.is_published = 0)) as pending_grading_count
       FROM teacher_subject_assignments tsa
       JOIN subjects s ON tsa.subject_id = s.id
       WHERE tsa.teacher_id = ?
       ORDER BY s.code ASC`,
      [teacherId]
    );

    // 2. Total unique students across authorized classes
    const totalStudentsRow = db.get(
      `SELECT COUNT(DISTINCT se.student_id) as count
       FROM student_enrollments se
       JOIN teacher_subject_assignments tsa ON tsa.subject_id = se.subject_id
       WHERE tsa.teacher_id = ? AND se.status = 'enrolled'`,
      [teacherId]
    );

    // 3. Active assignments
    const activeAssignmentsRow = db.get(
      `SELECT COUNT(*) as count
       FROM assignments a
       JOIN teacher_subject_assignments tsa ON tsa.subject_id = a.subject_id
       WHERE tsa.teacher_id = ? AND a.status = 'published'`,
      [teacherId]
    );

    // 4. Submissions awaiting grading
    const pendingGradingRow = db.get(
      `SELECT COUNT(sub.id) as count
       FROM submissions sub
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN teacher_subject_assignments tsa ON tsa.subject_id = a.subject_id
       LEFT JOIN grades g ON g.submission_id = sub.id
       WHERE tsa.teacher_id = ? AND (g.id IS NULL OR g.is_published = 0)`,
      [teacherId]
    );

    // 5. Recent submissions across teacher's subjects
    const recentSubmissions = db.query(
      `SELECT sub.id, sub.submitted_at, sub.status,
              a.id as assignment_id, a.title as assignment_title, a.max_marks,
              s.name as subject_name, s.code as subject_code, s.color,
              u.first_name || ' ' || u.last_name as student_name,
              st.student_id as student_code,
              sf.file_name,
              g.marks_obtained, g.is_published
       FROM submissions sub
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN subjects s ON a.subject_id = s.id
       JOIN teacher_subject_assignments tsa ON tsa.subject_id = s.id
       JOIN students st ON sub.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN submission_files sf ON sf.submission_id = sub.id
       LEFT JOIN grades g ON g.submission_id = sub.id
       WHERE tsa.teacher_id = ?
       ORDER BY sub.submitted_at DESC
       LIMIT 6`,
      [teacherId]
    );

    return res.json({
      success: true,
      stats: {
        assignedSubjectsCount: assignedSubjects.length,
        totalStudentsCount: totalStudentsRow ? totalStudentsRow.count : 0,
        activeAssignmentsCount: activeAssignmentsRow ? activeAssignmentsRow.count : 0,
        pendingGradingCount: pendingGradingRow ? pendingGradingRow.count : 0
      },
      assignedSubjects,
      recentSubmissions
    });
  } catch (err) {
    console.error('[Teacher] getTeacherDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load teacher dashboard.' });
  }
}

// My Subjects (strictly authorized assigned subjects only)
async function getMySubjects(req, res) {
  try {
    const teacherId = req.user.teacherId;

    const subjects = db.query(
      `SELECT s.id, s.code, s.name, s.department, s.description, s.credits, s.color, s.icon,
              tsa.assigned_at,
              (SELECT COUNT(*) FROM student_enrollments se WHERE se.subject_id = s.id AND se.status = 'enrolled') as student_count,
              (SELECT COUNT(*) FROM assignments a WHERE a.subject_id = s.id AND a.status = 'published') as assignment_count,
              (SELECT COUNT(*) FROM submissions sub
               JOIN assignments a ON sub.assignment_id = a.id
               LEFT JOIN grades g ON g.submission_id = sub.id
               WHERE a.subject_id = s.id AND (g.id IS NULL OR g.is_published = 0)) as pending_grading_count,
              (SELECT sf.file_name FROM submissions sub
               JOIN assignments a ON sub.assignment_id = a.id
               LEFT JOIN submission_files sf ON sf.submission_id = sub.id
               WHERE a.subject_id = s.id ORDER BY sub.submitted_at DESC LIMIT 1) as recent_submission_file
       FROM teacher_subject_assignments tsa
       JOIN subjects s ON tsa.subject_id = s.id
       WHERE tsa.teacher_id = ?
       ORDER BY s.code ASC`,
      [teacherId]
    );

    return res.json({ success: true, subjects });
  } catch (err) {
    console.error('[Teacher] getMySubjects error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch assigned subjects.' });
  }
}

// Teacher Subject Page (with roster, announcements, materials, assignments)
async function getSubjectDetail(req, res) {
  try {
    const teacherId = req.user.teacherId;
    const { subjectId } = req.params;

    // Strict Backend Permission Check:
    const isAssigned = db.get(
      'SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?',
      [teacherId, subjectId]
    );

    if (!isAssigned && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not authorized to view or manage this subject.'
      });
    }

    const subject = db.get(
      `SELECT s.id, s.code, s.name, s.department, s.description, s.credits, s.color, s.icon
       FROM subjects s
       WHERE s.id = ?`,
      [subjectId]
    );

    // Enrolled students roster
    const roster = db.query(
      `SELECT st.id, st.student_id, st.department, st.semester,
              u.first_name, u.last_name, u.email, u.phone,
              se.status, se.enrolled_at,
              c.name as class_name, c.section
       FROM student_enrollments se
       JOIN students st ON se.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN classes c ON se.class_id = c.id
       WHERE se.subject_id = ? AND se.status = 'enrolled'
       ORDER BY u.first_name ASC`,
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
      `SELECT a.id, a.title, a.description, a.due_date, a.max_marks, a.allow_resubmission, a.status,
              (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id) as submission_count,
              (SELECT COUNT(*) FROM submissions sub JOIN grades g ON g.submission_id = sub.id WHERE sub.assignment_id = a.id AND g.is_published = 1) as graded_count
       FROM assignments a
       WHERE a.subject_id = ?
       ORDER BY a.created_at DESC`,
      [subjectId]
    );

    return res.json({
      success: true,
      subject,
      roster,
      announcements,
      materials,
      assignments
    });
  } catch (err) {
    console.error('[Teacher] getSubjectDetail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load subject details.' });
  }
}

// Create Assignment
async function createAssignment(req, res) {
  try {
    const teacherId = req.user.teacherId;
    const { subjectId, title, description, dueDate, maxMarks = 100, allowResubmission = 1 } = req.body;

    if (!subjectId || !title || !description || !dueDate) {
      return res.status(400).json({ success: false, message: 'Subject, Title, Description, and Due Date are required.' });
    }

    // Verify teacher assignment to subject
    const isAssigned = db.get(
      'SELECT id, class_id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?',
      [teacherId, subjectId]
    );

    if (!isAssigned && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to create assignments for this subject.' });
    }

    const classId = isAssigned?.class_id || null;

    const result = db.run(
      `INSERT INTO assignments (subject_id, class_id, teacher_id, title, description, due_date, max_marks, allow_resubmission, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      [subjectId, classId, teacherId, title.trim(), description.trim(), dueDate, Number(maxMarks), allowResubmission ? 1 : 0]
    );

    const assignmentId = result.lastInsertRowid;
    const subObj = db.get('SELECT name, code FROM subjects WHERE id = ?', [subjectId]);

    // Notify all enrolled students in real-time
    notifyEnrolledStudents(subjectId, {
      title: 'New Coursework Published',
      message: `New assignment "${title.trim()}" published in ${subObj?.name || 'your subject'}. Due: ${new Date(dueDate).toLocaleDateString()}.`,
      type: 'assignment',
      link: `/student/assignments/${assignmentId}`
    });

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'teacher',
      action: 'CREATE_ASSIGNMENT',
      entityType: 'Assignment',
      entityId: assignmentId,
      details: { title, subjectId, dueDate },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Assignment published successfully.',
      assignmentId
    });
  } catch (err) {
    console.error('[Teacher] createAssignment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create assignment.' });
  }
}

// Post Announcement
async function postAnnouncement(req, res) {
  try {
    const { subjectId, title, content } = req.body;
    const teacherId = req.user.teacherId;

    if (!subjectId || !title || !content) {
      return res.status(400).json({ success: false, message: 'Subject, Title, and Content are required.' });
    }

    const isAssigned = db.get(
      'SELECT id, class_id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?',
      [teacherId, subjectId]
    );

    if (!isAssigned && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to post announcements for this subject.' });
    }

    const resAnn = db.run(
      `INSERT INTO announcements (subject_id, class_id, author_id, title, content)
       VALUES (?, ?, ?, ?, ?)`,
      [subjectId, isAssigned?.class_id || null, req.user.id, title.trim(), content.trim()]
    );

    const subObj = db.get('SELECT name, code FROM subjects WHERE id = ?', [subjectId]);
    notifyEnrolledStudents(subjectId, {
      title: 'New Announcement',
      message: `${subObj?.code || 'Course'} announcement: "${title.trim()}".`,
      type: 'announcement',
      link: `/student/subjects/${subjectId}`,
      eventType: 'ANNOUNCEMENT_POSTED'
    });

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'teacher',
      action: 'CREATE_ANNOUNCEMENT',
      entityType: 'Announcement',
      entityId: resAnn.lastInsertRowid,
      details: { title, subjectId },
      req
    });

    return res.status(201).json({ success: true, message: 'Announcement posted successfully.' });
  } catch (err) {
    console.error('[Teacher] postAnnouncement error:', err);
    return res.status(500).json({ success: false, message: 'Failed to post announcement.' });
  }
}

// Add Learning Material
async function addMaterial(req, res) {
  try {
    const teacherId = req.user.teacherId;
    const { subjectId, title, description } = req.body;
    const file = req.file;

    if (!subjectId || !title) {
      return res.status(400).json({ success: false, message: 'Subject and Title are required.' });
    }

    const isAssigned = db.get(
      'SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?',
      [teacherId, subjectId]
    );

    if (!isAssigned && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to upload materials for this subject.' });
    }

    const fileName = file ? file.originalname : `${title.replace(/\s+/g, '_')}.pdf`;
    const fileSize = file ? file.size : 1024000;
    const fileType = file ? file.mimetype : 'application/pdf';

    db.run(
      `INSERT INTO learning_materials (subject_id, teacher_id, title, description, file_name, file_size, file_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [subjectId, teacherId, title.trim(), description || null, fileName, fileSize, fileType]
    );

    return res.status(201).json({ success: true, message: 'Learning material added successfully.' });
  } catch (err) {
    console.error('[Teacher] addMaterial error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload material.' });
  }
}

// Assignment Submissions Review Table (with all eligible students, stats, and Plagiarism statuses)
async function getAssignmentSubmissions(req, res) {
  try {
    const teacherId = req.user.teacherId;
    const { assignmentId } = req.params;

    // Strict Backend Permission Check:
    // Verify that the assignment belongs to a subject assigned to this teacher
    const assignment = db.get(
      `SELECT a.id, a.title, a.description, a.due_date, a.max_marks, a.subject_id,
              a.allowed_file_types, a.max_file_size_mb, a.allow_resubmission, a.created_at,
              s.name as subject_name, s.code as subject_code, s.color
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       JOIN teacher_subject_assignments tsa ON tsa.subject_id = a.subject_id
       WHERE a.id = ? AND tsa.teacher_id = ?`,
      [assignmentId, teacherId]
    );

    if (!assignment && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not authorized to review submissions for this assignment.'
      });
    }

    // Query all enrolled students in this subject, left-joining their submission if present
    const roster = db.query(
      `SELECT 
         se.subject_id as subject_id,
         st.id as student_id,
         st.student_id as student_code,
         st.department as student_department,
         u.first_name || ' ' || u.last_name as student_name,
         u.email as student_email,
         sub.id,
         sub.assignment_id,
         sub.submitted_at,
         COALESCE(sub.status, 'not_submitted') as status,
         sub.remarks,
         sub.version,
         sf.id as file_id, sf.file_name, sf.file_size, sf.mime_type, sf.file_path,
         g.id as grade_id, g.marks_obtained, g.feedback, g.is_published, g.published_at,
         pc.id as plagiarism_check_id, pc.token_id as plagiarism_token, pc.status as plagiarism_status,
         pc.similarity_percentage, pc.report_url, pc.report_summary
       FROM student_enrollments se
       JOIN students st ON se.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN submissions sub ON sub.assignment_id = ? AND sub.student_id = st.id
       LEFT JOIN submission_files sf ON sf.submission_id = sub.id
       LEFT JOIN grades g ON g.submission_id = sub.id
       LEFT JOIN plagiarism_checks pc ON pc.submission_id = sub.id
       WHERE se.subject_id = ? AND se.status = 'enrolled'
       ORDER BY CASE WHEN sub.submitted_at IS NOT NULL THEN 0 ELSE 1 END, sub.submitted_at ASC, u.first_name ASC`,
      [assignmentId, assignment.subject_id]
    );

    // Attach complete submission version history for students who have submitted
    for (const sub of roster) {
      if (sub.id) {
        sub.versions = db.query(
          `SELECT id, version_number, file_name, file_path, file_size, mime_type, remarks, submitted_at, status
           FROM submission_versions
           WHERE submission_id = ?
           ORDER BY version_number DESC`,
          [sub.id]
        );
      } else {
        sub.versions = [];
      }
    }

    // Compute assignment-level metrics from real DB records
    const totalEnrolled = roster.length;
    const submittedCount = roster.filter(s => s.id !== null).length;
    const notSubmittedCount = totalEnrolled - submittedCount;
    const lateCount = roster.filter(s => s.status === 'late').length;
    const awaitingGradingCount = roster.filter(s => s.id !== null && (!s.grade_id || s.is_published === 0)).length;
    const gradedCount = roster.filter(s => s.is_published === 1).length;

    const stats = {
      totalEnrolled,
      submittedCount,
      notSubmittedCount,
      lateCount,
      awaitingGradingCount,
      gradedCount
    };

    return res.json({
      success: true,
      assignment: assignment || { id: assignmentId },
      stats,
      submissions: roster
    });
  } catch (err) {
    console.error('[Teacher] getAssignmentSubmissions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignment submissions.' });
  }
}

// Global Submissions Hub for Authorized Teacher (organized by subject)
async function getAllTeacherSubmissions(req, res) {
  try {
    const teacherId = req.user.teacherId;
    if (!teacherId) {
      return res.status(403).json({ success: false, message: 'Teacher profile not linked.' });
    }

    const { subjectId, status, search } = req.query;

    let query = `
      SELECT sub.id, sub.assignment_id, sub.student_id, sub.submitted_at, sub.status, sub.remarks, sub.version,
             a.title as assignment_title, a.max_marks, a.due_date,
             s.id as subject_id, s.name as subject_name, s.code as subject_code, s.color,
             st.student_id as student_code, st.department as student_department,
             u.first_name || ' ' || u.last_name as student_name,
             u.email as student_email,
             sf.id as file_id, sf.file_name, sf.file_size, sf.mime_type, sf.file_path,
             g.id as grade_id, g.marks_obtained, g.feedback, g.is_published, g.published_at,
             pc.id as plagiarism_check_id, pc.token_id as plagiarism_token, pc.status as plagiarism_status,
             pc.similarity_percentage, pc.report_url, pc.report_summary
      FROM submissions sub
      JOIN assignments a ON sub.assignment_id = a.id
      JOIN subjects s ON a.subject_id = s.id
      JOIN teacher_subject_assignments tsa ON tsa.subject_id = s.id
      JOIN students st ON sub.student_id = st.id
      JOIN users u ON st.user_id = u.id
      LEFT JOIN submission_files sf ON sf.submission_id = sub.id
      LEFT JOIN grades g ON g.submission_id = sub.id
      LEFT JOIN plagiarism_checks pc ON pc.submission_id = sub.id
      WHERE tsa.teacher_id = ?
    `;

    const params = [teacherId];

    if (subjectId) {
      query += ` AND s.id = ?`;
      params.push(subjectId);
    }

    if (status && status !== 'all') {
      if (status === 'awaiting_grading') {
        query += ` AND (g.id IS NULL OR g.is_published = 0)`;
      } else if (status === 'graded') {
        query += ` AND g.is_published = 1`;
      } else {
        query += ` AND sub.status = ?`;
        params.push(status);
      }
    }

    if (search && search.trim()) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR st.student_id LIKE ? OR a.title LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY s.code ASC, sub.submitted_at DESC`;

    const submissions = db.query(query, params);

    // Get assigned subjects for filtering
    const subjects = db.query(
      `SELECT s.id, s.code, s.name, s.color
       FROM teacher_subject_assignments tsa
       JOIN subjects s ON tsa.subject_id = s.id
       WHERE tsa.teacher_id = ?
       ORDER BY s.code ASC`,
      [teacherId]
    );

    const totalSubmissions = submissions.length;
    const awaitingGrading = submissions.filter(s => !s.grade_id || s.is_published === 0).length;
    const gradedCount = submissions.filter(s => s.is_published === 1).length;
    const lateCount = submissions.filter(s => s.status === 'late').length;

    return res.json({
      success: true,
      stats: {
        totalSubmissions,
        awaitingGrading,
        gradedCount,
        lateCount
      },
      subjects,
      submissions
    });
  } catch (err) {
    console.error('[Teacher] getAllTeacherSubmissions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch submissions.' });
  }
}

// Grade Submission
async function gradeSubmission(req, res) {
  try {
    const teacherId = req.user.teacherId;
    const { submissionId } = req.params;
    const { marksObtained, feedback, publishNow = true } = req.body;

    if (marksObtained === undefined || marksObtained === null) {
      return res.status(400).json({ success: false, message: 'Marks obtained is required.' });
    }

    // Verify teacher owns the subject of this submission
    const submission = db.get(
      `SELECT sub.id, sub.student_id, a.id as assignment_id, a.max_marks, a.title as assignment_title,
              s.name as subject_name
       FROM submissions sub
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN teacher_subject_assignments tsa ON tsa.subject_id = a.subject_id
       JOIN subjects s ON a.subject_id = s.id
       WHERE sub.id = ? AND tsa.teacher_id = ?`,
      [submissionId, teacherId]
    );

    if (!submission && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not authorized to grade this submission.'
      });
    }

    if (Number(marksObtained) > submission.max_marks) {
      return res.status(400).json({
        success: false,
        message: `Marks cannot exceed the maximum allowed marks (${submission.max_marks}).`
      });
    }

    const isPublished = publishNow ? 1 : 0;
    const existingGrade = db.get('SELECT id FROM grades WHERE submission_id = ?', [submissionId]);

    if (existingGrade) {
      db.run(
        `UPDATE grades
         SET marks_obtained = ?,
             feedback = ?,
             is_published = ?,
             graded_by = ?,
             graded_at = CURRENT_TIMESTAMP,
             published_at = ${isPublished ? 'CURRENT_TIMESTAMP' : 'published_at'}
         WHERE id = ?`,
        [Number(marksObtained), feedback || null, isPublished, teacherId, existingGrade.id]
      );
    } else {
      db.run(
        `INSERT INTO grades (submission_id, graded_by, marks_obtained, feedback, is_published, published_at)
         VALUES (?, ?, ?, ?, ?, ${isPublished ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
        [submissionId, teacherId, Number(marksObtained), feedback || null, isPublished]
      );
    }

    // Send notification to student if published
    if (isPublished) {
      const student = db.get('SELECT user_id FROM students WHERE id = ?', [submission.student_id]);
      if (student) {
        createNotification({
          userId: student.user_id,
          title: 'Grade Published',
          message: `Your grade for "${submission.assignment_title}" has been published: ${marksObtained}/${submission.max_marks}.`,
          type: 'grade',
          link: `/student/assignments/${submission.assignment_id}`
        });
        broadcastToUser(student.user_id, 'GRADE_PUBLISHED', {
          assignmentId: submission.assignment_id,
          submissionId,
          marksObtained,
          maxMarks: submission.max_marks
        });
      }
    }

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'teacher',
      action: isPublished ? 'GRADE_PUBLISHED' : 'GRADE_SAVED_DRAFT',
      entityType: 'Grade',
      entityId: submissionId,
      details: { marksObtained, isPublished, assignmentId: submission.assignment_id },
      req
    });

    return res.json({
      success: true,
      message: isPublished ? 'Grade published to student.' : 'Grade saved as draft.',
      marksObtained: Number(marksObtained),
      isPublished
    });
  } catch (err) {
    console.error('[Teacher] gradeSubmission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to grade submission.' });
  }
}

// Gradebook Overview for Teacher
async function getGradebook(req, res) {
  try {
    const teacherId = req.user.teacherId;

    const gradebookRecords = db.query(
      `SELECT s.id as subject_id, s.name as subject_name, s.code as subject_code,
              a.id as assignment_id, a.title as assignment_title, a.max_marks,
              st.id as student_id, st.student_id as student_code,
              u.first_name || ' ' || u.last_name as student_name,
              sub.id as submission_id, sub.submitted_at, sub.status as submission_status,
              g.marks_obtained, g.is_published
       FROM teacher_subject_assignments tsa
       JOIN subjects s ON tsa.subject_id = s.id
       JOIN student_enrollments se ON se.subject_id = s.id AND se.status = 'enrolled'
       JOIN students st ON se.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN assignments a ON a.subject_id = s.id AND a.status = 'published'
       LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = st.id
       LEFT JOIN grades g ON g.submission_id = sub.id
       WHERE tsa.teacher_id = ?
       ORDER BY s.code, u.first_name, a.id ASC`,
      [teacherId]
    );

    return res.json({ success: true, gradebook: gradebookRecords });
  } catch (err) {
    console.error('[Teacher] getGradebook error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load gradebook.' });
  }
}

// Request Resubmission / Return Work to Student
async function requestResubmission(req, res) {
  try {
    const teacherId = req.user.teacherId;
    const { submissionId } = req.params;
    const { reason = '' } = req.body;

    const submission = db.get(
      `SELECT sub.id, sub.student_id, a.id as assignment_id, a.title as assignment_title,
              s.name as subject_name
       FROM submissions sub
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN teacher_subject_assignments tsa ON tsa.subject_id = a.subject_id
       JOIN subjects s ON a.subject_id = s.id
       WHERE sub.id = ? AND tsa.teacher_id = ?`,
      [submissionId, teacherId]
    );

    if (!submission && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not authorized to return this submission.'
      });
    }

    db.run(
      `UPDATE submissions
       SET status = 'resubmitted',
           remarks = ?
       WHERE id = ?`,
      [reason ? `Returned by instructor for resubmission: ${reason}` : 'Resubmission requested by instructor.', submissionId]
    );

    const student = db.get('SELECT user_id FROM students WHERE id = ?', [submission.student_id]);
    if (student) {
      createNotification({
        userId: student.user_id,
        title: 'Resubmission Requested',
        message: `Your instructor has returned your work for "${submission.assignment_title}". ${reason ? `Note: ${reason}` : 'Please review instructions and resubmit.'}`,
        type: 'warning',
        link: `/student/assignments/${submission.assignment_id}`
      });
      broadcastToUser(student.user_id, 'RESUBMISSION_REQUESTED', {
        assignmentId: submission.assignment_id,
        submissionId,
        reason
      });
    }

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'teacher',
      action: 'RESUBMISSION_REQUESTED',
      entityType: 'Submission',
      entityId: submissionId,
      details: { assignmentId: submission.assignment_id, reason },
      req
    });

    return res.json({
      success: true,
      message: 'Work returned for resubmission. Student has been notified.'
    });
  } catch (err) {
    console.error('[Teacher] requestResubmission error:', err);
    return res.status(500).json({ success: false, message: 'Failed to request resubmission.' });
  }
}

module.exports = {
  getTeacherDashboard,
  getMySubjects,
  getSubjectDetail,
  createAssignment,
  postAnnouncement,
  addMaterial,
  getAssignmentSubmissions,
  getAllTeacherSubmissions,
  gradeSubmission,
  requestResubmission,
  getGradebook
};

