'use strict';
(()=>{
  const setStatus=t=>{const e=document.querySelector('#topStatus');if(e)e.textContent=t};
  window.addEventListener('error',e=>{console.error('LINA runtime error',e.error||e.message);setStatus('LINA hit an error — refresh once.');});
  window.addEventListener('unhandledrejection',e=>{console.error('LINA promise error',e.reason);setStatus('LINA hit an error — refresh once.');});
  const requiredIds=['nav','play','audioFile','lyricsText','story','lyrics','exportBtn','exportBottomBtn'];
  const missing=requiredIds.filter(id=>!document.getElementById(id));
  const requiredFns=['goStep','parseTimed','render','exportVideo','restoreSavedProject'];
  const missingFns=requiredFns.filter(n=>typeof window[n]!=='function');
  const nav=document.querySelector('#nav'),play=document.querySelector('#play'),exportTop=document.querySelector('#exportBtn'),exportBottom=document.querySelector('#exportBottomBtn');
  const handlerFailures=[];
  if(typeof nav?.onclick!=='function')handlerFailures.push('navigation');
  if(typeof play?.onclick!=='function')handlerFailures.push('playback');
  if(typeof exportTop?.onclick!=='function'||typeof exportBottom?.onclick!=='function')handlerFailures.push('export');
  const navButtons=[...document.querySelectorAll('.navbtn')];if(navButtons.length!==4)handlerFailures.push('panel-count');
  if(missing.length||missingFns.length||handlerFailures.length){
    console.error('LINA startup check failed',{missing,missingFns,handlerFailures});setStatus('LINA failed its startup check.');return;
  }
  const audio=document.querySelector('#audio');if(audio){audio.muted=false;if(audio.volume===0)audio.volume=1;}
  document.documentElement.dataset.linaReady='true';
  console.info('LINA startup check passed',{panels:navButtons.length,audioReady:!!audio,exportReady:true});
})();
