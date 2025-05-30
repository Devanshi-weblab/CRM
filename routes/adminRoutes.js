const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Apply admin middleware to all routes
router.use(isAuthenticated, isAdmin);

// Admin dashboard
router.get('/', adminController.getDashboard);

// Status Options Management
router.get('/status-options', adminController.getStatusOptions);

// Meeting Calendar route
router.get('/meetings', (req, res) => {
  res.render('admin/meeting-calendar', { user: req.session.user });
});

module.exports = router; 