'use strict';
(()=>{
  const setStatus=t=>{const e=document.querySelector('#topStatus');if(e)e.textContent=t};
  window.addEventListener('error',e=>{console.error('LINA runtime error',e.error||e.message);setStatus('LINA hit an error — refresh once.');});
  window.addEventListener('unhandledrejection',e=>{console.error('LINA promise error',e.reason);setStatus('LINA hit an error — refresh once.');});
  const requiredIds=['nav','play','audioFile','lyricsText','story','lyrics','exportBtn'];
  const missing=requiredIds.filter(id=>!document.getElementById(id));
  const requiredFns=['goStep','parseTimed','render','exportVideo','restoreSavedProject'];
  const missingFns=requiredFns.filter(n=>typeof window[n]!=='function');
  if(missing.length||missingFns.length){console.error('LINA startup check failed',{missing,missingFns});setStatus('LINA failed its startup check.');return;}
  const audio=document.querySelector('#audio');if(audio){audio.muted=false;if(audio.volume===0)audio.volume=1;}
  const nav=[...document.querySelectorAll('.navbtn')];
  if(nav.length!==4){console.error('LINA navigation check failed',nav.length);setStatus('LINA navigation failed its startup check.');return;}
  document.documentElement.dataset.linaReady='true';
  if((document.querySelector('#topStatus')?.textContent||'')==='Ready')setStatus('Ready');
  console.info('LINA startup check passed');
})();
