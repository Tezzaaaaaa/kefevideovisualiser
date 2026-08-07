'use strict';
(()=>{
  const STEPS=['setup','lyrics','style','background'];
  const shell=document.querySelector('.flow-shell'),controls=document.querySelector('.flow-controls');
  function updateDock(index=0){
    if(!controls)return;
    const shellTop=shell?.getBoundingClientRect().top??0;
    const shouldDock=index>0||shellTop<12;
    controls.classList.toggle('workflow-floating',shouldDock);
  }
  function showPanel(step){
    const index=Math.max(0,STEPS.indexOf(step)),id=STEPS[index];
    window.activeStep=index;
    document.querySelectorAll('.tool[data-panel]').forEach(panel=>{const on=panel.dataset.panel===id;panel.classList.toggle('active',on);panel.hidden=!on;panel.setAttribute('aria-hidden',on?'false':'true');panel.style.display=on?'block':'none'});
    document.querySelectorAll('#nav .navbtn[data-tool]').forEach((button,i)=>{const on=button.dataset.tool===id;button.classList.toggle('active',on);button.setAttribute('aria-selected',on?'true':'false');button.tabIndex=on?0:-1;if(i<index)button.classList.add('done')});
    const status=document.querySelector('#stepStatus');if(status)status.textContent=`Step ${index+1} of ${STEPS.length}`;
    const prev=document.querySelector('#prevStep'),next=document.querySelector('#nextStep');if(prev)prev.disabled=index===0;if(next)next.textContent=index===STEPS.length-1?'Review':'Next';
    document.querySelector('.left')?.scrollTo({top:0,behavior:'auto'});updateDock(index);
  }
  window.linaShowPanel=showPanel;
  document.addEventListener('click',e=>{
    const tab=e.target.closest('#nav .navbtn[data-tool]');
    if(tab){e.preventDefault();e.stopImmediatePropagation();showPanel(tab.dataset.tool);return}
    if(e.target.closest('#prevStep')){e.preventDefault();e.stopImmediatePropagation();const i=Math.max(0,STEPS.indexOf(document.querySelector('#nav .navbtn.active')?.dataset.tool||'setup'));showPanel(STEPS[Math.max(0,i-1)]);return}
    if(e.target.closest('#nextStep')){e.preventDefault();e.stopImmediatePropagation();const i=Math.max(0,STEPS.indexOf(document.querySelector('#nav .navbtn.active')?.dataset.tool||'setup'));if(i<STEPS.length-1)showPanel(STEPS[i+1]);return}
  },true);
  window.addEventListener('scroll',()=>updateDock(Math.max(0,STEPS.indexOf(document.querySelector('#nav .navbtn.active')?.dataset.tool||'setup'))),{passive:true});
  window.addEventListener('resize',()=>updateDock(Math.max(0,STEPS.indexOf(document.querySelector('#nav .navbtn.active')?.dataset.tool||'setup'))),{passive:true});
  requestAnimationFrame(()=>showPanel(document.querySelector('#nav .navbtn.active')?.dataset.tool||STEPS[Math.max(0,Number(window.activeStep)||0)]||'setup'));
})();
