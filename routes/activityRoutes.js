const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const asyncHandler = require('../middleware/asyncHandler');

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

router.use(isAuthenticated);
router.get('/:clientId/activities', asyncHandler(activityController.getActivities));
router.post('/:clientId/activities', asyncHandler(activityController.addActivity));

module.exports = router;
