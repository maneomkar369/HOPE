const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

function logAdminAction({ admin_id, action, details }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO admin_audit_logs (id, admin_id, action, details)
    VALUES (@id, @admin_id, @action, @details)
  `).run({ id, admin_id, action, details });
}

function listRecentAdminActions(limit = 25) {
  return db.prepare(`
    SELECT l.*, u.full_name AS admin_name
    FROM admin_audit_logs l
    LEFT JOIN users u ON u.id = l.admin_id
    ORDER BY datetime(l.created_at) DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  logAdminAction,
  listRecentAdminActions
};
