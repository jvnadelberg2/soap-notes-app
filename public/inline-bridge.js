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

