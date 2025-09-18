/* BEGIN:ARCH-COMMENT
File: public/soap-generator.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';
(function(){
  var HEALTH_PATH = '/inference/health';
  var RETRY_OK_MS = 15000;
  var RETRY_FAIL_MS = 60000;

  async function generateInference(ctx){
    return generators.resolve(false).generate(ctx);
  }

  async function probeHealth(){
    try {
      const r = await fetch(HEALTH_PATH, { method: 'HEAD', cache: 'no-store' });
      if (r.status === 404) {
        generators.register('inference', { name: 'inference', ready: false, generate: generateInference });
        return;
      }
      const healthy = (r.status === 200);
      generators.register('inference', { name: 'inference', ready: healthy, generate: generateInference });
      setTimeout(probeHealth, healthy ? RETRY_OK_MS : RETRY_FAIL_MS);
    } catch (_e) {
      generators.register('inference', { name: 'inference', ready: false, generate: generateInference });
      setTimeout(probeHealth, RETRY_FAIL_MS);
    }
  }

  generators.register('inference', { name: 'inference', ready: false, generate: generateInference });
  probeHealth();
})();
