'use strict';
module.exports = function requireJSON(req, res, next) {
  const m = req.method.toUpperCase();
  if (m === 'POST' || m === 'PUT' || m === 'PATCH') {
    const ct = (req.headers['content-type'] || '').toLowerCase();
    if (!ct.startsWith('application/json')) {
      return res.status(415).json({ ok:false, error:{ code:'UNSUPPORTED_MEDIA_TYPE', message:'Content-Type must be application/json' }});
    }
  }
  next();
};
