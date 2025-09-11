'use strict';
const express = require('express');
const crypto = require('crypto');
const requireJSON = require('../middleware/require-json');
const { withLock } = require('../middleware/inflight-lock');
const store = require('../services/store');

const router = express.Router();

/**
 * POST /api/notes/generate
 * Body: current UI payload (JSON). If body.uuid exists and note is not finalized, old uuid is purged.
 * Responses:
 *   201 { ok:true, uuid }
 *   409 { ok:false, error:{ code:'FINALIZED_LOCKED' } }
 *   415 for non-JSON
 */
router.post('/notes/generate', requireJSON, async (req, res, next) => {
  try {
    const body = req.body || {};
    const oldUuid = body.uuid ? String(body.uuid) : null;
    const lockKey = 'generate:' + (oldUuid || 'new');

    const uuid = await withLock(lockKey, async () => {
      if (oldUuid) {
        const prev = await store.getNote(oldUuid);
        if (prev && prev.finalizedAt) {
          const e = new Error('Note is finalized; cannot re-generate');
          e.status = 409; e.code = 'FINALIZED_LOCKED';
          throw e;
        }
      }
      const newUuid = crypto.randomUUID();
      const payload = { ...body, uuid: newUuid, noteType: body.noteType || body.note_type || 'SOAP' };
      await store.putNote(newUuid, payload);
      if (oldUuid) { try { await store.deleteNote(oldUuid); } catch(_) {} }
      return newUuid;
    });

    res.status(201).json({ ok:true, uuid });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
