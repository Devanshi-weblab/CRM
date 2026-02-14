const Notification = require('../models/Notification');
const mongoose = require('mongoose');

/** GET /notifications - list notifications for current user */
exports.list = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = parseInt(req.query.skip) || 0;

    const notifications = await Notification.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (req.xhr || req.get('Accept')?.includes('application/json')) {
      return res.json({ notifications });
    }
    const unreadCount = await Notification.countDocuments({ userId: user.id, read: false });
    res.render('notifications/list', { pageTitle: 'Notifications', notifications, unreadCount, user });
  } catch (err) {
    next(err);
  }
};

/** GET /notifications/unread-count - for badge (JSON) */
exports.unreadCount = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.json({ count: 0 });
    const count = await Notification.countDocuments({ userId: user.id, read: false });
    res.json({ count });
  } catch (err) {
    next(err);
  }
};

/** PATCH /notifications/:id/read - mark one as read */
exports.markOneRead = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });

    await Notification.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: { read: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/** POST /notifications/mark-all-read - mark all as read */
exports.markAllRead = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await Notification.updateMany({ userId: user.id, read: false }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
