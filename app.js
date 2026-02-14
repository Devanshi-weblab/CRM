// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');

// Create Express app
const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for CDN scripts; tighten in production if needed

// Rate limit for auth (login/signup)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// MongoDB connection
const url = process.env.MONGODB_URI;
mongoose.connect(url)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Make user data available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  req.session.flash = null;
  next();
});

// Notification unread count for sidebar (authenticated users only)
app.use((req, res, next) => {
  res.locals.notificationUnreadCount = 0;
  if (!req.session.user) return next();
  const Notification = require('./models/Notification');
  Notification.countDocuments({ userId: req.session.user.id, read: false })
    .then((count) => {
      res.locals.notificationUnreadCount = count;
      next();
    })
    .catch(() => next());
});

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    const role = req.session.user.role;
    if (role === 'admin') {
      return res.redirect('/dashboard/admin');
    } else if (role === 'employee') {
      return res.redirect('/dashboard/employee');
    }
  }
  res.redirect('/auth/login'); // Or render a public landing page if you want
});


const clientRoutes = require('./routes/clientRoutes');
app.use('/clients', clientRoutes);

const authRoutes = require('./routes/authRoutes');
app.use('/auth', authLimiter, authRoutes);

const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/dashboard', dashboardRoutes);

const employeeRoutes = require('./routes/employeeRoutes');
app.use('/employees', employeeRoutes);

const profileRoutes = require('./routes/profileRoutes');
app.use('/profile', profileRoutes);

const notificationRoutes = require('./routes/notificationRoutes');
app.use('/notifications', notificationRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

// API Routes
app.use('/api/status-options', require('./routes/statusOptionRoutes'));
app.use('/api/clients', require('./routes/activityRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// 404
app.use((req, res, next) => {
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).render('error', { message: 'Page not found', status: 404 });
});

// Global error handler
app.use(errorHandler);

// Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server is listening on port " + port);
});
