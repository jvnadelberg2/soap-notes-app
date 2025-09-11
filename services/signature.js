'use strict';
const crypto = require('crypto');
const fs = require('fs');

// --- helpers ---
const b64u = buf =>
  Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u = s =>
  Buffer.from(String(s).replace(/-/g,'+').replace(/_/g,'/'), 'base64');

// Prefer file paths in .env; fall back to PEM strings (with \n escapes allowed)
function readPem(varPem, varPath){
  const p = process.env[varPath];
  if (p && fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  let v = process.env[varPem] || '';
  if (v.includes('\\n')) v = v.replace(/\\n/g, '\n');
  return v;
}

// Deep sort so canonical JSON is stable
function sortObj(x){
  if (x === null || typeof x !== 'object') return x;
  if (Array.isArray(x)) return x.map(sortObj);
  const out = {};
  Object.keys(x).sort().forEach(k => { out[k] = sortObj(x[k]); });
  return out;
}

// Exclude volatile fields from what we sign; KEEP uuid
const EXCLUDE = new Set(['id','createdAt','updatedAt','finalizedAt','signature']);

function canonPayload(note){
  const o = {};
  for (const [k,v] of Object.entries(note)){
    if (EXCLUDE.has(k)) continue;
    o[k] = v;
  }
  if (note.uuid) o.uuid = note.uuid;
  return Buffer.from(JSON.stringify(sortObj(o)));
}

function sha256(buf){ return crypto.createHash('sha256').update(buf).digest(); }

function fingerprintPublicKey(pem){
  const raw = Buffer.from(String(pem).replace(/\r/g,''), 'utf8');
  return 'SHA256:' + b64u(sha256(raw));
}

// --- sign / verify with RSA-PSS(SHA-256) ---
function signNote(note){
  const priv = readPem('NOTE_SIGN_PRIVATE_KEY_PEM', 'NOTE_SIGN_PRIVATE_KEY_PATH');
  const pub  = readPem('NOTE_SIGN_PUBLIC_KEY_PEM',  'NOTE_SIGN_PUBLIC_KEY_PATH');
  if (!priv || !pub) throw new Error('Signing keys not configured (.env NOTE_SIGN_*).');

  const canon  = canonPayload(note);
  const digest = sha256(canon);

  const sig = crypto.sign('sha256', canon, {
    key: priv,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  });

  return {
    alg: 'RSASSA-PSS',
    hash: 'SHA-256',
    enc: 'base64url',
    digest: b64u(digest),
    sig: b64u(sig),
    keyId: fingerprintPublicKey(pub)
  };
}

function verifyNote(note){
  const sig = note?.signature;
  if (!sig) return { ok:false, reason:'NO_SIGNATURE' };

  const pub = readPem('NOTE_SIGN_PUBLIC_KEY_PEM', 'NOTE_SIGN_PUBLIC_KEY_PATH');
  if (!pub) return { ok:false, reason:'NO_PUBLIC_KEY' };

  const canon   = canonPayload(note);
  const digest2 = sha256(canon);
  const okHash  = (b64u(digest2) === sig.digest);

  const okSig = crypto.verify('sha256', canon, {
    key: pub,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  }, unb64u(sig.sig));

  return { ok: okHash && okSig, okHash, okSig, digest: b64u(digest2), keyId: fingerprintPublicKey(pub) };
}

module.exports = { canonPayload, signNote, verifyNote, fingerprintPublicKey };
