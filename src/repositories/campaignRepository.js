const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

/**
 * List all campaigns
 */
function listCampaigns(status = null) {
  let query = `
    SELECT c.*, u.full_name as created_by_name
    FROM campaigns c
    LEFT JOIN users u ON c.created_by_admin_id = u.id
  `;
  
  if (status) {
    query += ` WHERE c.status = ?`;
    return db.prepare(query).all(status);
  }
  
  query += ` ORDER BY c.created_at DESC`;
  return db.prepare(query).all();
}

/**
 * Find campaign by ID
 */
function findCampaignById(id) {
  return db.prepare(`
    SELECT c.*, u.full_name as created_by_name
    FROM campaigns c
    LEFT JOIN users u ON c.created_by_admin_id = u.id
    WHERE c.id = ?
  `).get(id);
}

/**
 * Create a new campaign
 */
function createCampaign(data) {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO campaigns (
      id, title, description, goal_amount, start_date, end_date, 
      status, image_url, created_by_admin_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.title,
    data.description,
    data.goal_amount,
    data.start_date,
    data.end_date || null,
    data.status || 'active',
    data.image_url || null,
    data.created_by_admin_id
  );

  return findCampaignById(id);
}

/**
 * Update campaign
 */
function updateCampaign(id, data) {
  const stmt = db.prepare(`
    UPDATE campaigns
    SET title = ?,
        description = ?,
        goal_amount = ?,
        start_date = ?,
        end_date = ?,
        status = ?,
        image_url = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `);

  stmt.run(
    data.title,
    data.description,
    data.goal_amount,
    data.start_date,
    data.end_date || null,
    data.status || 'active',
    data.image_url || null,
    id
  );

  return findCampaignById(id);
}

/**
 * Update campaign current amount
 */
function updateCampaignAmount(id, amount) {
  const stmt = db.prepare(`
    UPDATE campaigns
    SET current_amount = current_amount + ?,
        updated_at = datetime('now')
    WHERE id = ?
  `);

  stmt.run(amount, id);
  return findCampaignById(id);
}

/**
 * Delete campaign
 */
function deleteCampaign(id) {
  const stmt = db.prepare(`DELETE FROM campaigns WHERE id = ?`);
  stmt.run(id);
}

/**
 * Get campaign statistics
 */
function getCampaignStats(id) {
  const campaign = findCampaignById(id);
  if (!campaign) return null;

  const donationStats = db.prepare(`
    SELECT 
      COUNT(*) as donation_count,
      COUNT(DISTINCT user_id) as donor_count,
      SUM(amount) as total_raised
    FROM donations
    WHERE campaign_id = ? AND status = 'completed'
  `).get(id);

  const progress = (campaign.current_amount / campaign.goal_amount * 100).toFixed(1);

  return {
    ...campaign,
    ...donationStats,
    progress_percentage: Math.min(progress, 100),
    remaining_amount: Math.max(campaign.goal_amount - campaign.current_amount, 0)
  };
}

/**
 * Get active campaigns with progress
 */
function getActiveCampaignsWithProgress() {
  const campaigns = listCampaigns('active');
  
  return campaigns.map(campaign => {
    const progress = (campaign.current_amount / campaign.goal_amount * 100).toFixed(1);
    return {
      ...campaign,
      progress_percentage: Math.min(progress, 100),
      remaining_amount: Math.max(campaign.goal_amount - campaign.current_amount, 0)
    };
  });
}

module.exports = {
  listCampaigns,
  findCampaignById,
  createCampaign,
  updateCampaign,
  updateCampaignAmount,
  deleteCampaign,
  getCampaignStats,
  getActiveCampaignsWithProgress
};
