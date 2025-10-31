# 📥 Installation & Setup Guide

## HOPE - NGO Finance Management System

A comprehensive web application for managing NGO finances, donations, campaigns, and donor relationships.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v22.x or higher ([Download](https://nodejs.org/))
- **npm** v9.x or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

---

## 📦 Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/omkarmane369/HOPE.git
cd HOPE
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages:
- express
- better-sqlite3
- ejs
- bcryptjs
- nodemailer
- pdfkit
- exceljs
- node-cron
- express-rate-limit
- And more...

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file with your settings:

```properties
# Server Configuration
SESSION_SECRET=your-secret-key-change-this
APP_BASE_URL=http://localhost:3000

# Admin Credentials
ADMIN_EMAIL=admin@ngo.org
ADMIN_PASSWORD=Admin@123

# Email Configuration (Optional - for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

#### 📧 Gmail App Password Setup (Optional)
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate password for "Mail"
5. Use the 16-character password in `.env`

### 4. Start the Server

```bash
npm start
```

Server will start at: **http://localhost:3000**

---

## 🎯 First Time Setup

### 1. Access the Application
Open your browser and go to: **http://localhost:3000**

### 2. Admin Login
- Email: `admin@ngo.org`
- Password: `Admin@123`
- Role: Select **Admin**

### 3. Create User Account (Optional)
- Click "Sign Up" from homepage
- Fill in user details
- Role: **User**

---

## 📂 Project Structure

```
HOPE/
├── src/
│   ├── app.js                 # Express app configuration
│   ├── server.js              # Server startup
│   ├── db.js                  # Database initialization
│   ├── constants/
│   │   └── ngoProfile.js      # NGO information
│   ├── middleware/
│   │   └── auth.js            # Authentication middleware
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── user.js            # User dashboard routes
│   │   └── admin.js           # Admin dashboard routes
│   ├── repositories/          # Data access layer
│   ├── services/              # Business logic
│   │   ├── emailService.js    # Email notifications
│   │   ├── receiptService.js  # PDF receipts
│   │   ├── reportService.js   # Financial reports
│   │   └── backupService.js   # Database backups
│   ├── jobs/
│   │   └── reminderJob.js     # Recurring donation reminders
│   └── utils/                 # Helper functions
├── views/                     # EJS templates
├── public/                    # Static files (CSS, JS)
├── data/                      # Database & backups
├── receipts/                  # PDF receipts storage
├── package.json               # Dependencies
└── .env                       # Environment variables
```

---

## 🔧 Development

### Run in Development Mode

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

---

## ✨ Features

### User Features
- ✅ User registration & authentication
- ✅ One-time donations
- ✅ Recurring donations with reminders
- ✅ PDF receipt generation
- ✅ Donation history
- ✅ Campaign browsing
- ✅ Contact form

### Admin Features
- ✅ Complete donor management
- ✅ Expenditure tracking
- ✅ Requirements management
- ✅ Campaign management with progress tracking
- ✅ Financial reports (PDF)
- ✅ Data export (CSV/Excel)
- ✅ Database backups (automated & manual)
- ✅ Advanced filtering & search
- ✅ Audit logging

### Technical Features
- ✅ Email notifications (welcome, thank you, receipts, reminders)
- ✅ Rate limiting for security
- ✅ CSRF protection
- ✅ Role-based access control
- ✅ Session management
- ✅ Automated background jobs

---

## 🌐 Deployment

### Deploy to Production

1. **Update Environment Variables**
   ```bash
   # Set production values in .env
   APP_BASE_URL=https://your-domain.com
   SESSION_SECRET=strong-random-secret
   ```

2. **Use Process Manager (PM2)**
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name "hope-ngo"
   pm2 save
   pm2 startup
   ```

3. **Setup Nginx Reverse Proxy** (Optional)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🔐 Security Notes

- **Change default admin password** after first login
- **Use strong SESSION_SECRET** in production
- **Enable HTTPS** in production
- **Configure firewall** rules
- **Regular database backups** (automated daily at 2 AM)
- **Keep dependencies updated**: `npm audit fix`

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm start
```

### Database Issues
```bash
# Delete database and restart (WARNING: loses data)
rm data/database.sqlite
npm start
```

### Email Not Sending
- Check SMTP credentials in `.env`
- Verify Gmail App Password is correct
- Check console for email errors
- Application works without email (it's optional)

### Permission Errors
```bash
# Fix file permissions
chmod -R 755 data/ receipts/
```

---

## 📚 Documentation

- **Requirements Checklist**: See `REQUIREMENTS_CHECKLIST.md`
- **All Features**: See `ALL_FEATURES_IMPLEMENTED.md`
- **API Documentation**: See routes files in `src/routes/`

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**HOPE - Outreach & Progress Endeavor**

- **Pranjal Mundada** - Design & Frontend Developer
- **Pratiksha Navpute** - Architecture & Backend Developer
- **Rupesh Shinde** - Full Stack Developer

---

## 📞 Support

For issues, questions, or contributions:
- **GitHub Issues**: [Create an issue](https://github.com/omkarmane369/HOPE/issues)
- **Email**: admin@ngo.org

---

## 🎉 Quick Test Commands

```bash
# Install
npm install

# Start server
npm start

# Run tests
npm test

# Access application
open http://localhost:3000

# Login as admin
# Email: admin@ngo.org
# Password: Admin@123
```

---

**Made with ❤️ for NGOs making a difference**
