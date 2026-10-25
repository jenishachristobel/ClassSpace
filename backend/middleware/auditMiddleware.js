const db = require('../config/database');

function logAuditAction({ userId, userEmail, role, action, entityType, entityId, details, req }) {
  try {
    const ip = req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
    db.run(
      `INSERT INTO audit_logs (user_id, user_email, role, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        userEmail || 'system',
        role || 'system',
        action,
        entityType,
        entityId ? String(entityId) : null,
        typeof details === 'object' ? JSON.stringify(details) : details,
        ip
      ]
    );
  } catch (err) {
    console.error('[AuditLog] Error writing audit record:', err.message);
  }
}

module.exports = { logAuditAction };

