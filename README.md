# NGO Finance Website

Comprehensive documentation for an NGO Finance Website that supports user sign up/sign in, NGO admin sign in (single admin signup or fixed credentials), donations (one-time & recurring with reminders), receipts, user & admin dashboards, expenditures, and requirements.

---

## Table of contents

- Overview
- Goals & success criteria
- User stories
- Pages & UI flow
  - Authentication (signup/signin)
  - User dashboard (tabs)
  - NGO admin dashboard
- Donation flow (detailed)
- Data models (schema + example JSON)
- API design (endpoints + contracts)
- Security & admin policy
- Recurring donations & reminders
- Receipts & export
- Edge cases & validations
- Suggested tech stack & architecture
- Setup & development notes
- Tests & QA suggestions
- Next steps / optional features

---

## Overview

This project is an NGO Finance Website that allows people to sign up as users and donate to an NGO. NGO admins manage requirements, expenses, and see donor lists and messages. The site supports:

- User sign up and sign in
- NGO admin sign in (either single admin signup allowed only once or use fixed admin credentials)
- Donation flow with multiple payment methods, confirmation and optional recurring donations with reminders before each recurrence
- User dashboard: donation history, receipts, total donations, trend graph, requirements, NGO about and contact
- NGO admin dashboard: list of users and profiles, messages sent from users, create requirements, add expenditures with receipts, and view totals

The documentation below converts your description into a clear specification suitable for implementation.

## Goals & success criteria

- Secure user authentication and role-based access (user vs admin).
- Complete donation workflow with confirmation and optional recurring donations.
- Admin-only pages to manage requirements and expenditures with receipts.
- Each user sees personalized donation history, downloadable receipts, and reminders.
- Admin can only be created once, or alternatively a fixed admin credential is used.

Success criteria:
- All required fields are collected for both user and NGO admin signups.
- Donation receipts can be downloaded as PDFs from user history and admin expense pages.
- Recurring donations trigger a confirmation reminder 1 hour before scheduled recurrence.
- Admin dashboard displays all user details and aggregated totals.

## User stories

- As an anonymous visitor, I can choose to Sign In or Sign Up as a User or NGO Admin.
- As a User I can sign up with personal details and a valid ID proof.
- As a User I can donate one-time or setup recurring donations and receive reminders.
- As a User I can view my donation history, total donated amount, trend graph and download receipts.
- As a User I can read the NGO About page and send messages (contact) to admins.
- As an NGO Admin I can view all registered users, their donation history and details.
- As an NGO Admin I can add requirements, add expenditures with receipts, and see aggregated donation totals.

## Pages & UI flow

Each visit begins with an authentication choice.

### Landing / auth selection

- Buttons: Sign In, Sign Up
- On click: choose role — "Sign in / Sign up as User" or "Sign in / Sign up as NGO Admin"
- If NGO admin signup is disabled (preferred), show only fixed admin sign-in form or a one-time admin signup if allowed.

### Sign Up (User)

Fields (required):
- Full name
- Email (unique)
- Contact number
- Address (text)
- Valid ID proof (select options: Aadhaar, Passport, Voter ID, Driving License, Other)
- ID proof number
- Password
- Confirm password

Validation:
- Email format and uniqueness
- Contact number format
- Password strength & match
- ID proof number presence

### Sign Up (NGO Admin) — only if allowed

Fields (required):
- NGO name
- NGO email
- NGO contact number
- NGO secondary contact number (optional)
- NGO address
- NGO owner / primary contact name
- Owner valid ID proof (select list)
- ID proof number
- Password
- Confirm password

Admin signup rule: allow only a single admin signup. After first successful admin creation, disable admin signup. Alternatively, you can configure a fixed admin id/password in environment variables and hide signup for admins.

### Sign In (User)

After sign in, the user sees a tabbed interface:
- Donation
- Home
- About
- Contact
- Expenditure
- Requirements

### Donation tab (User)

Steps:
1. Enter amount
2. Choose payment method (UPI, Netbanking, Card, Wallet, Other)
3. Show method-specific fields (for UPI: UPI ID & optionally UPI PIN prompt; for Netbanking: bank selection & account OTP flow simulated)
4. Confirmation screen summarizing: amount, method, payer details
5. Choose donation type: One-time or Recurring
   - If Recurring: choose recurrence frequency (daily/weekly/monthly/yearly) and the next scheduled date/time or interval, plus end date or number of payments.
6. Save donation and process payment (in a real implementation, call payment gateway). Create donation record and generate receipt PDF.
7. If recurring: schedule background job and send a confirmation reminder 1 hour before next recurrence (email/push/in-app).

UX: show progress indicators, success/failure messages, and a download receipt link after completion.

### Home tab (User)

- Total donations by this user (sum)
- Donation trend graph (time series showing donation amounts per month/week)
- List of every donation with date, time, amount, payment method, receipt download button
- Button to export/download all donation receipts (optionally filtered by date)

### About tab

Full NGO profile containing:
- NGO name, address, contact numbers
- Mission, vision, aims and goals
- How they help people and community impact
- Past campaigns and activities (add a few sample campaigns)
- Team / owner personal & professional details
- Bank / account details for direct transfer (if applicable)
- Core values, transparency statement

### Contact tab

Form fields:
- Name (prefilled for signed-in users)
- Email (prefilled)
- Subject
- Message

Also show NGO social media links (Facebook, Twitter/X, LinkedIn, Instagram, YouTube).
Messages submitted are stored and visible in the NGO Admin dashboard.

### Expenditure tab (User)

- Shows list of expenditures added by NGO admins with:
  - Title/description
  - Amount
  - Date
  - Receipt link (view/download)
- This is read-only for users. Admins create and attach receipts when recording an expense.

### Requirements tab (User)

- Shows list of NGO needs and requests with:
  - Title
  - Budget amount
  - Tentative dates
  - Description
- Users can browse and optionally pledge or ask for more info (optional future feature).

## NGO Admin pages

Admin dashboard (after sign-in) must include:

- Users list: table of all registered users with links to user profile pages.
- User profile detail: contact details, address, ID proof info, donation history (with dates and receipts), and total donated amount by that user.
- Total donated amount (aggregated sum across users) and quick stats (monthly, yearly)
- Messages: list of contact messages from users with name and email, subject, message body and timestamp
- Requirements page: create/edit/delete requirement entries (title, budget, tentative dates, details)
- Expenditures page: create/edit/delete expenditures with amount, description, date, and upload receipt (PDF/image). These expenditures are visible to users.
- Receipts management: view or download receipts for donations and expenditures.

Admin actions should be audited (who added what and when).

---

## Donation flow (detailed)

1. User chooses amount and payment method.
2. System validates the payment fields.
3. If method is simulated (for now), mark as success and create a donation record with status `completed` and generate a receipt.
4. If recurring: store recurrence schedule and create the first donation now and schedule future jobs.
5. A background worker or cron job runs to trigger scheduled payments. One hour before a scheduled payment, send a push/email reminder to the user for confirmation.
6. On confirmation, process payment; on cancellation, stop recurrence.

Notes on reminders: allow user to opt out or change reminder preferences.

---

## Data models

Below are suggested models and example JSON shapes.

### User

- id (uuid)
- full_name
- email
- contact_number
- address
- valid_id_proof_type (enum)
- valid_id_proof_number
- password_hash
- role = "user"
- created_at, updated_at

Example:

{
  "id": "uuid",
  "full_name": "Anita Sharma",
  "email": "anita@example.com",
  "contact_number": "+91-99xxxxxx",
  "address": "123 Main St, City",
  "valid_id_proof_type": "Aadhaar",
  "valid_id_proof_number": "xxxx-xxxx",
  "role": "user"
}

### NGOAdmin

- id (uuid)
- ngo_name
- email
- contact_number_primary
- contact_number_secondary
- address
- owner_name
- owner_valid_id_type
- owner_valid_id_number
- password_hash
- created_at

If using fixed credentials, this model may be seeded or the system uses env variable credentials instead.

### Donation

- id (uuid)
- user_id
- amount (decimal)
- currency
- payment_method (enum)
- payment_details (json masked)
- status (pending/completed/failed)
- is_recurring (boolean)
- recurrence (json) - interval, next_run, end_date
- receipt_url (string)
- created_at

### Expense

- id
- title
- description
- amount
- date
- receipt_url
- added_by_admin_id

### Requirement

- id
- title
- description
- budget_amount
- tentative_start_date
- tentative_end_date
- created_by_admin

### Message (Contact)

- id
- user_name
- user_email
- subject
- message
- created_at

---

## API design (RESTful) — sample endpoints

Authentication:
- POST /api/auth/signup (role=user) — body: user signup fields
- POST /api/auth/signin — body: { email, password, role }
- POST /api/auth/signup-admin (one-time only) — admin signup fields (only permitted once)
- POST /api/auth/reset-password — email

Users:
- GET /api/users/ (admin only)
- GET /api/users/:id (admin or owner)

Donations:
- POST /api/donations — create donation (user)
- GET /api/donations — list donations for current user
- GET /api/donations/:id — details and receipt
- POST /api/donations/:id/confirm — confirm pending donation

Admin-only:
- GET /api/admin/donations — all donations
- GET /api/admin/users — users listing
- POST /api/admin/expenses — add expenditure with receipt
- GET /api/admin/expenses — list expenditures
- POST /api/admin/requirements — create requirement
- GET /api/admin/messages — list contact messages

Reminders & scheduling:
- POST /api/admin/recurrence/trigger — internal hook to process scheduled donations

Receipts:
- GET /api/receipts/donation/:donationId — download receipt (authenticated)
- GET /api/receipts/expense/:expenseId — download expense receipt (authenticated)

Authentication uses JWT or session cookies. Admin-only endpoints require admin role.

---

## Security & admin policy

- Store password hashes (bcrypt/argon2). Never store plain passwords.
- Role-based access control (RBAC) to separate admin and user actions.
- Admin signup policy: either:
  - Option A (single-signup): allow a single admin account to be created via the UI once. Once created, disable admin signup and require admin login.
  - Option B (fixed credentials): don't expose admin signup; instead configure an admin username/password via environment variables (e.g., ADMIN_EMAIL and ADMIN_PASSWORD) and allow signin via these credentials only. Document where to change them.
- Protect endpoints with CSRF protection for cookie-based sessions, or use secure JWT with proper expiry and refresh.
- Validate and sanitize all inputs (addresses, messages) to prevent XSS and injection.
- Uploads (receipts) should be virus-scanned and stored with restricted access (S3 with signed URLs or a protected server path).

Suggested fixed admin env example (do not commit credentials):

ADMIN_EMAIL=admin@ngo.org
ADMIN_PASSWORD_SUPERSECRET=ChangeMeInProd

Note: prefer seeding admin into DB with secure password rather than plaintext env-password in production.

---

## Recurring donations & reminders

Recommended approach:
- Save recurrence schedule in `recurrence` field on donation (interval, next_run, end_date).
- Use background worker (Sidekiq / Celery / Bull / cron) to:
  - Run every minute to find scheduled donations with next_run <= now + 1 hour and send reminder to the user.
  - If user confirms, process payment job at next_run and then update next_run to next interval.
- Reminder mechanism: email (via SMTP/SendGrid), SMS (optional), and in-app notification.
- Provide UI for users to manage recurring donations (pause, cancel, change amount, change frequency).

Reminder example: find records with next_run in (now, now + 1 hour], send a message saying: "Your recurring donation of ₹X is scheduled at <time>. Click to confirm or cancel." If confirmed, process; if canceled, mark recurrence inactive.

---

## Receipts & export

- Generate receipts in PDF containing: NGO name & address, donor name & contact, donation amount, date/time, transaction id, payment method, receipt id.
- Store receipt URL in donation record. Allow user to download from history.
- For expenditures, admin uploads invoice/receipt; users can view and download (read-only).

Implementation tips:
- Use a templating engine (Handlebars, Jinja) + headless Chromium (Puppeteer) or a PDF library (wkhtmltopdf, ReportLab) to render PDFs.

---

## Edge cases & validations

Key edge cases to handle:
- Duplicate signups (same email) — return friendly error.
- Payment failure during donation — show clear message and allow retry.
- Recurring job runs but user removed or payment method expired — notify admin and user, pause recurrence.
- Admin signup attempt after one admin exists — reject and show instructions to reset admin via secure process.
- Receipt file upload errors — show fallback and retry.

Validation checklist:
- Strict email format and uniqueness.
- Phone number validation for expected country formats.
- Password minimum length and complexity.
- File upload size & type checks for receipts.

---

## Suggested tech stack & architecture

Minimal recommended stack:
- Frontend: React (Vite or Create React App) or Next.js for server-side capabilities
- Backend: Node.js + Express or NestJS, or Python Django/DRF or Flask
- Database: PostgreSQL (or MySQL)
- Background jobs: BullMQ (Redis) or Celery (Redis/RabbitMQ)
- File storage: S3-compatible (AWS S3, DigitalOcean Spaces) or local storage for dev
- Auth: JWT or session cookies
- Payments: integrate a payment gateway (Razorpay / Stripe / PayPal) for production; simulate in dev

Deployment:
- Docker containers with separate services (web, worker, db)
- CI/CD pipeline to deploy to a host (Heroku, Render, AWS Elastic Beanstalk, or container platform)

---

## Setup & development notes (example Node + Express + Postgres)

This README assumes you've created a codebase; below are example steps to run locally.

1. Clone repo
2. Create `.env` with DB connection and (optionally) admin credentials:

```
DATABASE_URL=postgres://user:pass@localhost:5432/ngo_finance
JWT_SECRET=some_long_secret
ADMIN_EMAIL=admin@ngo.org
ADMIN_PASSWORD_SUPERSECRET=ChangeMeInDev
S3_BUCKET=dev-bucket
```

3. Install dependencies (example Node):

```bash
npm install
npm run db:migrate
npm run dev
```

4. Run worker (for reminders):

```bash
# background worker, e.g. Bull / Node worker or Celery for Python
npm run worker
```

5. Visit http://localhost:3000

Note: exact commands depend on chosen framework. The above is illustrative.

---

## Tests & QA suggestions

- Unit tests for auth flows, donation creation, recurrence scheduling and edge cases.
- Integration tests for payment processing simulation and receipt generation.
- E2E tests (Cypress/Playwright) for signup, donation, recurring flow and admin actions.
- Manual checks for: admin single-signup behavior, reminder emails, file upload/download.

Minimal tests to include before shipping:
- Signup (user) happy path
- Donation one-time happy path
- Recurring donation schedule creation
- Admin login and adding an expense

---

## Next steps & optional features

- Implement PDF receipts with templating
- Add export of donor list as CSV (admin)
- Add donation pledge & matching employers support
- Add social login (Google/Facebook) for faster signup
- Add email templates & transactional email service
- Add analytics dashboard with charts (use Chart.js or Recharts)
- Add role management if multiple admin accounts are needed in future

---

## Contract (brief)

Inputs: user signup details, NGO admin details, donation details (amount, payment method), uploaded receipts and messages.

Outputs: donation records, receipts (PDF), recurrence reminders and admin-managed resources (requirements, expenses).

Error modes: payment failures, expired credentials, invalid file uploads, duplicate accounts.

Success: Users can donate and download receipts; Admins can manage resources and view donor details.

---

## Contact / Ownership

This document was created from the features you specified. If you want, I can scaffold a minimal starter project (React + Express) implementing authentication, a simple donation form (simulated payments), and admin/read-only pages including seeded admin credentials. Tell me which stack you prefer and I will create the initial project scaffolding and a few working endpoints.

---

## Completion note

This documentation maps your original requirements into a clear implementation plan, data models, API surface and suggested architecture. If you'd like, I can next:

- Scaffold a starter repository (choose stack: Node/Express + React, or Django) with authentication and basic donation model, or
- Create JSON schema / SQL migrations for the database, or
- Provide UI wireframe images or HTML mockups for the key pages.

Pick a next action and I will implement it.
