const express = require('express');
const router = express.Router();

const { validateUserSignup, validateAdminSignup } = require('../utils/validators');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  createUser,
  findByEmail,
  countAdmins
} = require('../repositories/userRepository');
const { sendWelcomeEmail } = require('../services/emailService');

router.get('/choose', (req, res) => {
  res.render('auth/choose', { title: 'Get Started' });
});

router.get('/signup', (req, res) => {
  res.render('auth/signup', {
    title: 'User Sign Up',
    values: {}
  });
});

router.post('/signup', async (req, res) => {
  const errors = validateUserSignup(req.body);
  if (errors.length) {
    errors.forEach((message) => req.flash('danger', message));
    return res.render('auth/signup', {
      title: 'User Sign Up',
      values: req.body
    });
  }
  const existing = findByEmail(req.body.email);
  if (existing) {
    req.flash('danger', 'An account with this email already exists.');
    return res.render('auth/signup', {
      title: 'User Sign Up',
      values: req.body
    });
  }

  const password_hash = await hashPassword(req.body.password);
  const user = createUser({
    full_name: req.body.full_name,
    email: req.body.email,
    contact_number: req.body.contact_number,
    address: req.body.address,
    id_proof_type: req.body.id_proof_type,
    id_proof_number: req.body.id_proof_number,
    password_hash,
    role: 'user'
  });

  // Send welcome email
  try {
    await sendWelcomeEmail(user);
  } catch (emailError) {
    console.error('[Email] Failed to send welcome email:', emailError.message);
    // Continue even if email fails
  }

  req.session.user = {
    id: user.id,
    role: user.role,
    full_name: user.full_name,
    email: user.email
  };
  req.flash('success', 'Welcome aboard! Your account has been created.');
  return res.redirect('/user/dashboard');
});

router.get('/signin', (req, res) => {
  res.render('auth/signin', {
    title: 'Sign In',
    values: { role: 'user' }
  });
});

router.post('/signin', async (req, res) => {
  const { email, password, role } = req.body;
  const user = findByEmail(email || '');
  if (!user || user.role !== role) {
    req.flash('danger', 'Invalid credentials.');
    return res.render('auth/signin', {
      title: 'Sign In',
      values: { email, role }
    });
  }

  const match = await comparePassword(password || '', user.password_hash);
  if (!match) {
    req.flash('danger', 'Invalid credentials.');
    return res.render('auth/signin', {
      title: 'Sign In',
      values: { email, role }
    });
  }

  req.session.user = {
    id: user.id,
    role: user.role,
    full_name: user.full_name,
    email: user.email
  };

  req.flash('success', 'Signed in successfully.');
  if (role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  return res.redirect('/user/dashboard');
});

router.get('/admin-signup', (req, res) => {
  const adminCount = countAdmins();
  if (adminCount > 0) {
    req.flash('info', 'Admin account already exists. Please sign in.');
    return res.redirect('/auth/signin');
  }
  res.render('auth/admin-signup', {
    title: 'Admin Sign Up',
    values: {}
  });
});

router.post('/admin-signup', async (req, res) => {
  const adminCount = countAdmins();
  if (adminCount > 0) {
    req.flash('danger', 'Admin account already exists.');
    return res.redirect('/auth/signin');
  }
  const errors = validateAdminSignup(req.body);
  if (errors.length) {
    errors.forEach((message) => req.flash('danger', message));
    return res.render('auth/admin-signup', {
      title: 'Admin Sign Up',
      values: req.body
    });
  }
  const existing = findByEmail(req.body.email);
  if (existing) {
    req.flash('danger', 'An account with this email already exists.');
    return res.render('auth/admin-signup', {
      title: 'Admin Sign Up',
      values: req.body
    });
  }
  const password_hash = await hashPassword(req.body.password);
  const user = createUser({
    full_name: req.body.owner_name,
    email: req.body.email,
    contact_number: req.body.contact_number,
    address: req.body.address,
    id_proof_type: req.body.owner_id_proof_type,
    id_proof_number: req.body.owner_id_proof_number,
    password_hash,
    role: 'admin'
  });
  req.session.user = {
    id: user.id,
    role: user.role,
    full_name: user.full_name,
    email: user.email
  };
  req.flash('success', 'Admin account created.');
  return res.redirect('/admin/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
