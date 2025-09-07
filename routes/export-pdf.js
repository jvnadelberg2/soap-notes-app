const express = require('express');
const path = require('path');
const fs = require('fs');
const { renderNotePdf } = require('../services/pdf');

const router = express.Router();

router.post('/export-pdf', async (req, res) => {
  try {
    const { id, header = {}, data = {}, meta = {} } = req.body || {};
    const noteId = id || `note_${Date.now()}`;
    const outDir = path.join(process.cwd(), 'notes');
    const outFile = path.join(outDir, `${noteId}.pdf`);
    fs.mkdirSync(outDir, { recursive: true });

    const result = await renderNotePdf({ id: noteId, header, data, meta }, outFile);

    return res.status(200).json({
      ok: true,
      id: noteId,
      file: `/api/notes/${noteId}/pdf`,
      meta: {
        pages: result.pages,
        jsonHash: result.jsonHash,
        pdfHash: result.pdfHash,
        version: result.version,
        finalizedAt: result.finalizedAt
      }
    });
  } catch (e) {
    return res.status(500).json({ error: { code: 'PDF_EXPORT_FAILED', message: e.message } });
  }
});

router.get('/notes/:id/pdf', async (req, res) => {
  const noteId = req.params.id;
  const file = path.join(process.cwd(), 'notes', `${noteId}.pdf`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'PDF not found' } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${noteId}.pdf"`);
  fs.createReadStream(file).pipe(res);
});

module.exports = router;
