/* BEGIN:ARCH-COMMENT
File: public/inline-bridge.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
(function(){
  function byId(id){ return document.getElementById(id); }
  window.getChiefComplaint = function(){
    var el = byId('chiefComplaint');
    return (el && typeof el.value === 'string') ? el.value : '';
  };
  window.getHPI = function(){
    var el = byId('rawText');
    return (el && typeof el.value === 'string') ? el.value : '';
  };
})();

