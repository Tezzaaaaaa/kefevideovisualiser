'use strict';
(()=>{
  const ua=navigator.userAgent||'';
  const isWebKit=/AppleWebKit/i.test(ua)&&!/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua);
  if(!isWebKit)return;

  let disabled=false;
  for(const key of ['AudioEncoder','VideoEncoder']){
    try{
      const own=Object.getOwnPropertyDescriptor(window,key);
      if(!own||own.configurable){
        delete window[key];
        disabled=disabled||!(key in window);
      }
    }catch{}
  }

  if(disabled){
    document.documentElement.dataset.webkitExportMode='compatibility';
    window.linaWebKitCompatibilityExport=true;
    console.info('LINA: WebKit compatibility exporter enabled.');
  }else{
    document.documentElement.dataset.webkitExportMode='native-unavailable-to-disable';
    console.warn('LINA: Could not disable WebKit native exporter.');
  }
})();
