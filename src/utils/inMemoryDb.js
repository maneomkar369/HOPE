class InMemoryStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.trim();
    this.key = this.identify(sql.trim());
  }

  identify(sql) {
    if (sql.startsWith('INSERT INTO users')) return 'insertUser';
    if (sql.startsWith('SELECT * FROM users WHERE email')) return 'findUserByEmail';
    if (sql.startsWith('SELECT * FROM users WHERE id')) return 'findUserById';
    if (sql.includes('COUNT(*) as total FROM users WHERE role = \'admin\'')) return 'countAdmins';
    if (sql.startsWith('SELECT u.*, IFNULL(SUM(d.amount)')) return 'listUsersWithTotals';
    if (sql.startsWith('SELECT IFNULL(SUM(amount)')) return 'userDonationTotals';
    if (sql.startsWith('SELECT strftime')) return 'userDonationGrouped';
    if (sql.startsWith('INSERT INTO donations')) return 'insertDonation';
    if (sql.startsWith('SELECT * FROM donations WHERE id')) return 'findDonationById';
    if (sql.startsWith('SELECT * FROM donations\n    WHERE user_id = ?')) return 'listDonationsByUser';
    if (sql.startsWith('INSERT INTO recurring_donations')) return 'insertRecurring';
    if (sql.startsWith('SELECT * FROM recurring_donations WHERE id')) return 'findRecurringById';
    if (sql.startsWith('SELECT * FROM recurring_donations\n    WHERE user_id = ?')) return 'listRecurringByUser';
    if (sql.startsWith('UPDATE recurring_donations\n    SET total_occurrences')) return 'incrementRecurringOccurrence';
    if (sql.startsWith('UPDATE recurring_donations\n    SET')) return 'updateRecurring';
    if (sql.startsWith('INSERT INTO donation_reminders')) return 'insertReminder';
    if (sql.startsWith('SELECT * FROM donation_reminders WHERE id')) return 'findReminderById';
    if (sql.startsWith('SELECT * FROM recurring_donations\n    WHERE status = \'active\'')) return 'dueReminders';
    if (sql.startsWith('SELECT dr.*, rd.amount')) return 'pendingRemindersByUser';
    if (sql.startsWith('UPDATE donation_reminders SET status')) return 'updateReminderStatus';
    if (sql.startsWith('SELECT * FROM donation_reminders\n    WHERE recurring_donation_id')) return 'upcomingReminder';
    if (sql.startsWith('UPDATE recurring_donations SET status')) return 'deactivateRecurring';
    if (sql.startsWith('UPDATE donations SET receipt_path')) return 'updateDonationReceipt';
    if (sql.startsWith('SELECT d.*, u.full_name')) return 'listAllDonations';
    if (sql.startsWith('SELECT strftime(\'%Y-%m\'')) return 'donationAggregatesMonthly';
    if (sql.startsWith('INSERT INTO requirements')) return 'insertRequirement';
    if (sql.startsWith('SELECT * FROM requirements\n    ORDER BY')) return 'listRequirements';
    if (sql.startsWith('UPDATE requirements')) return 'updateRequirement';
    if (sql.startsWith('DELETE FROM requirements')) return 'deleteRequirement';
    if (sql.startsWith('SELECT * FROM requirements WHERE id')) return 'findRequirement';
    if (sql.startsWith('INSERT INTO expenditures')) return 'insertExpenditure';
    if (sql.startsWith('SELECT e.*, u.full_name AS added_by_name')) return 'listExpenditures';
    if (sql.startsWith('UPDATE expenditures')) return 'updateExpenditure';
    if (sql.startsWith('DELETE FROM expenditures')) return 'deleteExpenditure';
    if (sql.startsWith('SELECT * FROM expenditures WHERE id')) return 'findExpenditure';
    if (sql.startsWith('INSERT INTO contact_messages')) return 'insertMessage';
    if (sql.startsWith('SELECT * FROM contact_messages\n    ORDER BY')) return 'listMessages';
    if (sql.startsWith('INSERT INTO admin_audit_logs')) return 'insertAuditLog';
    if (sql.startsWith('SELECT l.*, u.full_name AS admin_name')) return 'listAuditLogs';
    if (sql.startsWith('SELECT IFNULL(SUM(amount), 0) AS total_amount')) return 'donationAggregatesTotal';
    return 'noop';
  }

  run(...args) {
    const params = this.normalizeArgs(args);
    switch (this.key) {
      case 'insertUser':
        this.db.tables.users.push({ ...params[0] });
        return { changes: 1 };
      case 'insertDonation':
        this.db.tables.donations.push({ ...params[0], created_at: new Date().toISOString() });
        return { changes: 1 };
      case 'insertRecurring':
        this.db.tables.recurring_donations.push({ ...params[0] });
        return { changes: 1 };
      case 'incrementRecurringOccurrence': {
        const id = params[0];
        const item = this.db.tables.recurring_donations.find((rec) => rec.id === id);
        if (item) {
          item.total_occurrences = (item.total_occurrences || 0) + 1;
        }
        return { changes: item ? 1 : 0 };
      }
      case 'updateRecurring': {
        const payload = params[0];
        const item = this.db.tables.recurring_donations.find((rec) => rec.id === payload.id);
        if (item) {
          Object.assign(item, payload, { id: item.id });
        }
        return { changes: item ? 1 : 0 };
      }
      case 'insertReminder':
        this.db.tables.donation_reminders.push({ ...params[0] });
        return { changes: 1 };
      case 'updateReminderStatus': {
        const [status, id] = params;
        const reminder = this.db.tables.donation_reminders.find((rem) => rem.id === id);
        if (reminder) {
          reminder.status = status;
        }
        return { changes: reminder ? 1 : 0 };
      }
      case 'deactivateRecurring': {
        const [status, id] = params;
        const recurring = this.db.tables.recurring_donations.find((rec) => rec.id === id);
        if (recurring) {
          recurring.status = status;
        }
        return { changes: recurring ? 1 : 0 };
      }
      case 'updateDonationReceipt': {
        const [receipt_path, id] = params;
        const donation = this.db.tables.donations.find((d) => d.id === id);
        if (donation) {
          donation.receipt_path = receipt_path;
        }
        return { changes: donation ? 1 : 0 };
      }
      case 'insertRequirement':
        this.db.tables.requirements.push({ ...params[0] });
        return { changes: 1 };
      case 'updateRequirement': {
        const payload = params[0];
        const item = this.db.tables.requirements.find((req) => req.id === payload.id);
        if (item) {
          Object.assign(item, payload, { id: item.id });
        }
        return { changes: item ? 1 : 0 };
      }
      case 'deleteRequirement': {
        const id = params[0];
        const before = this.db.tables.requirements.length;
        this.db.tables.requirements = this.db.tables.requirements.filter((req) => req.id !== id);
        return { changes: before - this.db.tables.requirements.length };
      }
      case 'insertExpenditure':
        this.db.tables.expenditures.push({ ...params[0] });
        return { changes: 1 };
      case 'updateExpenditure': {
        const payload = params[0];
        const existing = this.db.tables.expenditures.find((exp) => exp.id === payload.id);
        if (existing) {
          Object.assign(existing, payload, { id: existing.id });
        }
        return { changes: existing ? 1 : 0 };
      }
      case 'deleteExpenditure': {
        const id = params[0];
        const before = this.db.tables.expenditures.length;
        this.db.tables.expenditures = this.db.tables.expenditures.filter((exp) => exp.id !== id);
        return { changes: before - this.db.tables.expenditures.length };
      }
      case 'insertMessage':
        this.db.tables.contact_messages.push({ ...params[0] });
        return { changes: 1 };
      case 'insertAuditLog':
        this.db.tables.admin_audit_logs.push({ ...params[0] });
        return { changes: 1 };
      default:
        return { changes: 0 };
    }
  }

  get(...args) {
    const params = this.normalizeArgs(args);
    switch (this.key) {
      case 'findUserByEmail':
        return this.db.tables.users.find((user) => user.email === params[0]);
      case 'findUserById':
        return this.db.tables.users.find((user) => user.id === params[0]);
      case 'countAdmins': {
        const total = this.db.tables.users.filter((user) => user.role === 'admin').length;
        return { total };
      }
      case 'findDonationById':
        return this.db.tables.donations.find((donation) => donation.id === params[0]);
      case 'findRecurringById':
        return this.db.tables.recurring_donations.find((rec) => rec.id === params[0]);
      case 'findReminderById':
        return this.db.tables.donation_reminders.find((rem) => rem.id === params[0]);
      case 'upcomingReminder':
        return this.db.tables.donation_reminders.find(
          (rem) => rem.recurring_donation_id === params[0] && rem.scheduled_for === params[1]
        );
      case 'donationAggregatesTotal': {
        const totalAmount = this.db.tables.donations.reduce((sum, donation) => sum + (donation.amount || 0), 0);
        return { total_amount: totalAmount, donation_count: this.db.tables.donations.length };
      }
      case 'userDonationTotals': {
        const userId = params[0];
        const rows = this.db.tables.donations.filter((donation) => donation.user_id === userId);
        const total_amount = rows.reduce((sum, donation) => sum + (donation.amount || 0), 0);
        return { total_amount, donation_count: rows.length };
      }
      case 'findRequirement':
        return this.db.tables.requirements.find((req) => req.id === params[0]);
      case 'findExpenditure':
        return this.db.tables.expenditures.find((exp) => exp.id === params[0]);
      default:
        return undefined;
    }
  }

  all(...args) {
    const params = this.normalizeArgs(args);
    switch (this.key) {
      case 'listDonationsByUser':
        return this.db.tables.donations.filter((donation) => donation.user_id === params[0]);
      case 'listRecurringByUser':
        return this.db.tables.recurring_donations.filter((rec) => rec.user_id === params[0]);
      case 'dueReminders':
        return [];
      case 'pendingRemindersByUser':
        return [];
      case 'listRequirements':
        return [...this.db.tables.requirements];
      case 'listExpenditures':
        return [...this.db.tables.expenditures];
      case 'listMessages':
        return [...this.db.tables.contact_messages];
      case 'listAuditLogs':
        return [...this.db.tables.admin_audit_logs];
      case 'listUsersWithTotals':
        return this.db.tables.users
          .filter((user) => user.role === 'user')
          .map((user) => {
            const donations = this.db.tables.donations.filter((donation) => donation.user_id === user.id);
            const total_donated = donations.reduce((sum, donation) => sum + (donation.amount || 0), 0);
            return {
              ...user,
              total_donated,
              donation_count: donations.length
            };
          });
      case 'donationAggregatesMonthly':
      case 'userDonationGrouped':
        return [];
      case 'listAllDonations':
        return this.db.tables.donations.map((donation) => {
          const user = this.db.tables.users.find((u) => u.id === donation.user_id) || {};
          return {
            ...donation,
            user_name: user.full_name,
            user_email: user.email
          };
        });
      default:
        return [];
    }
  }

  normalizeArgs(args) {
    if (!args.length) return [];
    if (args.length === 1 && Array.isArray(args[0])) return args[0];
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !('length' in args[0])) {
      return [args[0]];
    }
    return args;
  }
}

class InMemoryDatabase {
  constructor() {
    this.tables = {
      users: [],
      donations: [],
      recurring_donations: [],
      donation_reminders: [],
      requirements: [],
      expenditures: [],
      contact_messages: [],
      admin_audit_logs: []
    };
  }

  pragma() {
    return null;
  }

  exec(sql) {
    const statements = sql.split(';').map((segment) => segment.trim()).filter(Boolean);
    statements.forEach((statement) => {
      if (statement.startsWith('DELETE FROM')) {
        const [, tableRaw] = statement.split('DELETE FROM');
        const table = tableRaw.trim().replace(/;$/, '').replace(/WHERE.+/, '').trim();
        if (this.tables[table]) {
          this.tables[table] = [];
        }
      }
    });
  }

  prepare(sql) {
    return new InMemoryStatement(this, sql);
  }

  close() {
    Object.keys(this.tables).forEach((key) => {
      this.tables[key] = [];
    });
  }
}

module.exports = InMemoryDatabase;
