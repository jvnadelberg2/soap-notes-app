document.addEventListener('DOMContentLoaded',function(){
  var old = document.getElementById('btnGenerate'); if(!old) return;
  var btn = old;
  var out = document.getElementById('soapTextOut')||document.getElementById('jsonOut');
  var st  = document.getElementById('status');
  function val(id){var x=document.getElementById(id);return x?String(x.value||'').trim():''}
  function chk(id){var x=document.getElementById(id);return !!(x&&x.checked)}
  btn.addEventListener('click', async function(){
    if(st) st.textContent='Generating...';
    if(out) out.innerHTML='';
    var payload={
      rawText:val('rawText'),
      patientHistory:val('patientHistory'),
      specialty:(document.getElementById('specialty')&&document.getElementById('specialty').value)||'General Practice',
      allowInference:chk('allowInference'),
      model:(document.getElementById('model')&&document.getElementById('model').value)||null
    };
// [inject labs/imaging] -- begin
(function(p){
  var labsEl=document.getElementById("labs"),
      imgEl =document.getElementById("imaging");
  var labs   = labsEl? String(labsEl.value||"").trim() : "",
      imaging= imgEl? String(imgEl.value||"").trim(): "";
  if(labs||imaging){
    if(labs && !p.labs) p.labs = labs;
    if(imaging && !p.imaging) p.imaging = imaging;

    // avoid double-append
    var already=false;
    ["Objective","body","text","input","prompt","bodyTxt","hpi","complaint","note","Subjective"]
      .some(function(k){
        if(typeof p[k]==="string" && (p[k].indexOf("Labs:")!==-1 || p[k].indexOf("Imaging:")!==-1)){
          already=true; return true;
        }
        return false;
      });

    if(!already){
      var parts=[];
      if(labs)    parts.push("Labs:\\n"+labs);
      if(imaging) parts.push("Imaging:\\n"+imaging);
      var block="\\n\\n"+parts.join("\\n\\n");
      ["Objective","body","text","input","prompt","bodyTxt","hpi","complaint","note","Subjective"]
        .forEach(function(k){ if(typeof p[k]==="string"){ p[k]+=block; }});
    }
  }
  return p;
})(payload);
// [inject labs/imaging] -- end

// [inject vitals HR/RR/BP] -- begin
(function(p){
  var b=document.getElementById("vBP"),
      h=document.getElementById("vHR"),
      r=document.getElementById("vRR");
  var vb=b?String(b.value||"").trim():"",
      vh=h?String(h.value||"").trim():"",
      vr=r?String(r.value||"").trim():"";
  if(vb||vh||vr){
    p.vitals=p.vitals||{};
    if(vb){ p.vitals.BP=vb; if(!p.bp)p.bp=vb; }
    if(vh){ p.vitals.HR=vh; if(!p.hr)p.hr=vh; }
    if(vr){ p.vitals.RR=vr; if(!p.rr)p.rr=vr; }
    var lines=[];
    if(vb) lines.push("BP: "+vb);
    if(vh) lines.push("HR: "+vh);
    if(vr) lines.push("RR: "+vr);

    // avoid double-inject if Vitals already appended
    var already=false;
    ["Objective","body","text","input","prompt","bodyTxt","hpi","complaint","note","Subjective"].some(function(k){
      if(typeof p[k]==="string" && p[k].indexOf("Vitals:")!==-1){ already=true; return true; }
      return false;
    });
    if(!already){
      var block="\\n\\nVitals:\\n"+lines.join("\\n");
      ["Objective","body","text","input","prompt","bodyTxt","hpi","complaint","note","Subjective"].forEach(function(k){
        if(typeof p[k]==="string"){ p[k]+=block; }
      });
    }
  }
  return p;
})(payload);
// [inject vitals] -- end

    try{
      var r=await fetch('/api/soap/json',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify((function(p){var x=document.getElementById("vBP");if(x){var v=String(x.value||"").trim();p.vitals=p.vitals||{};p.vitals.BP=v;if(!p.bp)p.bp=v;}return p;})(payload))});
      var ct=r.headers.get('content-type')||'';
      if(!r.ok){
        var t=await r.text();
        if(out) out.innerText='Error '+r.status+': '+t.slice(0,400);
        if(st) st.textContent='Error';
        return;
      }
      var text='';
      if(ct.indexOf('application/json')!==-1){
        var d=await r.json(); var n=(d&&d.note)?d.note:d;
        var parts=['Subjective','Objective','Assessment','Plan'];
        text = parts.map(function(k){
          return n[k]?('<strong>'+k+':</strong>\n\n'+n[k]):'';
        }).filter(Boolean).join('\n\n');
      }else{
        text = await r.text();
      }
      if(out) out.innerHTML = String(text).replace(/\r\n/g,'\n').replace(/\\n/g,'\n').replace(/\n/g,'\n');
      if(st) st.textContent='';
    }catch(e){
      if(out) out.innerText='Error: '+String(e).slice(0,400);
      if(st) st.textContent='Error';
    }
  }, {once:false});

  var raw=document.getElementById('rawText');
  if(raw){
    raw.addEventListener('keydown',function(e){
      if(e.key==='Enter' && !e.shiftKey){ e.stopImmediatePropagation(); e.stopPropagation(); }
    }, true);
  }
});