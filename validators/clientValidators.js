const { body, validationResult } = require('express-validator');

const clientAddEditRules = [
  body('name').trim().notEmpty().withMessage('Client name is required').isLength({ max: 200 }).withMessage('Name too long'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('contactNumber').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('meetingDate').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid date').toDate(),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  body('status').optional({ checkFalsy: true }),
  body('assignedTo').optional({ checkFalsy: true })
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const messages = errors.array().map(e => e.msg);
  req.session.flash = { type: 'error', message: messages.join('. ') };
  const isEdit = req.path.includes('/edit/');
  if (isEdit) return res.redirect(req.originalUrl);
  return res.redirect('/clients/add');
}

module.exports = { clientAddEditRules, handleValidation };
