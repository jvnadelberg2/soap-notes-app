(function(){
  if(window.__icdClientLoaded)return;window.__icdClientLoaded=true;
  const $out=document.getElementById('icdOut');
  const $raw=document.getElementById('rawText');
  const $hist=document.getElementById('patientHistory');
  const $soap=document.getElementById('soapTextOut');

  function render(list){
    if(!$out)return;
    if(!Array.isArray(list)||!list.length){$out.textContent='No ICD-10 codes detected.';return}
    $out.innerHTML=list.map(x=>`<div class="mono">${String(x.code||'').toUpperCase()} — ${x.desc||''}</div>`).join('');
  }

  async function update(){
    const text=[($raw&&$raw.value)||'',($hist&&$hist.value)||'',($soap&&($soap.textContent||$soap.value))||''].join(' ').trim();
    if(!text){render([]);return}
    try{
      const r=await fetch('/api/icd-best',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,limit:12})});
      const j=await r.json();render(j.icd||[]);
    }catch(_){render([])}
  }

  const mo=new MutationObserver(update);
  if($soap)mo.observe($soap,{childList:true,subtree:true,characterData:true});
  if($raw)$raw.addEventListener('input',update);
  if($hist)$hist.addEventListener('input',update);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',update,{once:true}):update();
})();
