'use strict';
(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

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

  function simplifyLyrics(){
    const panel=$('[data-panel="lyrics"]'),body=panel?.querySelector('.body'),sync=$('#syncMethod');
    if(!panel||!body||!sync||panel.dataset.guidedLyrics==='true')return false;
    panel.dataset.guidedLyrics='true';

    const guide=document.createElement('div');
    guide.className='first-run-guide';
    guide.innerHTML='<b>Start here</b><span>Use the recommended button below. LINA will find synced lyrics and show them in the preview. You only need the other options if automatic lookup cannot find your song.</span>';
    body.prepend(guide);

    const source=sync.closest('.subsection');
    const syncField=sync.closest('.field');
    const searchBox=$('#searchLyricsBox');
    const pasteBox=$('#pasteTimedBox');
    const fileBox=$('#fileTimedBox');
    const manualBox=$('#manualSyncBox');
    const manualTiming=$('#manualTimingBox');

    if(source){
      const head=source.querySelector('.subhead');
      const b=head?.querySelector('b'),m=head?.querySelector('span');
      if(b)b.textContent='Add lyrics';
      if(m)m.textContent='Recommended: automatic';
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

    const advanced=document.createElement('details');
    advanced.className='advanced-lyrics-settings';
    advanced.innerHTML='<summary>Advanced lyric settings</summary><div class="advanced-lyrics-body"></div>';
    const advancedBody=advanced.querySelector('.advanced-lyrics-body');
    const subsections=$$('[data-panel="lyrics"] .subsection');
    subsections.forEach(sec=>{
      const label=sec.querySelector('.subhead b')?.textContent?.trim();
      if(label==='Lyric phrasing'||label==='Lyrics entrance')advancedBody.append(sec);
    });
    const clear=$('#clearLyrics');if(clear)advancedBody.append(clear);
    body.append(advanced);

    if(!(typeof lines!=='undefined'&&Array.isArray(lines)&&lines.length)){
      sync.value='search';
      sync.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return true;
  }

  function clarifyStyle(){
    const effects=$('.consolidated-effects');
    if(!effects||effects.dataset.guidedEffects==='true')return false;
    effects.dataset.guidedEffects='true';
    const note=document.createElement('div');
    note.className='effect-guide';
    note.textContent='Choose one lyric look. Your selection is shown immediately in the preview below.';
    const picker=effects.querySelector('.effect-picker');
    effects.insertBefore(note,picker||null);
    $$('.effect-option').forEach(btn=>{
      btn.setAttribute('aria-pressed',btn.classList.contains('active')?'true':'false');
      btn.addEventListener('click',()=>setTimeout(()=>$$('.effect-option').forEach(x=>x.setAttribute('aria-pressed',x.classList.contains('active')?'true':'false')),0));
    });
    return true;
  }

  function selectedEffectName(){
    return $('.effect-option.active b')?.textContent?.trim()||'Apple Music';
  }

  function updateSummary(){
    const summary=$('#simpleControlSummary');
    if(!summary)return;
    const size=$('#size')?.value||'52';
    const context=$('#contextMode')?.selectedOptions?.[0]?.textContent?.replace(/\s+—.*$/,'')||'3 lines';
    const aspect=$('#aspect')?.value||'9:16';
    summary.innerHTML=`<span><b>Effect</b> ${selectedEffectName()}</span><span><b>Text</b> ${size}</span><span><b>Lyrics</b> ${context}</span><span><b>Frame</b> ${aspect}</span>`;
  }

  function simplifyBottomControls(){
    const stage=$('.stage');
    const tools=$('.transport-tools');
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
    if(previewControls)moreBody.append(previewControls);
    if(edit)moreBody.prepend(edit);
    if(exportBlock)moreBody.append(exportBlock);
    if(inspector)moreBody.append(inspector);

    updateSummary();
    ['input','change','click'].forEach(type=>document.addEventListener(type,e=>{
      if(e.target.closest?.('.effect-option,#size,#contextMode,#aspect'))setTimeout(updateSummary,0);
    }));
    return true;
  }

  function bindGuidance(){
    if(document.documentElement.dataset.guidedUiBound==='true')return;
    document.documentElement.dataset.guidedUiBound='true';

    document.addEventListener('click',e=>{
      if(e.target.closest('#nav [data-tool="lyrics"]'))setTimeout(revealFirstLyric,80);
      if(e.target.closest('#findLyricsBtn,#applyPaste,#confirmReview'))setTimeout(revealFirstLyric,180);
    });
    $('#lyricsFile')?.addEventListener('change',()=>setTimeout(revealFirstLyric,220));
  }

  function init(){
    let tries=0;
    const run=()=>{
      tries++;
      const a=simplifyLyrics();
      const b=clarifyStyle();
      const c=simplifyBottomControls();
      bindGuidance();
      if((!a&&!$('[data-panel="lyrics"]')||!b&&!$('.consolidated-effects')||!c&&!$('.stage'))&&tries<50)setTimeout(run,60);
      else if(tries<12&&(!document.documentElement.dataset.guidedUiReady)){
        document.documentElement.dataset.guidedUiReady='true';
        setTimeout(()=>{simplifyLyrics();clarifyStyle();simplifyBottomControls();},120);
      }
    };
    run();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
