document.addEventListener('DOMContentLoaded',function(){
  function el(id){return document.getElementById(id)}
  function hint(id,t){var h=el(id); if(h) h.textContent=t||''}

  function flattenStrings(x, out){
    if(!out) out=[];
    var t = Object.prototype.toString.call(x);
    if(t==='[object String]'){
      var s = String(x).trim(); if(s) out.push(s);
    }else if(t==='[object Number]'){
      out.push(String(x));
    }else if(t==='[object Array]'){
      for(var i=0;i<x.length;i++) flattenStrings(x[i], out);
    }else if(t==='[object Object]'){
      for(var k in x){ if(Object.prototype.hasOwnProperty.call(x,k)) flattenStrings(x[k], out); }
    }
    return out;
  }

  function uniqueSorted(arr){
    var seen = Object.create(null), out=[];
    for(var i=0;i<arr.length;i++){
      var v = String(arr[i]||'').trim();
      if(!v) continue;
      var key = v.toLowerCase();
      if(!seen[key]){ seen[key]=1; out.push(v); }
    }
    out.sort(function(a,b){ return a.localeCompare(b); });
    return out;
  }

  function fillSelect(id, arr){
    var s=el(id); if(!s) return 0;
    s.innerHTML='';
    for(var i=0;i<arr.length;i++){
      var v=String(arr[i]||'').trim(); if(!v) continue;
      var o=document.createElement('option'); o.value=v; o.textContent=v; s.appendChild(o);
    }
    return s.options.length;
  }

  var MODEL_FALLBACK=['llama3:latest','llama3.1:8b','mistral:7b-instruct','phi3:mini'];
  var SPEC_FALLBACK=['General Practice','Family Medicine','Internal Medicine'];

  fetch('/api/models').then(function(r){return r.ok?r.json():Promise.reject()}).then(function(d){
    var arr = Array.isArray(d)?d:(Array.isArray(d.models)?d.models:[]);
    var n = fillSelect('model', arr.length?arr:MODEL_FALLBACK);
    hint('modelHint','('+(n||0)+' available)');
  }).catch(function(){
    var n = fillSelect('model', MODEL_FALLBACK);
    hint('modelHint','(fallback)');
  });

  fetch('/disciplines.json')
    .then(function(r){ return r.ok ? r.json() : Promise.reject() })
    .then(function(d){
      var groups = Array.isArray(d) ? d : [];
      var clinical = null;
      for(var i=0;i<groups.length;i++){
        var lbl = String((groups[i] && groups[i].label) || "").toLowerCase();
        if(lbl.indexOf("clinical") !== -1){ clinical = groups[i]; break; }
      }
      var arr=(clinical&&Array.isArray(clinical.options))?clinical.options.map(function(o){return String(o&&o.label||"").trim()}).filter(Boolean):[];
      var flat=uniqueSorted(arr);
      var n = fillSelect('specialty', flat.length ? flat : SPEC_FALLBACK);
      hint('specCount','('+(n||0)+' loaded)');
    })
    .catch(function(){
      var n = fillSelect('specialty', SPEC_FALLBACK);
      hint('specCount','(fallback)');
    });
});