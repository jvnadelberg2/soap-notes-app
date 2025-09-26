/* BEGIN:ARCH-COMMENT
File: middleware/inflight-lock.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: withLock
Notes: Exports a module API.
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';
const inflight = new Map();
async function withLock(key, fn) {
  if (inflight.has(key)) {
    const e = new Error('Another operation is in progress'); e.status = 409; e.code = 'IN_PROGRESS'; throw e;
  }
  const p = (async () => { try { return await fn(); } finally { inflight.delete(key); } })();
  inflight.set(key, p);
  return p;
}
module.exports = { withLock };
