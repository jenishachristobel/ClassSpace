const db = require('../config/database');

// In-memory registry of active SSE response streams: userId -> Set<Response>
const activeClients = new Map();

/**
 * Handle new incoming Server-Sent Events (SSE) connection
 */
function handleSSEConnection(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).end();
    return;
  }

  // Set standard headers for persistent Server-Sent Events stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': req.headers.origin || '*'
  });

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', userId, timestamp: new Date().toISOString() })}\n\n`);

  // Register client stream
  if (!activeClients.has(userId)) {
    activeClients.set(userId, new Set());
  }
  activeClients.get(userId).add(res);

  // Keep-alive heartbeat every 20 seconds to prevent proxy / browser timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 20000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    const set = activeClients.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        activeClients.delete(userId);
      }
    }
  });
}

/**
 * Send an SSE event to a specific user if they are currently connected
 */
function broadcastToUser(userId, event, payload) {
  const userStreams = activeClients.get(userId);
  if (!userStreams || userStreams.size === 0) return false;

  const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const stream of userStreams) {
    try {
      stream.write(dataString);
    } catch (e) {
      userStreams.delete(stream);
    }
  }
  return true;
}

/**
 * Create a persistent notification record in the database and push an instant SSE event
 */
function createNotification({ userId, title, message, type = 'info', link = null }) {
  try {
    if (!userId || !title || !message) return null;

    // Check for recent duplicate to prevent spamming on retries
    const existing = db.get(
      `SELECT id FROM notifications 
       WHERE user_id = ? AND title = ? AND message = ? 
         AND created_at >= datetime('now', '-2 minutes')`,
      [userId, title, message]
    );

    let notificationId;
    if (existing) {
      notificationId = existing.id;
    } else {
      const res = db.run(
        `INSERT INTO notifications (user_id, title, message, type, link, is_read)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [userId, title, message, type, link]
      );
      notificationId = res.lastInsertRowid;
    }

    const unreadCountRow = db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    const unreadCount = unreadCountRow ? unreadCountRow.count : 0;

    const notificationPayload = {
      id: notificationId,
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: 0,
      created_at: new Date().toISOString(),
      unreadCount
    };

    // Push real-time event to user
    broadcastToUser(userId, 'NOTIFICATION', notificationPayload);

    return notificationPayload;
  } catch (err) {
    console.error('[RealtimeService] createNotification error:', err);
    return null;
  }
}

/**
 * Notify all students enrolled in a subject of coursework or announcements
 */
function notifyEnrolledStudents(subjectId, { title, message, type = 'assignment', link = null, eventType = 'ASSIGNMENT_PUBLISHED' }) {
  try {
    const students = db.query(
      `SELECT DISTINCT s.user_id 
       FROM student_enrollments se 
       JOIN students s ON se.student_id = s.id 
       WHERE se.subject_id = ? AND se.status = 'enrolled'`,
      [subjectId]
    );

    for (const stu of students) {
      createNotification({
        userId: stu.user_id,
        title,
        message,
        type,
        link
      });
      broadcastToUser(stu.user_id, eventType, { subjectId, title, link });
    }
  } catch (err) {
    console.error('[RealtimeService] notifyEnrolledStudents error:', err);
  }
}

/**
 * Notify all teachers assigned to a subject
 */
function notifySubjectTeachers(subjectId, { title, message, type = 'submission', link = null, eventType = 'SUBMISSION_RECEIVED' }) {
  try {
    const teachers = db.query(
      `SELECT DISTINCT t.user_id 
       FROM teacher_subject_assignments tsa 
       JOIN teachers t ON tsa.teacher_id = t.id 
       WHERE tsa.subject_id = ?`,
      [subjectId]
    );

    for (const t of teachers) {
      createNotification({
        userId: t.user_id,
        title,
        message,
        type,
        link
      });
      broadcastToUser(t.user_id, eventType, { subjectId, title, link });
    }
  } catch (err) {
    console.error('[RealtimeService] notifySubjectTeachers error:', err);
  }
}

module.exports = {
  handleSSEConnection,
  broadcastToUser,
  createNotification,
  notifyEnrolledStudents,
  notifySubjectTeachers
};

