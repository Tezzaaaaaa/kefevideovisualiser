'use strict';
(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const S=window.linaConsolidatedState;
  const stamp=(el,source='control-audit')=>{if(el)el.dataset.linaBound=el.dataset.linaBound||source;return el};
  const redraw=()=>{try{window.invalidateLinaMotion?.(true);window.render?.((Number(document.querySelector('#audio')?.currentTime)||0)*1000)}catch(e){console.error('LINA redraw failed',e)}};
  const setStatus=t=>{const e=$('#topStatus');if(e)e.textContent=t};
  const dirty=()=>{try{markDirty?.()}catch{}};
  const caseText=t=>window.linaCaseText?window.linaCaseText(t):String(t??'');
  const clamp2=(n,a,b)=>Math.max(a,Math.min(b,n));

  // Bring the useful intro controls out of the retired search panel.
  const trackFields=$('.consolidated-track .track-fields');
  const showTitleRow=$('#showTitle')?.closest('.toggle'),titleDurationRow=$('#titleDuration')?.closest('.field');
  if(trackFields&&showTitleRow&&!trackFields.contains(showTitleRow))trackFields.append(showTitleRow);
  if(trackFields&&titleDurationRow&&!trackFields.contains(titleDurationRow))trackFields.append(titleDurationRow);
  const artworkSection=$('#useArtworkBg2')?.closest('.subsection');
  if(artworkSection){const h=artworkSection.querySelector('.subhead');if(h)h.innerHTML='<b>Artwork backdrop</b><span>User supplied</span>';const s=artworkSection.querySelector('.toggle span');if(s)s.textContent='Use uploaded artwork as backdrop'}

  // Required rights confirmation: export buttons do nothing until confirmed.
  const exportPanel=$('.stage-export');
  if(exportPanel&&!$('#rightsConfirm')){
    const row=document.createElement('label');row.className='toggle rights-confirm';row.innerHTML='<span>I confirm I have the right to use the uploaded audio, lyrics and media</span><input id="rightsConfirm" type="checkbox">';
    exportPanel.insertBefore(row,exportPanel.querySelector('.stage-export-actions'));
  }
  const rawExport=window.exportVideo;
  const guardedExport=()=>{if(!$('#rightsConfirm')?.checked){setStatus('Confirm media rights before export.');$('#rightsConfirm')?.focus();return}return rawExport?.()};
  if($('#exportBtn')){$('#exportBtn').onclick=guardedExport;stamp($('#exportBtn'))}
  if($('#exportBottomBtn')){$('#exportBottomBtn').onclick=guardedExport;stamp($('#exportBottomBtn'))}

  // Remove fake word buttons: they were labels styled as buttons but had no action.
  if(typeof window.renderWordEditor==='function'){
    window.renderWordEditor=function(line){
      const box=$('#wordEditor');if(!box)return;
      box.innerHTML=units(line).map((w,i)=>`<div class="word-row" data-w="${i}"><span class="word-label">${esc(w.text)}</span><input class="emph" aria-label="${esc(w.text)} emphasis" type="number" min="0.7" max="2" step="0.1" value="${w.emphasis||1}"><input class="hold" aria-label="${esc(w.text)} hold" type="number" min="0.25" max="4" step="0.25" value="${w.hold||1}"></div>`).join('');
    };
    const style=document.createElement('style');style.textContent='.word-row .word-label{border:1px solid var(--border);background:#0d0d10;border-radius:9px;padding:8px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.story[data-lyric-effect="charli"] .charli-card{text-transform:none!important}.rights-confirm{margin:10px 0}';document.head.append(style);
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
  const gradientStops={none:null,sunset:['#ff5f6d55','#ffc37118','#6a11cb66'],ocean:['#00c6ff55','#0072ff2d','#07195277'],violet:['#fc466b44','#3f5efb66'],mono:['#00000012','#00000088'],warm:['#7b493b33','#3a241f66','#160d0b88']};
  const gradient=$('#studioGradient');if(gradient){gradient.onchange=()=>{if(S)S.gradient=gradient.value;$('#story')?.style.setProperty('--lina-gradient',gradients[gradient.value]||'transparent');dirty()};stamp(gradient)}

  const art=$('#userArtworkFile');if(art){art.onchange=async()=>{const f=art.files?.[0];if(!f)return;const url=URL.createObjectURL(f),p=$('#userArtworkPreview'),i=$('#introArt');if(S)S.art=url;artworkObjectURL=url;if(p){p.src=url;p.classList.add('on')}$('#artworkEmpty')?.classList.add('hidden');if(i){i.src=url;i.classList.toggle('on',$('#userArtworkIntro')?.checked!==false)}try{await saveMedia?.('artwork',f)}catch{}dirty()};stamp(art)}

  // Correct export parity for Charli and Eternal Sunshine.
  const baseDrawApple=window.drawApple;
  const activeAt=ms=>{const i=ci(ms),line=lines[i],start=(line?.start||0)+offset,duration=Math.max(120,line?.duration||1200);return{i,line,p:clamp2((ms-start)/duration,0,1)}};
  const canvasGradient=(ctx,w,h)=>{const stops=gradientStops[S?.gradient||'none'];if(!stops)return;const g=ctx.createLinearGradient(0,0,w,h);stops.forEach((c,i)=>g.addColorStop(i/(stops.length-1),c));ctx.save();ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.restore()};
  const wrap=(ctx,text,maxWidth)=>{const rows=[];let row='';for(const word of String(text||'').split(/\s+/)){const test=row?row+' '+word:word;if(row&&ctx.measureText(test).width>maxWidth){rows.push(row);row=word}else row=test}if(row)rows.push(row);return rows};
  const writeAt=(line,ms,p)=>{const text=caseText(line?.text||'');if(line?.words?.length){const now=ms-offset;let out='';for(const word of units(line)){const x=clamp2((now-word.start)/Math.max(80,word.duration||300),0,1);if(x<=0)break;const wt=caseText(word.text);out+=(out?' ':'')+wt.slice(0,Math.max(1,Math.ceil(wt.length*x)));if(x<1)break}return out}const sm=p*p*(3-2*p);return text.slice(0,Math.ceil(text.length*sm))};
  function drawCharliFixed(ctx,ms,w,h){canvasGradient(ctx,w,h);const {i,line,p}=activeAt(ms);if(!line)return;const text=caseText(line.text),v=i%4,light=v===1,outline=v===3;ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';let fs=Math.round(w*.12);ctx.font=`950 ${fs}px "Arial Narrow","Helvetica Neue",Arial,sans-serif`;while(fs>20&&ctx.measureText(text).width>w*.84){fs-=2;ctx.font=`950 ${fs}px "Arial Narrow","Helvetica Neue",Arial,sans-serif`}const x=w/2,y=h*(+$('#yPos').value/100),pad=w*.025,tw=ctx.measureText(text).width;ctx.translate(x,y);ctx.rotate((((i%5)-2)*.65)*Math.PI/180);ctx.scale(.86+.14*Math.min(1,p*4),.86+.14*Math.min(1,p*4));ctx.translate(-x,-y);if(outline){ctx.lineWidth=Math.max(2,fs*.045);ctx.strokeStyle=$('#textColor').value;ctx.strokeText(text,x,y)}else{ctx.fillStyle=light?'#fff':'#000';ctx.fillRect(x-tw/2-pad,y-fs*.62,tw+pad*2,fs*1.24);ctx.fillStyle=light?'#000':'#fff';ctx.fillText(text,x,y)}ctx.restore()}
  function drawEternalFixed(ctx,ms,w,h){canvasGradient(ctx,w,h);const {i,line,p}=activeAt(ms);if(!line)return;const prev=i?caseText(lines[i-1].text):'',shown=writeAt(line,ms,p),fs=Math.max(20,Math.round((+$('#size').value/620)*Math.min(w,h*.9))),x=w*.1,y=h*(+$('#yPos').value/100);ctx.save();ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle=$('#textColor').value;ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=Math.max(2,w*.008);if(prev){ctx.globalAlpha=.36;ctx.font=`500 ${Math.round(fs*.48)}px "Bradley Hand","Segoe Print",cursive`;wrap(ctx,prev,w*.8).slice(-2).forEach((row,n)=>ctx.fillText(row,x,y-fs*1.55+n*fs*.58))}ctx.globalAlpha=1;ctx.font=`500 ${fs}px "Bradley Hand","Segoe Print",cursive`;wrap(ctx,shown,w*.8).forEach((row,n)=>ctx.fillText(row,x,y+n*fs*1.08));ctx.restore()}
  if(typeof baseDrawApple==='function')window.drawApple=function(ctx,line,ms,w,h){if(S?.effect==='charli')return drawCharliFixed(ctx,ms,w,h);if(S?.effect==='eternal')return drawEternalFixed(ctx,ms,w,h);return baseDrawApple(ctx,line,ms,w,h)};

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
