const express = require('express');
const router = express.Router();
const statusOptionController = require('../controllers/statusOptionController');
const { createStatusOptionRules, handleValidation } = require('../validators/statusOptionValidators');
const asyncHandler = require('../middleware/asyncHandler');

function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

router.use(isAuthenticated);

router.get('/', asyncHandler(statusOptionController.getStatusOptions));
router.post('/', createStatusOptionRules, handleValidation, asyncHandler(statusOptionController.createStatusOption));
router.delete('/:id', asyncHandler(statusOptionController.deleteStatusOption));

module.exports = router; 