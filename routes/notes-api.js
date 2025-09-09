'use strict';

const express = require('express');
const store = require('../services/store');

const router = express.Router();

// List notes
router.get('/notes', async (_req, res) => {
  try {
    const notes = await store.listNotes();
    res.json({ ok: true, notes });
  } catch (e) {
    console.error('listNotes failed:', e);
    res.status(500).json({ ok: false, error: { code: 'LIST_FAILED' } });
  }
});

// Get one note
router.get('/notes/:id', async (req, res) => {
  try {
    const note = await store.getNoteById(req.params.id);
    if (!note) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND' } });
    res.json({ ok: true, note });
  } catch (e) {
    console.error('getNote failed:', e);
    res.status(500).json({ ok: false, error: { code: 'GET_FAILED' } });
  }
});

// Create a note
router.post('/notes', async (req, res) => {
  try {
    const saved = await store.saveNote(req.body || {});
    res.json({ ok: true, id: saved.id, note: saved });
  } catch (e) {
    console.error('saveNote failed:', e);
    res.status(500).json({ ok: false, error: { code: 'SAVE_FAILED' } });
  }
});

// Update a note
router.put('/notes/:id', async (req, res) => {
  try {
    const upd = await store.updateNote(req.params.id, req.body || {});
    if (!upd) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND' } });
    res.json({ ok: true, id: upd.id, note: upd });
  } catch (e) {
    console.error('updateNote failed:', e);
    res.status(500).json({ ok: false, error: { code: 'UPDATE_FAILED' } });
  }
});

// Delete one note
router.delete('/notes/:id', async (req, res) => {
  try {
    const ok = await store.deleteNote(req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND' } });
    res.json({ ok: true, id: req.params.id });
  } catch (e) {
    console.error('deleteNote failed:', e);
    res.status(500).json({ ok: false, error: { code: 'DELETE_FAILED' } });
  }
});

// Delete ALL notes (used by clear-all)
router.delete('/notes', async (_req, res) => {
  try {
    await store.deleteAllNotes();
    res.json({ ok: true });
  } catch (e) {
    console.error('deleteAllNotes failed:', e);
    res.status(500).json({ ok: false, error: { code: 'CLEAR_FAILED' } });
  }
});

module.exports = router;
