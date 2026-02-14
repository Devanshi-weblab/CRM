const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Client = require('../models/Client');
const StatusOption = require('../models/StatusOption');
const Activity = require('../models/Activity');
const LoginLog = require('../models/LoginLog');
const Task = require('../models/Task');
const { isAuthenticated, isAdmin, isEmployee } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { ensureMeetingRemindersForUser } = require('../services/notificationService');

// Admin dashboard
router.get('/admin', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const user = req.session.user;
  const companyId = user.companyId;
  const totalEmployees = await User.countDocuments({ companyId, role: 'employee' });
  const totalClients = await Client.countDocuments({ companyId });
  const statusOptions = await StatusOption.find({ companyId });
  const statusCounts = { noStatus: await Client.countDocuments({ companyId, status: { $exists: false } }) };
  for (const opt of statusOptions) {
    statusCounts[opt._id.toString()] = await Client.countDocuments({ companyId, status: opt._id });
  }

  // Recent activity: last 10 clients, last 5 activities, last 5 logins
  const recentClients = await Client.find({ companyId })
    .populate('addedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  const recentActivities = await Activity.find({ companyId })
    .populate('userId', 'name')
    .populate('clientId', 'name')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  const userIds = await User.find({ companyId }).select('_id').lean();
  const ids = userIds.map(u => u._id);
  const recentLogins = await LoginLog.find({ userId: { $in: ids } })
    .populate('userId', 'name')
    .sort({ loginTime: -1 })
    .limit(5)
    .lean();
  const recentActivity = [
    ...recentClients.map(c => ({
      type: 'client',
      text: `Client "${c.name}" added`,
      date: c.createdAt,
      by: c.addedBy?.name,
      link: `/clients/${c._id}`
    })),
    ...recentActivities.map(a => ({
      type: 'activity',
      text: `${a.type}: ${(a.content || '').slice(0, 40)}${(a.content && a.content.length > 40) ? '…' : ''} (${a.clientId?.name || 'Client'})`,
      date: a.createdAt,
      by: a.userId?.name,
      link: a.clientId ? `/clients/${a.clientId._id}` : null
    })),
    ...recentLogins.map(l => ({
      type: 'login',
      text: `${l.userId?.name || 'User'} logged in`,
      date: l.loginTime,
      by: null,
      link: null
    }))
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 15);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const overdueTasks = await Task.find({ companyId, done: false, dueDate: { $lt: todayStart } })
    .populate('clientId', 'name')
    .populate('assignedTo', 'name')
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();
  const dueTodayTasks = await Task.find({
    companyId,
    done: false,
    dueDate: { $gte: todayStart, $lte: todayEnd }
  })
    .populate('clientId', 'name')
    .populate('assignedTo', 'name')
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

  ensureMeetingRemindersForUser(user.id, companyId).catch((err) => console.error('Meeting reminders:', err));

  res.render('admin/admin-dashboard', {
    pageTitle: 'Admin Dashboard',
    user: req.session.user,
    totalEmployees,
    totalClients,
    statusOptions,
    statusCounts,
    recentActivity,
    overdueTasks,
    dueTodayTasks
  });
}));

// Employee dashboard
router.get('/employee', isAuthenticated, isEmployee, asyncHandler(async (req, res) => {
  const user = req.session.user;
  ensureMeetingRemindersForUser(user.id, user.companyId).catch((err) => console.error('Meeting reminders:', err));
  res.render('employees/employee-dashboard', { pageTitle: 'Employee Dashboard', user });
}));

module.exports = router;
