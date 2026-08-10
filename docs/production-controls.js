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

  $('#resetBtn')?.addEventListener('click',()=>localStorage.removeItem('lina.letterCase'));
  applyLyricCase(false);
  updateRemainingClock();
})();
