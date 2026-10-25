const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { logAuditAction } = require('../middleware/auditMiddleware');
const { getLoginLogs, getLoginSummaryStats } = require('../services/loginLogService');

// Dashboard Overview
async function getDashboardStats(req, res) {
  try {
    const totalStudents = db.get('SELECT COUNT(*) as count FROM students').count;
    const totalTeachers = db.get('SELECT COUNT(*) as count FROM teachers').count;
    const totalSubjects = db.get('SELECT COUNT(*) as count FROM subjects').count;
    const totalClasses = db.get('SELECT COUNT(*) as count FROM classes').count;
    const activeAssignments = db.get('SELECT COUNT(*) as count FROM assignments WHERE status = \'published\'').count;
    const totalSubmissions = db.get('SELECT COUNT(*) as count FROM submissions').count;

    const recentActivity = db.query(
      `SELECT id, user_email, role, action, entity_type, entity_id, details, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 10`
    );

    const enrollmentDistribution = db.query(
      `SELECT s.id, s.name, s.code, s.color, COUNT(se.id) as enrolled_count
       FROM subjects s
       LEFT JOIN student_enrollments se ON se.subject_id = s.id AND se.status = 'enrolled'
       GROUP BY s.id
       ORDER BY enrolled_count DESC`
    );

    const loginSummary = getLoginSummaryStats();

    return res.json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalSubjects,
        totalClasses,
        activeAssignments,
        totalSubmissions,
        // Login Activity Summary metrics
        totalRegisteredStudents: loginSummary.totalRegisteredStudents,
        totalRegisteredTeachers: loginSummary.totalRegisteredTeachers,
        successfulLoginsToday: loginSummary.successfulLoginsToday,
        uniqueStudentsLoggedInToday: loginSummary.uniqueStudentsLoggedInToday,
        failedLoginsToday: loginSummary.failedLoginsToday
      },
      recentActivity,
      enrollmentDistribution,
      loginSummary
    });
  } catch (err) {
    console.error('[Admin] getDashboardStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load admin stats.' });
  }
}

// Manage Students
async function getStudents(req, res) {
  try {
    const { search = '', department = '', status = '', page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let conditions = ['1=1'];
    let params = [];

    if (search.trim()) {
      conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR s.student_id LIKE ?)');
      const q = `%${search.trim()}%`;
      params.push(q, q, q, q);
    }

    if (department.trim()) {
      conditions.push('s.department = ?');
      params.push(department.trim());
    }

    if (status.trim()) {
      conditions.push('u.status = ?');
      params.push(status.trim());
    }

    const whereClause = conditions.join(' AND ');

    const countRow = db.get(
      `SELECT COUNT(*) as count
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE ${whereClause}`,
      params
    );

    const students = db.query(
      `SELECT s.id, s.user_id, s.student_id, s.department, s.semester, s.enrollment_year,
              u.first_name, u.last_name, u.email, u.status, u.phone, u.created_at,
              (SELECT COUNT(*) FROM student_enrollments se WHERE se.student_id = s.id AND se.status = 'enrolled') as enrolled_subjects_count
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE ${whereClause}
       ORDER BY u.first_name ASC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    return res.json({
      success: true,
      students,
      total: countRow.count,
      page: Number(page),
      totalPages: Math.ceil(countRow.count / Number(limit))
    });
  } catch (err) {
    console.error('[Admin] getStudents error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch students.' });
  }
}

async function createStudent(req, res) {
  try {
    const { firstName, lastName, email, studentId, department, semester = 3, password, phone } = req.body;

    if (!firstName || !lastName || !email || !studentId || !department || !password) {
      return res.status(400).json({ success: false, message: 'All required student fields must be provided.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = db.get('SELECT id FROM users WHERE LOWER(email) = ?', [trimmedEmail]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const existingStudentId = db.get('SELECT id FROM students WHERE student_id = ?', [studentId.trim()]);
    if (existingStudentId) {
      return res.status(400).json({ success: false, message: 'A student with this Student ID already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userRes = db.run(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, status)
       VALUES (?, ?, 'student', ?, ?, ?, 'active')`,
      [trimmedEmail, passwordHash, firstName.trim(), lastName.trim(), phone || null]
    );

    const stuRes = db.run(
      `INSERT INTO students (user_id, student_id, department, semester, enrollment_year)
       VALUES (?, ?, ?, ?, ?)`,
      [userRes.lastInsertRowid, studentId.trim(), department.trim(), Number(semester), new Date().getFullYear()]
    );

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'CREATE_STUDENT',
      entityType: 'Student',
      entityId: stuRes.lastInsertRowid,
      details: { email: trimmedEmail, studentId: studentId.trim() },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully.',
      student: {
        id: stuRes.lastInsertRowid,
        userId: userRes.lastInsertRowid,
        email: trimmedEmail,
        studentId: studentId.trim()
      }
    });
  } catch (err) {
    console.error('[Admin] createStudent error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create student account.' });
  }
}

async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const { firstName, lastName, department, semester, phone, status } = req.body;

    const student = db.get('SELECT user_id FROM students WHERE id = ?', [id]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    if (firstName || lastName || phone || status) {
      db.run(
        `UPDATE users
         SET first_name = COALESCE(?, first_name),
             last_name = COALESCE(?, last_name),
             phone = COALESCE(?, phone),
             status = COALESCE(?, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [firstName || null, lastName || null, phone || null, status || null, student.user_id]
      );
    }

    if (department || semester) {
      db.run(
        `UPDATE students
         SET department = COALESCE(?, department),
             semester = COALESCE(?, semester)
         WHERE id = ?`,
        [department || null, semester ? Number(semester) : null, id]
      );
    }

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'UPDATE_STUDENT',
      entityType: 'Student',
      entityId: id,
      details: { firstName, lastName, department, status },
      req
    });

    return res.json({ success: true, message: 'Student updated successfully.' });
  } catch (err) {
    console.error('[Admin] updateStudent error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update student.' });
  }
}

async function getStudentEnrollments(req, res) {
  try {
    const { id } = req.params; // student_id
    const enrollments = db.query(
      `SELECT se.id, se.subject_id, se.status, se.enrolled_at,
              s.name as subject_name, s.code as subject_code, s.department, s.credits, s.color, s.icon,
              c.name as class_name, c.section,
              (SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name, ', ')
               FROM teacher_subject_assignments tsa
               JOIN teachers t ON tsa.teacher_id = t.id
               JOIN users u ON t.user_id = u.id
               WHERE tsa.subject_id = s.id) as teacher_names
       FROM student_enrollments se
       JOIN subjects s ON se.subject_id = s.id
       LEFT JOIN classes c ON se.class_id = c.id
       WHERE se.student_id = ?`,
      [id]
    );

    return res.json({ success: true, enrollments });
  } catch (err) {
    console.error('[Admin] getStudentEnrollments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch student enrollments.' });
  }
}

async function enrollStudentInSubject(req, res) {
  try {
    const { id } = req.params; // student_id
    const { subjectId, classId } = req.body;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'Subject ID is required.' });
    }

    const existing = db.get(
      'SELECT id, status FROM student_enrollments WHERE student_id = ? AND subject_id = ?',
      [id, subjectId]
    );

    if (existing) {
      if (existing.status === 'enrolled') {
        return res.status(400).json({ success: false, message: 'Student is already enrolled in this subject.' });
      } else {
        db.run('UPDATE student_enrollments SET status = \'enrolled\', class_id = ? WHERE id = ?', [classId || null, existing.id]);
        return res.json({ success: true, message: 'Student re-enrolled successfully.' });
      }
    }

    // Default class if not provided
    let resolvedClassId = classId;
    if (!resolvedClassId) {
      const defClass = db.get('SELECT id FROM classes WHERE subject_id = ? LIMIT 1', [subjectId]);
      if (defClass) resolvedClassId = defClass.id;
    }

    db.run(
      `INSERT INTO student_enrollments (student_id, subject_id, class_id, status)
       VALUES (?, ?, ?, 'enrolled')`,
      [id, subjectId, resolvedClassId || null]
    );

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'ENROLL_STUDENT',
      entityType: 'Enrollment',
      entityId: `${id}-${subjectId}`,
      details: { studentId: id, subjectId },
      req
    });

    return res.status(201).json({ success: true, message: 'Student successfully enrolled in subject.' });
  } catch (err) {
    console.error('[Admin] enrollStudentInSubject error:', err);
    return res.status(500).json({ success: false, message: 'Failed to enroll student.' });
  }
}

async function unenrollStudentFromSubject(req, res) {
  try {
    const { id, subjectId } = req.params;

    db.run(
      'DELETE FROM student_enrollments WHERE student_id = ? AND subject_id = ?',
      [id, subjectId]
    );

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'UNENROLL_STUDENT',
      entityType: 'Enrollment',
      entityId: `${id}-${subjectId}`,
      details: { studentId: id, subjectId },
      req
    });

    return res.json({ success: true, message: 'Student unenrolled from subject successfully.' });
  } catch (err) {
    console.error('[Admin] unenrollStudentFromSubject error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unenroll student.' });
  }
}

// Manage Teachers
async function getTeachers(req, res) {
  try {
    const { search = '', department = '', status = '' } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (search.trim()) {
      conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR t.employee_id LIKE ?)');
      const q = `%${search.trim()}%`;
      params.push(q, q, q, q);
    }

    if (department.trim()) {
      conditions.push('t.department = ?');
      params.push(department.trim());
    }

    if (status.trim()) {
      conditions.push('u.status = ?');
      params.push(status.trim());
    }

    const teachers = db.query(
      `SELECT t.id, t.user_id, t.employee_id, t.department, t.designation, t.office_room,
              u.first_name, u.last_name, u.email, u.status, u.phone, u.created_at,
              (SELECT GROUP_CONCAT(s.code || ': ' || s.name, ' | ')
               FROM teacher_subject_assignments tsa
               JOIN subjects s ON tsa.subject_id = s.id
               WHERE tsa.teacher_id = t.id) as assigned_subjects_summary
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.first_name ASC`,
      params
    );

    return res.json({ success: true, teachers });
  } catch (err) {
    console.error('[Admin] getTeachers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch teachers.' });
  }
}

async function createTeacher(req, res) {
  try {
    const { firstName, lastName, email, employeeId, department, designation, officeRoom, password, phone } = req.body;

    if (!firstName || !lastName || !email || !employeeId || !department || !password) {
      return res.status(400).json({ success: false, message: 'All required teacher fields must be provided.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = db.get('SELECT id FROM users WHERE LOWER(email) = ?', [trimmedEmail]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const existingEmp = db.get('SELECT id FROM teachers WHERE employee_id = ?', [employeeId.trim()]);
    if (existingEmp) {
      return res.status(400).json({ success: false, message: 'A teacher with this Employee ID already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userRes = db.run(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, status)
       VALUES (?, ?, 'teacher', ?, ?, ?, 'active')`,
      [trimmedEmail, passwordHash, firstName.trim(), lastName.trim(), phone || null]
    );

    const teaRes = db.run(
      `INSERT INTO teachers (user_id, employee_id, department, designation, office_room)
       VALUES (?, ?, ?, ?, ?)`,
      [userRes.lastInsertRowid, employeeId.trim(), department.trim(), designation || 'Assistant Professor', officeRoom || null]
    );

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'CREATE_TEACHER',
      entityType: 'Teacher',
      entityId: teaRes.lastInsertRowid,
      details: { email: trimmedEmail, employeeId: employeeId.trim() },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Teacher account created successfully.',
      teacher: {
        id: teaRes.lastInsertRowid,
        userId: userRes.lastInsertRowid,
        email: trimmedEmail,
        employeeId: employeeId.trim()
      }
    });
  } catch (err) {
    console.error('[Admin] createTeacher error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create teacher account.' });
  }
}

async function updateTeacher(req, res) {
  try {
    const { id } = req.params;
    const { firstName, lastName, department, designation, officeRoom, phone, status } = req.body;

    const teacher = db.get('SELECT user_id FROM teachers WHERE id = ?', [id]);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher record not found.' });
    }

    if (firstName || lastName || phone || status) {
      db.run(
        `UPDATE users
         SET first_name = COALESCE(?, first_name),
             last_name = COALESCE(?, last_name),
             phone = COALESCE(?, phone),
             status = COALESCE(?, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [firstName || null, lastName || null, phone || null, status || null, teacher.user_id]
      );
    }

    if (department || designation || officeRoom) {
      db.run(
        `UPDATE teachers
         SET department = COALESCE(?, department),
             designation = COALESCE(?, designation),
             office_room = COALESCE(?, office_room)
         WHERE id = ?`,
        [department || null, designation || null, officeRoom || null, id]
      );
    }

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'UPDATE_TEACHER',
      entityType: 'Teacher',
      entityId: id,
      details: { firstName, lastName, department, status },
      req
    });

    return res.json({ success: true, message: 'Teacher updated successfully.' });
  } catch (err) {
    console.error('[Admin] updateTeacher error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update teacher.' });
  }
}

async function getTeacherAssignments(req, res) {
  try {
    const { id } = req.params; // teacher_id
    const assignments = db.query(
      `SELECT tsa.id, tsa.subject_id, tsa.class_id, tsa.assigned_at,
              s.name as subject_name, s.code as subject_code, s.department, s.color, s.icon,
              c.name as class_name, c.section,
              (SELECT COUNT(*) FROM student_enrollments se WHERE se.subject_id = s.id AND se.status = 'enrolled') as enrolled_count
       FROM teacher_subject_assignments tsa
       JOIN subjects s ON tsa.subject_id = s.id
       LEFT JOIN classes c ON tsa.class_id = c.id
       WHERE tsa.teacher_id = ?`,
      [id]
    );

    return res.json({ success: true, assignments });
  } catch (err) {
    console.error('[Admin] getTeacherAssignments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch teacher assignments.' });
  }
}

async function assignTeacherToSubject(req, res) {
  try {
    const { id } = req.params; // teacher_id
    const { subjectId, classId } = req.body;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'Subject ID is required.' });
    }

    const existing = db.get(
      'SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?',
      [id, subjectId]
    );

    if (existing) {
      return res.status(400).json({ success: false, message: 'Teacher is already assigned to this subject.' });
    }

    let resolvedClassId = classId;
    if (!resolvedClassId) {
      const defClass = db.get('SELECT id FROM classes WHERE subject_id = ? LIMIT 1', [subjectId]);
      if (defClass) resolvedClassId = defClass.id;
    }

    db.run(
      `INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id)
       VALUES (?, ?, ?)`,
      [id, subjectId, resolvedClassId || null]
    );

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'ASSIGN_TEACHER_SUBJECT',
      entityType: 'TeacherAssignment',
      entityId: `${id}-${subjectId}`,
      details: { teacherId: id, subjectId },
      req
    });

    return res.status(201).json({ success: true, message: 'Teacher assigned to subject successfully.' });
  } catch (err) {
    console.error('[Admin] assignTeacherToSubject error:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign teacher.' });
  }
}

async function removeTeacherFromSubject(req, res) {
  try {
    const { id, subjectId } = req.params;

    db.run(
      'DELETE FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ?',
      [id, subjectId]
    );

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'REMOVE_TEACHER_SUBJECT',
      entityType: 'TeacherAssignment',
      entityId: `${id}-${subjectId}`,
      details: { teacherId: id, subjectId },
      req
    });

    return res.json({ success: true, message: 'Teacher removed from subject assignment.' });
  } catch (err) {
    console.error('[Admin] removeTeacherFromSubject error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove teacher assignment.' });
  }
}

// Manage Subjects
async function getSubjects(req, res) {
  try {
    const subjects = db.query(
      `SELECT s.id, s.code, s.name, s.department, s.description, s.credits, s.color, s.icon, s.created_at,
              (SELECT COUNT(*) FROM student_enrollments se WHERE se.subject_id = s.id AND se.status = 'enrolled') as enrolled_count,
              (SELECT COUNT(*) FROM assignments a WHERE a.subject_id = s.id) as assignment_count,
              (SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name, ', ')
               FROM teacher_subject_assignments tsa
               JOIN teachers t ON tsa.teacher_id = t.id
               JOIN users u ON t.user_id = u.id
               WHERE tsa.subject_id = s.id) as assigned_teachers
       FROM subjects s
       ORDER BY s.code ASC`
    );

    return res.json({ success: true, subjects });
  } catch (err) {
    console.error('[Admin] getSubjects error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch subjects.' });
  }
}

async function createSubject(req, res) {
  try {
    const { code, name, department, description, credits = 4, color = '#3B82F6', icon = 'BookOpen', teacherId } = req.body;

    if (!code || !name || !department) {
      return res.status(400).json({ success: false, message: 'Subject Code, Name, and Department are required.' });
    }

    const existing = db.get('SELECT id FROM subjects WHERE code = ?', [code.trim().toUpperCase()]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'A subject with this code already exists.' });
    }

    const subRes = db.run(
      `INSERT INTO subjects (code, name, department, description, credits, color, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [code.trim().toUpperCase(), name.trim(), department.trim(), description || null, Number(credits), color, icon]
    );

    const subjectId = subRes.lastInsertRowid;

    // Automatically create a default Class Section
    const classCode = `${code.trim().toUpperCase()}-SEC-A`;
    const classRes = db.run(
      `INSERT INTO classes (subject_id, name, section, academic_term, class_code)
       VALUES (?, ?, 'Sec-A', 'Fall 2024', ?)`,
      [subjectId, `${name.trim()} - Section A`, classCode]
    );

    // Optionally assign initial teacher if selected
    if (teacherId) {
      db.run(
        `INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id)
         VALUES (?, ?, ?)`,
        [Number(teacherId), subjectId, classRes.lastInsertRowid]
      );
    }

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'CREATE_SUBJECT',
      entityType: 'Subject',
      entityId: subjectId,
      details: { code: code.trim().toUpperCase(), name: name.trim() },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Subject and Section created successfully.',
      subject: { id: subjectId, code: code.trim().toUpperCase(), name: name.trim() }
    });
  } catch (err) {
    console.error('[Admin] createSubject error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create subject.' });
  }
}

async function updateSubject(req, res) {
  try {
    const { id } = req.params;
    const { name, department, description, credits, color, icon } = req.body;

    db.run(
      `UPDATE subjects
       SET name = COALESCE(?, name),
           department = COALESCE(?, department),
           description = COALESCE(?, description),
           credits = COALESCE(?, credits),
           color = COALESCE(?, color),
           icon = COALESCE(?, icon),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name || null, department || null, description || null, credits ? Number(credits) : null, color || null, icon || null, id]
    );

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'UPDATE_SUBJECT',
      entityType: 'Subject',
      entityId: id,
      details: { name, department },
      req
    });

    return res.json({ success: true, message: 'Subject updated successfully.' });
  } catch (err) {
    console.error('[Admin] updateSubject error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update subject.' });
  }
}

async function deleteSubject(req, res) {
  try {
    const { id } = req.params;
    const subject = db.get('SELECT code, name FROM subjects WHERE id = ?', [id]);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    db.run('DELETE FROM subjects WHERE id = ?', [id]);

    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: 'admin',
      action: 'DELETE_SUBJECT',
      entityType: 'Subject',
      entityId: id,
      details: { code: subject.code, name: subject.name },
      req
    });

    return res.json({ success: true, message: `Subject '${subject.code}' deleted successfully.` });
  } catch (err) {
    console.error('[Admin] deleteSubject error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete subject.' });
  }
}

// Manage Classes
async function getClasses(req, res) {
  try {
    const classes = db.query(
      `SELECT c.id, c.subject_id, c.name, c.section, c.academic_term, c.class_code, c.created_at,
              s.name as subject_name, s.code as subject_code, s.color, s.icon,
              (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.status = 'enrolled') as enrolled_count,
              (SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name, ', ')
               FROM teacher_subject_assignments tsa
               JOIN teachers t ON tsa.teacher_id = t.id
               JOIN users u ON t.user_id = u.id
               WHERE tsa.subject_id = c.subject_id) as teachers
       FROM classes c
       JOIN subjects s ON c.subject_id = s.id
       ORDER BY s.code, c.section ASC`
    );

    return res.json({ success: true, classes });
  } catch (err) {
    console.error('[Admin] getClasses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch classes.' });
  }
}

async function createClass(req, res) {
  try {
    const { subjectId, name, section, academicTerm, classCode } = req.body;
    if (!subjectId || !name || !section || !classCode) {
      return res.status(400).json({ success: false, message: 'Subject, Name, Section, and Class Code are required.' });
    }

    const existing = db.get('SELECT id FROM classes WHERE class_code = ?', [classCode.trim()]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'A class with this Class Code already exists.' });
    }

    const result = db.run(
      `INSERT INTO classes (subject_id, name, section, academic_term, class_code)
       VALUES (?, ?, ?, ?, ?)`,
      [subjectId, name.trim(), section.trim(), academicTerm || 'Fall 2024', classCode.trim()]
    );

    return res.status(201).json({ success: true, message: 'Class section created successfully.', classId: result.lastInsertRowid });
  } catch (err) {
    console.error('[Admin] createClass error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create class section.' });
  }
}

// All Assignments
async function getAllAssignments(req, res) {
  try {
    const assignments = db.query(
      `SELECT a.id, a.title, a.due_date, a.max_marks, a.status, a.created_at,
              s.name as subject_name, s.code as subject_code, s.color,
              u.first_name || ' ' || u.last_name as teacher_name,
              (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id) as submission_count,
              (SELECT COUNT(*) FROM submissions sub JOIN grades g ON g.submission_id = sub.id WHERE sub.assignment_id = a.id) as graded_count
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       JOIN teachers t ON a.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       ORDER BY a.created_at DESC`
    );

    return res.json({ success: true, assignments });
  } catch (err) {
    console.error('[Admin] getAllAssignments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch all assignments.' });
  }
}

// Audit Logs
async function getAuditLogs(req, res) {
  try {
    const { page = 1, limit = 50, action = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = 'SELECT * FROM audit_logs';
    let countSql = 'SELECT COUNT(*) as count FROM audit_logs';
    let params = [];

    if (action.trim()) {
      sql += ' WHERE action LIKE ?';
      countSql += ' WHERE action LIKE ?';
      params.push(`%${action.trim()}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const countRow = db.get(countSql, params);
    const logs = db.query(sql, [...params, Number(limit), offset]);

    return res.json({
      success: true,
      logs,
      total: countRow.count,
      page: Number(page),
      totalPages: Math.ceil(countRow.count / Number(limit))
    });
  } catch (err) {
    console.error('[Admin] getAuditLogs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
}

// Dedicated Login Activity Logs
async function getLoginActivityLogs(req, res) {
  try {
    const { page = 1, limit = 25, email = '', role = '', status = '', authProvider = '', startDate = '', endDate = '' } = req.query;
    const result = getLoginLogs({ page, limit, email, role, status, authProvider, startDate, endDate });
    return res.json(result);
  } catch (err) {
    console.error('[Admin] getLoginActivityLogs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch login activity logs.' });
  }
}

// Login Summary Metrics
async function getLoginSummary(req, res) {
  try {
    const summary = getLoginSummaryStats();
    return res.json({ success: true, summary });
  } catch (err) {
    console.error('[Admin] getLoginSummary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load login summary.' });
  }
}

module.exports = {
  getDashboardStats,
  getStudents,
  createStudent,
  updateStudent,
  getStudentEnrollments,
  enrollStudentInSubject,
  unenrollStudentFromSubject,
  getTeachers,
  createTeacher,
  updateTeacher,
  getTeacherAssignments,
  assignTeacherToSubject,
  removeTeacherFromSubject,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getClasses,
  createClass,
  getAllAssignments,
  getAuditLogs,
  getLoginActivityLogs,
  getLoginSummary
};
