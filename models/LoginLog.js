// models/LoginLog.js
const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loginTime: { type: Date, default: Date.now },
  ipAddress: String,
  location: String, // e.g., "New York, USA" or "India - Mumbai"
  userAgent: String, // e.g., browser/device info
});

module.exports = mongoose.model('LoginLog', loginLogSchema);
