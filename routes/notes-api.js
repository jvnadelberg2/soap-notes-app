/* BEGIN:ARCH-COMMENT
File: routes/notes-api.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: GET /notes, GET /notes/:uuid, PUT /notes/:uuid, DELETE /notes/:uuid, POST /notes/:uuid/finalize
Exports: none detected
Notes: Content-Type=application/json enforced (415 on wrong type). Persists via services/store.
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';

const requireJSON = require('../middleware/require-json');
const express = require('express');
const router = express.Router();
const store = require('../services/store');

function normalizeBody(raw) {
  const b = Object(raw || {});
  const out = { ...b };

  // UUID is enforced by route param; we set it explicitly in handler.
  // Note type normalization
  let nt = String(out.noteType || 'SOAP').toUpperCase();
  if (nt !== 'SOAP' && nt !== 'BIRP') nt = 'SOAP';
  out.noteType = nt;

  // Text coalescing for export-readiness
  const text = out.text ?? out.note ?? out.noteText ?? '';
  out.text = String(text).replace(/\r\n/g, '\n').trim();

  return out;
}

// List (UUID-first, strip internal id)
router.get('/notes', async (_req, res) => {
  try {
    const notes = await store.listNotes();
    const out = notes.map(n => {
      const { id, ...rest } = n;
      return rest;
    });
    res.json({ ok: true, notes: out });
  } catch (e) {
    console.error('list notes failed:', e);
    res.status(500).json({ ok: false });
  }
});

// Get by UUID (UUID-first, strip internal id)
router.get('/notes/:uuid', async (req, res) => {
  try {
    const uuid = String(req.params.uuid || '').trim();
    const all = await store.listNotes();
    const note = all.find(n => n.uuid === uuid);
    if (!note) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND' } });
    const { id, ...rest } = note;
    res.json({ ok: true, note: rest });
  } catch (e) {
    console.error('get by uuid failed:', e);
    res.status(500).json({ ok: false });
  }
});

// Upsert by UUID (normalize into export-ready shape)
router.put('/notes/:uuid', requireJSON, async (req, res) => {
  try {
    const uuid = String(req.params.uuid || '').trim();
    if (!uuid) return res.status(400).json({ ok: false, error: { code: 'BAD_UUID' } });

    const now = new Date().toISOString();
    const all = await store.listNotes();
    const existing = all.find(n => n.uuid === uuid);

    const body = normalizeBody(req.body || {});
    body.uuid = uuid;

    if (existing) {
      if (existing.finalizedAt) {
        return res.status(409).json({ ok: false, error: { code: 'FINALIZED_IMMUTABLE' } });
      }
      const patch = { ...body, updatedAt: now };
      const updated = await store.updateNote(existing.id, patch);
      const { id, ...rest } = updated;
      return res.json({ ok: true, note: rest });
    } else {
      const toCreate = { ...body, createdAt: now, updatedAt: now };
      const created = await store.saveNote(toCreate);
      const { id, ...rest } = created;
      return res.status(201).json({ ok: true, note: rest });
    }
  } catch (e) {
    console.error('upsert by uuid failed:', e);
    res.status(500).json({ ok: false });
  }
});

// Delete by UUID
router.delete('/notes/:uuid', async (req, res) => {
  try {
    const uuid = String(req.params.uuid || '').trim();
    const all = await store.listNotes();
    const note = all.find(n => n.uuid === uuid);
    if (!note) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND' } });
    if (note.finalizedAt) {
      return res.status(409).json({ ok: false, error: { code: 'FINALIZED_IMMUTABLE' } });
    }
    await store.deleteNote(note.id);
    res.json({ ok: true });
  } catch (e) {
    console.error('delete by uuid failed:', e);
    res.status(500).json({ ok: false });
  }
});

// POST /api/notes/:uuid/finalize  → set finalizedAt and lock the note
router.post('/notes/:uuid/finalize', async (req, res) => {
  try {
    const uuid = String(req.params.uuid || '').trim();
    if (!uuid) return res.status(400).json({ ok:false, error:{ code:'BAD_UUID' }});

    const current = await store.getByUUID(uuid);
    if (!current) return res.status(404).json({ ok:false, error:{ code:'NOT_FOUND' }});
    if (current.finalizedAt) {
      return res.status(409).json({ ok:false, error:{ code:'FINALIZED_IMMUTABLE' }});
    }

    // Optional extras you might want to persist at finalize time
    const extras = {};
    const b = Object(req.body || {});
    ['signedBy','attestationText'].forEach(k => { if (b[k]) extras[k] = String(b[k]); });

    const updated = await store.finalizeNote(current.id, extras);
    return res.json({ ok:true, note: updated });
  } catch (e) {
    console.error('finalize failed:', e);
    return res.status(500).json({ ok:false, error:{ code:'FINALIZE_FAILED' }});
  }
});


module.exports = router;


router.delete('/notes', async (req, res) => {
  const allow = (process.env.ALLOW_PURGE === '1' || process.env.ALLOW_PURGE === 'true');
  const wantsAll = String(req.query.all || '') === '1';
  if (!allow || !wantsAll) return res.status(403).json({ ok:false, error:{ code:'PURGE_DISABLED' } });
  try {
    const path = require('path');
    const fsp = require('fs/promises');
    const notesDir = path.resolve(__dirname, '..', 'notes');
    const files = await fsp.readdir(notesDir).catch(() => []);
    const deleted = files.filter(n => !n.startsWith('.')).length;
    await fsp.rm(notesDir, { recursive: true, force: true });
    await fsp.mkdir(notesDir, { recursive: true });
    return res.status(200).json({ ok:true, deleted });
  } catch {
    return res.status(500).json({ ok:false, error:{ code:'PURGE_FAILED' } });
  }
});