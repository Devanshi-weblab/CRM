const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { isAuthenticated } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.use(isAuthenticated);

router.get('/', asyncHandler(notificationController.list));
router.get('/unread-count', asyncHandler(notificationController.unreadCount));
router.patch('/:id/read', asyncHandler(notificationController.markOneRead));
router.post('/mark-all-read', asyncHandler(notificationController.markAllRead));

module.exports = router;
