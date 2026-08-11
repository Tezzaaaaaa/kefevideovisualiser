'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const audio=$('#audio');
  const play=$('#play');
  const stop=$('#stop');
  const seek=$('#seek');
  const clock=$('#clock');
  const remaining=$('#remainingClock');
  if(!audio||!play||!stop||!seek)return;

  const fmt=v=>{
    v=Number.isFinite(v)?Math.max(0,v):0;
    const m=Math.floor(v/60),s=Math.floor(v%60);
    return `${m}:${String(s).padStart(2,'0')}`;
  };

  function bgVideo(){
    try{return bgMedia?.tagName==='VIDEO'?bgMedia:null}catch{return null}
  }

  function syncBackground(time,playing=false){
    const video=bgVideo();
    if(!video)return;
    try{syncBgVideo(time,true,video)}catch{}
    if(playing){
      video.muted=true;
      video.play().catch(()=>{});
    }else{
      try{video.pause()}catch{}
    }
  }

  function draw(time=audio.currentTime){
    try{window.render?.(Math.max(0,Number(time)||0)*1000)}catch{}
  }

  function updateUI(){
    const duration=Number(audio.duration)||0;
    const current=Math.max(0,Number(audio.currentTime)||0);
    seek.min='0';
    seek.max=String(duration||0);
    seek.step='0.01';
    seek.value=String(Math.min(current,duration||current));
    if(clock)clock.textContent=`${fmt(current)} / ${fmt(duration)}`;
    if(remaining)remaining.textContent=`−${fmt(Math.max(0,duration-current))}`;
    play.textContent=audio.paused?'▶':'❚❚';
    play.setAttribute('aria-label',audio.paused?'Play':'Pause');
  }

  async function togglePlayback(e){
    e?.preventDefault?.();
    e?.stopImmediatePropagation?.();
    if(audio.paused){
      if(audio.ended||((Number(audio.duration)||0)>0&&audio.currentTime>=audio.duration-.02))audio.currentTime=0;
      syncBackground(audio.currentTime,false);
      audio.muted=false;
      if(audio.volume===0)audio.volume=1;
      try{await audio.play()}catch{}
      syncBackground(audio.currentTime,!audio.paused);
    }else{
      audio.pause();
      syncBackground(audio.currentTime,false);
    }
    updateUI();
    draw();
  }

  function stopPlayback(e){
    e?.preventDefault?.();
    e?.stopImmediatePropagation?.();
    try{audio.pause()}catch{}
    try{audio.currentTime=0}catch{}
    syncBackground(0,false);
    updateUI();
    draw(0);
    try{typeof status==='function'&&status('Stopped.')}catch{}
  }

  function seekPlayback(e){
    e?.stopImmediatePropagation?.();
    const duration=Number(audio.duration)||0;
    const target=Math.max(0,Math.min(Number(e.target.value)||0,duration||Infinity));
    try{audio.currentTime=target}catch{}
    syncBackground(target,!audio.paused);
    updateUI();
    draw(target);
  }

  // Remove legacy property handlers; capture listeners below are the single owner.
  play.onclick=null;
  seek.oninput=null;
  play.addEventListener('click',togglePlayback,true);
  stop.addEventListener('click',stopPlayback,true);
  seek.addEventListener('input',seekPlayback,true);

  ['loadedmetadata','durationchange','timeupdate','play','pause','ended'].forEach(type=>audio.addEventListener(type,updateUI));
  audio.addEventListener('play',()=>syncBackground(audio.currentTime,true));
  audio.addEventListener('pause',()=>syncBackground(audio.currentTime,false));
  audio.addEventListener('seeked',()=>{
    syncBackground(audio.currentTime,!audio.paused);
    updateUI();
    draw();
  });
  audio.addEventListener('ended',()=>{
    syncBackground(audio.currentTime,false);
    updateUI();
    draw();
  });

  updateUI();
  syncBackground(audio.currentTime,!audio.paused);
  document.documentElement.dataset.transportOwner='canonical-v1';
})();
