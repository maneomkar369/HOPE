const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+()\-\s]{7,20}$/;

function validateUserSignup(payload) {
  const errors = [];

  if (!payload.full_name || payload.full_name.trim().length < 3) {
    errors.push('Full name must be at least 3 characters long.');
  }
  if (!payload.email || !EMAIL_REGEX.test(payload.email)) {
    errors.push('Provide a valid email address.');
  }
  if (!payload.contact_number || !PHONE_REGEX.test(payload.contact_number)) {
    errors.push('Provide a valid contact number.');
  }
  if (!payload.address || payload.address.trim().length < 10) {
    errors.push('Address must contain at least 10 characters.');
  }
  if (!payload.id_proof_type) {
    errors.push('Select a valid ID proof type.');
  }
  if (!payload.id_proof_number || payload.id_proof_number.trim().length < 4) {
    errors.push('Enter the ID proof number.');
  }
  if (!payload.password || payload.password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }
  if (payload.password !== payload.confirm_password) {
    errors.push('Password confirmation does not match.');
  }

  return errors;
}

function validateAdminSignup(payload) {
  const errors = [];

  if (!payload.ngo_name) errors.push('NGO name is required.');
  if (!payload.email || !EMAIL_REGEX.test(payload.email)) {
    errors.push('Provide a valid email address.');
  }
  if (!payload.contact_number || !PHONE_REGEX.test(payload.contact_number)) {
    errors.push('Provide a valid primary contact number.');
  }
  if (payload.contact_number_secondary && !PHONE_REGEX.test(payload.contact_number_secondary)) {
    errors.push('Provide a valid secondary contact number.');
  }
  if (!payload.address || payload.address.trim().length < 10) {
    errors.push('Address must contain at least 10 characters.');
  }
  if (!payload.owner_name || payload.owner_name.trim().length < 3) {
    errors.push('Owner name is required.');
  }
  if (!payload.owner_id_proof_type) {
    errors.push('Select owner ID proof type.');
  }
  if (!payload.owner_id_proof_number || payload.owner_id_proof_number.trim().length < 4) {
    errors.push('Enter the owner ID proof number.');
  }
  if (!payload.password || payload.password.length < 10) {
    errors.push('Admin password must be at least 10 characters.');
  }
  if (payload.password !== payload.confirm_password) {
    errors.push('Password confirmation does not match.');
  }

  return errors;
}

function validateDonation(payload) {
  const errors = [];

  const amount = parseFloat(payload.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    errors.push('Enter a valid donation amount.');
  }
  if (!payload.payment_method) {
    errors.push('Select a payment method.');
  }

  if (payload.recurring === 'on') {
    if (!payload.frequency) {
      errors.push('Select a recurrence frequency.');
    }
    if (!payload.next_run) {
      errors.push('Provide a start date/time for the recurring donation.');
    }
  }

  return errors;
}

module.exports = {
  validateUserSignup,
  validateAdminSignup,
  validateDonation
};
