const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/database');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session token. Please log in again.' });
    }

    // Verify user still exists in database and is active
    const user = db.get(
      'SELECT id, email, role, first_name, last_name, avatar_url, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact an administrator.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      name: `${user.first_name} ${user.last_name}`,
      avatarUrl: user.avatar_url
    };

    // If teacher, resolve teacher profile ID
    if (user.role === 'teacher') {
      const teacher = db.get('SELECT id, employee_id, department, designation FROM teachers WHERE user_id = ?', [user.id]);
      if (teacher) {
        req.user.teacherId = teacher.id;
        req.user.employeeId = teacher.employee_id;
        req.user.department = teacher.department;
        req.user.designation = teacher.designation;
      }
    }

    // If student, resolve student profile ID
    if (user.role === 'student') {
      const student = db.get('SELECT id, student_id, department, semester FROM students WHERE user_id = ?', [user.id]);
      if (student) {
        req.user.studentId = student.id;
        req.user.studentCode = student.student_id;
        req.user.department = student.department;
        req.user.semester = student.semester;
      }
    }

    next();
  });
}

module.exports = { authenticateToken };

