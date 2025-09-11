'use strict';
(function(){
  var btn = document.getElementById('export-pdf')
        || document.getElementById('exportPdf')
        || document.getElementById('exportPdfBtn')
        || document.querySelector('[data-action="export-pdf"]');
  if (!btn) return;

  function $(id){ return document.getElementById(id); }
  function getVal(el){
    if (!el) return '';
    if ('value' in el) return (el.value || '').trim();
    return (el.textContent || '').trim();
  }
  function val(id){ var el=$(id); return el ? (el.value||'').trim() : ''; }

  function getNoteText(){
    var ids = [
      'soapTextOut','birpTextOut','generatedNote','noteOutput','noteText',
      'note-text','noteTextOutArea'
    ];
    for (var i=0;i<ids.length;i++){
      var t = getVal($(ids[i]));
      if (t) return t;
    }
    var ce = document.querySelector('[data-note-output]') || document.querySelector('[contenteditable][id*="note"]');
    if (ce){
      var t2 = getVal(ce);
      if (t2) return t2;
    }
    var ta = document.querySelector('textarea[name="note"],textarea[name="noteText"],textarea[id*="note"]');
    if (ta){
      var t3 = getVal(ta);
      if (t3) return t3;
    }
    return '';
  }

  function getNoteType(){
    var el = $('noteType') || $('note-format');
    var v = (el && el.value) ? String(el.value) : 'SOAP';
    v = v.toUpperCase();
    return (v === 'BIRP') ? 'BIRP' : 'SOAP';
  }

  function getUuidMaybe(){
    var a = $('current-note-uuid');
    if (a && a.value && a.value.trim()) return a.value.trim();
    var b = $('current-note-id');
    if (b && b.value && b.value.trim()) return b.value.trim();
    return '';
  }

  async function exportDraftPdf(){
    var noteType = getNoteType();
    var text = getNoteText();
    if (!text){
      alert('Generate a note first, then Export PDF.');
      return;
    }

    // Header + clinical fields expected by the renderer
    var payload = {
      uuid: getUuidMaybe(),
      noteType: noteType,
      text: text,

      // Header
      patient: val('patient'),
      dob: val('dob'),
      sex: val('sex'),
      mrn: val('mrn'),
      provider: val('provider'),
      credentials: val('credentials'),
      npi: val('npi'),
      clinic: val('clinic'),
      encounter: val('encounter'),
      encounterType: val('encounterType'),
      telePlatform: val('telePlatform'),
      teleConsent: val('teleConsent'),

      // Subjective fallbacks (used if parser can’t extract sections)
      chiefComplaint: val('chiefComplaint'),
      hpi: val('hpi'),
      pmh: val('pmh'),
      fh: val('fh'),
      sh: val('sh'),
      ros: val('ros'),

      // Objective fallbacks (vitals/exam/diagnostics)
      vBP: val('vBP'),
      vHR: val('vHR'),
      vRR: val('vRR'),
      vTemp: val('vTemp'),
      vWeight: val('vWeight'),
      vO2Sat: val('vO2Sat'),
      height: val('height'),
      painScore: val('painScore'),
      exam: val('exam'),
      diagnostics: val('diagnostics'),
      medications: val('medications'),
      allergies: val('allergies'),

      format: (noteType === 'BIRP' ? 'birp' : 'soap')
    };

    var r = await fetch('/export/pdf', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!r.ok){
      var msg = 'PDF export failed';
      try { var j = await r.json(); if (j && j.error && j.error.code) msg += ': ' + j.error.code; } catch(_){}
      alert(msg);
      return;
    }
    var blob = await r.blob();
    var url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
  }

  btn.addEventListener('click', function(e){
    e.preventDefault();
    exportDraftPdf();
  }, { passive: false });
})();
