'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const paidTiers=new Set(['paid','pro','premium','member']);
  const hasPaidMembership=()=>{
    const membership=window.linaMembership||window.LINA_MEMBERSHIP||null;
    return membership?.paid===true||membership?.active===true&&paidTiers.has(String(membership?.tier||membership?.plan||'').toLowerCase());
  };
  const requestedQuality=()=>Math.max(0,...['#quality','#quickQuality'].map(selector=>+(($(selector)?.value)||0)));
  const run=()=>{
    if(requestedQuality()>720&&!hasPaidMembership()){
      const status=$('#topStatus');if(status)status.textContent='1080p export is available to paid members.';
      return;
    }
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

  for(const selector of ['#quality','#quickQuality']){
    const control=$(selector);if(!control)continue;
    for(const option of control.options||[]){if(+option.value>720&&!/Paid members/i.test(option.textContent||''))option.textContent=`${option.textContent} · Paid members`}
    control.addEventListener('change',()=>{
      if(+control.value<=720||hasPaidMembership())return;
      control.value='720';
      for(const peerSelector of ['#quality','#quickQuality']){const peer=$(peerSelector);if(peer)peer.value='720'}
      const status=$('#topStatus');if(status)status.textContent='1080p export is available to paid members.';
    });
  }
  window.linaHasPaidMembership=hasPaidMembership;
  window.linaExport=run;
  document.documentElement.dataset.exportOwner='canonical-v2-paid-quality';
})();
