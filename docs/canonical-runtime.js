'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const VALID_EFFECTS=new Set(['apple','charli','eternal']);
  const DEFAULTS={
    apple:{font:'apple-system',weight:'700',align:'left',lineHeight:'1.02',spacing:'-0.02',view:'5',color:'#ffffff',letterCase:'original',glow:'100'},
    charli:{font:'charli-condensed',weight:'900',align:'center',lineHeight:'0.84',spacing:'-0.055',view:'current',color:'#ffffff',letterCase:'original',glow:'100'},
    eternal:{font:'eternal-reenie',weight:'400',align:'left',lineHeight:'1.02',spacing:'0.005',view:'5',color:'#ffffff',letterCase:'original',glow:'100'}
  };
  const state={rendering:false,snapshotRestored:false,lastEffect:null,lastMs:0,resetCount:0};
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

  function studioState(){
    if(!window.linaConsolidatedState)window.linaConsolidatedState={effect:getEffect(),x:0,y:0,scale:1,rot:0};
    const s=window.linaConsolidatedState;
    if(!VALID_EFFECTS.has(s.effect))s.effect=getEffect();
    if(!Number.isFinite(Number(s.x)))s.x=0;
    if(!Number.isFinite(Number(s.y)))s.y=0;
    if(!Number.isFinite(Number(s.scale))||Number(s.scale)<=0)s.scale=1;
    if(!Number.isFinite(Number(s.rot)))s.rot=0;
    return s;
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
    const studio=studioState();
    studio.effect=value;
    const hidden=$('#lyricEffect');if(hidden&&hidden.value!==value)hidden.value=value;
    const story=$('#story');if(story)story.dataset.lyricEffect=value;
    const quick=$('#quickEffect');if(quick&&quick.value!==value)quick.value=value;
    const style=$('#styleEffectSelect');if(style&&style.value!==value)style.value=value;
    document.querySelectorAll('.effect-option[data-effect]').forEach(b=>b.classList.toggle('active',b.dataset.effect===value));
  }

  function applyTransformState(){
    const studio=studioState(),lyrics=$('#lyrics');
    if(!lyrics)return;
    lyrics.style.setProperty('--lina-drag-x',`${Number(studio.x)||0}px`);
    lyrics.style.setProperty('--lina-drag-y',`${Number(studio.y)||0}px`);
    lyrics.style.setProperty('--lina-scale',String(Number(studio.scale)||1));
    lyrics.style.setProperty('--lina-rotation',`${Number(studio.rot)||0}deg`);
    if($('#studioScale'))$('#studioScale').value=String(Math.round((Number(studio.scale)||1)*100));
    if($('#studioRotation'))$('#studioRotation').value=String(Number(studio.rot)||0);
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
  function copySelect(source,target){
    if(!source||!target)return;
    const value=source.value;
    target.replaceChildren(...[...source.options].map(o=>{const n=document.createElement('option');n.value=o.value;n.textContent=o.textContent;n.disabled=o.disabled;n.hidden=o.hidden;return n}));
    target.value=value;
  }

  function captureLayout(){
    const studio=studioState(),key=getEffect();
    return{
      key,size:$('#size')?.value,y:$('#yPos')?.value,view:$('#contextMode')?.value,
      font:$('#fontChoice')?.value,weight:$('#fontWeight')?.value,align:$('#textAlign')?.value,
      lineHeight:$('#lineHeight')?.value,spacing:$('#letterSpacing')?.value,color:$('#textColor')?.value,
      letterCase:$('#letterCase')?.value,glow:$('#glow')?.value,
      x:Number(studio.x)||0,yDrag:Number(studio.y)||0,scale:Number(studio.scale)||1,rot:Number(studio.rot)||0
    };
  }

  function syncLayoutMirrors(){
    const size=String($('#size')?.value||'52');
    if($('#sizeVal'))$('#sizeVal').textContent=size;
    const quickSize=$('#quickSize');
    if(quickSize?.options?.length){const values=[...quickSize.options].map(o=>Number(o.value)).filter(Number.isFinite),n=Number(size)||52,best=values.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a,values[0]??n);quickSize.value=String(best)}

    const font=$('#fontChoice'),quickFont=$('#quickFont');if(font&&quickFont){copySelect(font,quickFont);quickFont.value=font.value}
    const weight=$('#fontWeight')?.value;if(weight&&$('#quickWeight'))$('#quickWeight').value=weight;
    const letterCase=$('#letterCase')?.value;if(letterCase&&$('#quickCase'))$('#quickCase').value=letterCase;
    const color=$('#textColor')?.value||'#ffffff';if($('#quickTextColor'))$('#quickTextColor').value=color;
    const glow=String($('#glow')?.value||'100');if($('#glowVal'))$('#glowVal').textContent=`${glow}%`;if($('#quickGlow'))$('#quickGlow').value=glow;if($('#quickGlowVal'))$('#quickGlowVal').textContent=`${glow}%`;

    const y=String($('#yPos')?.value||'50');if($('#quickY'))$('#quickY').value=y;if($('#quickYVal'))$('#quickYVal').textContent=`${y}%`;
    const view=$('#contextMode')?.value;if(view&&$('#quickLyricsView'))$('#quickLyricsView').value=view;
    const align=$('#textAlign')?.value;if(align&&$('#quickAlign'))$('#quickAlign').value=align;
    const lh=String($('#lineHeight')?.value||'1.02');if($('#lineHeightVal'))$('#lineHeightVal').textContent=Number(lh).toFixed(2);if($('#quickLineHeight'))$('#quickLineHeight').value=lh;if($('#quickLineHeightVal'))$('#quickLineHeightVal').textContent=Number(lh).toFixed(2);
    const spacing=String($('#letterSpacing')?.value||'0');const spacingText=`${Number(spacing).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}em`;if($('#letterSpacingVal'))$('#letterSpacingVal').textContent=spacingText;if($('#quickLetterSpacing'))$('#quickLetterSpacing').value=spacing;if($('#quickLetterSpacingVal'))$('#quickLetterSpacingVal').textContent=spacingText;
  }

  function applyLayoutValues(values,{dirty=false,redraw=true}={}){
    const key=VALID_EFFECTS.has(values.key)?values.key:getEffect(),d=DEFAULTS[key],studio=studioState();
    const resolved={
      size:String(values.size??safeSize(key)),y:String(values.y??'50'),view:String(values.view??d.view),
      font:String(values.font??d.font),weight:String(values.weight??d.weight),align:String(values.align??d.align),
      lineHeight:String(values.lineHeight??d.lineHeight),spacing:String(values.spacing??d.spacing),color:String(values.color??d.color),
      letterCase:String(values.letterCase??d.letterCase),glow:String(values.glow??d.glow),
      x:Number(values.x)||0,yDrag:Number(values.yDrag)||0,scale:Number(values.scale)||1,rot:Number(values.rot)||0
    };

    studio.effect=key;studio.x=resolved.x;studio.y=resolved.yDrag;studio.scale=resolved.scale;studio.rot=resolved.rot;
    setControl('studioScale',Math.round(resolved.scale*100));setControl('studioRotation',resolved.rot);
    setControl('size',resolved.size);setControl('yPos',resolved.y);setControl('contextMode',resolved.view);
    setControl('fontChoice',resolved.font);setControl('fontWeight',resolved.weight);setControl('textAlign',resolved.align);
    setControl('lineHeight',resolved.lineHeight);setControl('letterSpacing',resolved.spacing);setControl('textColor',resolved.color);
    setControl('letterCase',resolved.letterCase);setControl('glow',resolved.glow);

    const typography=window.linaTypographyState?.[key];
    if(typography){typography.font=resolved.font;typography.weight=resolved.weight;typography.align=resolved.align;typography.lineHeight=resolved.lineHeight;typography.spacing=resolved.spacing}

    const root=document.documentElement,lyrics=$('#lyrics');
    root.style.setProperty('--lyric-weight',resolved.weight);
    root.style.setProperty('--lyric-lh',resolved.lineHeight);
    root.style.setProperty('--accent',resolved.color);
    if(lyrics){
      lyrics.style.fontSize=`${resolved.size}px`;
      lyrics.style.top=`${resolved.y}%`;
      lyrics.style.textAlign=resolved.align;
      lyrics.style.fontWeight=resolved.weight;
      lyrics.style.lineHeight=resolved.lineHeight;
      lyrics.style.letterSpacing=`${resolved.spacing}em`;
      lyrics.style.textTransform=resolved.letterCase==='upper'?'uppercase':resolved.letterCase==='lower'?'lowercase':'none';
      lyrics.style.setProperty('--lina-drag-x',`${resolved.x}px`);
      lyrics.style.setProperty('--lina-drag-y',`${resolved.yDrag}px`);
      lyrics.style.setProperty('--lina-scale',String(resolved.scale));
      lyrics.style.setProperty('--lina-rotation',`${resolved.rot}deg`);
      lyrics.classList.remove('lyric-backdrop-soft','lyric-backdrop-solid');
    }

    try{window.linaSyncTypography?.()}catch{}
    try{window.linaCanonicalControls?.applyCase?.(false)}catch{}
    applyTransformState();syncLayoutMirrors();
    try{window.invalidateLinaMotion?.(true)}catch{}
    try{window.linaQuickSettingsSync?.()}catch{}
    syncLayoutMirrors();
    if(redraw)render((Number($('#audio')?.currentTime)||0)*1000);
    if(dirty)try{markDirty?.()}catch{}
    return resolved;
  }

  function resetLayout(){
    const key=getEffect(),d=DEFAULTS[key],values={
      key,size:safeSize(key),y:'50',view:d.view,font:d.font,weight:d.weight,align:d.align,
      lineHeight:d.lineHeight,spacing:d.spacing,color:d.color,letterCase:d.letterCase,glow:d.glow,
      x:0,yDrag:0,scale:1,rot:0
    };
    const apply=()=>applyLayoutValues(values,{dirty:false,redraw:true});
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply,80);
    setTimeout(apply,220);
    state.resetCount+=1;
    document.documentElement.dataset.lastLyricReset=String(state.resetCount);
    try{markDirty?.()}catch{}
    try{status?.(`${key==='charli'?'Charli xcx · Apple':key==='eternal'?'Eternal Sunshine':'Apple Music'} lyric styling and layout reset.`)}catch{}
    return values;
  }

  const initialLayout=captureLayout();

  function markDelegatedControl(id,{reset=false}={}){
    const el=$('#'+id);if(!el)return false;
    el.dataset.linaOwner='canonical';
    if(reset)el.dataset.linaReset='canonical';
    return true;
  }

  function ownEffectPicker(){
    const picker=document.querySelector('.effect-picker');if(!picker||picker.dataset.linaOwner==='canonical')return false;
    picker.dataset.linaOwner='canonical';picker.addEventListener('click',e=>{const button=e.target.closest?.('.effect-option[data-effect]');if(!button)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setEffect(button.dataset.effect)},true);return true;
  }

  function restoreInitialLayout(){applyLayoutValues(initialLayout,{dirty:false,redraw:true})}

  function installControlOwnership(){
    markDelegatedControl('quickEffect');
    markDelegatedControl('styleEffectSelect');
    markDelegatedControl('quickResetLayout',{reset:true});
    ownEffectPicker();
    if($('#previewQuickControls')&&!state.snapshotRestored){state.snapshotRestored=true;requestAnimationFrame(restoreInitialLayout)}
    syncEffectUI(getEffect());
  }

  const observer=new MutationObserver(()=>installControlOwnership());observer.observe(document.documentElement,{subtree:true,childList:true});
  let tries=0;const ownershipTimer=setInterval(()=>{tries++;installControlOwnership();if(tries>100&&$('#quickResetLayout')&&$('#styleEffectSelect')){clearInterval(ownershipTimer);observer.disconnect()}},60);

  studioState();
  window.render=render;
  window.linaRuntime={
    version:'canonical-v2-hard-reset',render,setEffect,getEffect,resetLayout,selectedContext,contextForValue,ensureBackground,applyLayoutValues,captureLayout,state,defaults:DEFAULTS,
    selfTest(){const modes=['current','3','5','7','9'].map(contextForValue);return{renderOwner:document.documentElement.dataset.renderOwner,effect:getEffect(),appleBase:typeof appleRender==='function',charliBase:typeof effectRender==='function',appleEnhancer:!!window.linaAppleLetterHighlight,eternalEnhancer:!!window.linaEternalSunshine,contextModes:modes.map(x=>x.total),resetOwner:$('#quickResetLayout')?.dataset.linaOwner||'pending',resetCount:state.resetCount}}
  };
  window.linaResetLyricLayout=resetLayout;
  document.documentElement.dataset.renderOwner='canonical-v1';document.documentElement.dataset.effectOwner='canonical-v1';document.documentElement.dataset.layoutOwner='canonical-v2-hard-reset';
  syncEffectUI(getEffect());requestAnimationFrame(()=>render((Number($('#audio')?.currentTime)||0)*1000));
})();