(function(){
var createdAt=null
function el(id){return document.getElementById(id)}
function val(id){var x=el(id);return x?x.value.trim():""}
function setVal(id,v){var x=el(id); if(x) x.value=v}
function checked(id){var x=el(id);return x?x.checked:false}
function outEl(){return document.getElementById("soapTextOut")}
function setStatus(t){var s=el("status"); if(s) s.textContent=t||""}
function esc(s){return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function kvTextareaToObj(s){var out={}; String(s||"").split(/\r?\n/).forEach(function(line){var L=line.trim(); if(!L) return; var m=L.match(/^\s*([^:=]+)\s*[:=]\s*(.+)\s*$/); if(m){out[m[1].trim()]=m[2].trim();}}); return out}
function nowISO(){var d=new Date();return d.toLocaleString()}
function persistSet(k,v){try{localStorage.setItem(k,v)}catch(_e){}}
function persistGet(k){try{return localStorage.getItem(k)||""}catch(_e){return""}}

async function loadModels(){
  var sel = el("model"); if(!sel) return;
  sel.innerHTML = "";
  setStatus("Loading models…");
  try{
    var r = await fetch("/api/models", { method:"GET", cache:"no-store" });
    var j = await r.json().catch(function(){ return {}; });
    var arr = Array.isArray(j.models) ? j.models : [];
    arr = arr.filter(function(name){
      var n = String(name||"").toLowerCase();
      return n && n.indexOf("embed") === -1 && n.indexOf("embedding") === -1 && n.indexOf("nomic-embed-text") === -1;
    });
    var fallback = ["llama3:latest","llama3.1:8b","mistral:7b-instruct","phi3:mini"];
    var list = arr.length ? arr : fallback;
    list.forEach(function(name){
      var opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    });
    var pm = persistGet("soap.persist.model");
    if(pm){ for(var i=0;i<sel.options.length;i++){ if(sel.options[i].value===pm){ sel.value=pm; break; } } }
  }catch(_e){
    var opt = document.createElement("option");
    opt.value = "llama3:latest"; opt.textContent = "llama3:latest";
    sel.appendChild(opt);
  }finally{
    setStatus("");
  }
}
function currentModel(){ var m = el("model"); return m ? m.value : null; }
function isStrict(){ return !!checked("strict"); }

function parseVitalsFrom(text){
  var out={}; var T=String(text||"");
  var m;
  m=T.match(/\b(?:BP|blood\s*pressure)\s*[:=\s]*([0-9]{2,3})\s*[\/-]\s*([0-9]{2,3})\b/i);
  if(m) out.BP=m[1]+"/"+m[2];
  m=T.match(/\b(?:HR|heart\s*rate|pulse)\s*[:=\s]*([0-9]{2,3})(?!\d)\b/i);
  if(m) out.HR=m[1];
  m=T.match(/\b(?:RR|resp(?:iratory)?(?:\s*rate)?)\s*[:=\s]*([0-9]{1,3})(?!\d)\b/i);
  if(m) out.RR=m[1];
  m=T.match(/\b(?:T|temp(?:erature)?)\s*[:=\s]*([0-9]{1,2}(?:\.[0-9])?(?:\s*[CF])?)\b/i);
  if(m) out.T=m[1];
  return out;
}
function parseLabsList(text){
  var out={}; String(text||"").split(/\r?\n/).forEach(function(line){
    var L=line.trim(); if(!L) return;
    var m=L.match(/^\s*([A-Za-z0-9_.-]{1,40})\s*[:=]\s*(.+?)\s*$/);
    if(m) out[m[1]]=m[2];
  });
  return out;
}

function populateSpecialty(){
  var sel = el("specialty"); if(!sel) return Promise.resolve();
  return fetch("/disciplines.json", { cache: "no-store" })
    .then(function(r){ if(!r.ok) throw new Error("disciplines.json "+r.status); return r.json(); })
    .then(function(data){
      var clinical = null;
      if(Array.isArray(data)){
        for(var i=0;i<data.length;i++){
          var lbl = String((data[i]&&data[i].label)||"").toLowerCase();
          if(lbl.indexOf("clinical") !== -1){ clinical = data[i]; break; }
        }
      }
      var arr = [];
      if(clinical && Array.isArray(clinical.options)){
        for(var j=0;j<clinical.options.length;j++){
          var opt = clinical.options[j];
          var lab = String(opt && opt.label || "").trim();
          if(lab) arr.push(lab);
        }
      }
      var seen = Object.create(null), list=[];
      for(var k=0;k<arr.length;k++){ var s=arr[k]; if(!seen[s]){ seen[s]=1; list.push(s);} }
      list.sort(function(a,b){return a.localeCompare(b)});
      sel.innerHTML = "";
      for(var m=0;m<list.length;m++){
        var o=document.createElement("option");
        o.value=list[m]; o.textContent=list[m];
        sel.appendChild(o);
      }
      var hint = el("specCount"); if(hint) hint.textContent = "(" + list.length + ")";
      var ps = persistGet("soap.persist.specialty"); if(ps && list.indexOf(ps)>=0) sel.value=ps
    })
    .catch(function(){
      var fallback = ["General Practice","Family Medicine","Internal Medicine","Pediatrics"];
      sel.innerHTML = "";
      for(var k=0;k<fallback.length;k++){
        var o=document.createElement("option");
        o.value=fallback[k]; o.textContent=fallback[k];
        sel.appendChild(o);
      }
      var hint = el("specCount"); if(hint) hint.textContent = "(" + fallback.length + " fallback)";
      var ps = persistGet("soap.persist.specialty"); if(ps && fallback.indexOf(ps)>=0) sel.value=ps
    });
}
function populateDiscipline(){
  var sel = el("discipline"); if(!sel) return;
  var list = ["Physician","PA","NP","RN","PT","OT","SLP","Other"];
  sel.innerHTML="";
  for(var i=0;i<list.length;i++){
    var opt=document.createElement("option");
    opt.value=list[i];
    opt.textContent=list[i];
    sel.appendChild(opt);
  }
}

function buildPayload(){
  var payload={
    rawText: val("note"),
    patientHistory: val("history"),
    specialty: (el("specialty")&&el("specialty").value)||"General Practice",
    discipline: (el("discipline")&&el("discipline").value)||"",
    vitals: {},
    labs: {},
    imaging: [],
    dob: val("dob"),
    sex: val("sex"),
    duration: val("duration"),
    patientName: val("patientName"),
    mrn: val("mrn"),
    icd: val("icd"),
    createdAt: createdAt || nowISO(),
    model: currentModel(),
    strict: isStrict()
  };
  var vitals = kvTextareaToObj(val("vitals"));
  if(!Object.keys(vitals).length){
    var auto=parseVitalsFrom(payload.rawText+"\n"+payload.patientHistory);
    for(var k in auto) vitals[k]=auto[k];
  }
  if(Object.keys(vitals).length) payload.vitals=vitals;
  var labs=kvTextareaToObj(val("labs"));
  if(!Object.keys(labs).length){ labs=parseLabsList(payload.rawText+"\n"+payload.patientHistory); }
  if(Object.keys(labs).length) payload.labs=labs;
  var imaging=(el("imaging")&&el("imaging").value||"").split(/\r?\n/).map(function(s){return s.trim()}).filter(function(s){return s});
  if(imaging.length) payload.imaging=imaging;
  return payload;
}

function formatObjective(vitals,labs,imaging,dob,sex,duration){
  var html=[];
  if(dob) html.push('<div class="kv">• DOB: '+esc(dob)+'</div>');
  if(sex) html.push('<div class="kv">• Sex: '+esc(sex)+'</div>');
  if(duration) html.push('<div class="kv">• Duration: '+esc(duration)+'</div>');
  if(vitals && Object.keys(vitals).length){
    var keys=Object.keys(vitals);
    for(var i=0;i<keys.length;i++){ var k=keys[i]; html.push('<div class="kv">• '+esc(k)+': '+esc(vitals[k])+'</div>'); }
  }
  if(labs && Object.keys(labs).length){
    var lk=Object.keys(labs).sort();
    for(var j=0;j<lk.length;j++){ var k2=lk[j]; html.push('<div class="kv">• '+esc(k2)+': '+esc(labs[k2])+'</div>'); }
  }
  if(Array.isArray(imaging) && imaging.length){
    html.push('<ul>');
    for(var m=0;m<imaging.length;m++){ html.push('<li>'+esc(imaging[m])+'</li>'); }
    html.push('</ul>');
  }
  return html.join("");
}

function extractAP(modelText){
  var t=String(modelText||"");
  var a="", p="";
  var s=t.match(/(?:^|\n)\s*(Assessment)\s*:\s*([\s\S]*?)(?:\n\s*(Plan)\s*:|\n\s*P\s*:|\n\s*Plan\b|$)/i);
  if(s){ a=s[2].trim(); }
  var pm=t.match(/(?:^|\n)\s*(Plan)\s*:?\s*([\s\S]*)$/i);
  if(pm){ p=pm[2].trim(); }
  if(!a){
    var am=t.match(/(?:^|\n)\s*A\s*:\s*([\s\S]*?)(?:\n\s*P\s*:|\n\s*Plan\s*:|\n\s*Plan\b|$)/i);
    if(am){ a=am[1].trim(); }
  }
  if(!p){
    var pm2=t.match(/(?:^|\n)\s*P\s*:\s*([\s\S]*)$/i);
    if(pm2){ p=pm2[1].trim(); }
  }
  if(!a && /Assessment and Plan\s*:?\s*/i.test(t)){
    var ap=t.split(/Assessment and Plan\s*:?\s*/i)[1]||"";
    var parts=ap.split(/\n\s*\n/);
    if(parts.length>1){ a=parts[0].trim(); p=parts.slice[1].join("\n\n").trim(); }
    else { a=ap.trim(); }
  }
  return {a:a,p:p};
}

function renderSOAP(sections){
  var html=[];
  html.push('<div class="block"><strong>Subjective:</strong><br>'+esc(sections.subj||"")+'</div>');
  html.push('<div class="block"><strong>Objective:</strong><br>'+(sections.obj||"")+'</div>');
  html.push('<div class="block"><strong>Assessment:</strong><br>'+esc(sections.assess||"")+ '</div>');
  html.push('<div class="block"><strong>Plan:</strong><br>'+esc(sections.plan||"")+'</div>');
  return html.join("");
}

function showNoteHTML(h){
  var out=outEl(); if(!out) return;
  out.innerHTML=h||"";
}

function buildNoteMeta(){
  var header={
    provider: val("clinician"),
    clinic: val("clinic"),
    discipline: (el("discipline")&&el("discipline").value)||"",
    patientName: val("patientName"),
    mrn: val("mrn"),
    createdAt: createdAt || "",
    icd: val("icd")
  }
  var a=[]
  a.push('<div class="noteMetaRow">')
  a.push('<span><strong>Provider:</strong> '+esc(header.provider||"")+'</span>')
  a.push('<span><strong>Clinic:</strong> '+esc(header.clinic||"")+'</span>')
  a.push('<span><strong>Discipline:</strong> '+esc(header.discipline||"")+'</span>')
  a.push('</div>')
  a.push('<div class="noteMetaRow">')
  a.push('<span><strong>Patient:</strong> '+esc(header.patientName||"")+'</span>')
  a.push('<span><strong>MRN:</strong> '+esc(header.mrn||"")+'</span>')
  a.push('<span><strong>Date/Time:</strong> '+esc(header.createdAt||"")+'</span>')
  a.push('<span><strong>ICD-10:</strong> '+esc(header.icd||"")+'</span>')
  a.push('</div>')
  return a.join("")
}

function updateNoteMeta(){
  var H=el("noteHeader"), F=el("noteFooter")
  var html=buildNoteMeta()
  if(H) H.innerHTML = html
  if(F) F.innerHTML = html
}

function getSoapPlainFromEditor(defaultPlain){
  var o = outEl(); if(!o) return defaultPlain||""
  var txt = o.innerText.replace(/\r/g,"").trim()
  var hasAll = /Subjective:/i.test(txt) && /Objective:/i.test(txt) && /Assessment:/i.test(txt) && /Plan:/i.test(txt)
  if(hasAll) return txt
  return defaultPlain||txt
}

async function postTextWithModelHeader(url, body){
  var r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body||{}) });
  var txt = await r.text();
  var headerModel = r.headers.get("x-model-used");
  var badge = el("modelBadge");
  var chosen = currentModel() || "";
  var label = headerModel || chosen || "";
  if(badge && label){ badge.textContent = "Model: "+label; badge.style.display="inline-block"; }
  return txt;
}

async function generateSOAP(){
  setStatus("Generating SOAP…");
  try{
    createdAt = nowISO()
    var payload=buildPayload();
    payload.createdAt = createdAt
    var subjParts=[];
    if(payload.rawText) subjParts.push(payload.rawText);
    if(payload.patientHistory) subjParts.push(payload.patientHistory);
    var subj=subjParts.join("\n\n");
    var objHTML=formatObjective(payload.vitals,payload.labs,payload.imaging,payload.dob,payload.sex,payload.duration);
    var modelText=await postTextWithModelHeader("/api/soap/text", payload);
    var ap=extractAP(modelText);
    var finalHTML=renderSOAP({subj:subj,obj:objHTML,assess:ap.a||"",plan:ap.p||""});
    showNoteHTML(finalHTML);
    updateNoteMeta()
  }catch(e){
    showNoteHTML('<div class="block"><strong>Subjective:</strong><br></div><div class="block"><strong>Objective:</strong><br></div><div class="block"><strong>Assessment:</strong><br>Error</div><div class="block"><strong>Plan:</strong><br></div>');
  }finally{
    setStatus("");
    wireButtons()
  }
}

function clearPatientData(){
  setVal("note","");
  setVal("history","");
  setVal("labs","");
  setVal("imaging","");
  setVal("vitals","");
  setVal("dob","");
  setVal("sex","");
  setVal("duration","");
  setVal("patientName","");
  setVal("mrn","");
  setVal("icd","");
  showNoteHTML("");
  createdAt=null
  updateNoteMeta()
  var raw=el("note"); if(raw) raw.focus();
  wireButtons()
}

async function exportPdf(){
  setStatus("Exporting PDF…");
  try{
    var payload=buildPayload();
    var subjParts=[];
    if(payload.rawText) subjParts.push(payload.rawText);
    if(payload.patientHistory) subjParts.push(payload.patientHistory);
    var subj=subjParts.join("\n\n");

    var objLines=[];
    if(payload.dob) objLines.push("DOB: "+payload.dob);
    if(payload.sex) objLines.push("Sex: "+payload.sex);
    if(payload.duration) objLines.push("Duration: "+payload.duration);
    if(payload.vitals && Object.keys(payload.vitals).length){
      var keys=Object.keys(payload.vitals);
      for(var i=0;i<keys.length;i++){ var k=keys[i]; objLines.push(k+": "+payload.vitals[k]); }
    }
    if(payload.labs && Object.keys(payload.labs).length){
      var lk=Object.keys(payload.labs).sort();
      for(var j=0;j<lk.length;j++){ var k2=lk[j]; objLines.push(k2+": "+payload.labs[k2]); }
    }
    if(Array.isArray(payload.imaging) && payload.imaging.length){
      for(var m=0;m<payload.imaging.length;m++){ objLines.push(payload.imaging[m]); }
    }
    var objText=objLines.join("\n");

    var defaultPlain = [
      "Subjective:",
      subj,
      "",
      "Objective:",
      objText,
      "",
      "Assessment:",
      "",
      "",
      "Plan:",
      ""
    ].join("\n");

    var soapPlain = getSoapPlainFromEditor(defaultPlain)

    var badge = el("modelBadge");
    var modelUsed = badge && badge.textContent ? badge.textContent.replace(/^Model:\s*/,"") : (currentModel()||"");

    var reqBody = {
      title: (val("title")||"SOAP Note"),
      provider: val("clinician"),
      clinic: val("clinic"),
      discipline: (el("discipline")&&el("discipline").value)||"",
      patientName: val("patientName"),
      mrn: val("mrn"),
      icd: val("icd"),
      createdAt: payload.createdAt,
      soap: soapPlain,
      modelUsed: modelUsed
    };

    var r = await fetch("/api/export-pdf", {
      method:"POST", headers:{ "Content-Type":"application/json","Accept":"application/pdf" },
      body: JSON.stringify(reqBody)
    });
    if(!r.ok) throw new Error("export "+r.status);
    var b = await r.blob();
    var url = URL.createObjectURL(b);
    var a = document.createElement("a");
    a.href = url; a.download = (reqBody.title||"soap-note") + ".pdf";
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url) }, 2500);
  }catch(e){
    alert("Export failed: " + String(e&&e.message||e));
  }finally{
    setStatus("");
    wireButtons()
  }
}

async function saveWordDoc(){
  setStatus("Saving…");
  try{
    var badge = el("modelBadge");
    var modelUsed = badge && badge.textContent ? badge.textContent.replace(/^Model:\s*/,"") : (currentModel()||"");
    var soapPlain = getSoapPlainFromEditor("")
    var reqBody = {
      title: (val("title")||"SOAP Note"),
      provider: val("clinician"),
      clinic: val("clinic"),
      discipline: (el("discipline")&&el("discipline").value)||"",
      patientName: val("patientName"),
      mrn: val("mrn"),
      icd: val("icd"),
      createdAt: createdAt || nowISO(),
      soap: soapPlain,
      modelUsed: modelUsed
    };
    var r = await fetch("/api/save-note", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(reqBody) });
    if(!r.ok) throw new Error("save "+r.status);
    var b = await r.blob();
    var url = URL.createObjectURL(b);
    var a = document.createElement("a");
    a.href = url; a.download = (reqBody.title||"soap-note") + ".rtf";
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url) }, 2500);
  }catch(e){
    alert("Save failed: " + String(e&&e.message||e));
  }finally{
    setStatus("");
    wireButtons()
  }
}

function wireButtons(){
  var g=el("btnGenerate"); if(g && !g.dataset.wired){ g.dataset.wired="1"; g.addEventListener("click", generateSOAP) }
  var c=el("btnClear"); if(c && !c.dataset.wired){ c.dataset.wired="1"; c.addEventListener("click", clearPatientData) }
  var p=el("genStream"); if(p && !p.dataset.wired){ p.dataset.wired="1"; p.addEventListener("click", function(){ window.print() }) }
  var s=el("saveNote"); if(s && !s.dataset.wired){ s.dataset.wired="1"; s.addEventListener("click", saveWordDoc) }
  var ex=el("exportPdf"); if(ex && !ex.dataset.wired){ ex.dataset.wired="1"; ex.addEventListener("click", exportPdf) }
  var rm=el("reloadModels"); if(rm && !rm.dataset.wired){ rm.dataset.wired="1"; rm.addEventListener("click", loadModels) }
}

function wirePersistence(){
  var pr=el("clinician"), cl=el("clinic"), sp=el("specialty"), md=el("model")
  if(pr){ pr.value = persistGet("soap.persist.provider"); pr.addEventListener("input",function(){persistSet("soap.persist.provider",val("clinician")); updateNoteMeta()}) }
  if(cl){ cl.value = persistGet("soap.persist.clinic"); cl.addEventListener("input",function(){persistSet("soap.persist.clinic",val("clinic")); updateNoteMeta()}) }
  if(sp){ var ps=persistGet("soap.persist.specialty"); if(ps) sp.value=ps; sp.addEventListener("change",function(){persistSet("soap.persist.specialty",sp.value); updateNoteMeta()}) }
  if(md){ var pm=persistGet("soap.persist.model"); if(pm) md.value=pm; md.addEventListener("change",function(){persistSet("soap.persist.model",md.value)}) }
}

document.addEventListener("DOMContentLoaded", function(){
  populateDiscipline()
  populateSpecialty().then(function(){ wirePersistence(); updateNoteMeta() })
  loadModels().then(function(){ wirePersistence() })
  wireButtons()
  ;["patientName","mrn","icd"].forEach(function(id){ var x=el(id); if(x) x.addEventListener("input",updateNoteMeta) })
  var d=el("discipline"); if(d){ d.addEventListener("change",updateNoteMeta) }
  ;["clinician","clinic"].forEach(function(id){ var x=el(id); if(x) x.addEventListener("input",updateNoteMeta) })
  updateNoteMeta()
});
})();

document.addEventListener('DOMContentLoaded',function(){
  var btn=document.getElementById('btnClear'); if(!btn) return;
  function setVal(id,v){var x=document.getElementById(id); if(!x) return; x.value=v||''; x.dispatchEvent(new Event('input',{bubbles:true}));}
  function clearOut(id){var x=document.getElementById(id); if(!x) return; x.textContent=''; x.innerHTML='';}
  btn.onclick=function(){
    setVal('patient','');
    setVal('rawText','');
    setVal('patientHistory','');
    setVal('labs','');
    setVal('vBP','');
    setVal('vHR','');
    setVal('vRR','');
    setVal('imaging','');
    clearOut('soapTextOut');
    var raw=document.getElementById('rawText'); if(raw) raw.focus();
  };
});


/* generate-button-only */
document.addEventListener('DOMContentLoaded',function(){
  var raw=document.getElementById('rawText');
  if(raw){
    raw.addEventListener('keydown',function(e){
      if(e.key==='Enter' && !e.shiftKey){
        e.stopImmediatePropagation();
        e.stopPropagation();
        return;
      }
    }, true);
  }
  var btn=document.getElementById('btnGenerate');
  if(!btn || btn.dataset.bound==='1') return;
  btn.dataset.bound='1';
  btn.onclick=async function(){
    var out=document.getElementById('soapTextOut')||document.getElementById('jsonOut');
    var st=document.getElementById('status'); if(st) st.textContent='Generating...';
    try{
      var v=function(id){var x=document.getElementById(id);return x?x.value.trim():''};
      var c=function(id){var x=document.getElementById(id);return x?!!x.checked:false};
      var payload={
        rawText:v('rawText'),
        patientHistory:v('patientHistory'),
        specialty:(document.getElementById('specialty')&&document.getElementById('specialty').value)||'General Practice',
        allowInference:c('allowInference'),
        model:(document.getElementById('model')&&document.getElementById('model').value)||null
      };
      var r=await fetch('/api/soap/json',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
      var ct=r.headers.get('content-type')||'';
      if(!r.ok){
        var errText=await r.text();
        if(out) out.textContent='Error '+r.status+': '+errText.slice(0,400);
        if(st) st.textContent='Error';
        return;
      }
      if(ct.includes('application/json')){
        var d=await r.json();
        var n=(d&&d.note)?d.note:d;
        var parts=['Subjective','Objective','Assessment','Plan'];
        var s=parts.map(function(k){ return n[k]?(''<b>'+k+'</b>'\n\n'+n[k]):'' }).filter(Boolean).join('\n\n');
        if(out) out.textContent=__normalizeEscapes(s);
      }else{
        var t=await r.text();
        if(out) out.textContent=__normalizeEscapes(t);
      }
      if(st) st.textContent='';
    }catch(e){
      if(out) out.textContent='Error: '+String(e).slice(0,400);
      if(st) st.textContent='Error';
    }
  };
});
function __normalizeEscapes(t){
  try{
    if(typeof t!=='string') return t;
    return t.replace(/\r\n/g,'\n').replace(/\\r
/g,'\n').replace(/
/g,'\n');
  }catch(e){ return t; }
}
