const path = require('path');

let Database;
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
  Database = require('./utils/inMemoryDb');
} else {
  Database = require('better-sqlite3');
}

const dbFileName = process.env.NODE_ENV === 'test' ? 'database.test.sqlite' : 'database.sqlite';
const dbPath = path.join(__dirname, '..', 'data', dbFileName);
const db = process.env.NODE_ENV === 'test' ? new Database() : new Database(dbPath);

if (db.pragma) {
  db.pragma('foreign_keys = ON');
}

function initializeDatabase() {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return;
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      contact_number TEXT NOT NULL,
      address TEXT NOT NULL,
      id_proof_type TEXT NOT NULL,
      id_proof_number TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      campaign_id TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_details_json TEXT,
      status TEXT NOT NULL,
      receipt_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_donations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      base_donation_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_details_json TEXT,
      frequency TEXT NOT NULL,
      next_run TEXT,
      end_date TEXT,
      max_occurrences INTEGER,
      total_occurrences INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (base_donation_id) REFERENCES donations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS donation_reminders (
      id TEXT PRIMARY KEY,
      recurring_donation_id TEXT NOT NULL,
      scheduled_for TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (recurring_donation_id) REFERENCES recurring_donations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      budget_amount REAL NOT NULL,
      tentative_start TEXT,
      tentative_end TEXT,
      created_by_admin_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS expenditures (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      spent_on TEXT NOT NULL,
      receipt_path TEXT,
      added_by_admin_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (added_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      goal_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused')),
      image_url TEXT,
      created_by_admin_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
}

module.exports = {
  db,
  initializeDatabase,
  dbPath
};
