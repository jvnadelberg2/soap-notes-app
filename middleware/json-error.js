/* BEGIN:ARCH-COMMENT
File: middleware/json-error.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes: Exports a module API.
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';
module.exports = function jsonError(err, req, res, next) {
  const status = Number(err.status || err.statusCode || 500);
  const code = err.code || (status === 404 ? 'NOT_FOUND' : status === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : 'INTERNAL_ERROR');
  const msg = err.message && status < 500 ? err.message : undefined;
  if (res.headersSent) return next(err);
  res.status(status).json({ ok:false, error:{ code, message: msg }});
};
