(function(){
function el(id){return document.getElementById(id)}
function val(id){var x=el(id);return x?x.value.trim():""}
function checked(id){var x=el(id);return x?x.checked:false}
function outEl(){return document.getElementById("soapTextOut")}
function setStatus(t){var s=el("status"); if(s) s.textContent=t||""}

async function loadModels(){
  var sel = el("model"); if(!sel) return;
  sel.innerHTML = "";
  setStatus("Loading models…");
  try{
    var r = await fetch("/api/models", { method:"GET" });
    var j = await r.json().catch(function(){ return {}; });
    var arr = Array.isArray(j.models) ? j.models : [];
    // Client-side filter (belt & suspenders) to exclude embeddings
    arr = arr.filter(function(name){
      var n = String(name||"").toLowerCase();
      return n && n.indexOf("embed") === -1 && n.indexOf("embedding") === -1 && n.indexOf("nomic-embed-text") === -1;
    });
    var list = arr.length ? arr : ["llama3:latest","llama3.1:8b","mistral:7b-instruct","phi3:mini"];
    list.forEach(function(name){
      var opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    });
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

function labsTextareaToObj(s){
  var out={}; String(s||"").split(/\r?\n/).forEach(function(line){
    var L=line.trim(); if(!L) return;
    var i=L.indexOf("="); if(i>-1){ var k=L.slice(0,i).trim(); var v=L.slice(i+1).trim(); if(k) out[k]=v; }
  });
  return out;
}

// Populate specialty & discipline
function populateSpecialty(){
  var sel = el("specialty"); if(!sel) return;
  var list = [
    "General Practice","Family Medicine","Internal Medicine","Pediatrics",
    "Geriatrics","Cardiology","Pulmonology","Endocrinology","Gastroenterology",
    "Nephrology","Neurology","Psychiatry","OB/GYN","Orthopedics","Dermatology",
    "Otolaryngology","Ophthalmology","Urology","Oncology","Rheumatology",
    "Emergency Medicine","Sports Medicine","Palliative Care"
  ];
  sel.innerHTML = "";
  list.forEach(function(name){
    var opt=document.createElement("option"); opt.value=name; opt.textContent=name; sel.appendChild(opt);
  });
  var hint = el("specCount"); if(hint) hint.textContent = "(" + list.length + ")";
}

function populateDiscipline(){
  var sel = el("discipline"); if(!sel) return;
  var list = ["Physician","PA","NP","RN","PT","OT","SLP","Other"];
  sel.innerHTML = "";
  list.forEach(function(name){
    var opt=document.createElement("option"); opt.value=name; opt.textContent=name; sel.appendChild(opt);
  });
}

function buildPayload(){
  var payload={
    rawText: val("note"),
    patientHistory: val("history"),
    specialty: (el("specialty")&&el("specialty").value)||"General Practice",
    vitals: {},
    labs: {},
    imaging: []
  };

  var vitals={};
  if(val("vBP")) vitals.BP=val("vBP");
  if(val("vHR")) vitals.HR=val("vHR");
  if(val("vRR")) vitals.RR=val("vRR");
  if(!Object.keys(vitals).length){
    var auto=parseVitalsFrom(payload.rawText+"\n"+payload.patientHistory);
    for(var k in auto) vitals[k]=auto[k];
  }
  if(Object.keys(vitals).length) payload.vitals=vitals;

  var labs=labsTextareaToObj(val("labs"));
  if(!Object.keys(labs).length){
    labs=parseLabsList(payload.rawText+"\n"+payload.patientHistory);
  }
  if(Object.keys(labs).length) payload.labs=labs;

  var imaging=(el("imaging")&&el("imaging").value||"").split(/\r?\n/).map(function(s){return s.trim()}).filter(function(s){return s});
  if(imaging.length) payload.imaging=imaging;

  payload.model = currentModel();
  payload.strict = isStrict();
  return payload;
}

function showNoteText(t){
  var out=outEl(); if(!out) return;
  out.textContent=t||"";
  out.style.whiteSpace="pre-wrap";
  out.style.overflowWrap="anywhere";
}

async function postJSON(url, body){
  var r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body||{}) });
  var ct = r.headers.get("content-type")||"";
  if(ct.indexOf("application/json")>-1) return await r.json();
  return { ok:false, error: "Unexpected response" };
}

async function postText(url, body){
  var r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body||{}) });
  return await r.text();
}

async function generateText(){
  setStatus("Generating SOAP text…");
  try{
    var payload=buildPayload();
    var txt = await postText("/api/soap/text", payload);
    showNoteText(txt);
  }catch(e){
    showNoteText("Error: "+String(e&&e.message||e));
  }finally{
    setStatus("");
  }
}

async function exportPdf(){
  setStatus("Exporting PDF…");
  try{
    var payload=buildPayload();
    payload.title = val("title");
    payload.provider = val("clinician");
    payload.clinic = val("clinic");
    var r = await fetch("/api/export-pdf", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    var b = await r.blob();
    var url = URL.createObjectURL(b);
    var a = document.createElement("a");
    a.href = url; a.download = (payload.title||"soap-note") + ".pdf";
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url) }, 2500);
  }catch(e){
    alert("Export failed: " + String(e&&e.message||e));
  }finally{
    setStatus("");
  }
}

async function saveNote(){
  setStatus("Saving note…");
  try{
    var payload=buildPayload();
    payload.title = val("title");
    var r = await postJSON("/api/save-note", payload);
    if(!(r&&r.ok)) throw new Error("Save failed");
  }catch(e){
    alert("Save failed: " + String(e&&e.message||e));
  }finally{
    setStatus("");
  }
}

document.addEventListener("DOMContentLoaded", function(){
  var gT=el("genText"); if(gT) gT.addEventListener("click", generateText);
  var ex=el("exportPdf"); if(ex) ex.addEventListener("click", exportPdf);
  var sv=el("saveNote"); if(sv) sv.addEventListener("click", saveNote);
  var rm=el("reloadModels"); if(rm) rm.addEventListener("click", loadModels);

  populateSpecialty();
  populateDiscipline();
  loadModels();
});
})();

