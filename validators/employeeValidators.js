const { body, validationResult } = require('express-validator');

const employeeAddEditRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail()
];

const inviteEmployeeRules = [
  body('name').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Name too long'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail()
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const messages = errors.array().map(e => e.msg);
  req.session.flash = { type: 'error', message: messages.join('. ') };
  const isEdit = req.path.includes('/edit/');
  if (isEdit) return res.redirect(req.originalUrl);
  return res.redirect('/employees/add');
}

function handleInviteValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const messages = errors.array().map(e => e.msg);
  req.session.flash = { type: 'error', message: messages.join('. ') };
  return res.redirect('/employees/invite');
}

module.exports = { employeeAddEditRules, inviteEmployeeRules, handleValidation, handleInviteValidation };
