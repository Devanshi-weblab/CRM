const express = require('express');
const router = express.Router();
const statusOptionController = require('../controllers/statusOptionController');

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// Apply authentication middleware to all routes
router.use(isAuthenticated);

router.get('/', statusOptionController.getStatusOptions);
router.post('/', statusOptionController.createStatusOption);
router.delete('/:id', statusOptionController.deleteStatusOption);

module.exports = router; 