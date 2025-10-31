const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

function createDonation({
  user_id,
  campaign_id,
  amount,
  currency,
  payment_method,
  payment_details_json,
  status,
  receipt_path
}) {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO donations (
      id,
      user_id,
      campaign_id,
      amount,
      currency,
      payment_method,
      payment_details_json,
      status,
      receipt_path
    ) VALUES (@id, @user_id, @campaign_id, @amount, @currency, @payment_method, @payment_details_json, @status, @receipt_path)
  `);
  stmt.run({
    id,
    user_id,
    campaign_id: campaign_id || null,
    amount,
    currency,
    payment_method,
    payment_details_json: payment_details_json ? JSON.stringify(payment_details_json) : null,
    status,
    receipt_path
  });
  
  // Update campaign amount if donation is for a campaign
  if (campaign_id && status === 'completed') {
    const { updateCampaignAmount } = require('./campaignRepository');
    updateCampaignAmount(campaign_id, amount);
  }
  
  return getDonationById(id);
}

function updateDonationReceiptPath(id, receipt_path) {
  db.prepare('UPDATE donations SET receipt_path = ? WHERE id = ?').run(receipt_path, id);
  return getDonationById(id);
}

function getDonationById(id) {
  const stmt = db.prepare('SELECT * FROM donations WHERE id = ?');
  const row = stmt.get(id);
  if (row && row.payment_details_json) {
    if (typeof row.payment_details_json === 'string') {
      row.payment_details_json = JSON.parse(row.payment_details_json);
    }
  }
  return row;
}

function getDonationsByUser(userId) {
  const stmt = db.prepare(`
    SELECT * FROM donations
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC
  `);
  const rows = stmt.all(userId);
  return rows.map((row) => ({
    ...row,
    payment_details_json: row.payment_details_json ? (typeof row.payment_details_json === 'string' ? JSON.parse(row.payment_details_json) : row.payment_details_json) : null
  }));
}

function getAllDonations() {
  const stmt = db.prepare(`
    SELECT d.*, u.full_name AS user_name, u.email AS user_email
    FROM donations d
    INNER JOIN users u ON u.id = d.user_id
    ORDER BY datetime(d.created_at) DESC
  `);
  const rows = stmt.all();
  return rows.map((row) => ({
    ...row,
    payment_details_json: row.payment_details_json ? (typeof row.payment_details_json === 'string' ? JSON.parse(row.payment_details_json) : row.payment_details_json) : null
  }));
}

function getDonationAggregates() {
  const totals = db.prepare(`
    SELECT IFNULL(SUM(amount), 0) AS total_amount,
           COUNT(*) AS donation_count
    FROM donations
  `).get();

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS period,
           IFNULL(SUM(amount), 0) AS total
    FROM donations
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY period DESC
    LIMIT 12
  `).all();

  return { totals, monthly: monthly.reverse() };
}

function createRecurringDonation({
  user_id,
  base_donation_id,
  amount,
  currency,
  payment_method,
  payment_details_json,
  frequency,
  next_run,
  end_date,
  max_occurrences
}) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO recurring_donations (
      id,
      user_id,
      base_donation_id,
      amount,
      currency,
      payment_method,
      payment_details_json,
      frequency,
      next_run,
      end_date,
      max_occurrences
    ) VALUES (@id, @user_id, @base_donation_id, @amount, @currency, @payment_method, @payment_details_json, @frequency, @next_run, @end_date, @max_occurrences)
  `).run({
    id,
    user_id,
    base_donation_id,
    amount,
    currency,
    payment_method,
    payment_details_json: payment_details_json ? JSON.stringify(payment_details_json) : null,
    frequency,
    next_run,
    end_date,
    max_occurrences: max_occurrences ? Number(max_occurrences) : null
  });
  return getRecurringById(id);
}

function getRecurringById(id) {
  const stmt = db.prepare('SELECT * FROM recurring_donations WHERE id = ?');
  const row = stmt.get(id);
  if (row && row.payment_details_json) {
    if (typeof row.payment_details_json === 'string') {
      row.payment_details_json = JSON.parse(row.payment_details_json);
    }
  }
  return row;
}

function getRecurringByUser(userId) {
  const stmt = db.prepare(`
    SELECT * FROM recurring_donations
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC
  `);
  const rows = stmt.all(userId);
  return rows.map((row) => ({
    ...row,
    payment_details_json: row.payment_details_json ? (typeof row.payment_details_json === 'string' ? JSON.parse(row.payment_details_json) : row.payment_details_json) : null
  }));
}

function updateRecurringSchedule(id, updates) {
  const fields = [];
  const params = {};
  Object.entries(updates).forEach(([key, value]) => {
    fields.push(`${key} = @${key}`);
    params[key] = value;
  });
  params.id = id;
  if (!fields.length) {
    return getRecurringById(id);
  }
  db.prepare(`
    UPDATE recurring_donations
    SET ${fields.join(', ')}
    WHERE id = @id
  `).run(params);
  return getRecurringById(id);
}

function incrementRecurringOccurrence(id) {
  db.prepare(`
    UPDATE recurring_donations
    SET total_occurrences = total_occurrences + 1
    WHERE id = ?
  `).run(id);
}

function createReminder({ recurring_donation_id, scheduled_for, message }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO donation_reminders (id, recurring_donation_id, scheduled_for, message)
    VALUES (@id, @recurring_donation_id, @scheduled_for, @message)
  `).run({ id, recurring_donation_id, scheduled_for, message });
  return getReminderById(id);
}

function getReminderById(id) {
  return db.prepare('SELECT * FROM donation_reminders WHERE id = ?').get(id);
}

function getDueRemindersForWindow(fromIso, toIso) {
  const stmt = db.prepare(`
    SELECT * FROM recurring_donations
    WHERE status = 'active'
      AND next_run IS NOT NULL
      AND datetime(next_run) >= datetime(?)
      AND datetime(next_run) <= datetime(?)
  `);
  return stmt.all(fromIso, toIso);
}

function getPendingRemindersByUser(userId) {
  const stmt = db.prepare(`
    SELECT dr.*, rd.amount, rd.currency, rd.frequency, rd.next_run
    FROM donation_reminders dr
    INNER JOIN recurring_donations rd ON rd.id = dr.recurring_donation_id
    WHERE rd.user_id = ?
      AND dr.status = 'pending'
    ORDER BY datetime(dr.scheduled_for) ASC
  `);
  return stmt.all(userId);
}

function updateReminderStatus(id, status) {
  db.prepare('UPDATE donation_reminders SET status = ? WHERE id = ?').run(status, id);
}

function getUpcomingReminder(recurringId, scheduledFor) {
  return db.prepare(`
    SELECT * FROM donation_reminders
    WHERE recurring_donation_id = ?
      AND scheduled_for = ?
  `).get(recurringId, scheduledFor);
}

function deactivateRecurring(id, status = 'canceled') {
  db.prepare('UPDATE recurring_donations SET status = ? WHERE id = ?').run(status, id);
}

module.exports = {
  createDonation,
  getDonationById,
  getDonationsByUser,
  createRecurringDonation,
  getRecurringById,
  getRecurringByUser,
  updateRecurringSchedule,
  incrementRecurringOccurrence,
  createReminder,
  getReminderById,
  getDueRemindersForWindow,
  getPendingRemindersByUser,
  updateReminderStatus,
  getUpcomingReminder,
  deactivateRecurring,
  updateDonationReceiptPath,
  getAllDonations,
  getDonationAggregates
};
