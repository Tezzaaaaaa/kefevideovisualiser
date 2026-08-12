'use strict';
(()=>{
  const BUILD='p110-20260813-single-source-controls';
  window.__linaBootErrors=[];
  window.addEventListener('error',event=>window.__linaBootErrors.push(String(event.error?.stack||event.message||'Unknown startup error')));
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`${src}?v=${BUILD}`;s.onload=resolve;s.onerror=()=>reject(new Error(`Failed to load ${src}`));document.body.append(s)});
  for(const href of ['apple-motion.css','ui-solid.css','intro-layout.css','production-consolidated.css','consolidated-studio.css','editor-shell.css','editor-shell-mobile-safety.css','editor-shell-density-fix.css','setup-shell.css','guided-ui.css','setup-lyrics-bridge.css','background-dropzone.css','effect-typography.css','eternal-sunshine-effect.css','preview-quick-controls.css','sticky-preview.css']){const css=document.createElement('link');css.rel='stylesheet';css.href=`${href}?v=${BUILD}`;document.head.append(css)}
  (async()=>{
    try{
      await load('app-core-safe.js');
      await load('app-media-safe.js');
      await load('intro-layout.js');
      await load('export-prewarm.js');
      await load('app-export-safe.js');
      window.linaMediaRecorderExport=window.exportVideo;
      await load('ffmpeg-export.js');
      await load('safari-wasm-export.js');
      await load('webkit-export-guard.js');
      await load('consolidated-studio.js');
      await load('canonical-controls.js');
      await load('project-state-fix.js');
      if(window.linaResetCleanupPromise)await window.linaResetCleanupPromise;
      await load('editor-shell.js');
      await load('app-events-safe.js');
      if(window.linaRestorePromise)await window.linaRestorePromise;
      window.linaCanonicalControlsActivate?.();

      await load('media-lifecycle.js');
      await load('apple-timing.js');
      await load('apple-motion.js');
      await load('apple-subword.js');
      await load('production-motion-bridge.js');

      window.linaAppleBaseRender=window.render;
      window.linaAppleBaseDrawApple=window.drawApple;
      window.linaAppleBaseDrawIntro=window.drawIntro;
      window.linaConsolidatedActivate?.();
      window.linaEffectBaseRender=window.render;
      window.linaEffectBaseDrawApple=window.drawApple;
      window.linaEffectBaseDrawIntro=window.drawIntro;

      await load('setup-shell.js');
      await load('lyrics-workflow-fix.js');
      await load('setup-lyrics-bridge.js');
      await load('guided-ui.js');
      await load('background-dropzone.js');
      await load('effect-typography.js');

      await load('eternal-sunshine-effect.js');
      await load('apple-letter-highlight.js');
      await load('canonical-runtime.js');

      await load('preview-quick-controls.js');
      await load('canonical-export.js');
      await load('transport-lock.js');
      document.documentElement.dataset.linaReady='true';
      document.documentElement.dataset.systemOwner='single-source-v1';
      requestAnimationFrame(()=>{document.querySelector('#lina-boot-style')?.remove();document.body.style.visibility='visible'});
    }catch(e){
      document.querySelector('#lina-boot-style')?.remove();document.body.style.visibility='visible';
      console.error('LINA bootstrap failed',e);
      const s=document.querySelector('#topStatus');if(s)s.textContent='LINA failed to start.';
    }
  })();
})();
