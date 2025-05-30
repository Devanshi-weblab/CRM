// models/LoginLog.js
const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loginTime: { type: Date, default: Date.now },
  ipAddress: String,
  userAgent: String,
  // New geolocation fields
  latitude: Number,
  longitude: Number,
  fullAddress: String,
  city: String,
  country: String,
  postalCode: String,
  locationPermissionDenied: { type: Boolean, default: false }
});

module.exports = mongoose.model('LoginLog', loginLogSchema);
