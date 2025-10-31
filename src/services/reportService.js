const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const ngoProfile = require('../constants/ngoProfile');

const REPORTS_DIR = path.join(__dirname, '..', '..', 'data', 'reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate financial summary report
 */
function generateFinancialReport(startDate, endDate) {
  const reportData = {
    period: { startDate, endDate },
    donations: getDonationStats(startDate, endDate),
    expenditures: getExpenditureStats(startDate, endDate),
    donors: getDonorStats(startDate, endDate),
    campaigns: getCampaignStats(startDate, endDate)
  };

  reportData.netBalance = reportData.donations.total - reportData.expenditures.total;
  reportData.generated = new Date().toISOString();

  return reportData;
}

/**
 * Get donation statistics
 */
function getDonationStats(startDate, endDate) {
  const query = `
    SELECT 
      COUNT(*) as count,
      SUM(amount) as total,
      AVG(amount) as average,
      MIN(amount) as minimum,
      MAX(amount) as maximum
    FROM donations
    WHERE status = 'completed'
    AND created_at BETWEEN ? AND ?
  `;

  const stats = db.prepare(query).get(startDate, endDate);

  const byMethod = db.prepare(`
    SELECT payment_method, COUNT(*) as count, SUM(amount) as total
    FROM donations
    WHERE status = 'completed' AND created_at BETWEEN ? AND ?
    GROUP BY payment_method
  `).all(startDate, endDate);

  const monthly = db.prepare(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as count,
      SUM(amount) as total
    FROM donations
    WHERE status = 'completed' AND created_at BETWEEN ? AND ?
    GROUP BY month
    ORDER BY month
  `).all(startDate, endDate);

  return {
    ...stats,
    byMethod,
    monthly
  };
}

/**
 * Get expenditure statistics
 */
function getExpenditureStats(startDate, endDate) {
  const query = `
    SELECT 
      COUNT(*) as count,
      SUM(amount) as total,
      AVG(amount) as average
    FROM expenditures
    WHERE spent_on BETWEEN ? AND ?
  `;

  const stats = db.prepare(query).get(startDate, endDate);

  const topExpenditures = db.prepare(`
    SELECT title, amount, spent_on
    FROM expenditures
    WHERE spent_on BETWEEN ? AND ?
    ORDER BY amount DESC
    LIMIT 10
  `).all(startDate, endDate);

  return {
    ...stats,
    topExpenditures
  };
}

/**
 * Get donor statistics
 */
function getDonorStats(startDate, endDate) {
  const totalDonors = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM donations
    WHERE created_at BETWEEN ? AND ?
  `).get(startDate, endDate);

  const newDonors = db.prepare(`
    SELECT COUNT(*) as count
    FROM users
    WHERE role = 'user' AND created_at BETWEEN ? AND ?
  `).get(startDate, endDate);

  const topDonors = db.prepare(`
    SELECT 
      u.full_name,
      u.email,
      COUNT(d.id) as donation_count,
      SUM(d.amount) as total_donated
    FROM users u
    JOIN donations d ON u.id = d.user_id
    WHERE d.status = 'completed' AND d.created_at BETWEEN ? AND ?
    GROUP BY u.id
    ORDER BY total_donated DESC
    LIMIT 10
  `).all(startDate, endDate);

  return {
    total: totalDonors.count,
    new: newDonors.count,
    topDonors
  };
}

/**
 * Get campaign statistics
 */
function getCampaignStats(startDate, endDate) {
  const campaigns = db.prepare(`
    SELECT 
      c.id,
      c.title,
      c.goal_amount,
      c.current_amount,
      COUNT(d.id) as donation_count,
      SUM(d.amount) as total_raised
    FROM campaigns c
    LEFT JOIN donations d ON c.id = d.campaign_id 
      AND d.status = 'completed' 
      AND d.created_at BETWEEN ? AND ?
    WHERE c.created_at <= ?
    GROUP BY c.id
    ORDER BY total_raised DESC
  `).all(startDate, endDate, endDate);

  return campaigns.map(c => ({
    ...c,
    progress: ((c.current_amount / c.goal_amount) * 100).toFixed(1)
  }));
}

/**
 * Export financial report to PDF
 */
async function exportFinancialReportToPDF(reportData) {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `financial_report_${timestamp}.pdf`;
      const filepath = path.join(REPORTS_DIR, filename);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc.fontSize(24).fillColor('#1d3557').text('FINANCIAL REPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor('#6c7a91')
        .text(ngoProfile.name, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10)
        .text(`Report Period: ${new Date(reportData.period.startDate).toLocaleDateString()} - ${new Date(reportData.period.endDate).toLocaleDateString()}`, 
          { align: 'center' });
      doc.moveDown(2);

      // Summary Section
      doc.fontSize(16).fillColor('#1d3557').text('Executive Summary');
      doc.moveDown(0.5);
      
      const summaryData = [
        ['Total Donations', `₹${(reportData.donations.total || 0).toFixed(2)}`],
        ['Total Expenditures', `₹${(reportData.expenditures.total || 0).toFixed(2)}`],
        ['Net Balance', `₹${reportData.netBalance.toFixed(2)}`],
        ['Donation Count', reportData.donations.count],
        ['Average Donation', `₹${(reportData.donations.average || 0).toFixed(2)}`],
        ['Total Donors', reportData.donors.total],
        ['New Donors', reportData.donors.new]
      ];

      doc.fontSize(10).fillColor('#000');
      summaryData.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, { continued: false });
      });

      doc.moveDown(2);

      // Donations by Payment Method
      if (reportData.donations.byMethod.length > 0) {
        doc.fontSize(14).fillColor('#1d3557').text('Donations by Payment Method');
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000');
        
        reportData.donations.byMethod.forEach(method => {
          doc.text(`${method.payment_method}: ${method.count} donations, ₹${method.total.toFixed(2)}`);
        });
        doc.moveDown(1);
      }

      // Top Donors
      if (reportData.donors.topDonors.length > 0) {
        doc.addPage();
        doc.fontSize(14).fillColor('#1d3557').text('Top Donors');
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000');
        
        reportData.donors.topDonors.forEach((donor, idx) => {
          doc.text(`${idx + 1}. ${donor.full_name} - ₹${donor.total_donated.toFixed(2)} (${donor.donation_count} donations)`);
        });
        doc.moveDown(1);
      }

      // Top Expenditures
      if (reportData.expenditures.topExpenditures.length > 0) {
        doc.fontSize(14).fillColor('#1d3557').text('Top Expenditures');
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000');
        
        reportData.expenditures.topExpenditures.forEach((exp, idx) => {
          doc.text(`${idx + 1}. ${exp.title} - ₹${exp.amount.toFixed(2)} (${new Date(exp.spent_on).toLocaleDateString()})`);
        });
        doc.moveDown(1);
      }

      // Campaign Performance
      if (reportData.campaigns.length > 0) {
        doc.addPage();
        doc.fontSize(14).fillColor('#1d3557').text('Campaign Performance');
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000');
        
        reportData.campaigns.forEach(campaign => {
          doc.text(`${campaign.title}:`);
          doc.text(`  Goal: ₹${campaign.goal_amount.toFixed(2)} | Raised: ₹${(campaign.total_raised || 0).toFixed(2)} (${campaign.progress}%)`);
          doc.text(`  Donations: ${campaign.donation_count}`);
          doc.moveDown(0.5);
        });
      }

      // Footer
      doc.fontSize(8).fillColor('#6c7a91')
        .text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, 
          { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve({ success: true, filepath, filename });
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * List all generated reports
 */
function listReports() {
  try {
    if (!fs.existsSync(REPORTS_DIR)) {
      return [];
    }

    const files = fs.readdirSync(REPORTS_DIR)
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filePath = path.join(REPORTS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created);

    return files;
  } catch (error) {
    console.error('[Reports] Failed to list reports:', error.message);
    return [];
  }
}

/**
 * Delete a report
 */
function deleteReport(filename) {
  try {
    const reportPath = path.join(REPORTS_DIR, filename);
    
    if (!fs.existsSync(reportPath)) {
      return { success: false, error: 'Report file not found' };
    }

    fs.unlinkSync(reportPath);
    console.log(`[Reports] Deleted report: ${filename}`);
    
    return { success: true };
  } catch (error) {
    console.error(`[Reports] Failed to delete report ${filename}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateFinancialReport,
  exportFinancialReportToPDF,
  listReports,
  deleteReport
};
