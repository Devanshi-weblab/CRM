const mongoose = require('mongoose');
const crypto = require('crypto');

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  tempPassword: { type: String, required: true },
  acceptedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

invitationSchema.index({ token: 1 });
invitationSchema.index({ email: 1, companyId: 1 });

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

invitationSchema.statics.createInvitation = async function (data) {
  const token = generateToken();
  const doc = new this({
    ...data,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });
  await doc.save();
  return { invitation: doc, token };
};

module.exports = mongoose.model('Invitation', invitationSchema);
