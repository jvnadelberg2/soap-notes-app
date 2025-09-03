document.addEventListener('DOMContentLoaded',function(){
  function byId(id){return document.getElementById(id)}
  function val(id){var x=byId(id);return x?String(x.value||'').trim():''}
  function safe(s){return String(s||'').trim()}
  function setMsg(t){var m=byId('downloads'); if(m) m.textContent=String(t||'')}

  function noteText(){
    var out=byId('soapTextOut')||byId('jsonOut');
    if(!out) return '';
    return String(out.textContent||out.innerText||'').replace(/\r\n/g,'\n');
  }

  var btnPrint = byId('genStream');
  if(btnPrint){
    btnPrint.onclick = function(){ window.print(); };
  }

  var btnWord = byId('saveNote');
  if(btnWord){
    btnWord.onclick = function(){
      var patient = val('patient') || 'Patient';
      var clinic = val('clinic') || '';
      var provider = val('provider') || '';
      var now = new Date();
      var y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), d=String(now.getDate()).padStart(2,'0');
      var fname = (patient.replace(/[^A-Za-z0-9._-]+/g,'_')||'note')+'_'+y+m+d+'.doc';
      var body = ''
        + (clinic?('<h2 style="margin:0 0 8px 0">'+clinic.replace(/&/g,'&amp;')+'</h2>'):'')
        + ((patient||provider)?('<div style="margin:0 0 8px 0">'+patient.replace(/&/g,'&amp;')+(provider?(' — '+provider.replace(/&/g,'&amp;')):'')+'</div>'):'')
        + '<pre style="white-space:pre-wrap; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; line-height:1.35; margin:0">'
        + noteText().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        + '</pre>';
      var html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>SOAP Note</title></head><body>'+body+'</body></html>';
      var blob = new Blob([html], {type:'application/msword'});
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    };
  }

  async function getAnnotated(){
    var payload={
      rawText: val('rawText'),
      patientHistory: val('patientHistory'),
      specialty: (byId('specialty')&&byId('specialty').value)||'General Practice',
      allowInference: !!(byId('allowInference')&&byId('allowInference').checked),
      model: (byId('model')&&byId('model').value)||null
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

    var r=await fetch('/api/generate-soap-json-annotated',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify((function(p){var x=document.getElementById("vBP");if(x){var v=String(x.value||"").trim();p.vitals=p.vitals||{};p.vitals.BP=v;if(!p.bp)p.bp=v;}return p;})(payload))});
    if(!r.ok) throw new Error('annotated '+r.status);
    var j=await r.json();
    return j&&j.data?j.data:null;
  }

  var btnPdf = byId('exportPdf');
  if(btnPdf){
    btnPdf.onclick = async function(){
      setMsg('Exporting PDF...');
      var bodyTxt = noteText();
      if(!bodyTxt){ setMsg('Nothing to export'); return }
      try{
        var data = await getAnnotated();
        if(!data){ data = { Subjective: bodyTxt, Objective: '', Assessment: '', Plan: '' }; }
        var header = { patient:safe(val('patient')), provider:safe(val('provider')), clinic:safe(val('clinic')) , mrn: safe(val('mrn'))};
        var r = await fetch('/api/export-pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ header: header, data: data })});
        var ct = r.headers.get('content-type')||'';
        if(ct.includes('application/pdf')){
          var b=await r.blob();
          var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='soap-note.pdf';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function(){ URL.revokeObjectURL(a.href)},1000);
          setMsg('PDF downloaded.');
          return;
        }
        if(!r.ok){ setMsg('Export PDF failed'); return }
        var j=await r.json();
        if(j&&j.file){
          var a=document.createElement('a'); a.href=j.file; a.download='soap-note.pdf';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function(){ try{URL.revokeObjectURL(a.href)}catch(e){} },1000);
          setMsg('PDF downloaded.');
          return;
        }
        setMsg('Export PDF failed');
      }catch(e){
        setMsg('Export error: '+e.message);
      }
    };
  }
});
document.addEventListener('DOMContentLoaded',function(){
  var o=document.getElementById('soapTextOut')||document.getElementById('jsonOut');
  var ce=document.getElementById('toggleEditable');
  if(ce&&o){ ce.checked=(o.getAttribute('contenteditable')==='true'); ce.onchange=function(){ o.setAttribute('contenteditable', ce.checked?'true':'false'); } }
  var bc=document.getElementById('btnCopy');
  if(bc&&o){ bc.onclick=async function(){ var t=String(o.textContent||o.innerText||''); try{ await navigator.clipboard.writeText(t); var m=document.getElementById('downloads'); if(m) m.textContent='Copied.' }catch(e){ var m=document.getElementById('downloads'); if(m) m.textContent='Copy failed' } } }
});
