const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const flashMiddleware = require('./utils/flash');
const ngoProfile = require('./constants/ngoProfile');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/receipts', express.static(path.join(__dirname, '..', 'receipts')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

const donationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 donations per minute
  message: 'Too many donation requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({
      db: 'sessions.sqlite',
      dir: path.join(__dirname, '..', 'data')
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

const csrfProtection = csrf();
app.use(csrfProtection);

app.use(flashMiddleware);
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;
  res.locals.ngoProfile = ngoProfile;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.get('/', (req, res) => {
  res.render('landing', { title: 'HOPE NGO Finance Platform' });
});

// Apply specific rate limiters to auth routes
app.use('/auth/signin', authLimiter);
app.use('/auth/signup', authLimiter);

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Apply donation limiter
app.post('/user/donate', donationLimiter);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('danger', 'Security token expired or invalid. Please retry.');
    return res.redirect('back');
  }
  console.error(err);
  res.status(500).render('error', {
    title: 'Server Error',
    message: 'Something went wrong. Please try again later.'
  });
});

module.exports = app;
