const { body, validationResult } = require('express-validator');

const signupRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password || 'Passwords do not match'),
  body('companyName').trim().notEmpty().withMessage('Company name is required').isLength({ max: 200 }).withMessage('Company name too long')
];

const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const messages = errors.array().map(e => e.msg);
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(400).json({ errors: messages });
  }
  if (req.originalUrl.includes('login')) {
    return res.render('login', { error: messages[0] });
  }
  if (req.originalUrl.includes('signup')) {
    return res.status(400).send(messages.join('. '));
  }
  res.status(400).send(messages.join('. '));
}

module.exports = { signupRules, loginRules, handleValidation };
