(function () {
  const $ = (id) => document.getElementById(id);
  const setStatus = (m) => { const el = $('status'); if (el) el.textContent = m || ''; };
  const setWarn = (m) => { const el = $('warn'); if (!el) return; if (m) { el.hidden = false; el.textContent = m; } else { el.hidden = true; el.textContent=''; } };
  function toSOAP(raw, client, duration) {
    const text = (raw || '').trim();
    const s = text || '(no subjective content)';
    const o = 'Affect congruent; alert and oriented x3.';
    const a = 'Symptoms consistent with generalized anxiety; good insight; motivated for change.';
    const p = 'Continue weekly sessions; daily journaling before bed; breathing exercise during anxiety; follow-up next week.';
    return `S: ${s}\n\nO: ${o}\n\nA: ${a}\n\nP: ${p}\n\nClient: ${client||'N/A'} | Duration: ${duration||'N/A'} min`;
  }
  async function copyFrom(id){const el=$(id);if(!el)return;const t=el.textContent||'';if(!t){setStatus('Nothing to copy');return;}await navigator.clipboard.writeText(t);setStatus('Copied');}
  function saveTxt(){const summary=$('summary')?.textContent?.trim()||'';const soap=$('soap')?.textContent?.trim()||'';if(!summary&&!soap){setStatus('Nothing to save');return;}const client=$('client')?.value?.trim()||'client';const ts=new Date().toISOString().replace(/[:.]/g,'-');const out=`Summary\n\n${summary}\n\n---\n\nNote\n\n${soap}\n`;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([out],{type:'text/plain;charset=utf-8'}));a.download=`${client}-${ts}.txt`;document.body.appendChild(a);a.click();URL.revokeObjectURL(a.href);a.remove();setStatus('Saved .txt');}
  function bind(){
    $('generate')?.addEventListener('click',()=>{const note=$('note')?.value?.trim()||'';if(!note){setWarn('Enter notes first');setStatus('');return;}setWarn('');const client=$('client')?.value?.trim()||'';const duration=$('duration')?.value||'';const summary=note.split(/\n+/).slice(0,2).join(' ').trim();const soap=toSOAP(note,client,duration);if($('summary'))$('summary').textContent=summary||'(empty summary)';if($('soap'))$('soap').textContent=soap||'(empty note)';setStatus('Done');});
    $('copy-soap')?.addEventListener('click',()=>copyFrom('soap'));
    $('copy-summary')?.addEventListener('click',()=>copyFrom('summary'));
    $('save-txt')?.addEventListener('click',saveTxt);
    $('save-pdf')?.addEventListener('click',()=>window.print());
    setStatus('Ready');
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',bind,{once:true});}else{bind();}
})();
