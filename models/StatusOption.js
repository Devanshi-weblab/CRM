const mongoose = require('mongoose');

const statusOptionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Per-company unique name (different companies can have same status name)
statusOptionSchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('StatusOption', statusOptionSchema); 