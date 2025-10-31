const { addDays, addWeeks, addMonths, addYears, formatISO } = require('date-fns');

function getNextRun(date, frequency) {
  const current = new Date(date);
  if (Number.isNaN(current.getTime())) {
    throw new Error('Invalid date for recurrence');
  }
  let nextDate;
  switch (frequency) {
    case 'daily':
      nextDate = addDays(current, 1);
      break;
    case 'weekly':
      nextDate = addWeeks(current, 1);
      break;
    case 'monthly':
      nextDate = addMonths(current, 1);
      break;
    case 'yearly':
      nextDate = addYears(current, 1);
      break;
    default:
      throw new Error('Unsupported recurrence frequency');
  }
  return formatISO(nextDate, { representation: 'complete' });
}

module.exports = {
  getNextRun
};
