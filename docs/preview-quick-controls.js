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

  function currentEffect(){
    return $('#lyricEffect')?.value||$('#story')?.dataset.lyricEffect||$('#styleEffectSelect')?.value||'apple';
  }

  function safeSize(){
    const aspect=$('#aspect')?.value||'16:9',effect=currentEffect();
    if(aspect==='9:16')return effect==='charli'?'48':effect==='eternal'?'42':'44';
    if(aspect==='4:5')return effect==='charli'?'42':effect==='eternal'?'36':'38';
    if(aspect==='1:1')return effect==='charli'?'38':effect==='eternal'?'34':'36';
    return effect==='charli'?'34':effect==='eternal'?'30':'32';
  }

  function resetLayout(){
    $('#resetLyricsTransform')?.click();
    const size=$('#size');if(size){size.value=String(safeSize());fire(size,'input');fire(size,'change')}
    const y=$('#yPos');if(y){y.value='50';fire(y,'input');fire(y,'change')}
    try{window.invalidateLinaMotion?.(true)}catch{}
    try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
    setTimeout(syncAll,0);
  }

  function bindSelect(sourceId,quickId){
    const source=$('#'+sourceId),quick=$('#'+quickId);if(!source||!quick)return;
    copyOptions(source,quick);
    quick.addEventListener('change',()=>{source.value=quick.value;fire(source,'change');fire(source,'input');setTimeout(syncAll,0)});
    const sync=()=>{copyOptions(source,quick);quick.value=source.value};
    source.addEventListener('change',sync);source.addEventListener('input',sync);
    if(sourceId==='fontChoice')new MutationObserver(()=>sync()).observe(source,{childList:true});
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

  function bindToggle(sourceId,quickId){
    const source=$('#'+sourceId),quick=$('#'+quickId);if(!source||!quick)return;
    const sync=()=>quick.checked=!!source.checked;
    quick.addEventListener('change',()=>{source.checked=quick.checked;fire(source,'input');fire(source,'change');try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}});
    source.addEventListener('change',sync);source.addEventListener('input',sync);sync();
  }

  function bindSize(){
    const source=$('#size'),quick=$('#quickSize');if(!source||!quick)return;
    const values=[26,32,38,44,52,60,68,76];
    quick.replaceChildren(...values.map(v=>{const o=document.createElement('option');o.value=String(v);o.textContent=v<=26?`Small · ${v}`:v<=38?`Medium · ${v}`:v<=52?`Large · ${v}`:v<=68?`Extra large · ${v}`:`Maximum · ${v}`;return o;}));
    const sync=()=>{const n=Number(source.value)||Number(safeSize()),best=values.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a,values[0]);quick.value=String(best)};
    quick.addEventListener('change',()=>{source.value=quick.value;fire(source,'input');fire(source,'change')});
    source.addEventListener('input',sync);source.addEventListener('change',sync);sync();
  }

  function setEffect(value){
    const hidden=$('#lyricEffect');if(hidden)hidden.value=value;
    const option=$(`.effect-option[data-effect="${value}"]`);
    if(option)option.click();
    else{
      $('#story')?.setAttribute('data-lyric-effect',value);
      try{window.invalidateLinaMotion?.(true)}catch{}
      try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
    }
    setTimeout(()=>{window.linaSyncTypography?.();resetLayout();syncAll()},20);
  }

  function moveBackgroundSections(box){
    const frame=$('#cropX')?.closest('.subsection');
    const readable=$('#dim')?.closest('.subsection');
    const actions=box.querySelector('.quick-actions');
    const configure=(section,title,meta)=>{
      if(!section||section.closest('#previewQuickControls'))return;
      section.classList.add('quick-group','quick-background-group');
      section.dataset.quickBackground='true';
      const head=section.querySelector(':scope > .subhead');
      if(head){
        head.classList.add('quick-group-head');
        const b=head.querySelector('b'),s=head.querySelector('span');
        if(b)b.textContent=title;
        if(s)s.textContent=meta;
      }
      if(actions)box.insertBefore(section,actions);else box.append(section);
    };
    configure(frame,'2. Frame it','Position · crop · zoom');
    configure(readable,'3. Make lyrics readable','Overlay · blur');
  }

  function build(){
    const stageWrap=$('.stage-wrap');if(!stageWrap||$('#previewQuickControls'))return false;
    $('#previewEffectSwitcher')?.remove();$('#simpleControlSummary')?.remove();$('#previewTitleControls')?.remove();

    const box=document.createElement('section');
    box.id='previewQuickControls';box.className='preview-quick-controls';
    box.innerHTML=`
      <div class="quick-control-head"><b>Quick settings</b><span>Every common adjustment in one place.</span></div>

      <div class="quick-group">
        <div class="quick-group-head"><b>Essentials</b><span>Effect · type · layout</span></div>
        <div class="quick-control-grid">
          <label><span>Effect</span><select id="quickEffect"><option value="apple">Apple Music</option><option value="charli">Charli xcx · Apple</option><option value="eternal">Eternal Sunshine</option></select></label>
          <label><span>Font</span><select id="quickFont"></select></label>
          <label><span>Text size</span><select id="quickSize"></select></label>
          <label><span>Lyrics view</span><select id="quickLyricsView"></select></label>
          <label><span>Aspect ratio</span><select id="quickFrame"></select></label>
          <label><span>Letter case</span><select id="quickCase"></select></label>
        </div>
      </div>

      <div class="quick-group">
        <div class="quick-group-head"><b>Typography</b><span>Synced with Style</span></div>
        <div class="quick-control-grid">
          <label><span>Weight</span><select id="quickWeight"></select></label>
          <label><span>Alignment</span><select id="quickAlign"></select></label>
          <label class="quick-range"><span>Line height <b id="quickLineHeightVal"></b></span><input id="quickLineHeight" type="range"></label>
          <label class="quick-range"><span>Letter spacing <b id="quickLetterSpacingVal"></b></span><input id="quickLetterSpacing" type="range"></label>
          <label class="quick-colour"><span>Text colour</span><input id="quickTextColor" type="color" value="#ffffff"></label>
        </div>
      </div>

      <div class="quick-group">
        <div class="quick-group-head"><b>Placement & timing</b><span>Safe reversible changes</span></div>
        <div class="quick-control-grid">
          <label class="quick-range"><span>Vertical position <b id="quickYVal"></b></span><input id="quickY" type="range"></label>
          <label class="quick-range"><span>Glow <b id="quickGlowVal"></b></span><input id="quickGlow" type="range"></label>
          <label class="quick-range quick-wide"><span>Lyric offset <b id="quickOffsetVal"></b></span><input id="quickOffset" type="range"></label>
        </div>
      </div>

      <div class="quick-group">
        <div class="quick-group-head"><b>Intro & output</b><span>Title card · export</span></div>
        <div class="quick-control-grid">
          <label class="quick-toggle"><span><b>Title card</b><small>Title, artist and album</small></span><input id="quickTitle" type="checkbox"></label>
          <label><span>Title duration</span><select id="quickTitleDuration"></select></label>
          <label><span>Quality</span><select id="quickQuality"></select></label>
          <label class="quick-toggle"><span><b>Safe-area guides</b><small>Preview only</small></span><input id="quickSafe" type="checkbox"></label>
        </div>
      </div>

      <div class="quick-actions">
        <button id="quickResetLayout" class="btn subtle" type="button">Reset lyric layout</button>
        <button id="quickExport" class="btn primary" type="button">Export video</button>
      </div>
      <details id="quickFineTiming" class="quick-fine"><summary>Fine timing & lyric editing</summary><div class="quick-fine-body"></div></details>`;

    const tools=$('.transport-tools'),transport=$('.transport');
    (tools||transport||stageWrap).after(box);

    const sourceStash=stash();
    const previewControls=$('.preview-controls'),exportBlock=$('.stage-export');
    if(previewControls)sourceStash.append(previewControls);
    if(exportBlock)sourceStash.append(exportBlock);
    const inspector=$('.right'),fineBody=$('#quickFineTiming .quick-fine-body');
    if(inspector&&fineBody)fineBody.append(inspector);
    const more=$('.more-controls');if(more)more.remove();

    moveBackgroundSections(box);

    const qe=$('#quickEffect');qe.value=currentEffect();qe.addEventListener('change',()=>setEffect(qe.value));
    bindSelect('fontChoice','quickFont');
    bindSize();
    bindSelect('contextMode','quickLyricsView');
    bindSelect('aspect','quickFrame');
    bindSelect('letterCase','quickCase');
    bindSelect('fontWeight','quickWeight');
    bindSelect('textAlign','quickAlign');
    bindRange('lineHeight','quickLineHeight','quickLineHeightVal',v=>Number(v).toFixed(2));
    bindRange('letterSpacing','quickLetterSpacing','quickLetterSpacingVal',v=>`${Number(v).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}em`);
    bindColor();
    bindRange('yPos','quickY','quickYVal',v=>`${v}%`);
    bindRange('glow','quickGlow','quickGlowVal',v=>`${v}%`);
    bindRange('offset','quickOffset','quickOffsetVal',v=>`${Number(v)>0?'+':''}${v} ms`);
    bindToggle('showTitle','quickTitle');
    bindSelect('titleDuration','quickTitleDuration');
    bindSelect('quality','quickQuality');
    bindToggle('safeToggle','quickSafe');

    $('#quickResetLayout')?.addEventListener('click',resetLayout);
    $('#quickExport')?.addEventListener('click',()=>($('#exportBottomBtn')||$('#exportBtn'))?.click());

    document.addEventListener('change',e=>{
      if(['styleEffectSelect','lyricEffect'].includes(e.target?.id)||e.target?.closest?.('.effect-option'))setTimeout(syncAll,30);
    },true);
    document.addEventListener('click',e=>{if(e.target.closest?.('.effect-option[data-effect]'))setTimeout(syncAll,30)},true);

    const story=$('#story');
    if(story&&story.dataset.geometryLocked!=='true'){
      story.dataset.geometryLocked='true';
      for(const type of ['wheel','pointerdown','pointermove'])story.addEventListener(type,e=>{e.stopPropagation();e.stopImmediatePropagation()},{capture:true,passive:true});
    }

    window.linaQuickSettingsSync=syncAll;
    setTimeout(()=>{window.linaSyncTypography?.();syncAll();resetLayout()},30);
    return true;
  }

  function syncAll(){
    const qe=$('#quickEffect');if(qe)qe.value=currentEffect();
    const pairs=[['fontChoice','quickFont'],['contextMode','quickLyricsView'],['aspect','quickFrame'],['letterCase','quickCase'],['fontWeight','quickWeight'],['textAlign','quickAlign'],['titleDuration','quickTitleDuration'],['quality','quickQuality']];
    for(const [sourceId,quickId] of pairs){const source=$('#'+sourceId),quick=$('#'+quickId);if(source&&quick){if(sourceId==='fontChoice')copyOptions(source,quick);quick.value=source.value}}
    if($('#quickTitle')&&$('#showTitle'))$('#quickTitle').checked=$('#showTitle').checked;
    if($('#quickSafe')&&$('#safeToggle'))$('#quickSafe').checked=$('#safeToggle').checked;
  }

  function init(){let tries=0;const run=()=>{tries++;if(!build()&&tries<50)setTimeout(run,60)};run()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
