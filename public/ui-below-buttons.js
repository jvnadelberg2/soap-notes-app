document.addEventListener('DOMContentLoaded',function(){
  function g(id){return document.getElementById(id)}
  function out(){return g('soapTextOut')||g('jsonOut')}
  function getNote(){var o=out();return o?(o.textContent||''):''}
  function setNote(t){var o=out();if(o)o.textContent=t}
  function isFocused(){var o=out();return o&&document.activeElement===o}

  function ensureFields(){
    var btns=document.querySelector('.btns'); if(!btns) return;
    if(g('belowBtnsData')) return;
    var wrap=document.createElement('div');
    wrap.id='belowBtnsData';
    wrap.className='row';
    wrap.style.marginTop='8px';
    wrap.innerHTML='' +
      '<div class="row row-3">' +
        '<div><label for="vBP">BP</label><input id="vBP" type="text"/></div>' +
        '<div><label for="vHR">HR</label><input id="vHR" type="text"/></div>' +
        '<div><label for="vRR">RR</label><input id="vRR" type="text"/></div>' +
      '</div>' +
      '<div class="row row-2" style="margin-top:8px">' +
        '<div><label for="patientHistory">Patient History</label><textarea id="patientHistory"></textarea></div>' +
        '<div>' +
          '<label for="labs">Labs (name=value per line)</label><textarea id="labs"></textarea>' +
          '<label for="imaging" style="margin-top:8px;display:block">Imaging (one study per line)</label><textarea id="imaging"></textarea>' +
        '</div>' +
      '</div>';
    var d=g('downloads'); if(d&&d.parentNode){ d.parentNode.insertBefore(wrap,d) } else { btns.parentNode.insertBefore(wrap,btns.nextSibling) }
  }

  function squeeze(lines){ for(var i=lines.length-1;i>0;i--){ if(lines[i]===''&&lines[i-1]==='') lines.splice(i,1) } }
  function findHdr(lines,name){ var re=new RegExp('^\\s*'+name+'\\s*:?\\s*$','i'); for(var i=0;i<lines.length;i++){ if(re.test(lines[i])) return i } return -1 }
  function ensureHeadingsPresent(){
    if(isFocused()) return;
    var L=getNote().split(/\r?\n/);
    var heads=['Subjective','Objective','Assessment','Plan'];
    for(var h=0;h<heads.length;h++){
      var idx=findHdr(L,heads[h]);
      if(idx===-1){
        if(L.length && L[L.length-1]!=='') L.push('');
        L.push(heads[h]+':');
        L.push('');
      }else{
        if(L[idx+1]!=='' ){ L.splice(idx+1,0,'') }
      }
    }
    squeeze(L);
    setNote(L.join('\n'));
  }

  function linesFrom(id){
    var el=g(id); if(!el) return [];
    var s=String(el.value||'').trim(); if(!s) return [];
    return s.split(/\r?\n/).map(function(x){return x.trim()}).filter(Boolean);
  }
  function removeLabeledBlock(L,start,label){
    var reHead=new RegExp('^\\s*'+label+'\\s*:\\s*$','i');
    var i=start;
    if(i<L.length && reHead.test(L[i])){
      L.splice(i,1);
      while(i<L.length && L[i].trim()!==''){ if(/^\s*(Subjective|Objective|Assessment|Plan)\s*:?\s*$/.test(L[i])) break; L.splice(i,1) }
      while(i<L.length && L[i].trim()==='') L.splice(i,1);
    }
    return i;
  }

  function rebuildSubjective(){
    if(isFocused()) return;
    var L=getNote().split(/\r?\n/);
    var hdr=findHdr(L,'Subjective');
    if(hdr===-1){ ensureHeadingsPresent(); L=getNote().split(/\r?\n/); hdr=findHdr(L,'Subjective') }
    var i=hdr+1;
    while(i<L.length && L[i].trim()==='') L.splice(i,1);
    while(i<L.length && /^\s*Not provided\s*$/i.test(L[i])) L.splice(i,1);
    i=removeLabeledBlock(L,i,'Patient History');
    var ph=linesFrom('patientHistory');
    var ins=[];
    if(ph.length){
      ins.push('');
      ins.push('Patient History:');
      for(var k=0;k<ph.length;k++) ins.push(ph[k]);
      ins.push('');
    }
    L.splice(i,0,...ins);
    squeeze(L);
    setNote(L.join('\n'));
  }

  function rebuildObjective(){
    if(isFocused()) return;
    var L=getNote().split(/\r?\n/);
    var hdr=findHdr(L,'Objective');
    if(hdr===-1){ ensureHeadingsPresent(); L=getNote().split(/\r?\n/); hdr=findHdr(L,'Objective') }
    var i=hdr+1;
    while(i<L.length && L[i].trim()==='') L.splice(i,1);
    while(i<L.length && (/^\s*Not provided\s*$/i.test(L[i])||/^\s*No vitals available\s*$/i.test(L[i]))) L.splice(i,1);
    if(i<L.length && /^\s*Vitals\s*:/i.test(L[i])){ L.splice(i,1); while(i<L.length && L[i].trim()==='') L.splice(i,1) }
    i=removeLabeledBlock(L,i,'Labs');
    i=removeLabeledBlock(L,i,'Imaging');

    var bp=String((g('vBP')&&g('vBP').value)||'').trim();
    var hr=String((g('vHR')&&g('vHR').value)||'').trim();
    var rr=String((g('vRR')&&g('vRR').value)||'').trim();
    var vit=[]; if(bp) vit.push('BP '+bp); if(hr) vit.push('HR '+hr); if(rr) vit.push('RR '+rr);
    var vLine=vit.length?('Vitals: '+vit.join(', ')):'';
    var labs=linesFrom('labs');
    var img=linesFrom('imaging');

    var ins=[];
    ins.push('');
    if(vLine){ ins.push(vLine); ins.push('') }
    if(labs.length){ ins.push('Labs:'); for(var a=0;a<labs.length;a++) ins.push('- '+labs[a]); ins.push('') }
    if(img.length){ ins.push('Imaging:'); for(var b=0;b<img.length;b++) ins.push('- '+img[b]); ins.push('') }

    L.splice(i,0,...ins);
    squeeze(L);
    setNote(L.join('\n'));
  }

  function updateAll(){
    ensureHeadingsPresent();
    rebuildSubjective();
    rebuildObjective();
  }

  ensureFields();
  ensureHeadingsPresent();
  updateAll();

  ;['patientHistory','vBP','vHR','vRR','labs','imaging'].forEach(function(id){
    var el=g(id); if(el) el.addEventListener('input', updateAll);
  });

  var gen=g('btnGenerate');
  if(gen) gen.addEventListener('click', function(){
    if(gen.disabled) return;
    gen.disabled=true;
    var label=gen.textContent;
    gen.textContent='Generating...';
    var o=out(); var before=(o?o.textContent.length:0);
    var t0=Date.now();
    function tryFinish(){
      var after=(o?o.textContent.length:0);
      if(after!==before || Date.now()-t0>15000){
        gen.disabled=false;
        gen.textContent=label;
        updateAll();
      }else{
        setTimeout(tryFinish,250);
      }
    }
    setTimeout(tryFinish,250);
  });
});
