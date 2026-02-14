const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { updatePasswordRules, handleValidation } = require('../validators/profileValidators');
const asyncHandler = require('../middleware/asyncHandler');

const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  return res.redirect('/auth/login');
};

router.get('/', ensureAuthenticated, asyncHandler(profileController.renderProfile));
router.post('/update-password', ensureAuthenticated, updatePasswordRules, handleValidation, asyncHandler(profileController.updatePassword));

module.exports = router;
