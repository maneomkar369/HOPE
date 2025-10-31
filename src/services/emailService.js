const nodemailer = require('nodemailer');
const ngoProfile = require('../constants/ngoProfile');

// Create transporter - configure based on your SMTP provider
// For development, you can use a service like Ethereal, Gmail, or SendGrid
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your email
    pass: process.env.SMTP_PASS  // Your password or app password
  }
});

// Test connection (optional - comment out in production)
transporter.verify((error, success) => {
  if (error) {
    console.log('[Email] SMTP configuration error:', error.message);
    console.log('[Email] Please configure SMTP settings in .env file');
  } else {
    console.log('[Email] Email service is ready');
  }
});

/**
 * Send thank you email after donation
 */
async function sendDonationThankYouEmail(donor, donation) {
  try {
    const mailOptions = {
      from: `"${ngoProfile.name}" <${process.env.SMTP_USER}>`,
      to: donor.email,
      subject: `Thank You for Your Generous Donation - ${ngoProfile.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1d3557; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Thank You!</h1>
          </div>
          
          <div style="padding: 30px; background: #f4f6fb;">
            <p style="font-size: 16px;">Dear ${donor.full_name},</p>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Thank you for your generous donation of <strong>₹${donation.amount.toFixed(2)}</strong> to ${ngoProfile.name}.
              Your support makes a real difference in the lives of those we serve.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0b7285; margin-top: 0;">Donation Details</h3>
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Receipt Number:</strong></td>
                  <td>${donation.receipt_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                  <td>₹${donation.amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Date:</strong></td>
                  <td>${new Date(donation.created_at).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Payment Method:</strong></td>
                  <td>${donation.payment_method}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Transaction Reference:</strong></td>
                  <td>${donation.transaction_reference || 'N/A'}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Your donation is tax-deductible. A detailed receipt has been attached to this email for your records.
              Keep it safe for tax purposes.
            </p>
            
            <p style="font-size: 14px; line-height: 1.6;">
              With gratitude,<br>
              <strong>${ngoProfile.name} Team</strong>
            </p>
          </div>
          
          <div style="background: #6c7a91; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">${ngoProfile.address}</p>
            <p style="margin: 5px 0 0 0;">Email: ${ngoProfile.contactEmail} | Phone: ${ngoProfile.contactPhone}</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Thank you email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send thank you email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send donation receipt via email
 */
async function sendDonationReceiptEmail(donor, donation, receiptPath) {
  try {
    const mailOptions = {
      from: `"${ngoProfile.name}" <${process.env.SMTP_USER}>`,
      to: donor.email,
      subject: `Donation Receipt - ${donation.receipt_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1d3557; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Donation Receipt</h1>
          </div>
          
          <div style="padding: 30px; background: #f4f6fb;">
            <p style="font-size: 16px;">Dear ${donor.full_name},</p>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Please find attached your official donation receipt for the amount of <strong>₹${donation.amount.toFixed(2)}</strong>.
            </p>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Receipt Number: <strong>${donation.receipt_number}</strong><br>
              Date: <strong>${new Date(donation.created_at).toLocaleDateString()}</strong>
            </p>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Thank you for your continued support!
            </p>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Best regards,<br>
              <strong>${ngoProfile.name}</strong>
            </p>
          </div>
          
          <div style="background: #6c7a91; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">${ngoProfile.contactEmail} | ${ngoProfile.contactPhone}</p>
          </div>
        </div>
      `,
      attachments: receiptPath ? [{
        filename: `receipt_${donation.receipt_number}.pdf`,
        path: receiptPath
      }] : []
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Receipt email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send receipt email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send recurring donation reminder
 */
async function sendRecurringDonationReminder(donor, recurringDonation, nextDonationDate) {
  try {
    const mailOptions = {
      from: `"${ngoProfile.name}" <${process.env.SMTP_USER}>`,
      to: donor.email,
      subject: `Upcoming Recurring Donation Reminder - ${ngoProfile.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0b7285; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Recurring Donation Reminder</h1>
          </div>
          
          <div style="padding: 30px; background: #f4f6fb;">
            <p style="font-size: 16px;">Dear ${donor.full_name},</p>
            
            <p style="font-size: 14px; line-height: 1.6;">
              This is a friendly reminder that your recurring donation is scheduled for
              <strong>${new Date(nextDonationDate).toLocaleDateString()}</strong>.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0b7285; margin-top: 0;">Donation Details</h3>
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                  <td>₹${recurringDonation.amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Frequency:</strong></td>
                  <td>${recurringDonation.frequency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Next Date:</strong></td>
                  <td>${new Date(nextDonationDate).toLocaleDateString()}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Please ensure sufficient funds are available in your account. If you need to make any changes
              to your recurring donation, please log in to your dashboard.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_BASE_URL || 'http://localhost:3000'}/user/dashboard" 
                 style="background: #0b7285; color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 6px; display: inline-block; font-weight: bold;">
                View Dashboard
              </a>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Thank you for your continued support!<br>
              <strong>${ngoProfile.name} Team</strong>
            </p>
          </div>
          
          <div style="background: #6c7a91; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">${ngoProfile.address}</p>
            <p style="margin: 5px 0 0 0;">Email: ${ngoProfile.contactEmail} | Phone: ${ngoProfile.contactPhone}</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Reminder email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send reminder email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email to new users
 */
async function sendWelcomeEmail(user) {
  try {
    const mailOptions = {
      from: `"${ngoProfile.name}" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Welcome to ${ngoProfile.name}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1d3557; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Welcome!</h1>
          </div>
          
          <div style="padding: 30px; background: #f4f6fb;">
            <p style="font-size: 16px;">Dear ${user.full_name},</p>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Thank you for joining ${ngoProfile.name}! We're excited to have you as part of our community.
            </p>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Your account has been successfully created. You can now:
            </p>
            
            <ul style="font-size: 14px; line-height: 1.8;">
              <li>Make one-time donations</li>
              <li>Set up recurring donations</li>
              <li>Track your donation history</li>
              <li>Download receipts for tax purposes</li>
              <li>View our ongoing requirements and expenditures</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_BASE_URL || 'http://localhost:3000'}/user/dashboard" 
                 style="background: #0b7285; color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 6px; display: inline-block; font-weight: bold;">
                Go to Dashboard
              </a>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6;">
              Together, we can make a difference!<br>
              <strong>${ngoProfile.name} Team</strong>
            </p>
          </div>
          
          <div style="background: #6c7a91; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">${ngoProfile.address}</p>
            <p style="margin: 5px 0 0 0;">Email: ${ngoProfile.contactEmail} | Phone: ${ngoProfile.contactPhone}</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send welcome email:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendDonationThankYouEmail,
  sendDonationReceiptEmail,
  sendRecurringDonationReminder,
  sendWelcomeEmail
};
