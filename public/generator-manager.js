(function(){
  const REG = Object.create(null);
  window.generators = {
    register(name, impl){ REG[name] = impl; },
    isAvailable(name){ return !!REG[name] && REG[name].ready === true && typeof REG[name].generate === 'function'; },
    resolve(preferInference){
      if (preferInference && this.isAvailable('inference')) return REG.inference;
      if (this.isAvailable('stable')) return REG.stable;
      throw new Error('No generator available');
    }
  };
  REG.inference = {
    name: 'inference',
    ready: false,
    async generate(ctx){
      if (REG.stable && typeof REG.stable.generate === 'function') return REG.stable.generate(ctx);
      throw new Error('Stable generator missing');
    }
  };
})();
