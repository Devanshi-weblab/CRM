const { body, validationResult } = require('express-validator');

const updatePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').notEmpty().withMessage('New password is required').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmNewPassword').custom((value, { req }) => value === req.body.newPassword || 'New passwords do not match')
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const messages = errors.array().map(e => e.msg);
  req.session.flash = { type: 'error', message: messages.join('. ') };
  return res.redirect('/profile');
}

module.exports = { updatePasswordRules, handleValidation };
