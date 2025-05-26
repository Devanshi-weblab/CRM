const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.renderProfile = async (req, res) => {
  const user = await User.findById(req.session.user.id);
  res.render('profile', { user });
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const user = await User.findById(req.session.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(400).send('Current password is incorrect.');

    if (newPassword !== confirmNewPassword) {
      return res.status(400).send('New passwords do not match.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.send('Password updated successfully.');
  } catch (err) {
    res.status(500).send('Error updating password: ' + err.message);
  }
};
