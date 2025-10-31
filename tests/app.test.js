const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../src/app');
const { db, initializeDatabase, dbPath } = require('../src/db');

function resetDatabase() {
  db.exec(`
    DELETE FROM admin_audit_logs;
    DELETE FROM contact_messages;
    DELETE FROM donation_reminders;
    DELETE FROM recurring_donations;
    DELETE FROM donations;
    DELETE FROM expenditures;
    DELETE FROM requirements;
    DELETE FROM users;
  `);
}

describe('HOPE NGO Finance Website', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  beforeEach(() => {
    resetDatabase();
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  test('landing page renders successfully', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Finance Transparency for Lasting Impact');
  });

  test('user signup flow creates session and redirects to dashboard', async () => {
    const agent = request.agent(app);

    const getRes = await agent.get('/auth/signup');
    expect(getRes.status).toBe(200);
    const csrfToken = extractCsrfToken(getRes.text);
    expect(csrfToken).toBeTruthy();

    const postRes = await agent
      .post('/auth/signup')
      .type('form')
      .send({
        _csrf: csrfToken,
        full_name: 'Test User',
        email: 'test@example.com',
        contact_number: '+91-9000000000',
        address: '123 Sample Street, City',
        id_proof_type: 'Aadhaar',
        id_proof_number: '9999-8888-7777',
        password: 'password123',
        confirm_password: 'password123'
      });

    expect(postRes.status).toBe(302);
    expect(postRes.headers.location).toBe('/user/dashboard');

    const dashRes = await agent.get('/user/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.text).toContain('Total Donated');
  });
});

function extractCsrfToken(html) {
  const match = html.match(/name="_csrf" value="([^\"]+)"/);
  return match ? match[1] : null;
}
