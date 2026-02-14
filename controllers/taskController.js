const Task = require('../models/Task');
const Client = require('../models/Client');

// GET tasks for dashboard: due today, overdue (and optionally all for a client)
exports.getTasksForDashboard = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');
    const companyId = user.companyId;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const query = { companyId, done: false };
    // For employees, only their tasks; for admin, all or filter by assignedTo
    if (user.role === 'employee') query.assignedTo = user.id;
    const overdue = await Task.find({ ...query, dueDate: { $lt: todayStart } })
      .populate('clientId', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();
    const dueToday = await Task.find({
      ...query,
      dueDate: { $gte: todayStart, $lte: todayEnd }
    })
      .populate('clientId', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();
    res.json({ overdue, dueToday });
  } catch (err) {
    next(err);
  }
};

// GET tasks for a client (API)
exports.getClientTasks = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const client = await Client.findOne({
      _id: req.params.clientId,
      companyId: user.companyId
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const tasks = await Task.find({ clientId: req.params.clientId, companyId: user.companyId })
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 })
      .lean();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

// POST create task (API)
exports.createTask = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const client = await Client.findOne({
      _id: req.body.clientId,
      companyId: user.companyId
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const { title, dueDate, assignedTo } = req.body;
    if (!title || !dueDate) {
      return res.status(400).json({ error: 'Title and due date are required.' });
    }
    const task = await Task.create({
      clientId: client._id,
      companyId: user.companyId,
      assignedTo: assignedTo || user.id,
      title,
      dueDate: new Date(dueDate),
      done: false
    });
    const populated = await Task.findById(task._id).populate('clientId', 'name').populate('assignedTo', 'name').lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// PATCH toggle done (API)
exports.toggleTaskDone = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const task = await Task.findOne({
      _id: req.params.id,
      companyId: user.companyId
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    task.done = !task.done;
    await task.save();
    res.json(task);
  } catch (err) {
    next(err);
  }
};
