'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const dirty=()=>{try{markDirty?.()}catch{}};
  const redraw=()=>{try{window.invalidateLinaMotion?.(true);window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}};

  function caseText(value){
    const text=String(value??''),mode=$('#letterCase')?.value||'original';
    if(mode==='upper')return text.toUpperCase();
    if(mode==='lower')return text.toLowerCase();
    return text;
  }
  window.linaCaseText=caseText;

  if(!window.__linaCanonicalPersistencePatched){
    window.__linaCanonicalPersistencePatched=true;
    const baseCollect=collectControls,baseApply=applyControls;
    collectControls=function(){
      const controls=baseCollect();
      if($('#letterCase'))controls.letterCase=$('#letterCase').value;
      if($('#albumInput'))controls.albumInput=$('#albumInput').value;
      return controls;
    };
    applyControls=function(controls={}){
      baseApply(controls);
      if($('#letterCase')&&controls.letterCase)$('#letterCase').value=controls.letterCase;
      if($('#albumInput')&&controls.albumInput!=null)$('#albumInput').value=controls.albumInput;
    };
  }

  function applyCase(announce=true){
    const lyrics=$('#lyrics'),mode=$('#letterCase')?.value||'original';
    if(lyrics)lyrics.style.textTransform=mode==='upper'?'uppercase':mode==='lower'?'lowercase':'none';
    redraw();if(announce)dirty();
  }

  function syncEntrance(){
    const select=$('#lyricsEntrance'),wrap=$('#customEntranceWrap');
    if(!select||!wrap)return;
    const custom=select.value==='custom';
    wrap.classList.toggle('hidden',!custom);wrap.hidden=!custom;wrap.setAttribute('aria-hidden',custom?'false':'true');
  }

  function stampLine(){
    if(reviewMode!=='manual'||!sourceLines.length)return status('Import and review plain lyrics first.');
    if(manualIndex>=sourceLines.length)return status('All lyric lines are timestamped.');
    const i=manualIndex,now=Math.max(0,Math.round((Number($('#audio')?.currentTime)||0)*1000)-offset),line=sourceLines[i];
    line.start=now;line.duration=2600;
    if(i>0){const prev=sourceLines[i-1];prev.duration=Math.max(100,now-prev.start)}
    manualIndex++;
    if(manualIndex>=sourceLines.length&&Number($('#audio')?.duration)>0)line.duration=Math.max(100,Math.round($('#audio').duration*1000)-line.start);
    applyGrouping(false);selected=Math.min(i,Math.max(0,lines.length-1));timeline();fillEditor(selected);redraw();
    if($('#manualStatus'))$('#manualStatus').textContent=manualIndex<sourceLines.length?`Next: line ${manualIndex+1} of ${sourceLines.length}: ${sourceLines[manualIndex].text}`:`All ${sourceLines.length} lines timestamped.`;
    status(manualIndex<sourceLines.length?`Stamped line ${i+1}.`:'Manual lyric timing complete.');dirty();
  }

  function activate(){
    const lineHeight=$('#lineHeight');
    if(lineHeight){lineHeight.min='0.75';lineHeight.max='1.35';lineHeight.step='0.01';lineHeight.dataset.linaRangeOwner='canonical-controls'}

    const letterCase=$('#letterCase');
    if(letterCase){letterCase.onchange=()=>applyCase(true);letterCase.dataset.linaOwner='canonical-controls'}
    applyCase(false);

    const album=$('#albumInput');
    if(album){album.oninput=()=>{selectedSong={...(selectedSong||{}),collectionName:album.value};redraw();dirty()};album.dataset.linaOwner='canonical-controls'}

    const entrance=$('#lyricsEntrance');
    if(entrance){entrance.onchange=()=>{syncEntrance();redraw();dirty()};entrance.dataset.linaOwner='canonical-controls'}
    syncEntrance();

    const stamp=$('#stampLine');if(stamp){stamp.onclick=stampLine;stamp.dataset.linaOwner='canonical-controls'}
    const prev=$('#transportPrevLine');if(prev){prev.onclick=()=>$('#previousLine')?.click();prev.dataset.linaOwner='canonical-controls'}
    const next=$('#transportNextLine');if(next){next.onclick=()=>$('#nextLine')?.click();next.dataset.linaOwner='canonical-controls'}
    const sync=$('#transportSync');if(sync){sync.onclick=()=>$('#setNow')?.click();sync.dataset.linaOwner='canonical-controls'}

    document.documentElement.dataset.controlsOwner='canonical-v1';
    window.linaCanonicalControls={caseText,applyCase,syncEntrance,stampLine};
  }

  window.linaCanonicalControlsActivate=activate;
})();