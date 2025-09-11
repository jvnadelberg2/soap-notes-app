'use strict';
module.exports = {
  shouldShowDraftWatermark(note) { return !note || !note.finalizedAt; }
};
