const fsp = require('fs/promises');
/* BEGIN:ARCH-COMMENT
File: services/store.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: listNotes, saveNote, updateNote, deleteNote,          // normal delete (blocked if finalized), getByUUID, upsertByUUID, finalizeNote, // optional admin helper, deleteNoteById,      // allows {force
Notes: Exports a module API.
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';

/**
 * File-backed note store (CommonJS)
 * - Public key:    uuid (string, comes from client/UI)
 * - Internal key:  id   (short random string, server-only)
 * - Guarantees:
 *    • creates data file on first write
 *    • atomic writes (temp + rename)
 *    • uuid must be unique on create
 *    • finalized notes cannot be updated or deleted
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ↓↓↓ REQUIRED: digital-signature helper for finalize() ↓↓↓
const { signNote } = require('./signature'); // <-- make sure services/signature.js exists

// ---------- storage paths ----------
const DATA_DIR   = path.join(__dirname, '..', 'data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const TMP_FILE   = path.join(DATA_DIR, 'notes.json.tmp');

// ---------- in-memory cache ----------
let _loaded = false;
let _notes  = []; // array of note objects

// ---------- utils ----------
const clone = (x) => JSON.parse(JSON.stringify(x ?? null));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, '[]', 'utf8');
}

function loadAll() {
  if (_loaded) return;
  ensureDataDir();
  const raw = fs.readFileSync(NOTES_FILE, 'utf8');
  try {
    const arr = JSON.parse(raw);
    _notes = Array.isArray(arr) ? arr : [];
  } catch {
    _notes = [];
  }
  _loaded = true;
}

function persistAll() {
  ensureDataDir();
  const buf = Buffer.from(JSON.stringify(_notes, null, 2));
  fs.writeFileSync(TMP_FILE, buf);
  fs.renameSync(TMP_FILE, NOTES_FILE);
}

function newId(len = 10) {
  return crypto.randomBytes(Math.ceil(len * 0.75)).toString('base64url').slice(0, len);
}

function byUUID(uuid) {
  const u = String(uuid || '').trim();
  if (!u) return null;
  return _notes.find(n => String(n.uuid || '').trim() === u) || null;
}

// ---------- API ----------

/**
 * List notes (shallow filter/sort could be added here if you need)
 */
async function listNotes() {
  loadAll();
  return clone(_notes);
}

/**
 * Create a new note.
 * - Requires: obj.uuid (unique on create)
 * - Sets: id, createdAt, updatedAt if not provided
 */
async function saveNote(obj) {
  loadAll();

  const uuid = String(obj?.uuid || '').trim();
  if (!uuid) {
    const err = new Error('uuid is required');
    err.code = 'BAD_UUID';
    throw err;
  }
  if (byUUID(uuid)) {
    const err = new Error('uuid already exists');
    err.code = 'UUID_EXISTS';
    throw err;
  }

  const now = new Date().toISOString();
  const note = {
    id: newId(),
    uuid,
    createdAt: now,
    updatedAt: now,
    ...clone(obj)
  };

  _notes.push(note);
  persistAll();
  return clone(note);
}

/**
 * Update an existing note by internal id.
 * - Rejects if finalizedAt is set (immutable after finalize)
 */
async function updateNote(id, patch) {
  loadAll();
  const idx = _notes.findIndex(n => n.id === id);
  if (idx < 0) {
    const err = new Error('not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const cur = _notes[idx];
  if (cur.finalizedAt) {
    const err = new Error('finalized notes are immutable');
    err.code = 'FINALIZED_IMMUTABLE';
    throw err;
  }

  const next = { ...cur, ...clone(patch), updatedAt: new Date().toISOString() };
  _notes[idx] = next;
  persistAll();
  return clone(next);
}

/**
 * Delete a note by internal id.
 * - Rejects if finalizedAt is set (immutable). Admin code (if any) can call deleteNoteById(id, {force:true})
 */
async function deleteNote(id) {
  return deleteNoteById(id, { force: false });
}

/**
 * Delete helper that can optionally force deletion (e.g., for admin-only dev cleanup).
 */
async function deleteNoteById(id, { force = false } = {}) {
  loadAll();
  const idx = _notes.findIndex(n => n.id === id);
  if (idx < 0) {
    const err = new Error('not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const cur = _notes[idx];
  if (cur.finalizedAt && !force) {
    const err = new Error('finalized notes are immutable');
    err.code = 'FINALIZED_IMMUTABLE';
    throw err;
  }

  _notes.splice(idx, 1);
  persistAll();
  return true;
}

/**
 * Get a note by UUID (public identifier).
 */
async function getByUUID(uuid) {
  loadAll();
  const n = byUUID(uuid);
  return n ? clone(n) : null;
}

/**
 * Upsert by UUID.
 * - If a note with the uuid exists and is NOT finalized → update it.
 * - If none exists → create it.
 * - If exists and finalized → error.
 */
async function upsertByUUID(uuid, patch) {
  loadAll();
  const cur = byUUID(uuid);
  if (!cur) {
    return saveNote({ uuid, ...clone(patch) });
  }
  if (cur.finalizedAt) {
    const err = new Error('finalized notes are immutable');
    err.code = 'FINALIZED_IMMUTABLE';
    throw err;
  }
  return updateNote(cur.id, patch);
}

/**
 * FINALIZE a note by internal id.
 * - Stamps finalizedAt
 * - Merges finalize-time fields (e.g., signedBy, attestationText)
 * - Digitally signs the canonical payload (RSA-PSS over sorted JSON incl. uuid)
 * - Locks the record (subsequent updates/deletes will be rejected unless forced by admin helper)
 */
async function finalizeNote(id, extras = {}) {
  loadAll();
  const idx = _notes.findIndex(n => n.id === id);
  if (idx < 0) {
    const err = new Error('not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const note = _notes[idx];
  if (note.finalizedAt) {
    const err = new Error('finalized notes are immutable');
    err.code = 'FINALIZED_IMMUTABLE';
    throw err;
  }

  note.finalizedAt = new Date().toISOString();
  Object.assign(note, clone(extras));

  // ⬇️ This is the important call you asked about: sign the canonical note.
  const sig = signNote(note);
  note.signature = { signedAt: note.finalizedAt, ...sig };

  _notes[idx] = note;
  persistAll();
  return clone(note);
}

// ---------- exports ----------
module.exports = {
  listNotes,
  saveNote,
  updateNote,
  deleteNote,          // normal delete (blocked if finalized)
  getByUUID,
  upsertByUUID,
  finalizeNote,
  // optional admin helper:
  deleteNoteById,      // allows {force:true}
  // test/tools
  _unsafe_readAll: () => (loadAll(), clone(_notes)),
  _unsafe_writeAll: (arr) => { _notes = clone(arr || []); _loaded = true; persistAll(); }
};

const STORE_NOTES_DIR__PURGE = process.env.NOTES_DIR ? path.resolve(process.env.NOTES_DIR) : path.resolve(__dirname,'..','notes');
async function purgeAll(){
  const files = await fsp.readdir(STORE_NOTES_DIR__PURGE).catch(()=>[]);
  const deletedCount = files.filter(n=>!n.startsWith('.')).length;
  await fsp.rm(STORE_NOTES_DIR__PURGE,{recursive:true,force:true});
  await fsp.mkdir(STORE_NOTES_DIR__PURGE,{recursive:true});
  return { ok:true, deleted:deletedCount };
}

module.exports = module.exports || {};
module.exports.purgeAll = purgeAll;
