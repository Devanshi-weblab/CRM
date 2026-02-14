const Activity = require('../models/Activity');
const Client = require('../models/Client');

// GET activities for a client (API)
exports.getActivities = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const client = await Client.findOne({
      _id: req.params.clientId,
      companyId: user.companyId
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const activities = await Activity.find({ clientId: req.params.clientId, companyId: user.companyId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(activities);
  } catch (err) {
    next(err);
  }
};

// POST add activity (API)
exports.addActivity = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const client = await Client.findOne({
      _id: req.params.clientId,
      companyId: user.companyId
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { type, content } = req.body;
    if (!type || !content || !['note', 'call', 'meeting'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type or content. Type must be note, call, or meeting.' });
    }

    const activity = await Activity.create({
      clientId: req.params.clientId,
      userId: user.id,
      companyId: user.companyId,
      type,
      content: content.trim()
    });
    const populated = await Activity.findById(activity._id).populate('userId', 'name').lean();
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};
