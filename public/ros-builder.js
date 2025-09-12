
'use strict';



(function(){
  if (window.__ROS_CHECKBOXES__) return; window.__ROS_CHECKBOXES__ = true;

  function $(id){ return document.getElementById(id); }
  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

  const SYSTEMS = [
    'Constitutional',
    'Eyes',
    'ENT',
    'Cardiovascular',
    'Respiratory',
    'GI',
    'GU',
    'Musculoskeletal',
    'Neuro',
    'Psych',
    'Endo',
    'Heme/Lymph',
    'Allergy/Immun',
    'skin/breast'
  ];

  function hasTerm(text, term){
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}\\b`, 'i');
    return re.test(text || '');
  }
  function insertTerm(text, term){
    if (!text) return term;
    if (hasTerm(text, term)) return text;
    const needsSep = text.trim().length > 0 && !/[;.]$/.test(text.trim());
    return (text + (needsSep ? '; ' : '') + term).trim();
  }
  function removeTerm(text, term){
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}\\b[;,.\\s]*`, 'ig');
    return (text || '').replace(re, '').replace(/\s{2,}/g,' ').trim();
  }

  function buildGrid(textarea){
    const wrap = document.createElement('div');
    wrap.id = 'ros-checkbox-grid';
    wrap.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin:8px 0 6px';

    SYSTEMS.forEach(labelText => {
      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;user-select:none';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'ros-check';
      cb.value = labelText;

      try { cb.checked = hasTerm(textarea.value, labelText); } catch {}

      cb.addEventListener('change', function(){
        const cur = textarea.value || '';
        const next = cb.checked ? insertTerm(cur, labelText) : removeTerm(cur, labelText);
        textarea.value = next;
        textarea.dispatchEvent(new Event('input'));
      }, {capture:true});

      const span = document.createElement('span');
      span.textContent = labelText;

      lbl.appendChild(cb);
      lbl.appendChild(span);
      wrap.appendChild(lbl);
    });

    return wrap;
  }

  function clearAll(){
    $all('#ros-checkbox-grid input.ros-check').forEach(cb => { cb.checked = false; });
  }

  function wire(){
    const ta = $('ros');
    if (!ta) return;

    const oldToolbar = document.getElementById('ros-quick-toolbar');
    if (oldToolbar && oldToolbar.parentNode) oldToolbar.parentNode.removeChild(oldToolbar);

    const grid = buildGrid(ta);
    if (ta.parentNode) {
      ta.parentNode.insertBefore(grid, ta);
    } else {
      document.body.insertBefore(grid, document.body.firstChild);
    }

    ta.addEventListener('input', function(){
      if ((ta.value || '').trim() === '') clearAll();
    });

    const newBtn = $('btn-new-note');
    if (newBtn) newBtn.addEventListener('click', function(){
      clearAll();
    }, {capture:true});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, {once:true});
  } else {
    wire();
  }
})();
