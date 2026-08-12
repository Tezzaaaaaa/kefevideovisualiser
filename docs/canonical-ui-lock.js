'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const owned=new WeakSet();

  function ownEffect(id){
    const el=$('#'+id);if(!el||owned.has(el))return false;
    owned.add(el);el.dataset.linaOwner='canonical';
    el.addEventListener('change',e=>{
      e.stopPropagation();e.stopImmediatePropagation();
      window.linaRuntime?.setEffect?.(el.value);
    },true);
    return true;
  }

  function install(){
    ownEffect('quickEffect');ownEffect('styleEffectSelect');
    const reset=$('#resetProjectVisible');if(reset)reset.dataset.linaOwner='project-hard-v3';
    const exportBtn=$('#quickExport');if(exportBtn)exportBtn.dataset.linaOwner='export-runtime';
    document.documentElement.dataset.uiOwner='canonical-v1';
  }

  const observer=new MutationObserver(install);observer.observe(document.documentElement,{childList:true,subtree:true});
  let n=0;const timer=setInterval(()=>{install();if(++n>100&&$('#resetProjectVisible')&&$('#styleEffectSelect')){clearInterval(timer);observer.disconnect()}},50);
  install();
})();
