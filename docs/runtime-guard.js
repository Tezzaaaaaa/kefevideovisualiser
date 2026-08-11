'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const setStatus=t=>{const e=$('#topStatus');if(e)e.textContent=t};

  window.addEventListener('error',e=>{console.error('LINA runtime error',e.error||e.message);setStatus('LINA hit an error.');});
  window.addEventListener('unhandledrejection',e=>{console.error('LINA promise error',e.reason);setStatus('LINA hit an error.');});

  const requiredIds=['nav','play','stop','audioFile','lyricsText','story','lyrics','exportBtn','exportBottomBtn','quickResetLayout'];
  const missing=requiredIds.filter(id=>!document.getElementById(id));
  const requiredFns=['goStep','parseTimed','render','exportVideo','restoreSavedProject'];
  const missingFns=requiredFns.filter(n=>typeof window[n]!=='function');
  const failures=[];

  const navButtons=[...document.querySelectorAll('#nav .navbtn')];
  if(navButtons.length<4)failures.push('navigation');
  if(!window.linaTiming)failures.push('timing-layer');
  if(!window.linaMediaLifecycle)failures.push('media-lifecycle');
  if(typeof window.linaExportState!=='function')failures.push('export-lifecycle');
  if(!window.__linaStudio||!window.linaConsolidatedState)failures.push('signature-effects');
  if(!window.linaAppleLetterHighlight)failures.push('apple-glyph-enhancer');
  if(!window.linaEternalSunshine)failures.push('eternal-handwriting-enhancer');

  if(!window.linaRuntime)failures.push('canonical-runtime');
  else{
    const test=window.linaRuntime.selfTest?.()||{};
    if(document.documentElement.dataset.renderOwner!=='canonical-v1'||window.render!==window.linaRuntime.render)failures.push('render-owner');
    if(document.documentElement.dataset.effectOwner!=='canonical-v1')failures.push('effect-owner');
    if(document.documentElement.dataset.layoutOwner!=='canonical-v1')failures.push('layout-owner');
    if(JSON.stringify(test.contextModes)!==JSON.stringify([1,3,5,7,9]))failures.push('lyrics-view-modes');
  }

  const reset=$('#quickResetLayout');
  if(reset?.dataset.linaOwner!=='canonical'||reset?.dataset.linaReset!=='canonical')failures.push('reset-owner');
  if(!String(document.documentElement.dataset.transportOwner||'').startsWith('canonical'))failures.push('transport-owner');

  if(!window.linaControlAudit)failures.push('control-audit');
  else if(window.linaControlAudit.missing?.length)failures.push(...window.linaControlAudit.missing.map(x=>`control:${x}`));

  if(missing.length||missingFns.length||failures.length){
    console.error('LINA startup check failed',{missing,missingFns,failures,controlAudit:window.linaControlAudit,runtime:window.linaRuntime?.selfTest?.()});
    setStatus(`LINA startup QA failed · ${missing.length+missingFns.length+failures.length} issue${missing.length+missingFns.length+failures.length===1?'':'s'}.`);
    document.documentElement.dataset.linaReady='false';
    return;
  }

  const audio=$('#audio');if(audio){audio.muted=false;if(audio.volume===0)audio.volume=1}
  document.documentElement.dataset.linaReady='true';
  console.info('LINA startup check passed',{
    panels:navButtons.length,
    renderOwner:document.documentElement.dataset.renderOwner,
    effectOwner:document.documentElement.dataset.effectOwner,
    layoutOwner:document.documentElement.dataset.layoutOwner,
    transportOwner:document.documentElement.dataset.transportOwner,
    runtime:window.linaRuntime.selfTest(),
    controls:window.linaControlAudit
  });
})();
