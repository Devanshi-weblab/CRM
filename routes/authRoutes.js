const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Render forms
router.get('/login', authController.renderLogin);
router.get('/signup', authController.renderSignup);

// Auth actions
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/signup', authController.signup);

// Location update
router.post('/api/location-log', authController.updateLocation);

module.exports = router;
