'use strict';
(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

  function addGuide(panel,title,text){
    const body=panel?.querySelector('.body');
    if(!body||body.querySelector(':scope > .step-guide'))return;
    const guide=document.createElement('div');
    guide.className='step-guide';
    guide.innerHTML=`<b>${title}</b><span>${text}</span>`;
    body.prepend(guide);
  }

  function renameSubsection(section,title,meta){
    if(!section)return;
    const head=section.querySelector(':scope > .subhead');
    const b=head?.querySelector('b'),m=head?.querySelector('span');
    if(b&&title)b.textContent=title;
    if(m&&meta!==undefined)m.textContent=meta;
  }

  function firstLyricTime(){
    try{
      const list=typeof lines!=='undefined'&&Array.isArray(lines)?lines:[];
      if(!list.length)return null;
      return Math.max(0,(Number(list[0]?.start)||0)/1000+.03);
    }catch{return null}
  }

  function revealFirstLyric(){
    const t=firstLyricTime();
    const a=$('#audio');
    if(t==null||!a)return;
    try{a.currentTime=t}catch{}
    try{window.render?.(t*1000)}catch{}
    try{window.invalidateLinaMotion?.(true)}catch{}
  }

  function guideSetup(){
    const panel=$('[data-panel="setup"]');
    if(!panel||panel.dataset.guidedSetup==='true')return false;
    panel.dataset.guidedSetup='true';
    addGuide(panel,'Start with the song','1. Add the audio file. 2. Check the song details. Then press Next.');
    const sections=$$('[data-panel="setup"] .setup-shell-section');
    renameSubsection(sections[0],'1. Add audio','Required');
    renameSubsection(sections[1],'2. Check song details','Used for lyrics search');
    return true;
  }

  function simplifyLyrics(){
    const panel=$('[data-panel="lyrics"]'),body=panel?.querySelector('.body'),sync=$('#syncMethod');
    if(!panel||!body||!sync||panel.dataset.guidedLyrics==='true')return false;
    panel.dataset.guidedLyrics='true';
    addGuide(panel,'Add the lyrics','Recommended: press “Find my synced lyrics”. LINA will search using the song details from Setup and show the lyrics in the preview below.');

    const source=sync.closest('.subsection');
    const syncField=sync.closest('.field');
    const searchBox=$('#searchLyricsBox');
    const pasteBox=$('#pasteTimedBox');
    const fileBox=$('#fileTimedBox');
    const manualBox=$('#manualSyncBox');
    const manualTiming=$('#manualTimingBox');

    if(source){
      renameSubsection(source,'1. Find synced lyrics','Recommended');
      if(searchBox){
        const btn=$('#findLyricsBtn');
        if(btn)btn.textContent='Find my synced lyrics';
        source.append(searchBox);
      }
      let other=source.querySelector('.other-lyrics-methods');
      if(!other){
        other=document.createElement('details');
        other.className='other-lyrics-methods';
        other.innerHTML='<summary>Other ways to add lyrics</summary><div class="other-lyrics-body"></div>';
        source.append(other);
      }
      const otherBody=other.querySelector('.other-lyrics-body');
      if(syncField){
        const label=syncField.querySelector('span');
        if(label)label.textContent='Choose another method';
        otherBody.append(syncField);
      }
      [pasteBox,fileBox,manualBox,manualTiming].forEach(el=>{if(el)otherBody.append(el)});
    }

    let advanced=body.querySelector(':scope > .advanced-lyrics-settings');
    if(!advanced){
      advanced=document.createElement('details');
      advanced.className='advanced-lyrics-settings';
      advanced.innerHTML='<summary>Advanced lyric settings</summary><div class="advanced-lyrics-body"></div>';
      body.append(advanced);
    }
    const advancedBody=advanced.querySelector('.advanced-lyrics-body');
    $$('[data-panel="lyrics"] .subsection').forEach(sec=>{
      const label=sec.querySelector(':scope > .subhead b')?.textContent?.trim();
      if(label==='Lyric phrasing'||label==='Lyrics entrance')advancedBody.append(sec);
    });
    const clear=$('#clearLyrics');if(clear)advancedBody.append(clear);

    if(!(typeof lines!=='undefined'&&Array.isArray(lines)&&lines.length)){
      sync.value='search';
      sync.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return true;
  }

  function guideStyle(){
    const panel=$('[data-panel="style"]');
    if(!panel||panel.dataset.guidedStyle==='true')return false;
    panel.dataset.guidedStyle='true';
    addGuide(panel,'Choose how the lyrics look','Start by choosing one lyric effect. Then adjust typography only if you want to. Placement controls are optional.');

    const effects=$('.consolidated-effects');
    if(effects){
      renameSubsection(effects,'1. Choose lyric effect','Pick one');
      if(!effects.querySelector('.effect-guide')){
        const note=document.createElement('div');
        note.className='effect-guide';
        note.textContent='Choose Apple Music, Charli xcx · Apple, or Eternal Sunshine. The preview below updates immediately.';
        const picker=effects.querySelector('.effect-picker');
        effects.insertBefore(note,picker||null);
      }
      $$('.effect-option').forEach(btn=>{
        btn.setAttribute('aria-pressed',btn.classList.contains('active')?'true':'false');
        btn.addEventListener('click',()=>setTimeout(()=>$$('.effect-option').forEach(x=>x.setAttribute('aria-pressed',x.classList.contains('active')?'true':'false')),0));
      });
    }

    const typography=$$('[data-panel="style"] .subsection').find(sec=>/Typography/i.test(sec.querySelector('.subhead b')?.textContent||''));
    renameSubsection(typography,'2. Typography','Optional');

    const transform=$('.consolidated-transform');
    if(transform){
      renameSubsection(transform,'3. Placement & size','Optional');
      if(!transform.closest('.style-advanced-wrap')){
        const details=document.createElement('details');
        details.className='style-advanced-wrap';
        details.innerHTML='<summary>Fine-tune placement & size</summary><div class="style-advanced-body"></div>';
        transform.before(details);
        details.querySelector('.style-advanced-body').append(transform);
      }
    }
    return true;
  }

  function guideBackground(){
    const panel=$('[data-panel="background"]');
    if(!panel||panel.dataset.guidedBackground==='true')return false;
    panel.dataset.guidedBackground='true';
    addGuide(panel,'Set the background','1. Choose an image or video. 2. Frame it. 3. Adjust readability if the lyrics need more contrast. Everything else is optional.');

    const sections=$$('[data-panel="background"] .subsection');
    const custom=sections.find(sec=>/Custom background/i.test(sec.querySelector('.subhead b')?.textContent||''));
    const frame=sections.find(sec=>/Frame & crop/i.test(sec.querySelector('.subhead b')?.textContent||''));
    const video=sections.find(sec=>/Video timing/i.test(sec.querySelector('.subhead b')?.textContent||''));
    const readability=sections.find(sec=>/Readability/i.test(sec.querySelector('.subhead b')?.textContent||''));
    const treatment=$('.consolidated-background');
    renameSubsection(custom,'1. Choose background','Image or video');
    renameSubsection(frame,'2. Frame it','Position & crop');
    renameSubsection(readability,'3. Make lyrics readable','Optional');
    renameSubsection(video,'Video timing','Only when using video');
    renameSubsection(treatment,'Colour treatment','Optional');

    [video,treatment].forEach((sec,i)=>{
      if(!sec||sec.closest('.background-advanced-wrap'))return;
      const details=document.createElement('details');
      details.className='background-advanced-wrap';
      details.innerHTML=`<summary>${i===0?'Video options':'Colour options'}</summary><div class="background-advanced-body"></div>`;
      sec.before(details);
      details.querySelector('.background-advanced-body').append(sec);
    });
    return true;
  }

  function selectedEffectName(){return $('.effect-option.active b')?.textContent?.trim()||'Apple Music'}

  function updateSummary(){
    const summary=$('#simpleControlSummary');
    if(!summary)return;
    const size=$('#size')?.value||'52';
    const context=$('#contextMode')?.selectedOptions?.[0]?.textContent?.replace(/\s+—.*$/,'')||'3 lines';
    const aspect=$('#aspect')?.value||'9:16';
    let bg='Default';
    const bgStatus=$('#bgStatus')?.textContent?.trim()||'';
    if(bgStatus&&!/No custom background/i.test(bgStatus))bg='Custom media';
    summary.innerHTML=`<span><b>Effect</b> ${selectedEffectName()}</span><span><b>Text size</b> ${size}</span><span><b>Lyrics</b> ${context}</span><span><b>Frame</b> ${aspect}</span><span><b>Background</b> ${bg}</span>`;
  }

  function guideReview(){
    const panel=$('[data-panel="review"]');
    if(!panel||panel.dataset.guidedReview==='true')return false;
    panel.dataset.guidedReview='true';
    addGuide(panel,'Final check','Your choices are already applied. Review lyric cleanup only if something looks wrong, then use the preview and playback controls below.');
    const overview=panel.querySelector('.review-overview');
    if(overview){
      renameSubsection(overview,'Ready to preview','Your selections are applied');
      const status=overview.querySelector('.statusbox');
      if(status)status.textContent='Nothing else is required here. Play the video below. Open Review & clean only if a lyric line needs fixing.';
    }
    const reviewBox=$('#reviewBox');
    if(reviewBox&&!reviewBox.closest('.review-clean-wrap')){
      const details=document.createElement('details');
      details.className='review-clean-wrap';
      details.innerHTML='<summary>Review & clean lyrics</summary><div class="review-clean-body"></div>';
      reviewBox.before(details);
      details.querySelector('.review-clean-body').append(reviewBox);
    }
    return true;
  }

  function simplifyBottomControls(){
    const stage=$('.stage'),tools=$('.transport-tools');
    if(!stage||!tools||stage.dataset.guidedControls==='true')return false;
    stage.dataset.guidedControls='true';

    const edit=$('#transportEdit');
    if(edit)edit.classList.add('advanced-only-control');

    const summary=document.createElement('div');
    summary.id='simpleControlSummary';
    summary.className='simple-control-summary';
    tools.after(summary);

    const more=document.createElement('details');
    more.className='more-controls';
    more.innerHTML='<summary>More controls</summary><div class="more-controls-body"></div>';
    summary.after(more);
    const moreBody=more.querySelector('.more-controls-body');

    const previewControls=$('.preview-controls');
    const inspector=$('.right');
    const exportBlock=$('.stage-export');
    if(edit)moreBody.append(edit);
    if(previewControls)moreBody.append(previewControls);
    if(exportBlock)moreBody.append(exportBlock);
    if(inspector)moreBody.append(inspector);

    updateSummary();
    ['input','change','click'].forEach(type=>document.addEventListener(type,e=>{
      if(e.target.closest?.('.effect-option,#size,#contextMode,#aspect,#bgImageFile,#bgVideoFile,#removeBg'))setTimeout(updateSummary,0);
    }));
    return true;
  }


  function stepReady(tool){
    if(tool==='setup'){
      const audio=$('#audio');
      return !!($('#audioFile')?.files?.length||audio?.currentSrc||audio?.getAttribute('src'));
    }
    if(tool==='lyrics'){
      try{return Array.isArray(lines)&&lines.length>0}catch{return $('#timeline [data-i]').length>0}
    }
    if(tool==='background'){
      const imageChosen=Number($('#bgImageFile')?.files?.length||0)>0;
      const videoChosen=Number($('#bgVideoFile')?.files?.length||0)>0;
      let manualChosen=false;
      try{manualChosen=!!manualBgFile}catch{}
      return imageChosen||videoChosen||manualChosen;
    }
    return true;
  }

  function readinessMessage(tool){
    if(tool==='setup')return 'Add an audio file to continue.';
    if(tool==='lyrics')return 'Add and confirm lyrics to continue.';
    if(tool==='background')return 'Choose artwork, an image, or a video to finish.';
    return '';
  }

  function updateStepReadiness(){
    const nav=$('#nav'),next=$('#nextStep');if(!nav)return;
    const buttons=Array.from(document.querySelectorAll('#nav [data-tool]'));
    buttons.forEach(btn=>{
      const ready=stepReady(btn.dataset.tool);
      btn.classList.toggle('step-ready',ready);
      btn.setAttribute('data-ready',ready?'true':'false');
    });
    const active=buttons.find(btn=>btn.classList.contains('active'))||buttons[0];
    if(!active||!next)return;
    const tool=active.dataset.tool,ready=stepReady(tool);
    next.classList.toggle('next-ready',ready);
    next.classList.toggle('next-waiting',!ready);
    next.setAttribute('aria-disabled',ready?'false':'true');
    next.dataset.readiness=ready?'ready':'waiting';
    let hint=$('#stepReadinessHint');
    if(!hint){
      hint=document.createElement('span');hint.id='stepReadinessHint';hint.className='step-readiness-hint';
      next.before(hint);
    }
    hint.textContent=ready?(tool==='background'?'Ready to finalise.':'Ready — continue to the next step.'):readinessMessage(tool);
    hint.classList.toggle('ready',ready);
  }

  function bindStepReadiness(){
    if(document.documentElement.dataset.stepReadinessBound==='true')return;
    document.documentElement.dataset.stepReadinessBound='true';
    for(const type of ['input','change','click'])document.addEventListener(type,()=>setTimeout(updateStepReadiness,40),true);
    const audio=$('#audio');for(const type of ['loadedmetadata','emptied'])audio?.addEventListener(type,updateStepReadiness);
    setInterval(updateStepReadiness,700);
    updateStepReadiness();
  }

  function bindGuidance(){
    if(document.documentElement.dataset.guidedUiBound==='true')return;
    document.documentElement.dataset.guidedUiBound='true';
    document.addEventListener('click',e=>{
      if(e.target.closest('#nav [data-tool="lyrics"]'))setTimeout(revealFirstLyric,80);
      if(e.target.closest('#findLyricsBtn,#applyPaste,#confirmReview'))setTimeout(revealFirstLyric,220);
    });
    $('#lyricsFile')?.addEventListener('change',()=>setTimeout(revealFirstLyric,260));
  }

  function init(){
    let tries=0;
    const run=()=>{
      tries++;
      guideSetup();
      simplifyLyrics();
      guideStyle();
      guideBackground();
      guideReview();
      simplifyBottomControls();
      bindGuidance();
      bindStepReadiness();
      updateStepReadiness();
      if(tries<20&&(!document.documentElement.dataset.guidedUiReady))setTimeout(run,80);
      else document.documentElement.dataset.guidedUiReady='true';
    };
    run();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
