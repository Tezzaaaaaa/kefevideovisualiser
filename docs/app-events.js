'use strict';
(()=>{
  const BUILD='p0-20260807-1';
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`${src}?v=${BUILD}`;s.onload=resolve;s.onerror=()=>reject(new Error(`Failed to load ${src}`));document.body.append(s)});
  for(const href of ['apple-motion.css','ui-solid.css']){const css=document.createElement('link');css.rel='stylesheet';css.href=`${href}?v=${BUILD}`;document.head.append(css)}
  (async()=>{
    try{
      await load('app-core-safe.js');
      await load('app-media-safe.js');
      await load('app-export-safe.js');
      await load('app-events-safe.js');
      await load('runtime-guard.js');
    }catch(e){
      console.error('LINA bootstrap failed',e);
      const s=document.querySelector('#topStatus');if(s)s.textContent='LINA failed to start — refresh once.';
    }
  })();
})();
