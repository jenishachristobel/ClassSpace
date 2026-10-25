const db = require('../config/database');
const { handleSSEConnection } = require('../services/realtimeService');

function streamNotifications(req, res) {
  handleSSEConnection(req, res);
}

async function getNotifications(req, res) {
  try {
    const notifications = db.query(
      `SELECT id, title, message, type, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    const unreadCount = db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    ).count;

    return res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error('[Notifications] getNotifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
}

async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('[Notifications] markAsRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
}

async function markAllAsRead(req, res) {
  try {
    db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('[Notifications] markAllAsRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
}

module.exports = {
  streamNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead
};

