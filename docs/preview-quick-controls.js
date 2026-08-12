'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const fire=(el,type)=>el?.dispatchEvent(new Event(type,{bubbles:true}));

  function stash(){
    let el=$('#linaQuickSourceStash');
    if(!el){el=document.createElement('div');el.id='linaQuickSourceStash';el.hidden=true;el.setAttribute('aria-hidden','true');document.body.append(el)}
    return el;
  }

  function copyOptions(source,target){
    if(!source||!target)return;
    const value=source.value;
    target.replaceChildren(...[...source.options].map(o=>{const n=document.createElement('option');n.value=o.value;n.textContent=o.textContent;n.disabled=o.disabled;n.hidden=o.hidden;return n;}));
    target.value=value;
  }

  function currentEffect(){return window.linaRuntime?.getEffect?.()||$('#lyricEffect')?.value||$('#story')?.dataset.lyricEffect||$('#styleEffectSelect')?.value||'apple'}

  function safeSize(){
    const aspect=$('#aspect')?.value||'16:9',effect=currentEffect();
    if(aspect==='9:16')return effect==='charli'?'48':effect==='eternal'?'42':'44';
    if(aspect==='4:5')return effect==='charli'?'42':effect==='eternal'?'36':'38';
    if(aspect==='1:1')return effect==='charli'?'38':effect==='eternal'?'34':'36';
    return effect==='charli'?'34':effect==='eternal'?'30':'32';
  }

  function bindSelect(sourceId,quickId){
    const source=$('#'+sourceId),quick=$('#'+quickId);if(!source||!quick)return;
    copyOptions(source,quick);
    quick.addEventListener('change',()=>{source.value=quick.value;fire(source,'change');fire(source,'input');setTimeout(syncAll,0)});
    const sync=()=>{copyOptions(source,quick);quick.value=source.value};
    source.addEventListener('change',sync);source.addEventListener('input',sync);
    if(sourceId==='fontChoice')new MutationObserver(sync).observe(source,{childList:true});
  }

  function bindRange(sourceId,quickId,valueId,format=v=>v){
    const source=$('#'+sourceId),quick=$('#'+quickId),value=$('#'+valueId);if(!source||!quick)return;
    for(const attr of ['min','max','step'])if(source.getAttribute(attr)!=null)quick.setAttribute(attr,source.getAttribute(attr));
    const sync=()=>{quick.value=source.value;if(value)value.textContent=format(source.value)};
    quick.addEventListener('input',()=>{source.value=quick.value;fire(source,'input');sync()});
    quick.addEventListener('change',()=>{source.value=quick.value;fire(source,'change');sync()});
    source.addEventListener('input',sync);source.addEventListener('change',sync);sync();
  }

  function bindColor(){
    const source=$('#textColor'),quick=$('#quickTextColor');if(!source||!quick)return;
    const sync=()=>quick.value=source.value||'#ffffff';
    quick.addEventListener('input',()=>{source.value=quick.value;fire(source,'input')});
    quick.addEventListener('change',()=>{source.value=quick.value;fire(source,'change')});
    source.addEventListener('input',sync);source.addEventListener('change',sync);sync();
  }

  function bindToggle(sourceId,quickId,after){
    const source=$('#'+sourceId),quick=$('#'+quickId);if(!source||!quick)return;
    const sync=()=>{quick.checked=!!source.checked;after?.()};
    quick.addEventListener('change',()=>{source.checked=quick.checked;fire(source,'input');fire(source,'change');after?.();try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}});
    source.addEventListener('change',sync);source.addEventListener('input',sync);sync();
  }

  function bindSize(){
    const source=$('#size'),quick=$('#quickSize');if(!source||!quick)return;
    const values=[26,30,32,34,36,38,42,44,48,52,60,68,76];
    quick.replaceChildren(...values.map(v=>{const o=document.createElement('option');o.value=String(v);o.textContent=v<=26?`Small · ${v}`:v<=38?`Medium · ${v}`:v<=52?`Large · ${v}`:v<=68?`Extra large · ${v}`:`Maximum · ${v}`;return o;}));
    const sync=()=>{const n=Number(source.value)||Number(safeSize()),best=values.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a,values[0]);quick.value=String(best)};
    quick.addEventListener('change',()=>{source.value=quick.value;fire(source,'input');fire(source,'change')});
    source.addEventListener('input',sync);source.addEventListener('change',sync);sync();
  }

  function setEffect(value){
    if(window.linaRuntime?.setEffect){window.linaRuntime.setEffect(value);setTimeout(syncAll,0);return}
    const hidden=$('#lyricEffect');if(hidden)hidden.value=value;
    const option=$(`.effect-option[data-effect="${value}"]`);
    if(option)option.click();
    else{
      $('#story')?.setAttribute('data-lyric-effect',value);
      try{window.invalidateLinaMotion?.(true)}catch{}
      try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
    }
    setTimeout(()=>{window.linaSyncTypography?.();syncAll()},20);
  }

  function takeField(id){const el=$('#'+id);if(!el)return null;return el.closest('label')||el}

  function moveBackgroundControls(box){
    const group=box.querySelector('#quickBackgroundGroup');if(!group)return;
    const frameSection=$('#cropX')?.closest('.subsection');
    const readableSection=$('#dim')?.closest('.subsection');
    const frameGrid=group.querySelector('.quick-background-frame');
    const readableGrid=box.querySelector('.quick-typography-readable');
    const actionGrid=group.querySelector('.quick-background-actions');
    for(const id of ['bgFit','cropZoom','cropX','cropY']){const field=takeField(id);if(field&&frameGrid)frameGrid.append(field)}
    for(const id of ['dim','blur']){const field=takeField(id);if(field&&readableGrid)readableGrid.append(field)}
    const reset=$('#resetCrop'),remove=$('#removeBg');if(reset&&actionGrid)actionGrid.append(reset);if(remove&&actionGrid)actionGrid.append(remove);
    if(frameSection&&frameSection!==group)frameSection.remove();
    if(readableSection&&readableSection!==group)readableSection.remove();
    const advancedBody=box.querySelector('.quick-advanced-body'),videoBox=$('#videoTrimBox');
    if(videoBox&&advancedBody){
      const oldParent=videoBox.parentElement,videoWrap=document.createElement('div');
      videoWrap.className='quick-advanced-section quick-video-timing';
      videoWrap.innerHTML='<div class="quick-mini-head"><b>Background video timing</b><span>Only when needed</span></div>';
      videoWrap.append(videoBox);advancedBody.prepend(videoWrap);
      if(oldParent?.tagName==='DETAILS'&&!oldParent.querySelector('.subsection'))oldParent.remove();
    }
  }

  function titleEnabledState(){const toggle=$('#quickTitle'),duration=$('#quickTitleDuration');if(duration)duration.disabled=toggle?!toggle.checked:false}

  function build(){
    const stageWrap=$('.stage-wrap');if(!stageWrap||$('#previewQuickControls'))return false;
    $('#previewEffectSwitcher')?.remove();$('#simpleControlSummary')?.remove();$('#previewTitleControls')?.remove();$('#resetBtn')?.remove();
    const box=document.createElement('section');
    box.id='previewQuickControls';box.className='preview-quick-controls';
    box.innerHTML=`
      <div class="quick-control-head"><b>Finalise video</b><span>Every final adjustment is here, in order.</span></div>
      <div class="quick-group quick-priority-1">
        <div class="quick-group-head"><b>1. Lyric look & readability</b><span>Typography · title card · legibility</span></div>
        <div class="quick-control-grid">
          <label><span>Effect</span><select id="quickEffect"><option value="apple">Apple Music</option><option value="charli">Charli xcx · Apple</option><option value="eternal">Eternal Sunshine</option></select></label>
          <label><span>Font</span><select id="quickFont"></select></label>
          <label><span>Text size</span><select id="quickSize"></select></label>
          <label class="quick-toggle quick-title-inline"><span><b>Title card</b><small>Show at opening</small></span><input id="quickTitle" type="checkbox"></label>
          <label class="quick-title-duration"><span>Title duration</span><select id="quickTitleDuration"></select></label>
          <label><span>Weight</span><select id="quickWeight"></select></label>
          <label><span>Alignment</span><select id="quickAlign"></select></label>
          <label><span>Letter case</span><select id="quickCase"></select></label>
          <label class="quick-colour"><span>Text colour</span><input id="quickTextColor" type="color" value="#ffffff"></label>
          <label><span>Lyrics on screen</span><select id="quickLyricsView"></select></label>
          <label class="quick-range"><span>Line height <b id="quickLineHeightVal"></b></span><input id="quickLineHeight" type="range"></label>
          <label class="quick-range"><span>Letter spacing <b id="quickLetterSpacingVal"></b></span><input id="quickLetterSpacing" type="range"></label>
          <label class="quick-range quick-wide"><span>Glow <b id="quickGlowVal"></b></span><input id="quickGlow" type="range"></label>
        </div>
        <div class="quick-mini-head"><b>Background readability</b><span>Darken or soften behind the lyrics</span></div>
        <div class="quick-control-grid quick-typography-readable"></div>
        <div class="quick-mini-head"><b>Position & timing</b><span>Place it · sync it</span></div>
        <div class="quick-control-grid quick-position-timing">
          <label class="quick-range"><span>Vertical position <b id="quickYVal"></b></span><input id="quickY" type="range"></label>
          <label class="quick-range"><span>Lyric offset <b id="quickOffsetVal"></b></span><input id="quickOffset" type="range"></label>
        </div>
      </div>
      <div class="quick-group quick-priority-2" id="quickBackgroundGroup">
        <div class="quick-group-head"><b>2. Background & framing</b><span>Fit · crop · focus</span></div>
        <div class="quick-mini-head"><b>Frame</b><span>Fit · zoom · focus</span></div><div class="quick-control-grid quick-background-frame"></div>
        <div class="quick-background-actions"></div>
      </div>
      <div class="quick-group quick-priority-4">
        <div class="quick-group-head"><b>3. Export</b><span>Frame · quality · guides</span></div>
        <div class="quick-control-grid">
          <label><span>Aspect ratio</span><select id="quickFrame"></select></label>
          <label><span>Quality</span><select id="quickQuality"></select></label>
          <label class="quick-toggle quick-wide"><span><b>Safe-area guides</b><small>Preview only · never exported</small></span><input id="quickSafe" type="checkbox"></label>
        </div>
      </div>
      <details id="quickAdvanced" class="quick-fine quick-advanced">
        <summary>Fine lyric editing</summary>
        <div class="quick-advanced-body">
          <details id="quickFineTiming" class="quick-fine quick-timing-editor"><summary>Line timing, text and word emphasis</summary><div class="quick-fine-body"></div></details>
        </div>
      </details>
      <div class="quick-actions">
        <a id="resetProjectVisible" class="btn subtle" href="reset.html?v=p91-20260812-preview-visible" role="button" data-lina-owner="project-hard-v3">Reset project</a>
        <button id="quickExport" class="btn primary" type="button">Export video</button>
      </div>`;

    const tools=$('.transport-tools'),transport=$('.transport');(tools||transport||stageWrap).after(box);
    const sourceStash=stash(),previewControls=$('.preview-controls'),exportBlock=$('.stage-export'),stylePanel=$('[data-panel="style"]');
    if(previewControls)sourceStash.append(previewControls);if(exportBlock)sourceStash.append(exportBlock);if(stylePanel)sourceStash.append(stylePanel);
    $('.navbtn[data-tool="style"]')?.remove();
    const inspector=$('.right'),fineBody=$('#quickFineTiming .quick-fine-body');if(inspector&&fineBody)fineBody.append(inspector);
    $('.more-controls')?.remove();moveBackgroundControls(box);

    const qe=$('#quickEffect');qe.value=currentEffect();qe.addEventListener('change',()=>setEffect(qe.value));
    bindSelect('fontChoice','quickFont');bindSize();bindSelect('contextMode','quickLyricsView');bindSelect('textAlign','quickAlign');bindColor();
    bindRange('yPos','quickY','quickYVal',v=>`${v}%`);bindRange('offset','quickOffset','quickOffsetVal',v=>`${Number(v)>0?'+':''}${v} ms`);
    bindToggle('showTitle','quickTitle',titleEnabledState);bindSelect('titleDuration','quickTitleDuration');bindSelect('aspect','quickFrame');bindSelect('quality','quickQuality');
    bindSelect('fontWeight','quickWeight');bindSelect('letterCase','quickCase');bindRange('lineHeight','quickLineHeight','quickLineHeightVal',v=>Number(v).toFixed(2));
    bindRange('letterSpacing','quickLetterSpacing','quickLetterSpacingVal',v=>`${Number(v).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}em`);bindRange('glow','quickGlow','quickGlowVal',v=>`${v}%`);bindToggle('safeToggle','quickSafe');
    $('#quickExport')?.addEventListener('click',()=>($('#exportBottomBtn')||$('#exportBtn'))?.click());

    document.addEventListener('change',e=>{if(['styleEffectSelect','lyricEffect'].includes(e.target?.id)||e.target?.closest?.('.effect-option'))setTimeout(syncAll,30)},true);
    document.addEventListener('click',e=>{if(e.target.closest?.('.effect-option[data-effect]'))setTimeout(syncAll,30)},true);
    const story=$('#story');
    if(story&&story.dataset.geometryLocked!=='true'){
      story.dataset.geometryLocked='true';
      for(const type of ['wheel','pointerdown','pointermove'])story.addEventListener(type,e=>{e.stopPropagation();e.stopImmediatePropagation()},{capture:true,passive:true});
    }
    window.linaQuickSettingsSync=syncAll;
    setTimeout(()=>{window.linaSyncTypography?.();syncAll();titleEnabledState()},30);
    document.documentElement.dataset.quickControlsOrder='finalise-v5';document.documentElement.dataset.previewFinalise='v4';
    return true;
  }

  function syncAll(){
    const qe=$('#quickEffect');if(qe)qe.value=currentEffect();
    const pairs=[['fontChoice','quickFont'],['contextMode','quickLyricsView'],['textAlign','quickAlign'],['titleDuration','quickTitleDuration'],['aspect','quickFrame'],['quality','quickQuality'],['fontWeight','quickWeight'],['letterCase','quickCase']];
    for(const [sourceId,quickId] of pairs){const source=$('#'+sourceId),quick=$('#'+quickId);if(source&&quick){if(sourceId==='fontChoice')copyOptions(source,quick);quick.value=source.value}}
    if($('#quickTitle')&&$('#showTitle'))$('#quickTitle').checked=$('#showTitle').checked;
    if($('#quickSafe')&&$('#safeToggle'))$('#quickSafe').checked=$('#safeToggle').checked;
    titleEnabledState();
  }

  function init(){let tries=0;const run=()=>{tries++;if(!build()&&tries<50)setTimeout(run,60)};run()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();