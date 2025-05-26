const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Ensure user is logged in middleware (optional)
const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  return res.redirect('/auth/login');
};

router.get('/', ensureAuthenticated, profileController.renderProfile);
router.post('/update-password', ensureAuthenticated, profileController.updatePassword);

module.exports = router;
