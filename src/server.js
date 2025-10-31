require('dotenv').config();
const app = require('./app');
const { initializeDatabase } = require('./db');
const { countAdmins, findByEmail, createUser } = require('./repositories/userRepository');
const { hashPassword } = require('./utils/password');
const { startReminderJob } = require('./jobs/reminderJob');
const { startAutomatedBackup } = require('./services/backupService');

async function ensureAdminAccount() {
  const existingCount = countAdmins();
  if (existingCount > 0) {
    return;
  }
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('No admin credentials configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
    return;
  }
  const existing = findByEmail(email);
  if (existing) {
    return;
  }
  const password_hash = await hashPassword(password);
  createUser({
    full_name: 'NGO Administrator',
    email,
    contact_number: process.env.ADMIN_CONTACT_NUMBER || '+91-90000-00000',
    address: process.env.ADMIN_ADDRESS || 'Head Office Address Pending Update',
    id_proof_type: process.env.ADMIN_ID_PROOF_TYPE || 'Aadhaar',
    id_proof_number: process.env.ADMIN_ID_PROOF_NUMBER || '0000-0000',
    password_hash,
    role: 'admin'
  });
  console.info(`Seeded admin user ${email}`);
}

async function bootstrap() {
  try {
    initializeDatabase();
    await ensureAdminAccount();
    startReminderJob();
    startAutomatedBackup();
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.info(`Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

bootstrap();
