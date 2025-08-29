;(()=> {
  function g(id){return document.getElementById(id)}
  function v(id){const el=g(id);return el?el.value.trim():""}
  function b(id){const el=g(id);return el?el.checked:false}

  // --- Parse vitals from free text (HPI/history) ---
  function parseVitalsFrom(text){
    const out={}; const T=String(text||"");

    let m;
    // BP 130/80  or  BP: 130/80
    m=T.match(/\b(?:BP|blood\s*pressure)\s*[:=]?\s*([0-9]{2,3}\s*[\/-]\s*[0-9]{2,3})\b/i);
    if(m) out.BP=m[1].replace(/\s+/g,'');

    // HR 90 or Pulse 78 bpm
    m=T.match(/\b(?:HR|pulse)\s*[:=]?\s*([0-9]{2,3})(?:\s*bpm)?\b/i);
    if(m) out.HR=m[1];

    // RR 18 or Resp 18
    m=T.match(/\b(?:RR|resp(?:irations)?)\s*[:=]?\s*([0-9]{1,3})\b/i);
    if(m) out.RR=m[1];

    // Temp 37.2 C or T: 98.6 F
    m=T.match(/\b(?:T|temp(?:erature)?)\s*[:=]?\s*([0-9]{2,3}(?:\.[0-9])?)\s*(?:[FC])?\b/i);
    if(m) out.Temp=m[1];

    // SpO2 96%
    m=T.match(/\b(?:SpO2|SaO2|O2(?:\s*saturation)?)\s*[:=]?\s*([0-9]{2,3})\s*%\b/i);
    if(m) out.SpO2=m[1]+"%";

    return out;
  }

  // --- Parse labs from free text / textarea ---
  const VITAL_LABELS=new Set(["BP","BLOOD PRESSURE","HR","PULSE","RR","RESP","RESPIRATIONS","SPO2","SAO2","O2","TEMP","TEMPERATURE"]);
  function parseLabsFrom(text){
    const out={}; const T="\n"+String(text||"")+"\n";
    const re=/(^|\n)\s*([A-Za-z][A-Za-z0-9 /+\-%]{1,32})\s*(?::|=|\s)\s*([^\n,;]+)(?=\n|$|,|;)/g;
    let m;
    while((m=re.exec(T))){
      const k=m[2].trim().replace(/\s+/g,' ');
      if (VITAL_LABELS.has(k.toUpperCase())) continue;
      const val=m[3].trim();
      if(k && val) out[k]=val;
    }
    return out;
  }

  // --- Generate note (one click) ---
  async function generate(e){
    if(e){ e.preventDefault(); e.stopImmediatePropagation(); }
    const status=g('status'); if(status) status.textContent='Generating...';

    try{
      const payload={
        rawText: v('rawText'),
        patientHistory: v('patientHistory'),
        specialty: (g('specialty')?.value)||'General Practice',
        allowInference: b('allowInference'),
        model: (g('model')?.value)||null
      };

      // Vitals: take from dedicated fields if present, otherwise parse HPI/history
      const vitals={};
      if(v('vBP')) vitals.BP=v('vBP');
      if(v('vHR')) vitals.HR=v('vHR');
      if(v('vRR')) vitals.RR=v('vRR');
      if(!Object.keys(vitals).length){
        Object.assign(vitals, parseVitalsFrom(payload.rawText+"\n"+payload.patientHistory));
      }
      if(Object.keys(vitals).length) payload.vitals=vitals;

      // Labs: take textarea if present, otherwise parse HPI/history
      let labs=parseLabsFrom(v('labs'));
      if(!Object.keys(labs).length){
        labs=parseLabsFrom(payload.rawText+"\n"+payload.patientHistory);
      }
      if(Object.keys(labs).length) payload.labs=labs;

      // Imaging
      const imaging=(g('imaging')?.value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      if(imaging.length) payload.imaging=imaging;

      // Call annotated (ICD etc.)
      const r1=await fetch('/api/generate-soap-json-annotated',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
      });
      const j1=await r1.json();

      const icdBox=g('icdOut');
      if(icdBox){
        const list=b('includeICD')?(j1.icd||[]):[];
        icdBox.innerHTML = list.length
          ? '<ul>'+list.map(x=>`<li><b>${x.code}</b> — ${x.term} <span class="small">(score ${x.score})</span></li>`).join('')+'</ul>'
          : 'No suggestions.';
      }

      // Plain text SOAP for humans
      const r2=await fetch('/api/generate-soap',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
      });
      const j2=await r2.json();
      const out=g('jsonOut');                       // reuse the existing <pre id="jsonOut">
      if(out) out.textContent = j2.soapNote || 'No output.';
    }catch(err){
      const out=g('jsonOut'); if(out) out.textContent='Error: '+err.message;
    }finally{
      if(status) status.textContent='';
    }
  }

  function cleanUI(){
    // Rename headings that say "SOAP JSON" -> "SOAP Note"
    document.querySelectorAll('h3, h2, h1').forEach(h=>{
      if(/SOAP\s*JSON/i.test(h.textContent)) h.textContent=h.textContent.replace(/SOAP\s*JSON/i,'SOAP Note');
      if(/\bJSON\b/i.test(h.textContent)) h.textContent=h.textContent.replace(/\bJSON\b/ig,'Note');
    });

    // Change primary button text "Generate JSON" -> "Generate Note"
    const genBtn=g('genJson'); if(genBtn) genBtn.textContent='Generate Note';
    const streamBtn=g('genStream'); if(streamBtn) streamBtn.textContent='Stream Note';

    // Remove any buttons that are literally labeled "JSON" or "Rendered"
    document.querySelectorAll('button').forEach(b=>{
      if(/^\s*(JSON|Rendered)\s*$/i.test(b.textContent)) b.remove();
    });

    // Make the output pre block wrap nicely and stay readable
    const pre=g('jsonOut');
    if(pre){
      pre.style.whiteSpace='pre-wrap';
      pre.style.overflowWrap='anywhere';
      pre.style.maxWidth='100%';
      pre.style.background='#fff';
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    cleanUI();
    const gen=g('genJson'); if(gen) gen.addEventListener('click', generate, {capture:true});
    const stream=g('genStream'); if(stream) stream.addEventListener('click', generate, {capture:true});
  });
})();
