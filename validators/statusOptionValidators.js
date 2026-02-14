const { body, validationResult } = require('express-validator');

const createStatusOptionRules = [
  body('name').trim().notEmpty().withMessage('Status name is required').isLength({ max: 100 }).withMessage('Name too long')
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const messages = errors.array().map(e => e.msg);
  return res.status(400).json({ error: messages.join('. ') });
}

module.exports = { createStatusOptionRules, handleValidation };
