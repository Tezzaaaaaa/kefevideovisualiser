'use strict';
(()=>{
  const $=s=>document.querySelector(s);

  function install(){
    const actions=$('#previewQuickControls .quick-actions');
    if(!actions)return false;

    for(const selector of ['#quickResetLayout','#linaFreshReset','#resetLyricsBtn','#resetBtn','#resetProjectVisible']){
      const old=$(selector);if(old)old.remove();
    }

    const link=document.createElement('a');
    link.id='resetProjectVisible';
    link.className='btn subtle';
    link.href='reset.html?v=p71';
    link.textContent='Reset project';
    link.dataset.linaOwner='project-hard-v3';
    link.setAttribute('role','button');
    actions.prepend(link);
    return true;
  }

  if(!install()){
    const observer=new MutationObserver(()=>{if(install())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>{install();observer.disconnect()},5000);
  }
})();
