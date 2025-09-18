'use strict';
const express = require('express');
const { renderNotePDF } = require('../services/pdf');
const router = express.Router();

router.post('/export/pdf', async (req, res) => {
  try {
    const pdf = await renderNotePDF(req.body || {});
    const filename = 'SOAP_' + ((req.body && req.body.patient && req.body.patient.name) ? String(req.body.patient.name).replace(/[^\w\-]+/g,'_') : 'patient') + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
    res.send(pdf);
  } catch (e) {
    res.status(500).json({ ok: false, error: 'PDF generation failed' });
  }
});

module.exports = router;