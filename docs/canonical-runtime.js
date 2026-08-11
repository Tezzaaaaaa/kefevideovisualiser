'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const VALID_EFFECTS=new Set(['apple','charli','eternal']);
  const DEFAULTS={
    apple:{align:'left',lineHeight:'1.02',spacing:'-0.02',view:'5'},
    charli:{align:'center',lineHeight:'0.84',spacing:'-0.055',view:'current'},
    eternal:{align:'left',lineHeight:'1.02',spacing:'0.005',view:'5'}
  };
  const state={rendering:false,snapshotRestored:false,lastEffect:null,lastMs:0};
  const appleRender=window.linaAppleBaseRender||window.render;
  const effectRender=window.linaEffectBaseRender||window.render;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

  function getEffect(){
    const studio=window.linaConsolidatedState?.effect;
    const hidden=$('#lyricEffect')?.value;
    const story=$('#story')?.dataset.lyricEffect;
    const quick=$('#quickEffect')?.value;
    const style=$('#styleEffectSelect')?.value;
    for(const value of [hidden,studio,story,quick,style])if(VALID_EFFECTS.has(value))return value;
    return 'apple';
  }

  function contextForValue(value){
    if(value==='current')return{before:0,after:0,total:1,value:'current'};
    const total=clamp(Number(value)||3,1,9);
    const before=Math.floor((total-1)/2);
    return{before,after:total-1-before,total,value:String(total)};
  }
  function selectedContext(){return contextForValue($('#contextMode')?.value||'3')}

  function safeSize(key=getEffect()){
    const aspect=$('#aspect')?.value||'16:9';
    if(aspect==='9:16')return key==='charli'?'48':key==='eternal'?'42':'44';
    if(aspect==='4:5')return key==='charli'?'42':key==='eternal'?'36':'38';
    if(aspect==='1:1')return key==='charli'?'38':key==='eternal'?'34':'36';
    return key==='charli'?'34':key==='eternal'?'30':'32';
  }

  function syncEffectUI(value){
    const studio=window.linaConsolidatedState;
    if(studio)studio.effect=value;
    const hidden=$('#lyricEffect');if(hidden&&hidden.value!==value)hidden.value=value;
    const story=$('#story');if(story)story.dataset.lyricEffect=value;
    const quick=$('#quickEffect');if(quick&&quick.value!==value)quick.value=value;
    const style=$('#styleEffectSelect');if(style&&style.value!==value)style.value=value;
    document.querySelectorAll('.effect-option[data-effect]').forEach(b=>b.classList.toggle('active',b.dataset.effect===value));
  }

  function applyTransformState(){
    const studio=window.linaConsolidatedState;
    const lyrics=$('#lyrics');
    if(!studio||!lyrics)return;
    lyrics.style.setProperty('--lina-drag-x',`${Number(studio.x)||0}px`);
    lyrics.style.setProperty('--lina-drag-y',`${Number(studio.y)||0}px`);
    lyrics.style.setProperty('--lina-scale',String(Number(studio.scale)||1));
    lyrics.style.setProperty('--lina-rotation',`${Number(studio.rot)||0}deg`);
    if($('#studioScaleVal'))$('#studioScaleVal').textContent=`${Math.round((Number(studio.scale)||1)*100)}%`;
    if($('#studioRotationVal'))$('#studioRotationVal').textContent=`${Number(studio.rot||0).toFixed(1).replace('.0','')}°`;
  }

  function ensureBackground(){
    try{
      const wantsArtwork=!!$('#useArtworkBg')?.checked||!!$('#useArtworkBg2')?.checked;
      const attached=typeof bgMedia!=='undefined'&&!!bgMedia&&typeof bg!=='undefined'&&bg?.contains(bgMedia);
      if(!attached){
        if(typeof manualBgFile!=='undefined'&&manualBgFile){
          if(typeof bgURL!=='undefined'&&bgURL?.startsWith?.('blob:'))try{URL.revokeObjectURL(bgURL)}catch{}
          bgURL=URL.createObjectURL(manualBgFile);
          setBgSource(bgURL,manualBgFile.name||'Background',manualBgFile.type?.startsWith('video')?'video':'image');
        }else if(wantsArtwork&&typeof artworkObjectURL!=='undefined'&&artworkObjectURL){
          setBgSource(artworkObjectURL,'Selected artwork','image');
        }
      }
      if(typeof bg!=='undefined'&&bg){bg.style.visibility='visible';bg.style.opacity='1';bg.style.display='block'}
      if(typeof bgMedia!=='undefined'&&bgMedia){bgMedia.style.visibility='visible';bgMedia.style.opacity='1';bgMedia.style.display='block'}
    }catch{}
  }

  function handoff(ms){
    if(typeof lines==='undefined'||!Array.isArray(lines)||!lines.length)return;
    const title=$('#titleCard'),lyrics=$('#lyrics');if(!lyrics)return;
    let active=false;try{active=ms>=entranceMs()}catch{}
    if(active){
      if(title){title.classList.remove('on');title.hidden=true;title.style.setProperty('display','none','important');title.setAttribute('aria-hidden','true')}
      lyrics.classList.add('visible');lyrics.classList.remove('preenter');lyrics.style.setProperty('visibility','visible');lyrics.style.setProperty('z-index','4');
    }else if(title){
      title.hidden=false;title.removeAttribute('aria-hidden');title.style.removeProperty('display');lyrics.style.removeProperty('visibility');lyrics.style.removeProperty('z-index');
    }
  }

  function enforceAppleContext(ms){
    if(typeof lines==='undefined'||!Array.isArray(lines)||!lines.length)return;
    const cw=selectedContext();let active=0;try{active=clamp(ci(ms),0,lines.length-1)}catch{}
    const lo=Math.max(0,active-cw.before),hi=Math.min(lines.length-1,active+cw.after);
    document.querySelectorAll('#lyrics .apple-line').forEach((el,domIndex)=>{const parsed=Number(el.dataset.line),lineIndex=Number.isFinite(parsed)?parsed:domIndex;el.style.visibility=lineIndex>=lo&&lineIndex<=hi?'visible':'hidden'});
    const meta=$('#activeMeta');if(meta)meta.textContent=`Lyric ${active+1} of ${lines.length} · ${cw.total===1?'current only':`${cw.total} on screen`}`;
  }

  function wordMarkup(line){
    const list=typeof units==='function'?units(line):[];
    if(!list.length)return esc(line?.text||'');
    return list.map((w,i)=>`<span class="apple-word" data-w="${i}">${esc(w.text)}</span>`).join(' ');
  }

  function fallback(ms,error,key){
    console.error('LINA canonical renderer fallback',error);
    const lyrics=$('#lyrics');if(!lyrics)return;
    if(typeof lines==='undefined'||!Array.isArray(lines)||!lines.length){lyrics.textContent='Add lyrics to begin';return}
    try{if(ms<entranceMs()){lyrics.textContent='';return}}catch{}
    let i=0;try{i=clamp(ci(ms),0,lines.length-1)}catch{}
    if(key==='charli'){lyrics.innerHTML=`<div class="charli-frame"><div class="charli-card charli-dark">${esc(lines[i]?.text||'')}</div></div>`;return}
    const cw=selectedContext(),parts=[];
    for(let n=Math.max(0,i-cw.before);n<=Math.min(lines.length-1,i+cw.after);n++)parts.push(`<div class="apple-line ${n===i?'apple-current':'apple-neighbour'}" data-line="${n}" style="visibility:visible">${wordMarkup(lines[n])}</div>`);
    lyrics.innerHTML=`<div class="apple-flow">${parts.join('')}</div>`;
  }

  function cleanupEnhancers(key){
    try{if(key!=='apple')window.linaAppleLetterHighlight?.restore?.()}catch{}
    try{if(key!=='eternal')window.linaEternalSunshine?.restore?.()}catch{}
  }

  function render(ms=0){
    ms=Math.max(0,Number(ms)||0);state.lastMs=ms;if(state.rendering)return;state.rendering=true;
    const key=getEffect();
    try{
      syncEffectUI(key);cleanupEnhancers(key);
      const base=key==='charli'?effectRender:appleRender;if(typeof base!=='function')throw new Error('No base lyric renderer is available');
      base(ms);applyTransformState();handoff(ms);ensureBackground();
      if(key==='apple'){
        enforceAppleContext(ms);window.linaAppleLetterHighlight?.apply?.(ms);
      }else if(key==='eternal'){
        window.linaEternalSunshine?.apply?.(ms);
        const meta=$('#activeMeta');if(meta&&Array.isArray(lines)&&lines.length){let i=0;try{i=clamp(ci(ms),0,lines.length-1)}catch{}const count=selectedContext().total;meta.textContent=`Eternal Sunshine · Lyric ${i+1} of ${lines.length} · ${count===1?'current only':`${count} on screen`}`}
      }
      state.lastEffect=key;return true;
    }catch(error){
      fallback(ms,error,key);handoff(ms);ensureBackground();try{if(key==='apple')window.linaAppleLetterHighlight?.apply?.(ms);else if(key==='eternal')window.linaEternalSunshine?.apply?.(ms)}catch{}return false;
    }finally{state.rendering=false}
  }

  function setEffect(value,{redraw=true,dirty=true}={}){
    if(!VALID_EFFECTS.has(value))value='apple';syncEffectUI(value);
    try{window.invalidateLinaMotion?.(true)}catch{}try{window.linaSyncTypography?.()}catch{}try{window.linaQuickSettingsSync?.()}catch{}
    if(value==='eternal')document.fonts?.load?.('32px "Reenie Beanie"').catch(()=>{});
    if(redraw)requestAnimationFrame(()=>render((Number($('#audio')?.currentTime)||0)*1000));
    if(dirty)try{markDirty?.()}catch{}return value;
  }

  function setControl(id,value){const el=$('#'+id);if(el)el.value=String(value)}

  function captureLayout(){
    const studio=window.linaConsolidatedState||{},key=getEffect();
    return{key,size:$('#size')?.value,y:$('#yPos')?.value,view:$('#contextMode')?.value,align:$('#textAlign')?.value,lineHeight:$('#lineHeight')?.value,spacing:$('#letterSpacing')?.value,x:Number(studio.x)||0,yDrag:Number(studio.y)||0,scale:Number(studio.scale)||1,rot:Number(studio.rot)||0};
  }

  function syncLayoutMirrors(){
    const size=String($('#size')?.value||'52');
    if($('#sizeVal'))$('#sizeVal').textContent=size;
    const quickSize=$('#quickSize');
    if(quickSize?.options?.length){const values=[...quickSize.options].map(o=>Number(o.value)).filter(Number.isFinite),n=Number(size)||52,best=values.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a,values[0]??n);quickSize.value=String(best)}
    const y=String($('#yPos')?.value||'50');if($('#quickY'))$('#quickY').value=y;if($('#quickYVal'))$('#quickYVal').textContent=`${y}%`;
    const view=$('#contextMode')?.value;if(view&&$('#quickLyricsView'))$('#quickLyricsView').value=view;
    const align=$('#textAlign')?.value;if(align&&$('#quickAlign'))$('#quickAlign').value=align;
    const lh=String($('#lineHeight')?.value||'1.02');if($('#lineHeightVal'))$('#lineHeightVal').textContent=Number(lh).toFixed(2);if($('#quickLineHeight'))$('#quickLineHeight').value=lh;if($('#quickLineHeightVal'))$('#quickLineHeightVal').textContent=Number(lh).toFixed(2);
    const spacing=String($('#letterSpacing')?.value||'0');const spacingText=`${Number(spacing).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}em`;if($('#letterSpacingVal'))$('#letterSpacingVal').textContent=spacingText;if($('#quickLetterSpacing'))$('#quickLetterSpacing').value=spacing;if($('#quickLetterSpacingVal'))$('#quickLetterSpacingVal').textContent=spacingText;
  }

  function applyLayoutValues(values,{dirty=false,redraw=true}={}){
    const key=VALID_EFFECTS.has(values.key)?values.key:getEffect(),studio=window.linaConsolidatedState;
    if(studio){studio.x=Number(values.x)||0;studio.y=Number(values.yDrag)||0;studio.scale=Number(values.scale)||1;studio.rot=Number(values.rot)||0}
    setControl('studioScale',Math.round((Number(values.scale)||1)*100));setControl('studioRotation',Number(values.rot)||0);
    setControl('size',values.size??safeSize(key));setControl('yPos',values.y??'50');setControl('contextMode',values.view??DEFAULTS[key].view);setControl('textAlign',values.align??DEFAULTS[key].align);setControl('lineHeight',values.lineHeight??DEFAULTS[key].lineHeight);setControl('letterSpacing',values.spacing??DEFAULTS[key].spacing);

    const typography=window.linaTypographyState?.[key];
    if(typography){typography.align=String(values.align??DEFAULTS[key].align);typography.lineHeight=String(values.lineHeight??DEFAULTS[key].lineHeight);typography.spacing=String(values.spacing??DEFAULTS[key].spacing)}

    const lyrics=$('#lyrics');
    if(lyrics){lyrics.style.fontSize=`${values.size??safeSize(key)}px`;lyrics.style.top=`${values.y??50}%`;lyrics.style.textAlign=String(values.align??DEFAULTS[key].align);lyrics.style.lineHeight=String(values.lineHeight??DEFAULTS[key].lineHeight);lyrics.style.letterSpacing=`${values.spacing??DEFAULTS[key].spacing}em`}
    applyTransformState();syncLayoutMirrors();
    try{window.linaSyncTypography?.()}catch{}try{window.linaQuickSettingsSync?.()}catch{}try{window.invalidateLinaMotion?.(true)}catch{}
    syncLayoutMirrors();
    if(redraw)requestAnimationFrame(()=>render((Number($('#audio')?.currentTime)||0)*1000));
    if(dirty)try{markDirty?.()}catch{}
  }

  function resetLayout(){
    const key=getEffect(),d=DEFAULTS[key];
    applyLayoutValues({key,size:safeSize(key),y:'50',view:d.view,align:d.align,lineHeight:d.lineHeight,spacing:d.spacing,x:0,yDrag:0,scale:1,rot:0},{dirty:true,redraw:true});
    try{status?.('Lyric layout reset.')}catch{}
  }

  const initialLayout=captureLayout();

  function replaceSelect(id,handler){
    const old=$('#'+id);if(!old||old.dataset.linaOwner==='canonical')return false;
    const clone=old.cloneNode(true);clone.value=old.value;clone.dataset.linaOwner='canonical';old.replaceWith(clone);clone.addEventListener('change',()=>handler(clone.value));return true;
  }

  function ownResetButton(){
    const old=$('#quickResetLayout');if(!old||old.dataset.linaOwner==='canonical')return false;
    const button=old.cloneNode(true);button.dataset.linaOwner='canonical';button.dataset.linaReset='canonical';old.replaceWith(button);button.addEventListener('click',resetLayout);return true;
  }

  function ownEffectPicker(){
    const picker=document.querySelector('.effect-picker');if(!picker||picker.dataset.linaOwner==='canonical')return false;
    picker.dataset.linaOwner='canonical';picker.addEventListener('click',e=>{const button=e.target.closest?.('.effect-option[data-effect]');if(!button)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setEffect(button.dataset.effect)},true);return true;
  }

  function restoreInitialLayout(){applyLayoutValues(initialLayout,{dirty:false,redraw:true})}

  function installControlOwnership(){
    replaceSelect('quickEffect',value=>setEffect(value));replaceSelect('styleEffectSelect',value=>setEffect(value));ownResetButton();ownEffectPicker();
    if($('#previewQuickControls')&&!state.snapshotRestored){state.snapshotRestored=true;requestAnimationFrame(restoreInitialLayout);setTimeout(restoreInitialLayout,90)}
    syncEffectUI(getEffect());
  }

  const observer=new MutationObserver(()=>installControlOwnership());observer.observe(document.documentElement,{subtree:true,childList:true});
  let tries=0;const ownershipTimer=setInterval(()=>{tries++;installControlOwnership();if(tries>100&&$('#quickResetLayout')&&$('#styleEffectSelect')){clearInterval(ownershipTimer);observer.disconnect()}},60);

  window.render=render;
  window.linaRuntime={
    version:'canonical-v1',render,setEffect,getEffect,resetLayout,selectedContext,contextForValue,ensureBackground,applyLayoutValues,captureLayout,state,
    selfTest(){const modes=['current','3','5','7','9'].map(contextForValue);return{renderOwner:document.documentElement.dataset.renderOwner,effect:getEffect(),appleBase:typeof appleRender==='function',charliBase:typeof effectRender==='function',appleEnhancer:!!window.linaAppleLetterHighlight,eternalEnhancer:!!window.linaEternalSunshine,contextModes:modes.map(x=>x.total),resetOwner:$('#quickResetLayout')?.dataset.linaOwner||'pending'}}
  };
  window.linaResetLyricLayout=resetLayout;
  document.documentElement.dataset.renderOwner='canonical-v1';document.documentElement.dataset.effectOwner='canonical-v1';document.documentElement.dataset.layoutOwner='canonical-v1';
  syncEffectUI(getEffect());requestAnimationFrame(()=>render((Number($('#audio')?.currentTime)||0)*1000));
})();
