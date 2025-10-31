const cron = require('node-cron');
const { formatISO, addHours } = require('date-fns');
const {
  getDueRemindersForWindow,
  getUpcomingReminder,
  createReminder
} = require('../repositories/donationRepository');
const { findById } = require('../repositories/userRepository');
const { sendRecurringDonationReminder } = require('../services/emailService');

function startReminderJob() {
  cron.schedule('* * * * *', () => {
    const now = new Date();
    const oneHourLater = addHours(now, 1);
    const upcoming = getDueRemindersForWindow(formatISO(now), formatISO(oneHourLater));

    upcoming.forEach(async (recurring) => {
      if (!recurring.next_run) return;
      const existing = getUpcomingReminder(recurring.id, recurring.next_run);
      if (existing) return;

      const message = `Reminder: Your recurring donation of ${recurring.currency} ${recurring.amount.toFixed(2)} is scheduled for ${new Date(recurring.next_run).toLocaleString()}. Please confirm or cancel.`;
      createReminder({
        recurring_donation_id: recurring.id,
        scheduled_for: recurring.next_run,
        message
      });
      
      // Send email notification
      try {
        const user = findById(recurring.user_id);
        if (user) {
          await sendRecurringDonationReminder(user, recurring, recurring.next_run);
          console.info(`[reminderJob] Email sent for recurring donation ${recurring.id}`);
        }
      } catch (emailError) {
        console.error(`[reminderJob] Failed to send email for recurring donation ${recurring.id}:`, emailError.message);
      }
      
      console.info(`[reminderJob] Created reminder for recurring donation ${recurring.id}`);
    });
  });
}

module.exports = {
  startReminderJob
};
