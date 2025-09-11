
/* BEGIN:ARCH-COMMENT
File: services/pdf-watermark.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: shouldShowDraftWatermark(note) { return !note || !note.finalizedAt;
Notes: Exports a module API.
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */

'use strict';
module.exports = {
  shouldShowDraftWatermark(note) { return !note || !note.finalizedAt; }
};
