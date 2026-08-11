'use strict';
(()=>{
  const BUILD='p29-20260811-lyrics-workflow';
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`${src}?v=${BUILD}`;s.onload=resolve;s.onerror=()=>reject(new Error(`Failed to load ${src}`));document.body.append(s)});
  for(const href of ['apple-motion.css','ui-solid.css','intro-layout.css','production-consolidated.css','consolidated-studio.css','editor-shell.css','editor-shell-mobile-safety.css','editor-shell-density-fix.css','setup-shell.css','lyrics-workflow-fix.css']){const css=document.createElement('link');css.rel='stylesheet';css.href=`${href}?v=${BUILD}`;document.head.append(css)}
  (async()=>{
    try{
      await load('app-core-safe.js');
      await load('app-media-safe.js');
      await load('intro-layout.js');
      await load('ffmpeg-export.js');
      await load('production-controls.js');
      await load('consolidated-studio.js');
      await load('project-state-fix.js');
      await load('editor-shell.js');
      await load('app-events-safe.js');
      if(window.linaRestorePromise)await window.linaRestorePromise;
      await load('media-lifecycle.js');
      await load('apple-timing.js');
      await load('apple-motion.js');
      await load('apple-subword.js');
      await load('production-motion-bridge.js');
      window.linaConsolidatedActivate?.();
      await load('preview-runtime.js');
      await load('preview-recovery.js');
      window.invalidateLinaMotion?.(true);
      render(audio.currentTime*1000);
      await load('setup-shell.js');
      await load('control-audit.js');
      await load('control-finish.js');
      await load('lyrics-workflow-fix.js');
      await load('visual-polish.js');
      await load('runtime-guard.js');
    }catch(e){
      console.error('LINA bootstrap failed',e);
      const s=document.querySelector('#topStatus');if(s)s.textContent='LINA failed to start — refresh once.';
    }
  })();
})();
