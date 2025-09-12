(function(){
  function g(id){return document.getElementById(id)}
  function h(){var el=g('current-note-uuid');if(el)return el;el=document.createElement('input');el.type='hidden';el.id='current-note-uuid';document.body.appendChild(el);return el}
  var orig=window.onGenerateClick;
  window.onGenerateClick=async function(e){
    if(e&&e.preventDefault)e.preventDefault();
    if(typeof orig==='function'){await orig(e)}else if(window.generateStable){await window.generateStable()}
    var u=h();u.value=(crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
  };
})();
