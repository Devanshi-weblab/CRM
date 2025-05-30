const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Client = require('../models/Client');
const { isAuthenticated, isAdmin, isEmployee } = require('../middleware/auth');

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
