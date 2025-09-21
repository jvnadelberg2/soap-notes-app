/* BEGIN:ARCH-COMMENT
File: public/ros-builder.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';

/*
  Replacement for the old chip-based ROS helper.

  What this does:
  - Finds <textarea id="ros"> (your existing free-text ROS field).
  - Renders a grid of checkboxes for common systems right ABOVE that textarea.
  - Ticking a checkbox inserts that system name into the textarea (de-duplicated).
  - Unticking removes it from the textarea.
  - If the textarea already contains some system names at load, matching boxes start checked.
  - Clicking “New Note” (btn-new-note) clears all ROS checkboxes.

  No backend changes required. Your save/load path for #ros stays the same.
*/

(function(){
  if (window.__ROS_CHECKBOXES__) return; window.__ROS_CHECKBOXES__ = true;

  function $(id){ return document.getElementById(id); }
  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

  // Systems list (labels written exactly as they’ll appear in the textarea)
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

  // Text helpers
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

      // Initialize checked state from existing textarea content
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

    // If an old toolbar exists, remove it (for safety when replacing older builds)
    const oldToolbar = document.getElementById('ros-quick-toolbar');
    if (oldToolbar && oldToolbar.parentNode) oldToolbar.parentNode.removeChild(oldToolbar);

    // Insert grid right above the textarea’s parent row (or just above the textarea)
    const grid = buildGrid(ta);
    if (ta.parentNode) {
      ta.parentNode.insertBefore(grid, ta);
    } else {
      // Fallback: append after body if layout is unusual
      document.body.insertBefore(grid, document.body.firstChild);
    }

    // When textarea is cleared manually, untick all boxes (keeps UI in sync)
    ta.addEventListener('input', function(){
      if ((ta.value || '').trim() === '') clearAll();
    });

    // Clear on New Note button
    const newBtn = $('btn-new-note');
    if (newBtn) newBtn.addEventListener('click', function(){
      clearAll();
      // Let your existing code clear #ros value as it already does
    }, {capture:true});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, {once:true});
  } else {
    wire();
  }
})();
