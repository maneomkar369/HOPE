const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

function listExpenditures() {
  return db.prepare(`
    SELECT e.*, u.full_name AS added_by_name
    FROM expenditures e
    LEFT JOIN users u ON u.id = e.added_by_admin_id
    ORDER BY datetime(e.spent_on) DESC
  `).all();
}

function createExpenditure({ title, description, amount, spent_on, receipt_path, added_by_admin_id }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO expenditures (
      id,
      title,
      description,
      amount,
      spent_on,
      receipt_path,
      added_by_admin_id
    ) VALUES (@id, @title, @description, @amount, @spent_on, @receipt_path, @added_by_admin_id)
  `).run({
    id,
    title,
    description,
    amount: Number(amount),
    spent_on,
    receipt_path,
    added_by_admin_id
  });
  return findExpenditureById(id);
}

function updateExpenditure(id, payload) {
  db.prepare(`
    UPDATE expenditures
    SET title = @title,
        description = @description,
        amount = @amount,
        spent_on = @spent_on,
        receipt_path = COALESCE(@receipt_path, receipt_path)
    WHERE id = @id
  `).run({
    id,
    title: payload.title,
    description: payload.description,
    amount: Number(payload.amount),
    spent_on: payload.spent_on,
    receipt_path: payload.receipt_path || null
  });
  return findExpenditureById(id);
}

function deleteExpenditure(id) {
  return db.prepare('DELETE FROM expenditures WHERE id = ?').run(id);
}

function findExpenditureById(id) {
  return db.prepare('SELECT * FROM expenditures WHERE id = ?').get(id);
}

module.exports = {
  listExpenditures,
  createExpenditure,
  updateExpenditure,
  deleteExpenditure,
  findExpenditureById
};
