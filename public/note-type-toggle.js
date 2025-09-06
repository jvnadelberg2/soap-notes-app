<script>
(function () {
  function pick() {
    for (let i = 0; i < arguments.length; i++) {
      const el = document.getElementById(arguments[i]);
      if (el) return el;
    }
    return null;
  }
  function show(el, yes) { if (el) el.style.display = yes ? '' : 'none'; }
  function applyMode(mode) {
    const isBIRP = mode === 'BIRP';
    const birpInputsCard = pick('birpInputsCard', 'birp-card', 'birpInputs');
    const titleEl = pick('generatedNoteTitle', 'noteTitle');

    // BIRP inputs via display toggle (right column)
    show(birpInputsCard, isBIRP);

    // Body-level mode flags (CSS above handles Patient Data visibility w/o reflow)
    document.documentElement.classList.toggle('mode-birp', isBIRP);
    document.documentElement.classList.toggle('mode-soap', !isBIRP);

    if (titleEl) titleEl.textContent = isBIRP ? 'Generated BIRP Note' : 'Generated SOAP Note';
    // Important: no focus() or scrollIntoView() here to avoid perceived “bounce”
  }

  function init() {
    const noteTypeSel = pick('noteType');
    if (!noteTypeSel) return;
    applyMode(noteTypeSel.value);
    noteTypeSel.addEventListener('change', function () { applyMode(noteTypeSel.value); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>
