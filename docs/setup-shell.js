'use strict';
(()=>{
  const STEPS=['setup','lyrics','background'];
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];

  function section(title,meta){
    const el=document.createElement('div');
    el.className='subsection setup-shell-section';
    const head=document.createElement('div');
    head.className='subhead';
    head.innerHTML=`<b>${title}</b><span>${meta}</span>`;
    el.append(head);
    return el;
  }

  function hiddenStash(){
    let stash=q('#linaHiddenControlStash');
    if(!stash){
      stash=document.createElement('div');
      stash.id='linaHiddenControlStash';
      stash.hidden=true;
      stash.setAttribute('aria-hidden','true');
      document.body.append(stash);
    }
    return stash;
  }

  function preserveIntroControls(){
    const stash=hiddenStash();
    const toggle=q('#showTitle');
    const duration=q('#titleDuration');
    if(toggle)stash.append(toggle);
    if(duration){
      duration.value=duration.value||'4';
      stash.append(duration);
    }
  }

  function rebuildSetup(){
    const body=q('[data-panel="setup"] .body');
    if(!body)return false;

    const audioUpload=q('#audioFile')?.closest('label');
    const mediaStatus=q('#mediaStatus');
    const titleLabel=q('#titleInput')?.closest('label');
    const artistLabel=q('#artistInput')?.closest('label');
    const albumLabel=q('#albumInput')?.closest('label');

    if(!audioUpload||!titleLabel||!artistLabel||!albumLabel)return false;

    preserveIntroControls();

    const audio=section('Audio','Start here');
    audio.append(audioUpload);
    if(mediaStatus)audio.append(mediaStatus);

    const details=section('Track details','User supplied');
    const detailsGrid=document.createElement('div');
    detailsGrid.className='setup-details-grid';
    detailsGrid.append(titleLabel,artistLabel,albumLabel);
    details.append(detailsGrid);

    body.replaceChildren(audio,details);

    q('#useArtworkBg2')?.closest('.subsection')?.remove();
    qa('#userArtworkFile,#userArtworkPreview,#artworkEmpty,#userArtworkIntro,#showArtworkIntro,#useArtworkBg,#pickedArt,#introArt').forEach(el=>el.remove());

    document.documentElement.dataset.setupStructure='vertical-v2';
    document.documentElement.dataset.setupAudioFirst='true';
    document.documentElement.dataset.artworkRetired='true';
    return true;
  }

  function moveWorkflowControls(panel){
    const controls=q('.flow-controls');
    const body=panel?.querySelector('.body');
    if(!controls||!body)return;
    controls.style.display='';
    controls.classList.add('workflow-inline');
    body.append(controls);
  }

  function markNav(id,index){
    qa('#nav .navbtn[data-tool]').forEach((button,i)=>{
      const active=button.dataset.tool===id;
      button.classList.toggle('active',active);
      button.classList.toggle('done',i<index);
      button.setAttribute('aria-selected',active?'true':'false');
      button.tabIndex=0;
    });
  }

  function showPanel(step){
    const index=Math.max(0,STEPS.indexOf(step));
    const id=STEPS[index];
    window.activeStep=index;

    document.documentElement.dataset.reviewDestination='';
    qa('.tool[data-panel]').forEach(panel=>{
      const active=panel.dataset.panel===id;
      panel.classList.toggle('active',active);
      panel.hidden=!active;
      panel.setAttribute('aria-hidden',active?'false':'true');
      panel.style.display=active?'block':'none';
    });

    markNav(id,index);

    const panel=q(`.tool[data-panel="${id}"]`);
    moveWorkflowControls(panel);

    const status=q('#stepStatus');
    if(status)status.textContent=`Step ${index+1} of ${STEPS.length}`;
    const prev=q('#prevStep');
    const next=q('#nextStep');
    if(prev)prev.disabled=index===0;
    if(next)next.textContent='Next';

    window.scrollTo({top:0,behavior:'auto'});
  }

  function bindNavigation(){
    if(document.documentElement.dataset.verticalWorkflowBound==='true')return;
    document.documentElement.dataset.verticalWorkflowBound='true';
    document.addEventListener('click',e=>{
      const tab=e.target.closest('#nav .navbtn[data-tool]');
      if(tab){
        e.preventDefault();
        e.stopImmediatePropagation();
        showPanel(tab.dataset.tool);
        return;
      }
      if(e.target.closest('#prevStep')){
        e.preventDefault();
        e.stopImmediatePropagation();
        const current=Math.max(0,STEPS.indexOf(q('#nav .navbtn.active')?.dataset.tool||'setup'));
        showPanel(STEPS[Math.max(0,current-1)]);
        return;
      }
      if(e.target.closest('#nextStep')){
        e.preventDefault();
        e.stopImmediatePropagation();
        const current=Math.max(0,STEPS.indexOf(q('#nav .navbtn.active')?.dataset.tool||'setup'));
        showPanel(STEPS[Math.min(STEPS.length-1,current+1)]);
      }
    },true);
  }

  function init(){
    let attempts=0;
    const run=()=>{
      attempts++;
      if(rebuildSetup()){
        bindNavigation();
        window.linaShowPanel=showPanel;
        showPanel('setup');
        return;
      }
      if(attempts<40)setTimeout(run,50);
    };
    run();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
