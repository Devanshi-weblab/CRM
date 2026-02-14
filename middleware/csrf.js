/**
 * CSRF validation: require req.body._csrf or req.headers['x-csrf-token'] to match session.
 * Skip for GET, HEAD, OPTIONS.
 */
function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = req.body && req.body._csrf ? req.body._csrf : req.get('x-csrf-token');
  if (!token || token !== req.session.csrfToken) {
    if (req.xhr || req.get('Accept')?.includes('application/json')) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }
    return res.status(403).send('Invalid or missing CSRF token. Please refresh and try again.');
  }
  next();
}

module.exports = { csrfProtection };
