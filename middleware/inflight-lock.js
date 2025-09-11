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
