'use strict';
(()=>{
  const STEPS=['setup','lyrics','style','background','review'];
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

  function preserveTitleToggle(){
    const toggle=q('#showTitle');
    if(!toggle)return;
    let stash=q('#linaHiddenControlStash');
    if(!stash){
      stash=document.createElement('div');
      stash.id='linaHiddenControlStash';
      stash.hidden=true;
      stash.setAttribute('aria-hidden','true');
      document.body.append(stash);
    }
    stash.append(toggle);
  }

  function rebuildSetup(){
    const body=q('[data-panel="setup"] .body');
    if(!body)return false;

    const audioUpload=q('#audioFile')?.closest('label');
    const mediaStatus=q('#mediaStatus');
    const titleLabel=q('#titleInput')?.closest('label');
    const artistLabel=q('#artistInput')?.closest('label');
    const albumLabel=q('#albumInput')?.closest('label');
    const durationLabel=q('#titleDuration')?.closest('label');

    if(!audioUpload||!titleLabel||!artistLabel||!albumLabel||!durationLabel)return false;

    preserveTitleToggle();

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
    introGrid.append(durationLabel);
    intro.append(introGrid);
    const helper=document.createElement('div');
    helper.className='helper';
    helper.textContent='Audio and lyrics stay user supplied.';
    intro.append(helper);

    body.replaceChildren(audio,details,intro);

    q('#useArtworkBg2')?.closest('.subsection')?.remove();
    qa('#userArtworkFile,#userArtworkPreview,#artworkEmpty,#userArtworkIntro,#showArtworkIntro,#useArtworkBg,#pickedArt,#introArt').forEach(el=>el.remove());

    document.documentElement.dataset.setupStructure='vertical-v2';
    document.documentElement.dataset.setupAudioFirst='true';
    document.documentElement.dataset.artworkRetired='true';
    return true;
  }

  function ensureReviewStep(){
    const left=q('.left');
    const background=q('[data-panel="background"]');
    if(!left||!background)return false;

    let review=q('[data-panel="review"]');
    if(!review){
      review=document.createElement('section');
      review.className='panel tool';
      review.dataset.panel='review';
      review.hidden=true;
      review.setAttribute('aria-hidden','true');
      review.innerHTML='<h2>Review</h2><div class="body"><div class="subsection review-overview"><div class="subhead"><b>Review</b><span>Final check</span></div><div class="statusbox">Check your imported lyrics if needed, then preview the finished result below.</div></div></div>';
      background.after(review);
    }

    const reviewBox=q('#reviewBox');
    const body=review.querySelector('.body');
    if(reviewBox&&body&&reviewBox.parentElement!==body)body.append(reviewBox);

    const nav=q('#nav');
    if(nav&&!nav.querySelector('[data-tool="review"]')){
      const button=document.createElement('button');
      button.className='navbtn';
      button.dataset.tool='review';
      button.type='button';
      button.innerHTML='<span class="step">5</span>Review';
      nav.append(button);
    }
    return true;
  }

  function moveWorkflowControls(panel){
    const controls=q('.flow-controls');
    const body=panel?.querySelector('.body');
    if(!controls||!body)return;
    controls.classList.add('workflow-inline');
    body.append(controls);
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

    const panel=q(`.tool[data-panel="${id}"]`);
    moveWorkflowControls(panel);

    const status=q('#stepStatus');
    if(status)status.textContent=`Step ${index+1} of ${STEPS.length}`;
    const prev=q('#prevStep');
    const next=q('#nextStep');
    if(prev)prev.disabled=index===0;
    if(next)next.textContent=index===STEPS.length-1?'Preview':'Next';

    window.scrollTo({top:0,behavior:'auto'});
  }

  function bindNavigation(){
    if(document.documentElement.dataset.verticalWorkflowBound==='true')return;
    document.documentElement.dataset.verticalWorkflowBound='true';
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
      if(rebuildSetup()&&ensureReviewStep()){
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
