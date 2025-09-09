'use strict';

const express = require('express');
const { renderNotePDF } = require('../services/pdf');
const store = require('../services/store');

const router = express.Router();

/**
 * GET /notes/:id/pdf
 * Generates the PDF on the fly from the note in the store.
 * Accepts ?format=soap|birp (case-insensitive).
 * Tries id, then falls back to matching code/uuid in case the table shows a different field.
 */
router.get('/notes/:id/pdf', async (req, res) => {
  try {
    const id = req.params.id;
    const fmt = String(req.query.format || 'soap').toUpperCase();

    // Primary: direct lookup
    let note = await store.getNoteById(id);

    // Fallback: sometimes the list shows a different key ("code" or "uuid")
    if (!note) {
      const list = await store.listNotes().catch(() => []);
      note = list.find(
        (n) => n && (n.id === id || n.code === id || n.uuid === id)
      );
    }

    if (!note) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Note not found' } });
    }

    const buf = await renderNotePDF(note, { format: fmt });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${id}.pdf"`);
    res.send(buf);
  } catch (e) {
    console.error('PDF render failed:', e);
    res.status(500).json({ error: { code: 'PDF_FAILED' } });
  }
});

/**
 * POST /export-pdf
 * Optional legacy endpoint: accepts { id, format } or a raw note in the body.
 */
router.post('/export-pdf', async (req, res) => {
  try {
    const { id, format } = req.body || {};
    const fmt = String(format || 'soap').toUpperCase();

    let note = null;
    if (id) {
      note = await store.getNoteById(id);
      if (!note) {
        const list = await store.listNotes().catch(() => []);
        note = list.find(
          (n) => n && (n.id === id || n.code === id || n.uuid === id)
        );
      }
    } else if (req.body && req.body.note) {
      note = req.body.note;
    } else {
      note = req.body || null;
    }

    if (!note) {
      return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    }

    const buf = await renderNotePDF(note, { format: fmt });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${(note.id || id || 'note')}.pdf"`
    );
    res.send(buf);
  } catch (e) {
    console.error('PDF export failed:', e);
    res.status(500).json({ error: { code: 'PDF_FAILED' } });
  }
});

module.exports = router;
