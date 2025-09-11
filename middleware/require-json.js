
/* BEGIN:ARCH-COMMENT
File: middleware/require-json.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes: Exports a module API.
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */

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
