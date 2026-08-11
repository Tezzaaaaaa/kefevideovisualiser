'use strict';
(()=>{
  const $=s=>document.querySelector(s);

  function install(){
    const actions=$('#previewQuickControls .quick-actions');
    if(!actions)return false;

    for(const selector of ['#quickResetLayout','#linaFreshReset','#resetLyricsBtn','#resetBtn']){
      const old=$(selector);if(old)old.remove();
    }
    if($('#resetProjectVisible'))return true;

    const button=document.createElement('button');
    button.id='resetProjectVisible';
    button.className='btn subtle';
    button.type='button';
    button.textContent='Reset project';
    button.dataset.linaOwner='project-hard-v2';
    button.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if(typeof window.linaResetProject==='function')void window.linaResetProject();
    },true);
    actions.prepend(button);
    return true;
  }

  if(!install()){
    const observer=new MutationObserver(()=>{if(install())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>{install();observer.disconnect()},5000);
  }
})();
