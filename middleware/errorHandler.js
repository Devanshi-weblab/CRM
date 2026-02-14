/**
 * Global error handler. Logs error and sends 500 page or JSON for API.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Error';
  if (status === 500 && err.code === 11000) {
    status = 409;
    message = 'A record with this value already exists.';
  } else if (status === 500) {
    message = 'Something went wrong. Please try again later.';
  }

  const wantsJson = req.xhr || req.path.startsWith('/api/') || /application\/json/.test(req.get('Accept') || '');
  if (wantsJson) {
    return res.status(status).json({ error: message });
  }

  console.error(err);
  res.status(status).render('error', { message, status });
}

module.exports = errorHandler;
