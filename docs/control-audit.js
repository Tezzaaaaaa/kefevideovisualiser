'use strict';
(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const S=window.linaConsolidatedState;
  const stamp=(el,source='control-audit')=>{if(el)el.dataset.linaBound=el.dataset.linaBound||source;return el};
  const redraw=()=>{try{window.invalidateLinaMotion?.(true);window.render?.((Number(document.querySelector('#audio')?.currentTime)||0)*1000)}catch(e){console.error('LINA redraw failed',e)}};
  const setStatus=t=>{const e=$('#topStatus');if(e)e.textContent=t};
  const dirty=()=>{try{markDirty?.()}catch{}};

  // Remove fake word buttons: they were labels styled as buttons but had no action.
  if(typeof window.renderWordEditor==='function'){
    window.renderWordEditor=function(line){
      const box=$('#wordEditor');if(!box)return;
      box.innerHTML=units(line).map((w,i)=>`<div class="word-row" data-w="${i}"><span class="word-label">${esc(w.text)}</span><input class="emph" aria-label="${esc(w.text)} emphasis" type="number" min="0.7" max="2" step="0.1" value="${w.emphasis||1}"><input class="hold" aria-label="${esc(w.text)} hold" type="number" min="0.25" max="4" step="0.25" value="${w.hold||1}"></div>`).join('');
    };
    const style=document.createElement('style');style.textContent='.word-row .word-label{border:1px solid var(--border);background:#0d0d10;border-radius:9px;padding:8px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';document.head.append(style);
  }

  // Signature effects are hard-bound after the full renderer exists.
  const effectButtons=$$('.effect-option[data-effect]');
  effectButtons.forEach(btn=>{
    btn.onclick=()=>{
      const effect=btn.dataset.effect||'apple',input=$('#lyricEffect'),story=$('#story');
      if(input)input.value=effect;
      if(S)S.effect=effect;
      if(story)story.dataset.lyricEffect=effect;
      effectButtons.forEach(x=>x.classList.toggle('active',x===btn));
      redraw();
      setStatus(`${btn.querySelector('b')?.textContent||'Lyric'} effect selected.`);
      dirty();
    };
    stamp(btn);
  });

  const fontMap={native:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif',condensed:'"Arial Narrow","Helvetica Neue",Arial,sans-serif',classic:'Georgia,"Times New Roman",serif',rounded:'ui-rounded,"SF Pro Rounded","Avenir Next",sans-serif'};
  const font=$('#studioFont');if(font){font.onchange=()=>{if(S)S.font=font.value;$('#lyrics').style.fontFamily=fontMap[font.value]||fontMap.native;redraw();dirty()};stamp(font)}
  const backdrop=$('#studioBackdrop');if(backdrop){backdrop.onchange=()=>{if(S)S.backdrop=backdrop.value;const l=$('#lyrics');l.classList.toggle('lyric-backdrop-soft',backdrop.value==='soft');l.classList.toggle('lyric-backdrop-solid',backdrop.value==='solid');dirty()};stamp(backdrop)}
  const scale=$('#studioScale');if(scale){scale.oninput=()=>{const v=Math.max(.45,Math.min(1.8,(+scale.value||100)/100));if(S)S.scale=v;$('#lyrics').style.setProperty('--lina-scale',v);if($('#studioScaleVal'))$('#studioScaleVal').textContent=Math.round(v*100)+'%';dirty()};stamp(scale)}
  const rotation=$('#studioRotation');if(rotation){rotation.oninput=()=>{const v=Math.max(-30,Math.min(30,+rotation.value||0));if(S)S.rot=v;$('#lyrics').style.setProperty('--lina-rotation',v+'deg');if($('#studioRotationVal'))$('#studioRotationVal').textContent=v.toFixed(1).replace('.0','')+'°';dirty()};stamp(rotation)}
  const centre=$('#centreLyrics');if(centre){centre.onclick=()=>{if(S){S.x=0;S.y=0}const l=$('#lyrics');l.style.setProperty('--lina-drag-x','0px');l.style.setProperty('--lina-drag-y','0px');dirty()};stamp(centre)}
  const reset=$('#resetLyricsTransform');if(reset){reset.onclick=()=>{if(S){S.x=0;S.y=0;S.scale=1;S.rot=0}const l=$('#lyrics');l.style.setProperty('--lina-drag-x','0px');l.style.setProperty('--lina-drag-y','0px');l.style.setProperty('--lina-scale','1');l.style.setProperty('--lina-rotation','0deg');if(scale){scale.value=100;scale.dispatchEvent(new Event('input'))}if(rotation){rotation.value=0;rotation.dispatchEvent(new Event('input'))}};stamp(reset)}
  const gradients={none:'transparent',sunset:'linear-gradient(155deg,#ff5f6d55,#ffc37118 48%,#6a11cb66)',ocean:'linear-gradient(155deg,#00c6ff55,#0072ff2d 48%,#07195277)',violet:'linear-gradient(155deg,#fc466b44,#3f5efb66)',mono:'linear-gradient(180deg,#00000012,#00000088)',warm:'linear-gradient(155deg,#7b493b33,#3a241f66 48%,#160d0b88)'};
  const gradient=$('#studioGradient');if(gradient){gradient.onchange=()=>{if(S)S.gradient=gradient.value;$('#story')?.style.setProperty('--lina-gradient',gradients[gradient.value]||'transparent');dirty()};stamp(gradient)}

  const art=$('#userArtworkFile');if(art){art.onchange=async()=>{const f=art.files?.[0];if(!f)return;const url=URL.createObjectURL(f),p=$('#userArtworkPreview'),i=$('#introArt');if(S)S.art=url;if(p){p.src=url;p.classList.add('on')}$('#artworkEmpty')?.classList.add('hidden');if(i){i.src=url;i.classList.toggle('on',$('#userArtworkIntro')?.checked!==false)}try{await saveMedia?.('artwork',f)}catch{}dirty()};stamp(art)}

  // Explicit fallbacks for controls that were previously bound only through layered listeners.
  const liveLook=['size','yPos','glow','textColor','textAlign','fontWeight','lineHeight','letterSpacing'];
  liveLook.forEach(id=>{const el=$('#'+id);if(!el)return;const ev=el.tagName==='SELECT'||el.type==='color'?'onchange':'oninput';el[ev]=()=>{try{look()}catch{}dirty()};stamp(el)});
  const off=$('#offset');if(off){off.oninput=()=>{try{offset=+off.value;look()}catch{}dirty()};stamp(off)}
  const context=$('#contextMode');if(context){context.onchange=()=>{redraw();dirty()};stamp(context)}
  const entrance=$('#lyricsEntrance');if(entrance){entrance.onchange=()=>{redraw();dirty()};stamp(entrance)}
  ['titleInput','artistInput','customEntrance'].forEach(id=>{const el=$('#'+id);if(el){el.oninput=()=>{redraw();dirty()};stamp(el)}});
  ['showTitle','showArtworkIntro'].forEach(id=>{const el=$('#'+id);if(el){el.onchange=()=>{redraw();dirty()};stamp(el)}});
  const bgControls=['cropX','cropY','cropZoom','bgFit','dim','blur','videoMode','videoStart','videoEnd'];
  bgControls.forEach(id=>{const el=$('#'+id);if(!el)return;const ev=el.tagName==='SELECT'?'onchange':'oninput';el[ev]=()=>{try{bgStyle()}catch{}dirty()};stamp(el)});
  ['aspect','quality'].forEach(id=>{const el=$('#'+id);if(el){el.onchange=()=>{try{aspect()}catch{}dirty()};stamp(el)}});
  const safe=$('#safeToggle');if(safe){safe.onchange=()=>$('#safe')?.classList.toggle('on',safe.checked);stamp(safe)}

  const direct=['saveProgressBtn','exportBtn','exportBottomBtn','resetBtn','cancel','applyPaste','prepareManual','hideFlagged','restoreAll','confirmReview','clearLyrics','applyGrouping','resetCrop','removeBg','play','earlier','setNow','later','previousLine','nextLine','applyLine','addLineAfter','duplicateLine','deleteLine','applyWords'];
  const marked=['stop','transportPrevLine','transportEdit','transportSync','transportNextLine','stampLine','prevStep','nextStep','centreLyrics','resetLyricsTransform'];
  const delegated=['reviewList','timeline'];
  const requiredEffects=['apple','charli','eternal'];
  const missing=[];
  for(const id of direct){const el=$('#'+id);if(!el)missing.push(`${id}:missing`);else if(typeof el.onclick!=='function')missing.push(`${id}:unbound`)}
  for(const id of marked){const el=$('#'+id);if(!el)missing.push(`${id}:missing`);else if(!el.dataset.linaBound&&typeof el.onclick!=='function')missing.push(`${id}:unbound`)}
  for(const id of delegated){const el=$('#'+id);if(!el)missing.push(`${id}:missing`);else if(typeof el.onclick!=='function')missing.push(`${id}:delegation-unbound`)}
  const actualEffects=effectButtons.map(b=>b.dataset.effect);
  for(const name of requiredEffects){const btn=effectButtons.find(b=>b.dataset.effect===name);if(!btn)missing.push(`effect:${name}:missing`);else if(typeof btn.onclick!=='function')missing.push(`effect:${name}:unbound`)}

  const checked=direct.length+marked.length+delegated.length+requiredEffects.length;
  const report={checked,missing,signatureEffects:actualEffects,rendererActive:window.__linaStudio===1};
  if(!report.rendererActive)missing.push('signature-renderer:inactive');
  report.passed=Math.max(0,checked-missing.length);
  window.linaControlAudit=report;
  document.documentElement.dataset.linaControls=missing.length?'failed':'passed';
  if(missing.length){console.error('LINA control audit failed',report);setStatus(`Control QA failed: ${missing.length} issue${missing.length===1?'':'s'}.`)}else console.info('LINA control audit passed',report);
})();
