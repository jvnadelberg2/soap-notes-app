(() => {
  const $ = (s) => document.querySelector(s);
  const statusEl = $('#status');
  function setStatus(t){ if(statusEl) statusEl.textContent = t || ''; }

  function extractFromHPI(hpi) {
    const out = { vitals:{}, labs:{} };
    const s = String(hpi||'');
    const mBP = s.match(/\bBP[:\s]*([0-9]{2,3}\s*\/\s*[0-9]{2,3})\b/i);
    if (mBP) out.vitals.BP = mBP[1].replace(/\s+/g,'');
    const mHR = s.match(/\b(?:HR|Pulse)[:\s]*([0-9]{2,3})\b/i);
    if (mHR) out.vitals.HR = mHR[1];
    const mRR = s.match(/\b(?:RR|Resp(?:iratory)?(?:\s*Rate)?)[:=\s]*([0-9]{1,3})(?!\d)\b/i);
    if (mRR) out.vitals.RR = mRR[1];
if (mRR) out.vitals.RR = mRR[1];
    if (mRR) out.vitals.RR = mRR[1];
    s.split(/\r?\n/).forEach(line=>{
      const m = line.match(/^\s*([A-Za-z][\w\s\/\+\-\.%]*?)\s*[:=]\s*(.+)\s*$/);
      if (!m) return;
      const key = m[1].trim();
      const val = m[2].trim();
      if (!key) return;
      if (/^(BP|HR|Pulse|RR|Resp|Respiratory Rate)$/i.test(key)) return;
      out.labs[key] = val;
    });
    if (!Object.keys(out.vitals).length) delete out.vitals;
    if (!Object.keys(out.labs).length) delete out.labs;
    return out;
  }

  function labsToObj(text){
    const out = {};
    (text||'').split(/\r?\n/).forEach(line=>{
      const i = line.indexOf('=');
      if(i>0){ const k=line.slice(0,i).trim(); const v=line.slice(i+1).trim(); if(k) out[k]=v; }
    });
    return Object.keys(out).length ? out : null;
  }
  function imagingToArr(text){ return (text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean); }

  function buildPayload(){
    const rawText = $('#rawText')?.value || '';
    const patientHistory = $('#patientHistory')?.value || '';
    const specialty = $('#specialty')?.value || 'General Practice';
    const allowInference = $('#allowInference')?.checked || false;
    const model = $('#model')?.value || null;

    const vitals = {};
    const bp = $('#vBP')?.value.trim(); if (bp) vitals.BP = bp;
    const hr = $('#vHR')?.value.trim(); if (hr) vitals.HR = hr;
    const rr = $('#vRR')?.value.trim(); if (rr) vitals.RR = rr;
    const labsExplicit = labsToObj($('#labs')?.value);
    const imaging = imagingToArr($('#imaging')?.value);

    const auto = extractFromHPI(rawText);
    const mergedVitals = Object.assign({}, auto?.vitals||{}, vitals);
    const mergedLabs   = Object.assign({}, auto?.labs||{}, labsExplicit||{});

    const payload = { rawText, patientHistory, specialty, allowInference, model };
    if (Object.keys(mergedVitals).length) payload.vitals = mergedVitals;
    if (Object.keys(mergedLabs).length)   payload.labs   = mergedLabs;
    if (imaging.length)                   payload.imaging = imaging;

    return payload;
  }

  function renderSoapText(d){
    const S = d.Subjective || 'Not provided';
    const O = d.Objective || 'Not provided';
    const A = d.Assessment || 'Not provided';
    const P = d.Plan || 'Not provided';
    return `Subjective:\n${S}\n\nObjective:\n${O}\n\nAssessment:\n${A}\n\nPlan:\n${P}\n`;
  }

  async function generateNote(){
    setStatus('Generating…');
    try{
      const payload = buildPayload();
      const r = await fetch('/api/generate-soap-json-annotated',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const j = await r.json();
      const data = j?.data || j;
      const out = (document.querySelector('#soapTextOut')||document.querySelector('#jsonOut')); if (out) out.textContent = renderSoapText(data);
      const icd = j?.icd || [];
      const icdBox = $('#icdOut');
      if (icdBox) icdBox.innerHTML = icd.length ? '<ul>'+icd.map(x=>`<li><b>${x.code}</b> — ${x.term}</li>`).join('')+'</ul>' : 'No suggestions.';
      setStatus('');
    } catch(e){ setStatus('Error: ' + e.message); }
  }

  async function streamText(){
    setStatus('Streaming…');
    try{
      const payload = buildPayload();
      const r = await fetch('/api/generate-soap-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      const out = (document.querySelector('#soapTextOut')||document.querySelector('#jsonOut'));

      let buf = '';
      let needPaint = false;
      function paint(){
        if (!needPaint) return;
        needPaint = false;
        if (out) out.textContent = buf;
        requestAnimationFrame(paint);
      }
      needPaint = true;
      requestAnimationFrame(paint);

      for(;;){
        const {done, value} = await reader.read();
        if (done) break;
        buf += decoder.decode(value,{stream:true});
        needPaint = true;
      }
      if (out) out.textContent = buf;
      setStatus('');
    } catch(e){ setStatus('Error: ' + e.message); }
  }

  async function saveNote(){
    setStatus('Saving…');
    try{
      const payload = buildPayload();
      const r = await fetch('/api/save-note',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const j = await r.json();
      const d = $('#downloads');
      if (j?.ok) d.innerHTML = `<a class="button" href="\${j.files.text}" target="_blank">Download Text</a> <a class="button" href="\${j.files.json}" target="_blank">Download Data</a>`;
      else d.textContent = j?.error || 'Failed to save.';
      setStatus('');
    } catch(e){ setStatus('Error: ' + e.message); }
  }

  function wire(){
    const b2 = $('#genStream'); if (b2) b2.onclick = streamText;
    const b3 = $('#saveNote');  if (b3) b3.onclick = saveNote;
  }
  document.addEventListener('DOMContentLoaded', wire);
})();
