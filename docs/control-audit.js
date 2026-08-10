'use strict';
(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const S=window.linaConsolidatedState;
  const stamp=(el,source='control-audit')=>{if(el)el.dataset.linaBound=el.dataset.linaBound||source;return el};
  const redraw=()=>{try{window.invalidateLinaMotion?.(true);window.render?.((Number(document.querySelector('#audio')?.currentTime)||0)*1000)}catch(e){console.error('LINA redraw failed',e)}};
  const setStatus=t=>{const e=$('#topStatus');if(e)e.textContent=t};

  $$('.effect-option[data-effect]').forEach(btn=>{
    btn.onclick=()=>{
      const effect=btn.dataset.effect||'apple',input=$('#lyricEffect'),story=$('#story');
      if(input)input.value=effect;
      if(S)S.effect=effect;
      if(story)story.dataset.lyricEffect=effect;
      $$('.effect-option[data-effect]').forEach(x=>x.classList.toggle('active',x===btn));
      redraw();
      setStatus(`${btn.querySelector('b')?.textContent||'Lyric'} effect selected.`);
      try{markDirty?.()}catch{}
    };
    stamp(btn);
  });

  const fontMap={native:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif',condensed:'"Arial Narrow","Helvetica Neue",Arial,sans-serif',classic:'Georgia,"Times New Roman",serif',rounded:'ui-rounded,"SF Pro Rounded","Avenir Next",sans-serif'};
  const font=$('#studioFont');if(font){font.onchange=()=>{if(S)S.font=font.value;$('#lyrics').style.fontFamily=fontMap[font.value]||fontMap.native;redraw();try{markDirty?.()}catch{}};stamp(font)}
  const backdrop=$('#studioBackdrop');if(backdrop){backdrop.onchange=()=>{if(S)S.backdrop=backdrop.value;const l=$('#lyrics');l.classList.toggle('lyric-backdrop-soft',backdrop.value==='soft');l.classList.toggle('lyric-backdrop-solid',backdrop.value==='solid');try{markDirty?.()}catch{}};stamp(backdrop)}
  const scale=$('#studioScale');if(scale){scale.oninput=()=>{const v=Math.max(.45,Math.min(1.8,(+scale.value||100)/100));if(S)S.scale=v;$('#lyrics').style.setProperty('--lina-scale',v);if($('#studioScaleVal'))$('#studioScaleVal').textContent=Math.round(v*100)+'%';try{markDirty?.()}catch{}};stamp(scale)}
  const rotation=$('#studioRotation');if(rotation){rotation.oninput=()=>{const v=Math.max(-30,Math.min(30,+rotation.value||0));if(S)S.rot=v;$('#lyrics').style.setProperty('--lina-rotation',v+'deg');if($('#studioRotationVal'))$('#studioRotationVal').textContent=v.toFixed(1).replace('.0','')+'°';try{markDirty?.()}catch{}};stamp(rotation)}
  const centre=$('#centreLyrics');if(centre){centre.onclick=()=>{if(S){S.x=0;S.y=0}const l=$('#lyrics');l.style.setProperty('--lina-drag-x','0px');l.style.setProperty('--lina-drag-y','0px');try{markDirty?.()}catch{}};stamp(centre)}
  const reset=$('#resetLyricsTransform');if(reset){reset.onclick=()=>{if(S){S.x=0;S.y=0;S.scale=1;S.rot=0}const l=$('#lyrics');l.style.setProperty('--lina-drag-x','0px');l.style.setProperty('--lina-drag-y','0px');l.style.setProperty('--lina-scale','1');l.style.setProperty('--lina-rotation','0deg');if(scale){scale.value=100;scale.dispatchEvent(new Event('input'))}if(rotation){rotation.value=0;rotation.dispatchEvent(new Event('input'))}};stamp(reset)}
  const gradients={none:'transparent',sunset:'linear-gradient(155deg,#ff5f6d55,#ffc37118 48%,#6a11cb66)',ocean:'linear-gradient(155deg,#00c6ff55,#0072ff2d 48%,#07195277)',violet:'linear-gradient(155deg,#fc466b44,#3f5efb66)',mono:'linear-gradient(180deg,#00000012,#00000088)',warm:'linear-gradient(155deg,#7b493b33,#3a241f66 48%,#160d0b88)'};
  const gradient=$('#studioGradient');if(gradient){gradient.onchange=()=>{if(S)S.gradient=gradient.value;$('#story')?.style.setProperty('--lina-gradient',gradients[gradient.value]||'transparent');try{markDirty?.()}catch{}};stamp(gradient)}

  const art=$('#userArtworkFile');if(art){art.onchange=async()=>{const f=art.files?.[0];if(!f)return;const url=URL.createObjectURL(f),p=$('#userArtworkPreview'),i=$('#introArt');if(S)S.art=url;if(p){p.src=url;p.classList.add('on')}$('#artworkEmpty')?.classList.add('hidden');if(i){i.src=url;i.classList.toggle('on',$('#userArtworkIntro')?.checked!==false)}try{await saveMedia?.('artwork',f)}catch{}try{markDirty?.()}catch{}};stamp(art)}

  const direct=['saveProgressBtn','exportBtn','exportBottomBtn','resetBtn','applyPaste','prepareManual','hideFlagged','restoreAll','confirmReview','clearLyrics','applyGrouping','resetCrop','removeBg','play','earlier','setNow','later','previousLine','nextLine','applyLine','addLineAfter','duplicateLine','deleteLine','applyWords'];
  const marked=['stop','transportPrevLine','transportEdit','transportSync','transportNextLine','stampLine','prevStep','nextStep','centreLyrics','resetLyricsTransform'];
  const missing=[];
  for(const id of direct){const el=$('#'+id);if(!el)missing.push(`${id}:missing`);else if(typeof el.onclick!=='function')missing.push(`${id}:unbound`)}
  for(const id of marked){const el=$('#'+id);if(!el)missing.push(`${id}:missing`);else if(!el.dataset.linaBound&&typeof el.onclick!=='function')missing.push(`${id}:unbound`)}
  for(const btn of $$('.effect-option[data-effect]'))if(typeof btn.onclick!=='function')missing.push(`effect:${btn.dataset.effect}:unbound`);

  const report={checked:direct.length+marked.length+$$('.effect-option[data-effect]').length,missing,signatureEffects:$$('.effect-option[data-effect]').map(b=>b.dataset.effect),rendererActive:window.__linaStudio===1};
  if(!report.rendererActive)missing.push('signature-renderer:inactive');
  report.passed=report.checked-missing.length;
  window.linaControlAudit=report;
  document.documentElement.dataset.linaControls=missing.length?'failed':'passed';
  if(missing.length){console.error('LINA control audit failed',report);setStatus(`Control QA failed: ${missing.length} issue${missing.length===1?'':'s'}.`)}else console.info('LINA control audit passed',report);
})();
