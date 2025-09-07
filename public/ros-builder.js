'use strict';

(function(){
  if (window.__ROS_BUILDER__) return; window.__ROS_BUILDER__ = true;

  function $(id){ return document.getElementById(id); }
  function addAfter(el, newNode){ if (!el || !el.parentNode) return; el.parentNode.insertBefore(newNode, el.nextSibling); }

  function hasTerm(text, term){
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}\\b`, 'i');
    return re.test(text||'');
  }
  function insertTerm(text, term){
    if (!text) return term;
    if (hasTerm(text, term)) return text;
    const sep = text.trim().endsWith('.') ? ' ' : (text.trim().endsWith(';') ? ' ' : (text.trim().length ? '; ' : ''));
    return (text + sep + term).trim();
  }
  function removeTerm(text, term){
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}\\b[;,.\\s]*`, 'ig');
    return (text||'').replace(re, '').replace(/\s{2,}/g,' ').trim();
  }

  const GROUPS = [
    { title: 'General', items: ['fever','chills','fatigue','weight loss','weight gain'] },
    { title: 'HEENT', items: ['headache','sore throat','ear pain','congestion','vision changes'] },
    { title: 'Cardio', items: ['chest pain','palpitations','edema'] },
    { title: 'Resp', items: ['cough','shortness of breath','wheezing'] },
    { title: 'GI', items: ['nausea','vomiting','diarrhea','constipation','abdominal pain','heartburn'] },
    { title: 'GU', items: ['dysuria','frequency','hematuria'] },
    { title: 'MSK', items: ['joint pain','back pain','myalgias'] },
    { title: 'Neuro', items: ['dizziness','numbness','weakness','syncope'] },
    { title: 'Psych', items: ['anxiety','depression','insomnia'] },
    { title: 'Skin', items: ['rash','pruritus','lesions'] },
    { title: 'Endo', items: ['polyuria','polydipsia','heat intolerance','cold intolerance'] },
    { title: 'Heme/Allergy', items: ['easy bruising','bleeding','seasonal allergies'] }
  ];

  function makeChip(term, textarea){
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = term;
    b.style.cssText = 'padding:6px 10px;border:1px solid #e5e7eb;border-radius:999px;background:#fff;cursor:pointer;font-size:12px;';
    b.addEventListener('click', function(){
      const cur = textarea.value || '';
      const next = hasTerm(cur, term) ? removeTerm(cur, term) : insertTerm(cur, term);
      textarea.value = next;
      textarea.dispatchEvent(new Event('input'));
      b.style.background = hasTerm(next, term) ? '#dcfce7' : '#fff';
    }, {capture:true});
    return b;
  }

  function buildToolbar(textarea){
    const wrap = document.createElement('div');
    wrap.id = 'ros-quick-toolbar';
    wrap.style.cssText = 'margin-top:6px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;display:grid;gap:6px;background:#fafafa;';

    const title = document.createElement('div');
    title.textContent = 'Review of Systems — Quick Select';
    title.style.cssText = 'font-weight:600;font-size:12px;color:#374151';
    wrap.appendChild(title);

    GROUPS.forEach(g=>{
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center';
      const label = document.createElement('span');
      label.textContent = g.title+':';
      label.style.cssText='min-width:82px;color:#6b7280;font-size:12px';
      row.appendChild(label);
      g.items.forEach(term=> row.appendChild( makeChip(term, textarea) ));
      wrap.appendChild(row);
    });

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:4px';
    const clr = document.createElement('button');
    clr.type = 'button';
    clr.textContent = 'Clear ROS';
    clr.style.cssText = 'padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;';
    clr.addEventListener('click', function(){
      textarea.value = '';
      textarea.dispatchEvent(new Event('input'));
      const chips = wrap.querySelectorAll('button');
      chips.forEach(ch=> ch.style.background = '#fff');
    }, {capture:true});
    controls.appendChild(clr);
    wrap.appendChild(controls);

    return wrap;
  }

  function wire(){
    const ta = $('ros');
    if (!ta) return;
    // Remove any old toolbar (defensive)
    const old = document.getElementById('ros-quick-toolbar');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    addAfter(ta, buildToolbar(ta));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, {once:true});
  } else {
    wire();
  }
})();
