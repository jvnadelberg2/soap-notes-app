'use strict';
module.exports = function jsonError(err, req, res, next) {
  const status = Number(err.status || err.statusCode || 500);
  const code = err.code || (status === 404 ? 'NOT_FOUND' : status === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : 'INTERNAL_ERROR');
  const msg = err.message && status < 500 ? err.message : undefined;
  if (res.headersSent) return next(err);
  res.status(status).json({ ok:false, error:{ code, message: msg }});
};
