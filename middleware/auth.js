// Middleware to protect routes
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/auth/login');
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  res.redirect('/auth/login');
}

function isEmployee(req, res, next) {
  if (req.session.user && req.session.user.role === 'employee') return next();
  res.redirect('/auth/login');
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isEmployee
};
