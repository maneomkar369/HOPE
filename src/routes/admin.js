const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const ngoProfile = require('../constants/ngoProfile');
const {
  getAllDonations,
  getDonationAggregates,
  getRecurringByUser
} = require('../repositories/donationRepository');
const { getAllUsersWithTotals, findById } = require('../repositories/userRepository');
const {
  listRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  findRequirementById
} = require('../repositories/requirementsRepository');
const {
  listExpenditures,
  createExpenditure,
  updateExpenditure,
  deleteExpenditure,
  findExpenditureById
} = require('../repositories/expenditureRepository');
const { listMessages } = require('../repositories/messageRepository');
const { logAdminAction, listRecentAdminActions } = require('../repositories/auditRepository');
const {
  createBackup,
  listBackups,
  deleteBackup,
  getBackupStats
} = require('../services/backupService');
const {
  listCampaigns,
  findCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignStats,
  getActiveCampaignsWithProgress
} = require('../repositories/campaignRepository');
const {
  generateFinancialReport,
  exportFinancialReportToPDF,
  listReports,
  deleteReport
} = require('../services/reportService');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', '..', 'receipts', 'expenses');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => {
      const timestamp = Date.now();
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      cb(null, `${timestamp}_${sanitized}`);
    }
  }),
  fileFilter: (_, file, cb) => {
    if (!/(pdf|jpg|jpeg|png)$/i.test(file.mimetype)) {
      return cb(new Error('Only PDF or image receipts are allowed'));
    }
    return cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.use(ensureAuthenticated, ensureRole('admin'));

router.get('/dashboard', (req, res) => {
  const tab = req.query.tab || 'overview';
  let donations = getAllDonations();
  const aggregates = getDonationAggregates();
  let users = getAllUsersWithTotals();
  let requirements = listRequirements();
  let expenditures = listExpenditures();
  const messages = listMessages();
  const auditLogs = listRecentAdminActions();
  const campaigns = listCampaigns();

  // Apply filters for donations
  const { dateFrom, dateTo, minAmount, maxAmount, status, donationType, search } = req.query;
  
  if (dateFrom) {
    donations = donations.filter(d => new Date(d.created_at) >= new Date(dateFrom));
  }
  if (dateTo) {
    donations = donations.filter(d => new Date(d.created_at) <= new Date(dateTo));
  }
  if (minAmount) {
    donations = donations.filter(d => d.amount >= parseFloat(minAmount));
  }
  if (maxAmount) {
    donations = donations.filter(d => d.amount <= parseFloat(maxAmount));
  }
  if (status) {
    donations = donations.filter(d => d.status === status);
  }
  if (donationType) {
    donations = donations.filter(d => d.donation_type === donationType);
  }
  
  // Search donors by name or email
  if (search) {
    const searchLower = search.toLowerCase();
    users = users.filter(u => 
      u.full_name.toLowerCase().includes(searchLower) || 
      u.email.toLowerCase().includes(searchLower)
    );
  }
  
  // Filter expenditures by title or description
  if (req.query.expSearch) {
    const expSearchLower = req.query.expSearch.toLowerCase();
    expenditures = expenditures.filter(e => 
      e.title.toLowerCase().includes(expSearchLower) || 
      (e.description && e.description.toLowerCase().includes(expSearchLower))
    );
  }
  
  // Filter requirements by title or status
  if (req.query.reqSearch) {
    const reqSearchLower = req.query.reqSearch.toLowerCase();
    requirements = requirements.filter(r => 
      r.title.toLowerCase().includes(reqSearchLower) || 
      (r.description && r.description.toLowerCase().includes(reqSearchLower))
    );
  }
  if (req.query.reqStatus) {
    requirements = requirements.filter(r => r.status === req.query.reqStatus);
  }

  const recurringByUser = users.map((user) => ({
    user,
    recurring: getRecurringByUser(user.id)
  }));

  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    tab,
    donations,
    aggregates,
    users,
    recurringByUser,
    requirements,
    expenditures,
    messages,
    auditLogs,
    campaigns,
    ngoProfile,
    filters: { dateFrom, dateTo, minAmount, maxAmount, status, donationType, search, 
               expSearch: req.query.expSearch, reqSearch: req.query.reqSearch, reqStatus: req.query.reqStatus }
  });
});

router.post('/requirements', (req, res) => {
  const adminId = req.session.user.id;
  createRequirement({
    title: req.body.title,
    description: req.body.description,
    budget_amount: req.body.budget_amount,
    tentative_start: req.body.tentative_start,
    tentative_end: req.body.tentative_end,
    created_by_admin_id: adminId
  });
  logAdminAction({
    admin_id: adminId,
    action: 'create_requirement',
    details: `Requirement ${req.body.title}`
  });
  req.flash('success', 'Requirement added.');
  res.redirect('/admin/dashboard?tab=requirements');
});

router.post('/requirements/:id/update', (req, res) => {
  const requirement = findRequirementById(req.params.id);
  if (!requirement) {
    req.flash('danger', 'Requirement not found.');
    return res.redirect('/admin/dashboard?tab=requirements');
  }
  updateRequirement(req.params.id, req.body);
  logAdminAction({
    admin_id: req.session.user.id,
    action: 'update_requirement',
    details: `Requirement ${requirement.title}`
  });
  req.flash('success', 'Requirement updated.');
  return res.redirect('/admin/dashboard?tab=requirements');
});

router.post('/requirements/:id/delete', (req, res) => {
  const requirement = findRequirementById(req.params.id);
  if (!requirement) {
    req.flash('danger', 'Requirement not found.');
    return res.redirect('/admin/dashboard?tab=requirements');
  }
  deleteRequirement(req.params.id);
  logAdminAction({
    admin_id: req.session.user.id,
    action: 'delete_requirement',
    details: `Requirement ${requirement.title}`
  });
  req.flash('info', 'Requirement deleted.');
  return res.redirect('/admin/dashboard?tab=requirements');
});

router.post('/expenditures', upload.single('receipt'), (req, res) => {
  const adminId = req.session.user.id;
  const payload = {
    title: req.body.title,
    description: req.body.description,
    amount: req.body.amount,
    spent_on: req.body.spent_on,
    receipt_path: req.file ? path.relative(path.join(__dirname, '..', '..'), req.file.path) : null,
    added_by_admin_id: adminId
  };
  createExpenditure(payload);
  logAdminAction({
    admin_id: adminId,
    action: 'create_expenditure',
    details: `Expenditure ${payload.title}`
  });
  req.flash('success', 'Expenditure recorded.');
  res.redirect('/admin/dashboard?tab=expenditures');
});

router.post('/expenditures/:id/update', upload.single('receipt'), (req, res) => {
  const existing = findExpenditureById(req.params.id);
  if (!existing) {
    req.flash('danger', 'Expenditure not found.');
    return res.redirect('/admin/dashboard?tab=expenditures');
  }
  const receipt_path = req.file ? path.relative(path.join(__dirname, '..', '..'), req.file.path) : null;
  updateExpenditure(req.params.id, { ...req.body, receipt_path });
  logAdminAction({
    admin_id: req.session.user.id,
    action: 'update_expenditure',
    details: `Expenditure ${existing.title}`
  });
  req.flash('success', 'Expenditure updated.');
  res.redirect('/admin/dashboard?tab=expenditures');
});

router.post('/expenditures/:id/delete', (req, res) => {
  const existing = findExpenditureById(req.params.id);
  if (!existing) {
    req.flash('danger', 'Expenditure not found.');
    return res.redirect('/admin/dashboard?tab=expenditures');
  }
  if (existing.receipt_path) {
    const absolute = path.join(__dirname, '..', '..', existing.receipt_path);
    if (fs.existsSync(absolute)) {
      fs.unlinkSync(absolute);
    }
  }
  deleteExpenditure(req.params.id);
  logAdminAction({
    admin_id: req.session.user.id,
    action: 'delete_expenditure',
    details: `Expenditure ${existing.title}`
  });
  req.flash('info', 'Expenditure deleted.');
  res.redirect('/admin/dashboard?tab=expenditures');
});

router.get('/expenditures/:id/receipt', (req, res) => {
  const existing = findExpenditureById(req.params.id);
  if (!existing || !existing.receipt_path) {
    req.flash('danger', 'Receipt not found.');
    return res.redirect('/admin/dashboard?tab=expenditures');
  }
  const absolute = path.join(__dirname, '..', '..', existing.receipt_path);
  return res.download(absolute);
});

router.get('/users/:id', (req, res) => {
  const user = findById(req.params.id);
  if (!user || user.role !== 'user') {
    req.flash('danger', 'User not found.');
    return res.redirect('/admin/dashboard');
  }
  const donations = getAllDonations().filter((d) => d.user_id === user.id);
  res.render('admin/user-profile', {
    title: `User: ${user.full_name}`,
    user,
    donations
  });
});

// Export donors to CSV
router.get('/export/donors/csv', (req, res) => {
  const users = getAllUsersWithTotals();
  
  // Create CSV content
  const headers = ['Name', 'Email', 'Contact', 'Address', 'ID Proof Type', 'ID Proof Number', 'Total Donated', 'Donation Count', 'Joined Date'];
  const rows = users.map(user => [
    user.full_name,
    user.email,
    user.contact_number,
    user.address,
    user.id_proof_type,
    user.id_proof_number,
    `₹${user.total_donated.toFixed(2)}`,
    user.donation_count,
    new Date(user.created_at).toLocaleDateString()
  ]);
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="donors_${Date.now()}.csv"`);
  res.send(csv);
});

// Export donors to Excel
router.get('/export/donors/excel', async (req, res) => {
  const users = getAllUsersWithTotals();
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Donors');
  
  // Add headers with styling
  worksheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Contact', key: 'contact', width: 15 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'ID Proof Type', key: 'id_type', width: 15 },
    { header: 'ID Proof Number', key: 'id_number', width: 20 },
    { header: 'Total Donated', key: 'total', width: 15 },
    { header: 'Donation Count', key: 'count', width: 15 },
    { header: 'Joined Date', key: 'joined', width: 15 }
  ];
  
  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1D3557' }
  };
  
  // Add data rows
  users.forEach(user => {
    worksheet.addRow({
      name: user.full_name,
      email: user.email,
      contact: user.contact_number,
      address: user.address,
      id_type: user.id_proof_type,
      id_number: user.id_proof_number,
      total: `₹${user.total_donated.toFixed(2)}`,
      count: user.donation_count,
      joined: new Date(user.created_at).toLocaleDateString()
    });
  });
  
  // Add summary row
  const totalDonated = users.reduce((sum, u) => sum + u.total_donated, 0);
  const totalCount = users.reduce((sum, u) => sum + u.donation_count, 0);
  
  worksheet.addRow({});
  const summaryRow = worksheet.addRow({
    name: 'TOTAL',
    total: `₹${totalDonated.toFixed(2)}`,
    count: totalCount
  });
  summaryRow.font = { bold: true };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF4F6FB' }
  };
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="donors_${Date.now()}.xlsx"`);
  
  await workbook.xlsx.write(res);
  res.end();
});

// Backup Management Routes
router.get('/backups', (req, res) => {
  const backups = listBackups();
  const stats = getBackupStats();
  
  res.render('admin/backups', {
    title: 'Database Backups',
    backups,
    stats
  });
});

router.post('/backups/create', (req, res) => {
  const result = createBackup();
  
  if (result.success) {
    logAdminAction({
      admin_id: req.session.user.id,
      action: 'create_backup',
      details: `Backup created: ${result.filename}`
    });
    req.flash('success', `Backup created successfully: ${result.filename}`);
  } else {
    req.flash('danger', `Failed to create backup: ${result.error}`);
  }
  
  res.redirect('/admin/backups');
});

router.post('/backups/:filename/delete', (req, res) => {
  const result = deleteBackup(req.params.filename);
  
  if (result.success) {
    logAdminAction({
      admin_id: req.session.user.id,
      action: 'delete_backup',
      details: `Backup deleted: ${req.params.filename}`
    });
    req.flash('info', 'Backup deleted successfully.');
  } else {
    req.flash('danger', `Failed to delete backup: ${result.error}`);
  }
  
  res.redirect('/admin/backups');
});

router.get('/backups/:filename/download', (req, res) => {
  const backups = listBackups();
  const backup = backups.find(b => b.filename === req.params.filename);
  
  if (!backup) {
    req.flash('danger', 'Backup file not found.');
    return res.redirect('/admin/backups');
  }
  
  res.download(backup.path, req.params.filename);
});

// Campaign Management Routes
router.post('/campaigns', (req, res) => {
  const adminId = req.session.user.id;
  createCampaign({
    title: req.body.title,
    description: req.body.description,
    goal_amount: parseFloat(req.body.goal_amount),
    start_date: req.body.start_date,
    end_date: req.body.end_date || null,
    status: req.body.status || 'active',
    image_url: req.body.image_url || null,
    created_by_admin_id: adminId
  });
  
  logAdminAction({
    admin_id: adminId,
    action: 'create_campaign',
    details: `Campaign ${req.body.title}`
  });
  
  req.flash('success', 'Campaign created successfully.');
  res.redirect('/admin/dashboard?tab=campaigns');
});

router.post('/campaigns/:id/update', (req, res) => {
  const campaign = findCampaignById(req.params.id);
  if (!campaign) {
    req.flash('danger', 'Campaign not found.');
    return res.redirect('/admin/dashboard?tab=campaigns');
  }
  
  updateCampaign(req.params.id, {
    title: req.body.title,
    description: req.body.description,
    goal_amount: parseFloat(req.body.goal_amount),
    start_date: req.body.start_date,
    end_date: req.body.end_date || null,
    status: req.body.status,
    image_url: req.body.image_url || null
  });
  
  logAdminAction({
    admin_id: req.session.user.id,
    action: 'update_campaign',
    details: `Campaign ${campaign.title}`
  });
  
  req.flash('success', 'Campaign updated successfully.');
  res.redirect('/admin/dashboard?tab=campaigns');
});

router.post('/campaigns/:id/delete', (req, res) => {
  const campaign = findCampaignById(req.params.id);
  if (!campaign) {
    req.flash('danger', 'Campaign not found.');
    return res.redirect('/admin/dashboard?tab=campaigns');
  }
  
  deleteCampaign(req.params.id);
  
  logAdminAction({
    admin_id: req.session.user.id,
    action: 'delete_campaign',
    details: `Campaign ${campaign.title}`
  });
  
  req.flash('info', 'Campaign deleted.');
  res.redirect('/admin/dashboard?tab=campaigns');
});

router.get('/campaigns/:id', (req, res) => {
  const campaignStats = getCampaignStats(req.params.id);
  if (!campaignStats) {
    req.flash('danger', 'Campaign not found.');
    return res.redirect('/admin/dashboard?tab=campaigns');
  }
  
  const donations = getAllDonations().filter(d => d.campaign_id === req.params.id);
  
  res.render('admin/campaign-details', {
    title: `Campaign: ${campaignStats.title}`,
    campaign: campaignStats,
    donations
  });
});

// Financial Reports Routes
router.get('/reports', (req, res) => {
  const reports = listReports();
  
  res.render('admin/reports', {
    title: 'Financial Reports',
    reports
  });
});

router.post('/reports/generate', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      req.flash('danger', 'Please provide both start and end dates.');
      return res.redirect('/admin/reports');
    }

    const reportData = generateFinancialReport(startDate, endDate);
    const result = await exportFinancialReportToPDF(reportData);

    if (result.success) {
      logAdminAction({
        admin_id: req.session.user.id,
        action: 'generate_report',
        details: `Report generated: ${result.filename}`
      });
      req.flash('success', `Report generated successfully: ${result.filename}`);
    } else {
      req.flash('danger', 'Failed to generate report.');
    }
  } catch (error) {
    console.error('[Reports] Error generating report:', error);
    req.flash('danger', `Error: ${error.message}`);
  }

  res.redirect('/admin/reports');
});

router.get('/reports/:filename/download', (req, res) => {
  const reports = listReports();
  const report = reports.find(r => r.filename === req.params.filename);

  if (!report) {
    req.flash('danger', 'Report file not found.');
    return res.redirect('/admin/reports');
  }

  res.download(report.path, req.params.filename);
});

router.post('/reports/:filename/delete', (req, res) => {
  const result = deleteReport(req.params.filename);

  if (result.success) {
    logAdminAction({
      admin_id: req.session.user.id,
      action: 'delete_report',
      details: `Report deleted: ${req.params.filename}`
    });
    req.flash('info', 'Report deleted successfully.');
  } else {
    req.flash('danger', `Failed to delete report: ${result.error}`);
  }

  res.redirect('/admin/reports');
});

module.exports = router;
