(function(){
function el(id){return document.getElementById(id)}
function val(id){var x=el(id);return x?x.value.trim():""}
function checked(id){var x=el(id);return x?x.checked:false}
function outEl(){return document.getElementById("soapTextOut")||document.getElementById("jsonOut")}
function setStatus(t){var s=el("status"); if(s) s.textContent=t||""}

function parseVitalsFrom(text){
  var out={}; var T=String(text||"");
  var m;
  m=T.match(/\b(?:BP|blood\s*pressure)\s*[:=\s]*([0-9]{2,3})\s*[\/-]\s*([0-9]{2,3})\b/i);
  if(m) out.BP=m[1]+"/"+m[2];
  m=T.match(/\b(?:HR|heart\s*rate|pulse)\s*[:=\s]*([0-9]{2,3})(?!\d)\b/i);
  if(m) out.HR=m[1];
  m=T.match(/\b(?:RR|resp(?:iratory)?(?:\s*rate)?)\s*[:=\s]*([0-9]{1,3})(?!\d)\b/i);
  if(m) out.RR=m[1];
  m=T.match(/\b(?:T|temp(?:erature)?)\s*[:=\s]*([0-9]{2,3}(?:\.[0-9])?)\s*(?:[FC])?\b/i);
  if(m) out.Temp=m[1];
  m=T.match(/\b(?:SpO2|SaO2|O2(?:\s*saturation)?)\s*[:=\s]*([0-9]{2,3})\s*%\b/i);
  if(m) out.SpO2=m[1]+"%";
  return out;
}

var VITAL_KEYS=new Set(["BP","BLOOD PRESSURE","HR","HEART RATE","PULSE","RR","RESP","RESPIRATORY RATE","RESPIRATIONS","SPO2","SAO2","O2","TEMP","TEMPERATURE"]);
function parseLabsList(text){
  var out={}; var lines=String(text||"").split(/\r?\n/);
  for(var i=0;i<lines.length;i++){
    var line=lines[i];
    var m = line.match(/^\s*([A-Za-z][A-Za-z0-9 /+\-%]{1,32})\s*[:=]\s*(.+)\s*$/);
    if(!m) continue;
    var k=m[1].trim().replace(/\s+/g," ");
    if(VITAL_KEYS.has(k.toUpperCase())) continue;
    var v=m[2].trim();
    if(k && v) out[k]=v;
  }
  return out;
}

function labsTextareaToObj(txt){
  var out={}; String(txt||"").split(/\r?\n/).forEach(function(line){
    var i=line.indexOf("="); if(i<=0) return;
    var k=line.slice(0,i).trim(); var v=line.slice(i+1).trim();
    if(k && v) out[k]=v;
  });
  return out;
}

function buildPayload(){
  var payload={
    rawText: val("rawText"),
    patientHistory: val("patientHistory"),
    specialty: (el("specialty")&&el("specialty").value)||"General Practice",
    allowInference: checked("allowInference"),
    model: (el("model")&&el("model").value)||null
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

  return payload;
}

function showNoteText(t){
  var out=outEl(); if(!out) return;
  out.textContent=t||"";
  out.style.whiteSpace="pre-wrap";
  out.style.overflowWrap="anywhere";
}

function showICD(list){
  var box=el("icdOut"); if(!box) return;
  var enabled=checked("includeICD");
  if(!enabled){ box.textContent="ICD-10 suggestions disabled."; return; }
  if(!Array.isArray(list)||!list.length){ box.textContent="No suggestions."; return; }
  box.innerHTML="<ul>"+list.map(function(x){return "<li><b>"+x.code+"</b> — "+x.term+"</li>"}).join("")+"</ul>";
}

var inFlight=false;
async function generateOnce(){
  if(inFlight) return;
  inFlight=true;
  setStatus("Generating...");
  try{
    var payload=buildPayload();
    var rT=await fetch("/api/generate-soap",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    var jT=await rT.json();
    var noteText=jT&&jT.soapNote||"";
    showNoteText(noteText);

    var rA=await fetch("/api/generate-soap-json-annotated",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    var jA=await rA.json();
    showICD(jA.icd||[]);
  }catch(e){
    showNoteText("Error: "+(e&&e.message?e.message:String(e)));
  }finally{
    setStatus("");
    inFlight=false;
  }
}

function autofillFromHPI(){
  var hpi=val("rawText")+"\n"+val("patientHistory");
  var v=parseVitalsFrom(hpi);
  if(v.BP && !val("vBP")) el("vBP").value=v.BP;
  if(v.HR && !val("vHR")) el("vHR").value=v.HR;
  if(v.RR && !val("vRR")) el("vRR").value=v.RR;
  if(!val("labs")){
    var labs=parseLabsList(hpi);
    if(Object.keys(labs).length) el("labs").value=Object.entries(labs).map(function(kv){return kv[0]+"="+kv[1]}).join("\n");
  }
}

function wire(){
  var raw=el("rawText");
  if(raw){
    raw.addEventListener("keydown",function(e){
      if(e.key==="Enter" && !e.shiftKey){
        e.preventDefault();
        generateOnce();
      }
    });
    raw.addEventListener("input",autofillFromHPI);
  }
  var hx=el("patientHistory");
  if(hx) hx.addEventListener("input",autofillFromHPI);

  var g=document.getElementById("genJson"); if(g) g.remove();
  var sbtn=document.getElementById("genStream"); if(sbtn) sbtn.remove();
  var save=document.getElementById("saveNote");
  if(save){
    save.onclick=async function(){
      var payload=buildPayload();
      try{
        var r=await fetch("/api/save-note",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        var j=await r.json();
        var d=el("downloads");
        if(j&&j.ok){ d.innerHTML='<a class="button" href="'+j.files.text+'" target="_blank">Download Text</a> <a class="button" href="'+j.files.json+'" target="_blank">Download Data</a>'; }
        else { d.textContent=(j&&j.error)||"Failed to save."; }
      }catch(e){}
    }
  }
  var out=outEl(); if(out){ out.style.whiteSpace="pre-wrap"; out.style.overflowWrap="anywhere"; }
  setTimeout(autofillFromHPI,0);
}

document.addEventListener("DOMContentLoaded",wire);
})();
