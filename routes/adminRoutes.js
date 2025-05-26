const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin middleware
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  res.redirect('/auth/login');
}

// Apply admin middleware to all routes
router.use(isAdmin);

// Admin dashboard
router.get('/', adminController.getDashboard);

// Status Options Management
router.get('/status-options', adminController.getStatusOptions);

module.exports = router; 