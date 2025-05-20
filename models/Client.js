const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactNumber: { type: String },
  email: { type: String },
  address: { type: String },
  meetingDate: { type: Date },
  notes: { type: String },

  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Client', clientSchema);
