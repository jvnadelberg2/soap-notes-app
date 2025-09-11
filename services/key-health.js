
/* BEGIN:ARCH-COMMENT
File: services/key-health.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: checkSigningKeys
Notes: Exports a module API.
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */

'use strict';
const fs = require('fs');
function readVar(name){ return (process.env[name] || '').trim(); }
function hasReadablePath(pathVar){ const p = readVar(pathVar); return !!(p && fs.existsSync(p)); }
function hasInlinePem(pemVar){ const v = readVar(pemVar); return !!v; }
function checkSigningKeys(){
  const privOk = hasReadablePath('NOTE_SIGN_PRIVATE_KEY_PATH') || hasInlinePem('NOTE_SIGN_PRIVATE_KEY_PEM');
  const pubOk  = hasReadablePath('NOTE_SIGN_PUBLIC_KEY_PATH')  || hasInlinePem('NOTE_SIGN_PUBLIC_KEY_PEM');
  const reasons = [];
  if (!privOk) reasons.push('missing private key (NOTE_SIGN_PRIVATE_KEY_PATH or NOTE_SIGN_PRIVATE_KEY_PEM)');
  if (!pubOk)  reasons.push('missing public key (NOTE_SIGN_PUBLIC_KEY_PATH or NOTE_SIGN_PUBLIC_KEY_PEM)');
  return { ok: (privOk && pubOk), reasons };
}
module.exports = { checkSigningKeys };
