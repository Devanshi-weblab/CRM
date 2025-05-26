const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Client = require('../models/Client');


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
router.get('/admin', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const companyId = req.session.user.companyId;
    const totalEmployees = await User.countDocuments({ companyId, role: 'employee' });
    const totalClients = await Client.countDocuments({ companyId });
    res.render('admin/admin-dashboard', {
      user: req.session.user,
      totalEmployees,
      totalClients
    });
  } catch (err) {
    res.status(500).send('Error loading dashboard');
  }
});

// Employee dashboard
router.get('/employee', isAuthenticated, isEmployee, (req, res) => {
  res.render('employees/employee-dashboard', { user: req.session.user });
});


module.exports = router;
