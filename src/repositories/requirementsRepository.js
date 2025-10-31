const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

function listRequirements() {
  const stmt = db.prepare(`
    SELECT * FROM requirements
    ORDER BY datetime(created_at) DESC
  `);
  return stmt.all();
}

function createRequirement({ title, description, budget_amount, tentative_start, tentative_end, created_by_admin_id }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO requirements (
      id,
      title,
      description,
      budget_amount,
      tentative_start,
      tentative_end,
      created_by_admin_id
    ) VALUES (@id, @title, @description, @budget_amount, @tentative_start, @tentative_end, @created_by_admin_id)
  `).run({
    id,
    title,
    description,
    budget_amount: Number(budget_amount),
    tentative_start,
    tentative_end,
    created_by_admin_id
  });
  return findRequirementById(id);
}

function updateRequirement(id, payload) {
  db.prepare(`
    UPDATE requirements
    SET title = @title,
        description = @description,
        budget_amount = @budget_amount,
        tentative_start = @tentative_start,
        tentative_end = @tentative_end,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id,
    title: payload.title,
    description: payload.description,
    budget_amount: Number(payload.budget_amount),
    tentative_start: payload.tentative_start,
    tentative_end: payload.tentative_end
  });
  return findRequirementById(id);
}

function deleteRequirement(id) {
  return db.prepare('DELETE FROM requirements WHERE id = ?').run(id);
}

function findRequirementById(id) {
  return db.prepare('SELECT * FROM requirements WHERE id = ?').get(id);
}

module.exports = {
  listRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  findRequirementById
};
