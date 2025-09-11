/* BEGIN:ARCH-COMMENT
File: public/soap-specialty-inject.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
"use strict";
(function(){
  var origFetch = window.fetch;
  window.fetch = function(input, init){
    try{
      var url = (typeof input === "string") ? input : (input && input.url) || "";
      if (/\/api\/(soap|generate-soap|generate-soap-json-annotated|generate_soap)\b/i.test(url)) {
        var conf = init || {};
        var body = conf.body;
        var obj = null;
        if (body && typeof body === "string") {
          try { obj = JSON.parse(body); } catch(_){}
        }
        if (obj && obj.specialty == null) {
          var spec = (window.getSpecialty && window.getSpecialty()) ||
                     (document.getElementById("specialty") && document.getElementById("specialty").value) || "";
          if (spec) {
            obj.specialty = spec;
            conf = Object.assign({}, conf, {
              body: JSON.stringify(obj),
              headers: Object.assign({}, conf.headers, {"Content-Type":"application/json"})
            });
            init = conf;
          }
        }
      }
    } catch(_){}
    return origFetch.call(this, input, init);
  };
})();
