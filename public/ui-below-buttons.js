'use strict';

/*
  Neutralized UI helper (no rendering).
  Keeps only small, safe UI conveniences.
*/

function byId(id){ return document.getElementById(id); }

function autoGrowTextarea(el){
  if (!el) return;
  const handler = () => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 600) + 'px';
  };
  el.addEventListener('input', handler);
  // Initial pass
  handler();
}

function wireAutoGrow(){
  const ids = [
    'chiefComplaint','hpi','pmh','fh','sh',
    'ros','diagnostics','exam'
  ];
  for (const id of ids){
    const el = byId(id);
    if (el && el.tagName === 'TEXTAREA') autoGrowTextarea(el);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // IMPORTANT: Do NOT write to #soapTextOut from here.
  // No Generate button bindings here either (handled in generate-stable.js).
  wireAutoGrow();
});
