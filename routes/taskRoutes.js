const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const asyncHandler = require('../middleware/asyncHandler');

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

router.use(isAuthenticated);
router.get('/dashboard', asyncHandler(taskController.getTasksForDashboard));
router.get('/client/:clientId', asyncHandler(taskController.getClientTasks));
router.post('/', asyncHandler(taskController.createTask));
router.patch('/:id/toggle-done', asyncHandler(taskController.toggleTaskDone));

module.exports = router;
