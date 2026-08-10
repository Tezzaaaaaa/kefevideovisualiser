'use strict';
(()=>{
  const caseSelect=$('#letterCase');
  const remainingClock=$('#remainingClock');

  function caseText(value){
    const text=String(value??'');
    const mode=caseSelect?.value||'original';
    if(mode==='upper')return text.toUpperCase();
    if(mode==='lower')return text.toLowerCase();
    return text;
  }
  window.linaCaseText=caseText;

  const baseCollectControls=collectControls;
  collectControls=function(){
    const controls=baseCollectControls();
    if(caseSelect)controls.letterCase=caseSelect.value;
    return controls;
  };

  const baseApplyControls=applyControls;
  applyControls=function(controls={}){
    baseApplyControls(controls);
    if(caseSelect&&controls.letterCase)caseSelect.value=controls.letterCase;
    applyLyricCase(false);
  };

  const baseCanvasLine=canvasLine;
  canvasLine=function(ctx,line,ms,w,h,y,scale,alpha,focus=1){
    const rendered=line?{...line,text:caseText(line.text)}:line;
    return baseCanvasLine(ctx,rendered,ms,w,h,y,scale,alpha,focus);
  };

  function applyLyricCase(dirty=true){
    if(!caseSelect||!lyricsEl)return;
    const mode=caseSelect.value;
    lyricsEl.style.textTransform=mode==='upper'?'uppercase':mode==='lower'?'lowercase':'none';
    window.invalidateLinaMotion?.(true);
    render((Number(audio.currentTime)||0)*1000);
    if(dirty)markDirty();
  }

  function updateRemainingClock(){
    if(!remainingClock)return;
    const duration=Number(audio.duration)||0;
    const current=Math.max(0,Number(audio.currentTime)||0);
    remainingClock.textContent=duration?`−${ft(Math.max(0,duration-current))}`:'−0:00';
  }

  caseSelect?.addEventListener('change',()=>applyLyricCase(true));
  ['loadedmetadata','durationchange','timeupdate','seeked','ended'].forEach(type=>audio.addEventListener(type,updateRemainingClock));

  $('#stop')?.addEventListener('click',()=>{
    audio.pause();
    try{audio.currentTime=0}catch{}
    if($('#seek'))$('#seek').value=0;
    if(bgMedia?.tagName==='VIDEO'){
      try{bgMedia.pause()}catch{}
      syncBgVideo(0,true);
    }
    render(0);
    updateRemainingClock();
    status('Stopped.');
  });

  $('#transportPrevLine')?.addEventListener('click',()=>$('#previousLine')?.click());
  $('#transportNextLine')?.addEventListener('click',()=>$('#nextLine')?.click());
  $('#transportSync')?.addEventListener('click',()=>$('#setNow')?.click());
  $('#transportEdit')?.addEventListener('click',()=>{
    if(lines.length){
      fillEditor(selected);
      $('#currentText')?.focus();
      $('#currentText')?.scrollIntoView({behavior:'smooth',block:'center'});
    }
  });

  $('#confirmReview')?.addEventListener('click',()=>queueMicrotask(()=>{
    if(reviewMode!=='manual'||!sourceLines.length)return;
    manualIndex=0;
    $('#manualTimingBox')?.classList.remove('hidden');
    if($('#manualStatus'))$('#manualStatus').textContent=`Ready to stamp line 1 of ${sourceLines.length}: ${sourceLines[0].text}`;
  }));

  $('#stampLine')?.addEventListener('click',()=>{
    if(reviewMode!=='manual'||!sourceLines.length)return status('Import and review plain lyrics first.');
    if(manualIndex>=sourceLines.length)return status('All lyric lines are timestamped.');
    const i=manualIndex;
    const now=Math.max(0,Math.round((Number(audio.currentTime)||0)*1000)-offset);
    const line=sourceLines[i];
    line.start=now;
    line.duration=2600;
    if(i>0){
      const prev=sourceLines[i-1];
      prev.duration=Math.max(100,now-prev.start);
    }
    manualIndex++;
    if(manualIndex>=sourceLines.length&&Number(audio.duration)>0)line.duration=Math.max(100,Math.round(audio.duration*1000)-line.start);
    applyGrouping(false);
    selected=Math.min(i,Math.max(0,lines.length-1));
    timeline();
    fillEditor(selected);
    render((Number(audio.currentTime)||0)*1000);
    if($('#manualStatus'))$('#manualStatus').textContent=manualIndex<sourceLines.length?`Next: line ${manualIndex+1} of ${sourceLines.length}: ${sourceLines[manualIndex].text}`:`All ${sourceLines.length} lines timestamped.`;
    status(manualIndex<sourceLines.length?`Stamped line ${i+1}.`:'Manual lyric timing complete.');
    markDirty();
  });

  $('#clearLyrics')?.addEventListener('click',()=>{
    manualIndex=0;
    $('#manualTimingBox')?.classList.add('hidden');
  });

  applyLyricCase(false);
  updateRemainingClock();
})();
