const crypto = require('crypto');
const db = require('../config/database');

// In-memory cache to debounce duplicate log events within 1.5 seconds (e.g. React StrictMode)
const recentEventsCache = new Map();

function cleanOldCacheEntries() {
  const now = Date.now();
  for (const [key, timestamp] of recentEventsCache.entries()) {
    if (now - timestamp > 5000) {
      recentEventsCache.delete(key);
    }
  }
}

/**
 * Record a login event (success or failure) to the audit log
 */
function recordLoginAttempt({
  req,
  email,
  role = null,
  authProvider = 'local_credentials',
  loginStatus = 'success',
  failureReason = null,
  userId = null,
  userName = null,
  sessionId = null
}) {
  try {
    cleanOldCacheEntries();

    const normalizedEmail = (email || 'unknown').trim().toLowerCase();
    const clientIp = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Unknown Client';

    // Debounce duplicate events triggered by React StrictMode or instant retries
    const debounceKey = `${normalizedEmail}_${authProvider}_${loginStatus}_${clientIp}_${sessionId || ''}`;
    const lastLogged = recentEventsCache.get(debounceKey);
    if (lastLogged && Date.now() - lastLogged < 1200) {
      return null;
    }
    recentEventsCache.set(debounceKey, Date.now());

    const eventId = `evt_auth_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    db.run(
      `INSERT INTO login_activity_logs (
        event_id, user_id, user_name, email, role, auth_provider,
        login_status, failure_reason, ip_address, user_agent,
        session_id, login_timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        userId || null,
        userName || null,
        normalizedEmail,
        role || null,
        authProvider,
        loginStatus,
        failureReason || null,
        clientIp,
        userAgent,
        sessionId || null,
        timestamp,
        timestamp
      ]
    );

    return eventId;
  } catch (err) {
    console.error('[LoginLogService] Failed to record login attempt:', err);
    return null;
  }
}

/**
 * Retrieve paginated and filtered login activity logs
 */
function getLoginLogs({
  page = 1,
  limit = 25,
  email = '',
  role = '',
  status = '',
  authProvider = '',
  startDate = '',
  endDate = ''
} = {}) {
  try {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));
    const offset = (pageNum - 1) * limitNum;

    let whereConditions = [];
    let params = [];

    if (email && email.trim()) {
      whereConditions.push('LOWER(email) LIKE ?');
      params.push(`%${email.trim().toLowerCase()}%`);
    }

    if (role && role !== 'all') {
      whereConditions.push('role = ?');
      params.push(role.trim());
    }

    if (status && status !== 'all') {
      whereConditions.push('login_status = ?');
      params.push(status.trim());
    }

    if (authProvider && authProvider !== 'all') {
      whereConditions.push('auth_provider = ?');
      params.push(authProvider.trim());
    }

    if (startDate) {
      whereConditions.push('DATE(login_timestamp) >= DATE(?)');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(login_timestamp) <= DATE(?)');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRow = db.get(
      `SELECT COUNT(*) as count FROM login_activity_logs ${whereClause}`,
      params
    );
    const total = countRow ? countRow.count : 0;

    const logs = db.query(
      `SELECT id, event_id, user_id, user_name, email, role,
              auth_provider, login_status, failure_reason,
              ip_address, user_agent, session_id,
              login_timestamp, created_at
       FROM login_activity_logs
       ${whereClause}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return {
      success: true,
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    };
  } catch (err) {
    console.error('[LoginLogService] getLoginLogs error:', err);
    throw err;
  }
}

/**
 * Get login summary statistics for the Admin Dashboard
 */
function getLoginSummaryStats() {
  try {
    const totalStudents = db.get('SELECT COUNT(*) as count FROM students')?.count || 0;
    const totalTeachers = db.get('SELECT COUNT(*) as count FROM teachers')?.count || 0;

    // Successful logins today (UTC)
    const loginsTodayRow = db.get(
      `SELECT COUNT(*) as count
       FROM login_activity_logs
       WHERE login_status = 'success'
         AND DATE(login_timestamp) = DATE('now')`
    );
    const successfulLoginsToday = loginsTodayRow ? loginsTodayRow.count : 0;

    // Unique students logged in today
    const uniqueStudentsRow = db.get(
      `SELECT COUNT(DISTINCT email) as count
       FROM login_activity_logs
       WHERE login_status = 'success'
         AND role = 'student'
         AND DATE(login_timestamp) = DATE('now')`
    );
    const uniqueStudentsLoggedInToday = uniqueStudentsRow ? uniqueStudentsRow.count : 0;

    // Total failed attempts today
    const failedLoginsRow = db.get(
      `SELECT COUNT(*) as count
       FROM login_activity_logs
       WHERE login_status = 'failed'
         AND DATE(login_timestamp) = DATE('now')`
    );
    const failedLoginsToday = failedLoginsRow ? failedLoginsRow.count : 0;

    // Top recent login activity
    const recentLoginLogs = db.query(
      `SELECT id, event_id, user_id, user_name, email, role,
              auth_provider, login_status, failure_reason,
              login_timestamp
       FROM login_activity_logs
       ORDER BY id DESC
       LIMIT 8`
    );

    return {
      totalRegisteredStudents: totalStudents,
      totalRegisteredTeachers: totalTeachers,
      successfulLoginsToday,
      uniqueStudentsLoggedInToday,
      failedLoginsToday,
      recentLoginLogs
    };
  } catch (err) {
    console.error('[LoginLogService] getLoginSummaryStats error:', err);
    return {
      totalRegisteredStudents: 0,
      totalRegisteredTeachers: 0,
      successfulLoginsToday: 0,
      uniqueStudentsLoggedInToday: 0,
      failedLoginsToday: 0,
      recentLoginLogs: []
    };
  }
}

module.exports = {
  recordLoginAttempt,
  getLoginLogs,
  getLoginSummaryStats
};

