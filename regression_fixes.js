// LINA — post-merge regression fixes.
(function(){
'use strict';
function install(){
  if(typeof setStoryClass!=='function')return;
  const original=setStoryClass;
  setStoryClass=function(){
    const story=document.getElementById('story');
    const font=[...story.classList].find(c=>c.startsWith('font-'))||`font-${document.getElementById('fontStyle')?.value||'helvetica'}`;
    original();
    story.classList.add(font);
  };
  const select=document.getElementById('fontStyle');
  if(select){
    select.addEventListener('change',()=>{
      const story=document.getElementById('story');
      [...story.classList].filter(c=>c.startsWith('font-')).forEach(c=>story.classList.remove(c));
      story.classList.add(`font-${select.value||'helvetica'}`);
    });
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
