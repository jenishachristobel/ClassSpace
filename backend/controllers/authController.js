const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const env = require('../config/env');
const { logAuditAction } = require('../middleware/auditMiddleware');
const { recordLoginAttempt } = require('../services/loginLogService');
const {
  validateInstitutionalDomain,
  verifyGoogleIdToken,
  sendInstitutionalVerificationCode,
  verifyInstitutionalCode,
  authenticateOrProvisionStudent
} = require('../services/institutionalAuthService');

/**
 * Standard username & password login (for Admin, Teacher, and Demo accounts)
 */
async function login(req, res) {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      recordLoginAttempt({
        req,
        email: email || 'unknown',
        role: portal || null,
        authProvider: 'local_credentials',
        loginStatus: 'failed',
        failureReason: 'MISSING_CREDENTIALS'
      });
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.get('SELECT * FROM users WHERE LOWER(email) = ?', [trimmedEmail]);

    if (!user) {
      recordLoginAttempt({
        req,
        email: trimmedEmail,
        role: portal || null,
        authProvider: 'local_credentials',
        loginStatus: 'failed',
        failureReason: 'ACCOUNT_NOT_FOUND'
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials. No registered account found with this email.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      recordLoginAttempt({
        req,
        email: trimmedEmail,
        role: user.role,
        authProvider: 'local_credentials',
        loginStatus: 'failed',
        failureReason: 'INCORRECT_PASSWORD',
        userId: user.id,
        userName: `${user.first_name} ${user.last_name}`
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials. The password you entered is incorrect.' });
    }

    if (user.status !== 'active') {
      recordLoginAttempt({
        req,
        email: trimmedEmail,
        role: user.role,
        authProvider: 'local_credentials',
        loginStatus: 'failed',
        failureReason: 'ACCOUNT_INACTIVE',
        userId: user.id,
        userName: `${user.first_name} ${user.last_name}`
      });
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact the administrator.' });
    }

    // Role Enforcement: check if portal was specified and matches user's actual database role
    if (portal && portal !== 'any') {
      if (portal !== user.role) {
        let expectedPortalName = 'User';
        if (user.role === 'admin') expectedPortalName = 'Administrator';
        if (user.role === 'teacher') expectedPortalName = 'Teacher';
        if (user.role === 'student') expectedPortalName = 'Student';

        recordLoginAttempt({
          req,
          email: trimmedEmail,
          role: user.role,
          authProvider: 'local_credentials',
          loginStatus: 'failed',
          failureReason: `PORTAL_ROLE_MISMATCH: attempted ${portal}, actual is ${user.role}`,
          userId: user.id,
          userName: `${user.first_name} ${user.last_name}`
        });

        return res.status(403).json({
          success: false,
          message: `Access Denied: This account is registered as a ${expectedPortalName}. Please use the ${expectedPortalName} Login portal.`
        });
      }
    }

    // Determine default redirect path based on actual database role
    let redirectUrl = '/';
    let profileData = {};

    if (user.role === 'admin') {
      redirectUrl = '/admin/dashboard';
    } else if (user.role === 'teacher') {
      redirectUrl = '/teacher/dashboard';
      const teacher = db.get('SELECT id, employee_id, department, designation FROM teachers WHERE user_id = ?', [user.id]);
      if (teacher) {
        profileData = {
          teacherId: teacher.id,
          employeeId: teacher.employee_id,
          department: teacher.department,
          designation: teacher.designation
        };
      }
    } else if (user.role === 'student') {
      redirectUrl = '/student/dashboard';
      const student = db.get('SELECT id, student_id, department, semester FROM students WHERE user_id = ?', [user.id]);
      if (student) {
        profileData = {
          studentId: student.id,
          studentCode: student.student_id,
          department: student.department,
          semester: student.semester
        };
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Record successful login event in login_activity_logs
    recordLoginAttempt({
      req,
      email: trimmedEmail,
      role: user.role,
      authProvider: 'local_credentials',
      loginStatus: 'success',
      userId: user.id,
      userName: `${user.first_name} ${user.last_name}`
    });

    logAuditAction({
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: { role: user.role, portal: portal || 'generic', authProvider: 'local_credentials' },
      req
    });

    return res.json({
      success: true,
      token,
      redirectUrl,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        avatarUrl: user.avatar_url,
        ...profileData
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
}

/**
 * Real Student Google OAuth Login (@karunya.edu.in)
 */
async function googleStudentLogin(req, res) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      recordLoginAttempt({
        req,
        email: 'unknown',
        role: 'student',
        authProvider: 'google_oauth',
        loginStatus: 'failed',
        failureReason: 'MISSING_GOOGLE_ID_TOKEN'
      });
      return res.status(400).json({ success: false, message: 'Google authentication credential is required.' });
    }

    // 1. Verify token with Google identity service
    const verifyResult = await verifyGoogleIdToken(idToken);
    if (!verifyResult.valid) {
      recordLoginAttempt({
        req,
        email: verifyResult.email || 'unknown',
        role: 'student',
        authProvider: 'google_oauth',
        loginStatus: 'failed',
        failureReason: verifyResult.error || 'INVALID_GOOGLE_TOKEN'
      });
      return res.status(401).json({
        success: false,
        error: verifyResult.error,
        message: verifyResult.message || 'Google authentication failed.'
      });
    }

    // 2. Reject unverified emails
    if (!verifyResult.emailVerified) {
      recordLoginAttempt({
        req,
        email: verifyResult.email,
        role: 'student',
        authProvider: 'google_oauth',
        loginStatus: 'failed',
        failureReason: 'UNVERIFIED_EMAIL'
      });
      return res.status(401).json({
        success: false,
        error: 'UNVERIFIED_EMAIL',
        message: 'Google account email is not verified by Google. An authentic, verified institutional account is required.'
      });
    }

    // 3. Strict backend domain validation: must be @karunya.edu.in
    const domainCheck = validateInstitutionalDomain(verifyResult.email);
    if (!domainCheck.valid) {
      recordLoginAttempt({
        req,
        email: verifyResult.email,
        role: 'student',
        authProvider: 'google_oauth',
        loginStatus: 'failed',
        failureReason: domainCheck.error
      });
      return res.status(403).json({
        success: false,
        error: domainCheck.error,
        message: domainCheck.message
      });
    }

    // 4. Provision new student or authenticate existing student
    const result = await authenticateOrProvisionStudent({
      email: verifyResult.email,
      firstName: verifyResult.firstName,
      lastName: verifyResult.lastName,
      avatarUrl: verifyResult.avatarUrl,
      authProvider: 'google_oauth',
      req
    });

    return res.status(result.status || 200).json(result);
  } catch (err) {
    console.error('[Auth] googleStudentLogin error:', err);
    return res.status(500).json({ success: false, message: 'Server error during Google institutional authentication.' });
  }
}

/**
 * Request an Institutional Email OTP Verification Code (@karunya.edu.in)
 */
async function requestInstitutionalOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Institutional email address is required.' });
    }

    const domainCheck = validateInstitutionalDomain(email);
    if (!domainCheck.valid) {
      recordLoginAttempt({
        req,
        email,
        role: 'student',
        authProvider: 'institutional_verification',
        loginStatus: 'failed',
        failureReason: domainCheck.error
      });
      return res.status(403).json({
        success: false,
        error: domainCheck.error,
        message: domainCheck.message
      });
    }

    const codeResult = sendInstitutionalVerificationCode(domainCheck.normalizedEmail);
    return res.json(codeResult);
  } catch (err) {
    console.error('[Auth] requestInstitutionalOtp error:', err);
    return res.status(500).json({ success: false, message: 'Error generating institutional verification code.' });
  }
}

/**
 * Verify Institutional Email OTP & Authenticate/Provision Student (@karunya.edu.in)
 */
async function verifyInstitutionalOtp(req, res) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }

    const verification = verifyInstitutionalCode(email, code);
    if (!verification.valid) {
      recordLoginAttempt({
        req,
        email,
        role: 'student',
        authProvider: 'institutional_verification',
        loginStatus: 'failed',
        failureReason: verification.error || 'INVALID_VERIFICATION_CODE'
      });
      return res.status(401).json({
        success: false,
        error: verification.error,
        message: verification.message
      });
    }

    // Authentication successful: provision or load student
    const result = await authenticateOrProvisionStudent({
      email: verification.email,
      firstName: verification.firstName,
      lastName: verification.lastName,
      avatarUrl: verification.avatarUrl,
      authProvider: 'institutional_verification',
      req
    });

    return res.status(result.status || 200).json(result);
  } catch (err) {
    console.error('[Auth] verifyInstitutionalOtp error:', err);
    return res.status(500).json({ success: false, message: 'Error verifying institutional code.' });
  }
}

async function getMe(req, res) {
  try {
    const user = db.get(
      'SELECT id, email, role, first_name, last_name, avatar_url, phone, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let extra = {};
    if (user.role === 'student') {
      const stu = db.get('SELECT id, student_id, department, semester, enrollment_year FROM students WHERE user_id = ?', [user.id]);
      if (stu) {
        const enrollCount = db.get('SELECT COUNT(*) as count FROM student_enrollments WHERE student_id = ? AND status = \'enrolled\'', [stu.id]);
        extra = { ...stu, enrolledSubjectsCount: enrollCount ? enrollCount.count : 0 };
      }
    } else if (user.role === 'teacher') {
      const tea = db.get('SELECT id, employee_id, department, designation, office_room FROM teachers WHERE user_id = ?', [user.id]);
      if (tea) {
        const subCount = db.get('SELECT COUNT(DISTINCT subject_id) as count FROM teacher_subject_assignments WHERE teacher_id = ?', [tea.id]);
        extra = { ...tea, assignedSubjectsCount: subCount ? subCount.count : 0 };
      }
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        status: user.status,
        createdAt: user.created_at,
        ...extra
      }
    });
  } catch (err) {
    console.error('[Auth] getMe error:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving user profile.' });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const user = db.get('SELECT id, email, role, first_name FROM users WHERE LOWER(email) = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.json({
        success: true,
        message: 'If this email is registered in ClassSpace, a password reset instruction link has been generated.'
      });
    }

    const demoResetToken = 'rst_' + Math.random().toString(36).substring(2, 12);

    logAuditAction({
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      details: { token: demoResetToken },
      req
    });

    return res.json({
      success: true,
      message: `Password reset link simulated for ${user.first_name}. For demo testing, use the default demo password or contact the system administrator.`,
      demoResetToken
    });
  } catch (err) {
    console.error('[Auth] forgotPassword error:', err);
    return res.status(500).json({ success: false, message: 'Error processing password reset request.' });
  }
}

async function logout(req, res) {
  if (req.user) {
    logAuditAction({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: req.user.id,
      details: {},
      req
    });
  }
  return res.json({ success: true, message: 'Successfully logged out.' });
}

module.exports = {
  login,
  googleStudentLogin,
  requestInstitutionalOtp,
  verifyInstitutionalOtp,
  getMe,
  forgotPassword,
  logout
};
