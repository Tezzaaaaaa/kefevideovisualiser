'use strict';
(()=>{
  const STEPS=['setup','lyrics','style','background'];
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

  function rebuildSetup(){
    const body=q('[data-panel="setup"] .body');
    if(!body)return false;

    const audioUpload=q('#audioFile')?.closest('label');
    const mediaStatus=q('#mediaStatus');
    const titleLabel=q('#titleInput')?.closest('label');
    const artistLabel=q('#artistInput')?.closest('label');
    const albumLabel=q('#albumInput')?.closest('label');
    const showTitleLabel=q('#showTitle')?.closest('label');
    const durationLabel=q('#titleDuration')?.closest('label');

    if(!audioUpload||!titleLabel||!artistLabel||!albumLabel||!showTitleLabel||!durationLabel)return false;

    const audio=section('Audio','Start here');
    audio.append(audioUpload);
    if(mediaStatus)audio.append(mediaStatus);

    const details=section('Track details','User supplied');
    const detailsGrid=document.createElement('div');
    detailsGrid.className='setup-details-grid';
    detailsGrid.append(titleLabel,artistLabel,albumLabel);
    details.append(detailsGrid);

    const intro=section('Intro','Optional');
    const introGrid=document.createElement('div');
    introGrid.className='setup-intro-grid';
    const showTitleText=showTitleLabel.querySelector('span');
    if(showTitleText)showTitleText.textContent='Show title + artist at start';
    introGrid.append(showTitleLabel,durationLabel);
    intro.append(introGrid);
    const helper=document.createElement('div');
    helper.className='helper';
    helper.textContent='Audio and lyrics stay user supplied.';
    intro.append(helper);

    body.replaceChildren(audio,details,intro);

    q('#useArtworkBg2')?.closest('.subsection')?.remove();
    qa('#userArtworkFile,#userArtworkPreview,#artworkEmpty,#userArtworkIntro,#showArtworkIntro,#useArtworkBg,#pickedArt,#introArt').forEach(el=>el.remove());

    document.documentElement.dataset.setupStructure='clean-v1';
    document.documentElement.dataset.setupAudioFirst='true';
    document.documentElement.dataset.artworkRetired='true';
    return true;
  }

  function showPanel(step){
    const index=Math.max(0,STEPS.indexOf(step));
    const id=STEPS[index];
    window.activeStep=index;

    qa('.tool[data-panel]').forEach(panel=>{
      const active=panel.dataset.panel===id;
      panel.classList.toggle('active',active);
      panel.hidden=!active;
      panel.setAttribute('aria-hidden',active?'false':'true');
      panel.style.display=active?'block':'none';
    });

    qa('#nav .navbtn[data-tool]').forEach((button,i)=>{
      const active=button.dataset.tool===id;
      button.classList.toggle('active',active);
      button.classList.toggle('done',i<index);
      button.setAttribute('aria-selected',active?'true':'false');
      button.tabIndex=0;
    });

    const status=q('#stepStatus');
    if(status)status.textContent=`Step ${index+1} of ${STEPS.length}`;
    const prev=q('#prevStep');
    const next=q('#nextStep');
    if(prev)prev.disabled=index===0;
    if(next)next.textContent=index===STEPS.length-1?'Preview':'Next';
    q('.left')?.scrollTo({top:0,behavior:'auto'});
  }

  function bindNavigation(){
    document.addEventListener('click',e=>{
      const tab=e.target.closest('#nav .navbtn[data-tool]');
      if(tab){e.preventDefault();showPanel(tab.dataset.tool);return;}
      if(e.target.closest('#prevStep')){
        e.preventDefault();
        const current=Math.max(0,STEPS.indexOf(q('#nav .navbtn.active')?.dataset.tool||'setup'));
        showPanel(STEPS[Math.max(0,current-1)]);
        return;
      }
      if(e.target.closest('#nextStep')){
        e.preventDefault();
        const current=Math.max(0,STEPS.indexOf(q('#nav .navbtn.active')?.dataset.tool||'setup'));
        if(current<STEPS.length-1)showPanel(STEPS[current+1]);
        else q('.stage')?.scrollIntoView({behavior:'smooth',block:'start'});
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
        showPanel(q('#nav .navbtn.active')?.dataset.tool||'setup');
        return;
      }
      if(attempts<40)setTimeout(run,50);
    };
    run();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
