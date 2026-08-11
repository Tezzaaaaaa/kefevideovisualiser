'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const setStatus=t=>{const e=$('#topStatus');if(e)e.textContent=t};
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  window.addEventListener('error',e=>{console.error('LINA runtime error',e.error||e.message);setStatus('LINA hit an error.');});
  window.addEventListener('unhandledrejection',e=>{console.error('LINA promise error',e.reason);setStatus('LINA hit an error.');});

  async function waitForCanonicalOwnership(){
    for(let i=0;i<80;i++){
      const reset=$('#resetProjectVisible'),quick=$('#quickEffect'),style=$('#styleEffectSelect');
      const ready=window.linaRuntime&&window.linaAuditSystem&&
        reset?.dataset.linaOwner==='project-hard-v2'&&quick?.dataset.linaOwner==='canonical'&&style?.dataset.linaOwner==='canonical'&&
        String(document.documentElement.dataset.transportOwner||'').startsWith('canonical')&&
        document.documentElement.dataset.exportOwner==='canonical-v1'&&
        document.documentElement.dataset.controlsOwner==='canonical-v1'&&
        document.documentElement.dataset.uiOwner==='canonical-v1'&&
        document.documentElement.dataset.projectResetOwner==='hard-v2';
      if(ready)return true;
      await sleep(25);
    }
    return false;
  }

  async function verify(){
    document.documentElement.dataset.linaReady='checking';
    await waitForCanonicalOwnership();
    const requiredIds=['nav','play','stop','audioFile','lyricsText','story','lyrics','exportBtn','resetProjectVisible','quickEffect','styleEffectSelect'];
    const missing=requiredIds.filter(id=>!document.getElementById(id));
    const requiredFns=['goStep','parseTimed','render','exportVideo','restoreSavedProject'];
    const missingFns=requiredFns.filter(n=>typeof window[n]!=='function');
    const failures=[];

    if([...document.querySelectorAll('#nav .navbtn')].length<5)failures.push('navigation');
    if(!window.linaTiming)failures.push('timing-layer');
    if(!window.linaMediaLifecycle)failures.push('media-lifecycle');
    if(typeof window.linaExportState!=='function')failures.push('export-lifecycle');
    if(!window.__linaStudio||!window.linaConsolidatedState)failures.push('shared-state');
    if(!window.linaAppleLetterHighlight)failures.push('apple-glyph-enhancer');
    if(!window.linaEternalSunshine)failures.push('eternal-handwriting-enhancer');

    if(!window.linaRuntime)failures.push('canonical-runtime');
    else{
      const test=window.linaRuntime.selfTest?.()||{};
      if(document.documentElement.dataset.renderOwner!=='canonical-v1'||window.render!==window.linaRuntime.render)failures.push('render-owner');
      if(document.documentElement.dataset.effectOwner!=='canonical-v1')failures.push('effect-owner');
      if(document.documentElement.dataset.layoutOwner!=='canonical-v2-hard-reset')failures.push('layout-owner');
      if(JSON.stringify(test.contextModes)!==JSON.stringify([1,3,5,7,9]))failures.push('lyrics-view-modes');
    }

    if(document.documentElement.dataset.controlsOwner!=='canonical-v1')failures.push('controls-owner');
    if(document.documentElement.dataset.uiOwner!=='canonical-v1')failures.push('ui-owner');
    if(document.documentElement.dataset.exportOwner!=='canonical-v1')failures.push('export-owner');
    if(document.documentElement.dataset.projectResetOwner!=='hard-v2')failures.push('project-reset-owner');
    if(!String(document.documentElement.dataset.transportOwner||'').startsWith('canonical'))failures.push('transport-owner');
    if($('#resetProjectVisible')?.dataset.linaOwner!=='project-hard-v2'||typeof window.linaResetProject!=='function')failures.push('full-project-reset');
    if($('#quickResetLayout')||$('#linaFreshReset')||$('#resetLyricsBtn')||$('#resetBtn'))failures.push('retired-reset-control');
    if($('#rightsConfirm'))failures.push('retired-rights-control');

    const audit=window.linaAuditSystem?.();
    if(!audit)failures.push('system-audit');
    else if(audit.missing?.length)failures.push(...audit.missing.map(x=>`system:${x}`));

    if(missing.length||missingFns.length||failures.length){
      console.error('LINA startup check failed',{missing,missingFns,failures,audit,runtime:window.linaRuntime?.selfTest?.()});
      setStatus(`LINA startup QA failed · ${missing.length+missingFns.length+failures.length} issue${missing.length+missingFns.length+failures.length===1?'':'s'}.`);
      document.documentElement.dataset.linaReady='false';return;
    }

    const audio=$('#audio');if(audio){audio.muted=false;if(audio.volume===0)audio.volume=1}
    document.documentElement.dataset.linaReady='true';
    document.documentElement.dataset.systemOwner='canonical-unified-v1';
    console.info('LINA unified startup check passed',{audit,runtime:window.linaRuntime.selfTest()});
  }

  verify().catch(error=>{console.error('LINA startup QA crashed',error);setStatus('LINA startup QA failed.');document.documentElement.dataset.linaReady='false';});
})();