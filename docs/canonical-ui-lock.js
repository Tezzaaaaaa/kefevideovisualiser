'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const owned=new WeakSet();

  function ownReset(){
    const reset=$('#quickResetLayout');
    if(!reset||owned.has(reset))return false;
    owned.add(reset);reset.dataset.linaOwner='canonical';reset.dataset.linaReset='canonical';
    reset.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      window.linaRuntime?.resetLayout?.();
      setTimeout(()=>window.linaQuickSettingsSync?.(),0);
    },true);
    return true;
  }

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
    ownReset();ownEffect('quickEffect');ownEffect('styleEffectSelect');
    const project=$('#resetBtn');if(project)project.dataset.linaOwner='canonical-project';
    const exportBtn=$('#quickExport');if(exportBtn)exportBtn.dataset.linaOwner='canonical-export';
    document.documentElement.dataset.uiOwner='canonical-v1';
  }

  const observer=new MutationObserver(install);observer.observe(document.documentElement,{childList:true,subtree:true});
  let n=0;const timer=setInterval(()=>{install();if(++n>100&&$('#quickResetLayout')&&$('#styleEffectSelect')){clearInterval(timer);observer.disconnect()}},50);
  install();
})();