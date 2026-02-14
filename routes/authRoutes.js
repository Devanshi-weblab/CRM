const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { signupRules, loginRules, handleValidation } = require('../validators/authValidators');
const asyncHandler = require('../middleware/asyncHandler');

// Render forms
router.get('/login', authController.renderLogin);
router.get('/signup', authController.renderSignup);

// Auth actions
router.post('/login', loginRules, handleValidation, asyncHandler(authController.login));
router.get('/logout', authController.logout);
router.post('/signup', signupRules, handleValidation, asyncHandler(authController.signup));
router.get('/accept-invite/:token', asyncHandler(authController.getAcceptInvite));
router.post('/accept-invite', asyncHandler(authController.postAcceptInvite));

// Location update
router.post('/api/location-log', asyncHandler(authController.updateLocation));

module.exports = router;
