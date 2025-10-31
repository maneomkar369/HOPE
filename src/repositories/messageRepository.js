const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

function createMessage({ user_id, name, email, subject, message }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO contact_messages (id, user_id, name, email, subject, message)
    VALUES (@id, @user_id, @name, @email, @subject, @message)
  `).run({ id, user_id, name, email, subject, message });
  return findMessageById(id);
}

function findMessageById(id) {
  return db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(id);
}

function listMessages() {
  return db.prepare(`
    SELECT * FROM contact_messages
    ORDER BY datetime(created_at) DESC
  `).all();
}

module.exports = {
  createMessage,
  findMessageById,
  listMessages
};
