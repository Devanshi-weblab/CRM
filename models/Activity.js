const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  type: { type: String, enum: ['note', 'call', 'meeting'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

activitySchema.index({ clientId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
