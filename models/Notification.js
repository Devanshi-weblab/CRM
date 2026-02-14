const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  type: {
    type: String,
    enum: ['client_added', 'client_assigned', 'client_bulk_assigned', 'meeting_reminder', 'task_due', 'general'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  relatedModel: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
