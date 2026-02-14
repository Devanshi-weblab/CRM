const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  dueDate: { type: Date, required: true },
  done: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

taskSchema.index({ companyId: 1, assignedTo: 1, dueDate: 1 });
taskSchema.index({ companyId: 1, done: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
