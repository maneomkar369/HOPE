const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const ngoProfile = require('../constants/ngoProfile');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function generateDonationReceipt(donation, user) {
  const dir = path.join(__dirname, '..', '..', 'receipts', 'donations');
  ensureDirExists(dir);
  const fileName = `${donation.id}.pdf`;
  const filePath = path.join(dir, fileName);

  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 50,
    info: {
      Title: 'Donation Receipt',
      Author: ngoProfile.name,
      Subject: `Donation Receipt for ${user.full_name}`
    }
  });
  
  doc.pipe(fs.createWriteStream(filePath));

  // Colors
  const primaryColor = '#1d3557';
  const accentColor = '#0b7285';
  const lightGray = '#f4f6fb';
  const darkGray = '#6c7a91';

  // Header Section with Border
  doc.rect(50, 50, doc.page.width - 100, 120).fillAndStroke(lightGray, primaryColor);
  
  // NGO Logo (Text-based)
  doc.fillColor(accentColor)
     .fontSize(36)
     .font('Helvetica-Bold')
     .text('HOPE', 70, 70, { width: doc.page.width - 140 });
  
  // NGO Name
  doc.fillColor(primaryColor)
     .fontSize(18)
     .font('Helvetica-Bold')
     .text(ngoProfile.name, 70, 115, { width: doc.page.width - 140 });
  
  // Address and Contact
  doc.fillColor(darkGray)
     .fontSize(10)
     .font('Helvetica')
     .text(ngoProfile.address, 70, 140, { width: doc.page.width - 140 });
  
  doc.text(`Phone: ${ngoProfile.contacts.primary} | Email: ${ngoProfile.contacts.email}`, 70, 155, { 
    width: doc.page.width - 140 
  });

  // Receipt Title
  doc.moveDown(2);
  doc.fillColor(primaryColor)
     .fontSize(24)
     .font('Helvetica-Bold')
     .text('DONATION RECEIPT', 50, 200, { align: 'center', width: doc.page.width - 100 });
  
  // Tax Exemption Note
  doc.fillColor(accentColor)
     .fontSize(10)
     .font('Helvetica-Oblique')
     .text('(Tax Exemption Certificate Available)', 50, 230, { align: 'center', width: doc.page.width - 100 });

  // Divider Line
  doc.moveTo(50, 250)
     .lineTo(doc.page.width - 50, 250)
     .strokeColor(accentColor)
     .lineWidth(2)
     .stroke();

  // Receipt Details Box
  let yPos = 270;
  
  doc.fillColor(primaryColor)
     .fontSize(11)
     .font('Helvetica-Bold')
     .text('Receipt Number:', 70, yPos);
  doc.fillColor('#000000')
     .font('Helvetica')
     .text(donation.id, 220, yPos);
  
  yPos += 20;
  doc.fillColor(primaryColor)
     .font('Helvetica-Bold')
     .text('Receipt Date:', 70, yPos);
  doc.fillColor('#000000')
     .font('Helvetica')
     .text(new Date(donation.created_at || Date.now()).toLocaleDateString('en-IN', {
       year: 'numeric',
       month: 'long',
       day: 'numeric'
     }), 220, yPos);

  // Donor Details Section
  yPos += 40;
  doc.rect(50, yPos, doc.page.width - 100, 30)
     .fillAndStroke(accentColor, accentColor);
  
  doc.fillColor('#ffffff')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('DONOR DETAILS', 70, yPos + 8);

  yPos += 40;
  const donorDetails = [
    ['Name:', user.full_name],
    ['Email:', user.email],
    ['Contact Number:', user.contact_number],
    ['Address:', user.address]
  ];

  donorDetails.forEach(([label, value]) => {
    doc.fillColor(primaryColor)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(label, 70, yPos);
    doc.fillColor('#000000')
       .font('Helvetica')
       .text(value, 220, yPos, { width: 300 });
    yPos += 20;
  });

  // Donation Details Section
  yPos += 20;
  doc.rect(50, yPos, doc.page.width - 100, 30)
     .fillAndStroke(accentColor, accentColor);
  
  doc.fillColor('#ffffff')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('DONATION DETAILS', 70, yPos + 8);

  yPos += 40;
  
  // Amount Box - Highlighted
  doc.rect(70, yPos, doc.page.width - 140, 60)
     .fillAndStroke(lightGray, primaryColor);
  
  doc.fillColor(primaryColor)
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('Amount Donated:', 90, yPos + 10);
  
  doc.fillColor(accentColor)
     .fontSize(28)
     .font('Helvetica-Bold')
     .text(`₹ ${donation.amount.toFixed(2)}`, 90, yPos + 28);

  yPos += 80;
  
  const paymentDetails = [
    ['Payment Method:', donation.payment_method.toUpperCase()],
    ['Transaction Status:', donation.status.toUpperCase()],
    ['Currency:', donation.currency]
  ];

  paymentDetails.forEach(([label, value]) => {
    doc.fillColor(primaryColor)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(label, 70, yPos);
    doc.fillColor('#000000')
       .font('Helvetica')
       .text(value, 220, yPos);
    yPos += 20;
  });

  if (donation.payment_details_json) {
    try {
      const details = JSON.parse(donation.payment_details_json);
      doc.fillColor(primaryColor)
         .font('Helvetica-Bold')
         .text('Transaction Reference:', 70, yPos);
      doc.fillColor('#000000')
         .font('Helvetica')
         .text(details.reference || details.txn_id || 'N/A', 220, yPos);
    } catch (e) {
      // Skip if JSON parse fails
    }
  }

  // Thank You Note
  yPos = doc.page.height - 180;
  doc.rect(50, yPos, doc.page.width - 100, 80)
     .fillAndStroke(lightGray, primaryColor);
  
  doc.fillColor(primaryColor)
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('Thank You for Your Generous Contribution!', 70, yPos + 15, { 
       align: 'center',
       width: doc.page.width - 140 
     });
  
  doc.fillColor('#000000')
     .fontSize(10)
     .font('Helvetica')
     .text('Your donation helps us empower under-served communities through healthcare,', 70, yPos + 35, { 
       align: 'center',
       width: doc.page.width - 140 
     });
  
  doc.text('education, and sustainable livelihoods. This receipt is eligible for tax deduction', 70, yPos + 50, { 
       align: 'center',
       width: doc.page.width - 140 
     });
  
  doc.text('as per Section 80G of the Income Tax Act, 1961.', 70, yPos + 65, { 
       align: 'center',
       width: doc.page.width - 140 
     });

  // Footer
  const footerY = doc.page.height - 80;
  doc.moveTo(50, footerY)
     .lineTo(doc.page.width - 50, footerY)
     .strokeColor(darkGray)
     .lineWidth(1)
     .stroke();
  
  doc.fillColor(darkGray)
     .fontSize(9)
     .font('Helvetica')
     .text(`${ngoProfile.name} | ${ngoProfile.tagline}`, 50, footerY + 10, { 
       align: 'center',
       width: doc.page.width - 100 
     });
  
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 50, footerY + 25, { 
       align: 'center',
       width: doc.page.width - 100 
     });

  doc.end();
  return filePath;
}

module.exports = {
  generateDonationReceipt
};
