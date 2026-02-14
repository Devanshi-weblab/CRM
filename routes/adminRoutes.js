const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.use(isAuthenticated, isAdmin);

router.get('/', asyncHandler(adminController.getDashboard));
router.get('/status-options', asyncHandler(adminController.getStatusOptions));

// Meeting Calendar route
router.get('/meetings', (req, res) => {
  res.render('admin/meeting-calendar', { user: req.session.user });
});

module.exports = router; 