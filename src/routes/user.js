const express = require('express');
const path = require('path');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const { validateDonation } = require('../utils/validators');
const ngoProfile = require('../constants/ngoProfile');
const {
  createDonation,
  getDonationsByUser,
  getRecurringByUser,
  getPendingRemindersByUser,
  updateReminderStatus,
  getReminderById,
  getRecurringById,
  updateRecurringSchedule,
  incrementRecurringOccurrence,
  deactivateRecurring,
  updateDonationReceiptPath,
  createRecurringDonation
} = require('../repositories/donationRepository');
const { findById, getUserDonationSummary } = require('../repositories/userRepository');
const { listRequirements } = require('../repositories/requirementsRepository');
const { listExpenditures } = require('../repositories/expenditureRepository');
const { createMessage } = require('../repositories/messageRepository');
const { generateDonationReceipt } = require('../services/receiptService');
const { sendDonationThankYouEmail, sendDonationReceiptEmail } = require('../services/emailService');
const { getActiveCampaignsWithProgress } = require('../repositories/campaignRepository');
const { getNextRun } = require('../utils/recurrence');
const { formatISO } = require('date-fns');

const router = express.Router();

router.use(ensureAuthenticated, ensureRole('user'));

router.get('/dashboard', async (req, res) => {
  const tab = req.query.tab || 'home';
  const userId = req.session.user.id;

  const donations = getDonationsByUser(userId);
  const recurringDonations = getRecurringByUser(userId);
  const reminders = getPendingRemindersByUser(userId);
  const summary = getUserDonationSummary(userId);
  const requirements = listRequirements();
  const expenditures = listExpenditures();
  const campaigns = getActiveCampaignsWithProgress();

  res.render('user/dashboard', {
    title: 'My Dashboard',
    tab,
    donations,
    recurringDonations,
    reminders,
    summary,
    requirements,
    expenditures,
    campaigns,
    ngoProfile
  });
});

router.post('/donate', async (req, res) => {
  const userId = req.session.user.id;
  const errors = validateDonation(req.body);
  if (errors.length) {
    errors.forEach((message) => req.flash('danger', message));
    return res.redirect('/user/dashboard?tab=donation');
  }

  const amount = parseFloat(req.body.amount);
  const payment_details_json = buildPaymentDetails(req.body);
  const donation = createDonation({
    user_id: userId,
    campaign_id: req.body.campaign_id || null,
    amount,
    currency: 'INR',
    payment_method: req.body.payment_method,
    payment_details_json,
    status: 'completed',
    receipt_path: null
  });

  const user = req.session.user;
  const receiptPath = generateDonationReceipt(donation, user);
  updateDonationReceiptPath(donation.id, path.relative(path.join(__dirname, '..', '..'), receiptPath));

  // Send thank you email and receipt
  try {
    await sendDonationThankYouEmail(user, donation);
    await sendDonationReceiptEmail(user, donation, receiptPath);
  } catch (emailError) {
    console.error('[Email] Failed to send donation emails:', emailError.message);
    // Continue even if email fails
  }

  if (req.body.recurring === 'on') {
    try {
      const nextRunInput = req.body.next_run;
      const nextRunIso = normalizeDateTime(nextRunInput);
      const endDateIso = req.body.end_date ? normalizeDateTime(req.body.end_date) : null;
      const recurring = createRecurringDonation({
        user_id: userId,
        base_donation_id: donation.id,
        amount,
        currency: 'INR',
        payment_method: req.body.payment_method,
        payment_details_json,
        frequency: req.body.frequency,
        next_run: nextRunIso,
        end_date: endDateIso,
        max_occurrences: req.body.max_occurrences
      });
      req.flash('success', 'Donation completed and recurrence scheduled.');
      console.info(`[donation] Recurring donation ${recurring.id} scheduled for ${recurring.next_run}`);
    } catch (error) {
      console.error('Failed to schedule recurring donation', error);
      req.flash('danger', 'Donation was successful but recurring schedule failed. Please configure again.');
    }
  } else {
    req.flash('success', 'Donation completed successfully.');
  }

  return res.redirect('/user/dashboard?tab=home');
});

router.get('/donations/:id/receipt', (req, res) => {
  const donationId = req.params.id;
  const userId = req.session.user.id;
  const donation = getDonationsByUser(userId).find((item) => item.id === donationId);
  if (!donation || !donation.receipt_path) {
    req.flash('danger', 'Receipt not found.');
    return res.redirect('/user/dashboard?tab=home');
  }
  const receiptAbsolute = path.join(__dirname, '..', '..', donation.receipt_path);
  return res.download(receiptAbsolute);
});

router.post('/contact', (req, res) => {
  const userId = req.session.user.id;
  createMessage({
    user_id: userId,
    name: req.body.name,
    email: req.body.email,
    subject: req.body.subject,
    message: req.body.message
  });
  req.flash('success', 'Message sent to the NGO admin.');
  return res.redirect('/user/dashboard?tab=contact');
});

router.post('/reminders/:id/confirm', (req, res) => {
  const reminder = getReminderById(req.params.id);
  if (!reminder) {
    req.flash('danger', 'Reminder not found.');
    return res.redirect('/user/dashboard?tab=donation');
  }
  const recurring = getRecurringById(reminder.recurring_donation_id);
  if (!recurring || recurring.user_id !== req.session.user.id) {
    req.flash('danger', 'You cannot manage this reminder.');
    return res.redirect('/user/dashboard?tab=donation');
  }

  const donation = createDonation({
    user_id: recurring.user_id,
    amount: recurring.amount,
    currency: recurring.currency,
    payment_method: recurring.payment_method,
    payment_details_json: recurring.payment_details_json,
    status: 'completed',
    receipt_path: null
  });
  const user = findById(recurring.user_id);
  const receiptPath = generateDonationReceipt(donation, user);
  updateDonationReceiptPath(donation.id, path.relative(path.join(__dirname, '..', '..'), receiptPath));

  incrementRecurringOccurrence(recurring.id);
  const nextRun = getNextRun(recurring.next_run, recurring.frequency);
  let shouldDeactivate = false;
  if (recurring.end_date && new Date(nextRun) > new Date(recurring.end_date)) {
    shouldDeactivate = true;
  }
  if (recurring.max_occurrences && recurring.total_occurrences + 1 >= recurring.max_occurrences) {
    shouldDeactivate = true;
  }

  if (shouldDeactivate) {
    deactivateRecurring(recurring.id, 'completed');
    updateRecurringSchedule(recurring.id, { next_run: null });
  } else {
    updateRecurringSchedule(recurring.id, { next_run });
  }

  updateReminderStatus(reminder.id, 'confirmed');
  req.flash('success', 'Recurring donation confirmed and processed.');
  return res.redirect('/user/dashboard?tab=donation');
});

router.post('/reminders/:id/cancel', (req, res) => {
  const reminder = getReminderById(req.params.id);
  if (!reminder) {
    req.flash('danger', 'Reminder not found.');
    return res.redirect('/user/dashboard?tab=donation');
  }
  const recurring = getRecurringById(reminder.recurring_donation_id);
  if (!recurring || recurring.user_id !== req.session.user.id) {
    req.flash('danger', 'You cannot manage this reminder.');
    return res.redirect('/user/dashboard?tab=donation');
  }
  updateReminderStatus(reminder.id, 'canceled');
  deactivateRecurring(recurring.id, 'paused');
  updateRecurringSchedule(recurring.id, { next_run: null });
  req.flash('info', 'Recurring donation paused.');
  return res.redirect('/user/dashboard?tab=donation');
});

function buildPaymentDetails(body) {
  const method = body.payment_method;
  const details = { method };
  switch (method) {
    case 'upi':
      details.upi_id = body.upi_id;
      break;
    case 'netbanking':
      details.bank_name = body.bank_name;
      details.account_reference = body.account_reference;
      break;
    case 'card':
      details.card_last4 = (body.card_number || '').slice(-4);
      details.card_holder = body.card_holder;
      break;
    case 'wallet':
      details.wallet_provider = body.wallet_provider;
      break;
    default:
      details.notes = body.payment_notes;
      break;
  }
  return details;
}

function normalizeDateTime(value) {
  if (!value) return null;
  const normalized = new Date(value);
  if (Number.isNaN(normalized.getTime())) {
    throw new Error('Invalid datetime value');
  }
  return formatISO(normalized, { representation: 'complete' });
}

module.exports = router;
