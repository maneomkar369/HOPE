const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

function createUser(payload) {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO users (
      id,
      full_name,
      email,
      contact_number,
      address,
      id_proof_type,
      id_proof_number,
      password_hash,
      role
    ) VALUES (@id, @full_name, @email, @contact_number, @address, @id_proof_type, @id_proof_number, @password_hash, @role)
  `);
  stmt.run({
    id,
    full_name: payload.full_name,
    email: payload.email.toLowerCase(),
    contact_number: payload.contact_number,
    address: payload.address,
    id_proof_type: payload.id_proof_type,
    id_proof_number: payload.id_proof_number,
    password_hash: payload.password_hash,
    role: payload.role
  });
  return findById(id);
}

function findByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email.toLowerCase());
}

function findById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
}

function countAdmins() {
  const stmt = db.prepare("SELECT COUNT(*) as total FROM users WHERE role = 'admin'");
  const row = stmt.get();
  return row ? row.total : 0;
}

function getAllUsersWithTotals() {
  const stmt = db.prepare(`
    SELECT u.*, IFNULL(SUM(d.amount), 0) AS total_donated, COUNT(d.id) AS donation_count
    FROM users u
    LEFT JOIN donations d ON d.user_id = u.id
    WHERE u.role = 'user'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  return stmt.all();
}

function getUserDonationSummary(userId) {
  const totals = db.prepare(`
    SELECT IFNULL(SUM(amount), 0) AS total_amount,
           COUNT(*) AS donation_count
    FROM donations
    WHERE user_id = ?
  `).get(userId);

  const grouped = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS period,
           IFNULL(SUM(amount), 0) AS total
    FROM donations
    WHERE user_id = ?
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY period
  `).all(userId);

  return {
    totals,
    grouped
  };
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  countAdmins,
  getAllUsersWithTotals,
  getUserDonationSummary
};
