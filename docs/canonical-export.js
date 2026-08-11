'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const run=()=>{
    const fn=window.linaFFmpegExport||window.exportVideo;
    if(typeof fn==='function')return fn();
    const status=$('#topStatus');if(status)status.textContent='Export is unavailable.';
  };

  $('#rightsConfirm')?.closest('.rights-confirm')?.remove();

  for(const id of ['exportBtn','exportBottomBtn']){
    const el=$('#'+id);if(!el)continue;
    el.onclick=run;
    el.dataset.linaOwner='canonical-export';
  }

  const quick=$('#quickExport');
  if(quick){
    quick.dataset.linaOwner='canonical-export';
    quick.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      void run();
    },true);
  }

  window.linaExport=run;
  document.documentElement.dataset.exportOwner='canonical-v1';
})();
