// public/generate-stable.js
// Merges CC + HPI + History before calling the API.
// Provides a local fallback so the note is never empty if the model returns nothing.

document.addEventListener('DOMContentLoaded', function () {
  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function text(el) { return String(el && (el.textContent || el.innerText) || '').replace(/\r\n/g, '\n'); }
  function setStatus(t) { var s = $('status'); if (s) s.textContent = String(t || ''); }
  function setMsg(t) { var m = $('downloads'); if (m) m.textContent = String(t || ''); }

  function renderSoapText(obj) {
    var S = (obj && obj.Subjective) || 'Not provided';
    var O = (obj && obj.Objective) || 'Not provided';
    var A = (obj && obj.Assessment) || 'Not provided';
    var P = (obj && obj.Plan) || 'Not provided';
    return ['Subjective:', S, '', 'Objective:', O, '', 'Assessment:', A, '', 'Plan:', P].join('\n');
  }

  function outputSet(textValue) {
    var out = $('soapTextOut') || $('jsonOut');
    if (!out) return;
    out.textContent = String(textValue == null ? '' : textValue);
  }

  function buildMergedRawText() {
    var cc  = val('chiefComplaint');
    var hpi = val('rawText');           // HPI input area
    var hx  = val('patientHistory');    // Past/pertinent history
    var parts = [];
    if (cc)  parts.push('Chief Complaint: ' + cc);
    if (hpi) parts.push('HPI: ' + hpi);
    if (hx)  parts.push('History: ' + hx);
    return parts.join('\n\n');
  }

  function parseKVLines(id) {
    var s = val(id);
    if (!s) return {};
    var o = {};
    s.split(/\r?\n/).forEach(function (line) {
      line = String(line || '').trim();
      if (!line) return;
      var m = line.match(/^([^:=\s][^:=]*?)\s*[:=]\s*(.+)$/);
      if (m) o[m[1]] = m[2];
    });
    return o;
  }

  async function getAnnotated() {
    var merged = buildMergedRawText();
    var payload = {
      rawText: merged,
      specialty: ($('specialty') && $('specialty').value) || 'General Practice',
      allowInference: !!($('useInference') && $('useInference').checked),
      model: ($('model') && $('model').value) || null,
      provider: ($('providerSelect') && $('providerSelect').value) || 'ollama',
      vitals: { BP: val('vBP') || '', HR: val('vHR') || '', RR: val('vRR') || '' },
      labs: parseKVLines('labs'),
      imaging: val('imaging').split(/\r?\n/).map(function (x) { return String(x || '').trim(); }).filter(Boolean)
    };
    try {
      const r = await fetch('/api/generate-soap-json-annotated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      // accept either {data:{...}} or {...}
      return (j && (j.data || j)) || null;
    } catch (e) {
      if (window.console && console.warn) console.warn('annotated error/fallback:', e && e.message || e);
      return null;
    }
  }

  var btnGen = $('btnGenerate');
  if (btnGen) {
    btnGen.onclick = async function () {
      setStatus('Generating…');
      var data = await getAnnotated();

      // Robust fallback if model returns nothing
      if (!data || (!data.Subjective && !data.Objective && !data.Assessment && !data.Plan)) {
        var cc  = val('chiefComplaint');
        var hpi = val('rawText');
        var hx  = val('patientHistory');
        var bp = val('vBP'), hr = val('vHR'), rr = val('vRR');
        var labs = parseKVLines('labs');
        var imaging = val('imaging');

        var subjParts = [];
        if (cc)  subjParts.push('Chief Complaint: ' + cc);
        if (hpi) subjParts.push('HPI: ' + hpi);
        if (hx)  subjParts.push('History: ' + hx);

        var objParts = [];
        var vitals = [];
        if (bp) vitals.push('BP ' + bp);
        if (hr) vitals.push('HR ' + hr);
        if (rr) vitals.push('RR ' + rr);
        if (vitals.length) objParts.push('Vitals: ' + vitals.join(', '));

        var labKeys = Object.keys(labs || {});
        if (labKeys.length) objParts.push('Labs: ' + labKeys.map(function(k){return k + '=' + labs[k];}).join(', '));
        if (imaging) objParts.push('Imaging: ' + imaging.split(/\r?\n/).filter(Boolean).join('; '));

        data = {
          Subjective: subjParts.join('\n\n') || 'Not provided',
          Objective: objParts.join('\n') || 'Not provided',
          Assessment: 'Not provided',
          Plan: 'Not provided'
        };
      }

      outputSet(renderSoapText(data));
      setStatus('');
    };
  }

  var btnClear = $('btnClear');
  if (btnClear) {
    btnClear.onclick = function () {
      ['chiefComplaint', 'rawText', 'patientHistory', 'labs', 'imaging', 'vBP', 'vHR', 'vRR'].forEach(function (id) {
        var el = $(id); if (el) el.value = '';
      });
      outputSet('');
      setStatus('');
      setMsg('');
    };
  }

  var btnSaveDoc = $('saveNote');
  if (btnSaveDoc) {
    btnSaveDoc.onclick = function () {
      var body = text($('soapTextOut') || $('jsonOut'));
      if (!body) { setMsg('Nothing to save'); return; }
      var patient = val('patient'), provider = val('provider'), clinic = val('clinic');
      var now = new Date();
      var y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
      var fname = (patient.replace(/[^A-Za-z0-9._-]+/g, '_') || 'note') + '_' + y + m + d + '.doc';
      var html = ''
        + (clinic ? ('<h2 style="margin:0 0 8px 0">' + clinic.replace(/&/g, '&amp;') + '</h2>') : '')
        + ((patient || provider) ? ('<div style="margin:0 0 8px 0">' + (patient ? patient.replace(/&/g, '&amp;') : '') + (provider ? (' — ' + provider.replace(/&/g, '&amp;')) : '') + '</div>') : '')
        + '<pre style="white-space:pre-wrap; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; line-height:1.35; margin:0">'
        + body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        + '</pre>';
      var blob = new Blob(['<!DOCTYPE html><html><head><meta charset="utf-8"><title>SOAP Note</title></head><body>' + html + '</body></html>'], { type: 'application/msword' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = fname;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      setMsg('Saved document');
    };
  }

  var btnPdf = $('exportPdf');
  if (btnPdf) {
    btnPdf.onclick = async function () {
      setMsg('Exporting PDF...');
      try {
        var data = await getAnnotated();
        if (!data) {
          var body = text($('soapTextOut') || $('jsonOut'));
          if (!body) throw new Error('Nothing to export');
          data = { Subjective: body, Objective: '', Assessment: '', Plan: '' };
        }
        var header = {
          patient: val('patient'),
          provider: val('provider'),
          clinic: val('clinic'),
          mrn: val('mrn')
        };
        var r = await fetch('/api/export-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ header: header, data: data }) });
        if ((r.headers.get('content-type') || '').includes('application/pdf')) {
          var b = await r.blob();
          var a = document.createElement('a');
          a.href = URL.createObjectURL(b); a.download = (header.patient || 'note') + '.pdf';
          document.body.appendChild(a); a.click(); a.remove();
          setMsg('Saved PDF');
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        } else {
          setMsg('Export PDF failed');
        }
      } catch (e) { setMsg('Export error: ' + e.message); }
    };
  }

  var btnPrint = $('genStream');
  if (btnPrint) {
    btnPrint.onclick = function () { window.print(); };
  }

  // Toggle editable display (if present)
  (function () {
    var out = $('soapTextOut') || $('jsonOut');
    var ce = $('toggleEditable');
    if (ce && out) {
      ce.checked = (out.getAttribute('contenteditable') === 'true');
      ce.onchange = function () { out.setAttribute('contenteditable', ce.checked ? 'true' : 'false'); };
    }
    var bc = $('btnCopy');
    if (bc && out) {
      bc.onclick = async function () {
        try {
          await navigator.clipboard.writeText(text(out));
          setMsg('Copied');
        } catch (_) {
          setMsg('Copy failed');
        }
      };
    }
  })();
});
