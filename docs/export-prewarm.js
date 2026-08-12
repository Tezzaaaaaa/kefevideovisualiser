'use strict';
(()=>{
  const MEDIABUNNY_URL='https://cdn.jsdelivr.net/npm/mediabunny@1.51.0/+esm';
  let promise=null;

  function addModulePreload(){
    if(document.querySelector('link[data-lina-export-preload]'))return;
    const link=document.createElement('link');
    link.rel='modulepreload';
    link.href=MEDIABUNNY_URL;
    link.crossOrigin='anonymous';
    link.dataset.linaExportPreload='1';
    document.head.append(link);
  }

  function prewarm(){
    addModulePreload();
    if(!('VideoEncoder'in window&&'AudioEncoder'in window))return Promise.resolve(null);
    if(!promise){
      promise=import(MEDIABUNNY_URL).catch(error=>{
        promise=null;
        console.warn('LINA fast export prewarm deferred',error);
        return null;
      });
    }
    return promise;
  }

  window.linaExportPrewarm=prewarm;
  window.linaMediabunnyReady=()=>promise;

  addModulePreload();
  const run=()=>void prewarm();
  if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:900});
  else setTimeout(run,150);

  for(const type of ['pointerdown','touchstart','keydown']){
    addEventListener(type,run,{once:true,passive:true});
  }
})();
