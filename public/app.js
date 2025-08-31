(function(){
  var inFlight=false;
  function $(id){return document.getElementById(id)}
  function val(id){var el=$(id);return el?(el.value||"").trim():""}
  function checked(id){var el=$(id);return !!(el&&el.checked)}
  function safe(s){return String(s==null?"":s).trim()}
  function setDisabled(btn,on){if(btn){btn.disabled=!!on}}
  function collectVitals(){var v={},bp=val('vBP'),hr=val('vHR'),rr=val('vRR');if(bp)v.BP=bp;if(hr)v.HR=hr;if(rr)v.RR=rr;return v}
  function collectLabs(){var t=val('labs');if(!t)return{};var out={};t.split(/\r?\n/).forEach(function(line){var m=line.split(/[:=]/);if(m.length>=2){var k=m[0].trim(),vv=m.slice(1).join('=').trim();if(k)out[k]=vv}});return out}
  async function generate(e){
    if(e&&e.preventDefault)e.preventDefault();
    if(inFlight)return;
    var btn=$('btnGenerate');inFlight=true;setDisabled(btn,true);
    var payload={rawText:val('rawText'),patientHistory:val('patientHistory'),specialty:val('specialty')||'General Practice',vitals:collectVitals(),labs:collectLabs(),imaging:{},allowInference:checked('allowInference'),model:val('model')||null,provider:val('provider')||'ollama'};
    var isEmpty=!payload.rawText&&!payload.patientHistory&&!Object.keys(payload.vitals).length&&!Object.keys(payload.labs).length;
    if(isEmpty){inFlight=false;setDisabled(btn,false);return}
    try{
      const doFetch=async()=>{const res=await fetch('/api/generate-soap-json-annotated',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!res.ok){const txt=await res.text();throw new Error('HTTP '+res.status+' '+txt.slice(0,200))}return res.json()}
      let body;try{body=await doFetch()}catch(err){if(String(err).includes('Failed to fetch')){await new Promise(r=>setTimeout(r,300));body=await doFetch()}else{throw err}}
      var d=(body&&body.data)||{};var t='';if(d.Subjective)t+='Subjective:\n'+safe(d.Subjective)+'\n\n';if(d.Objective)t+='Objective:\n'+safe(d.Objective)+'\n\n';if(d.Assessment)t+='Assessment:\n'+safe(d.Assessment)+'\n\n';if(d.Plan)t+='Plan:\n'+safe(d.Plan)+'\n\n';
      var out=$('soapTextOut');if(out)out.textContent=t||JSON.stringify(d,null,2);
      if(Array.isArray(body.icd)&&typeof window.renderICD==='function'){window.renderICD(body.icd)}
    }catch(err){console.error('Generate failed',err);alert('Generate failed: '+(err&&err.message?err.message:String(err)))}finally{inFlight=false;setDisabled(btn,false)}
  }
  function clearPatientData(e){
    if(e&&e.preventDefault)e.preventDefault();
    ['patient','rawText','patientHistory','vBP','vHR','vRR','labs'].forEach(function(id){var el=$(id);if(el)el.value=''});
    var out=$('soapTextOut');if(out)out.textContent='';
    if(typeof window.renderICD==='function'){window.renderICD([])}
  }
  function wire(){
    var form=document.querySelector('form'); if(form){ form.addEventListener('submit', function(ev){ ev.preventDefault(); }); }
    var btn=$('btnGenerate');if(btn){btn.removeEventListener('click',generate);btn.addEventListener('click',generate)}
    var ta=$('rawText');if(ta){ta.addEventListener('keydown',function(ev){if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault()}})}
    var clr=$('btnClear');if(clr){clr.removeEventListener('click',clearPatientData);clr.addEventListener('click',clearPatientData)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
  window.__wireGenerate=wire
})();
(function(){
  'use strict';
  var MODELS = ["ollama/llama3.1:8b","ollama/llama3.1:13b","gpt-4o-mini"];
  var SPECIALTIES = ["General Practice","Cardiology","Endocrinology","Gastroenterology","Psychiatry","Urology"];

  function $(id){ return document.getElementById(id) }
  function k(id){ return 'sel:'+id }
  function save(id,v){ try{ sessionStorage.setItem(k(id), String(v||'')) }catch(e){} }
  function load(id){ try{ return sessionStorage.getItem(k(id))||'' }catch(e){ return '' } }

  function dedup(sel){
    var seen = new Set();
    for (var i=sel.options.length-1;i>=0;i--){
      var v = String(sel.options[i].value||sel.options[i].textContent||'').trim().toLowerCase();
      if (!v) continue;
      if (seen.has(v)) sel.remove(i); else seen.add(v);
    }
  }

  function setIfEmpty(id, items){
    var sel = $(id); if (!sel) return;
    var had = sel.options.length;
    if (!had){
      var frag = document.createDocumentFragment();
      for (var i=0;i<items.length;i++){
        var txt = String(items[i]||'').trim(); if (!txt) continue;
        var o = document.createElement('option'); o.value = txt; o.textContent = txt; frag.appendChild(o);
      }
      sel.innerHTML = '';
      sel.appendChild(frag);
    }
    dedup(sel);
    var want = load(id);
    if (want){
      for (var j=0;j<sel.options.length;j++){
        var ov = String(sel.options[j].value||sel.options[j].textContent||'').trim();
        if (ov === want){ sel.value = sel.options[j].value || sel.options[j].textContent; break; }
      }
    }
    if (!sel.value && sel.options.length) sel.value = sel.options[0].value;
    sel.addEventListener('change', function(){ save(id, sel.value); }, true);
    save(id, sel.value);
  }

  function init(){
    setIfEmpty('model', MODELS);
    setIfEmpty('specialty', SPECIALTIES);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
