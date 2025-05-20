const express = require('express');
const router = express.Router();

// Middleware to protect routes
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/auth/login');
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  res.redirect('/auth/login');
}

function isEmployee(req, res, next) {
  if (req.session.user && req.session.user.role === 'employee') return next();
  res.redirect('/auth/login');
}

// Admin dashboard
router.get('/admin', isAuthenticated, isAdmin, (req, res) => {
  res.render('admin-dashboard', { user: req.session.user });
});

// Employee dashboard
router.get('/employee', isAuthenticated, isEmployee, (req, res) => {
  res.render('employee-dashboard', { user: req.session.user });
});

module.exports = router;
