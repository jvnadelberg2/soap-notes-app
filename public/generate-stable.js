document.addEventListener('DOMContentLoaded',function(){
  var old = document.getElementById('btnGenerate'); if(!old) return;
  var btn = old.cloneNode(true); old.parentNode.replaceChild(btn, old);
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
    try{
      var r=await fetch('/api/soap/json',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
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