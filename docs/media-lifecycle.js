'use strict';
(()=>{
  const originalSetBgSource=window.setBgSource;
  const originalSetBgFile=window.setBgFile;
  const originalArtworkToggle=window.artworkToggle;
  if(typeof originalSetBgSource!=='function')return;

  function retireMedia(node){
    if(!node)return;
    try{node.onloadedmetadata=null;node.onerror=null}catch{}
    if(node.tagName==='VIDEO'){
      try{node.pause()}catch{}
      try{node.removeAttribute('src');node.load()}catch{}
    }else if(node.tagName==='IMG'){
      try{node.removeAttribute('src')}catch{}
    }
  }

  function retireCurrentBackground(){
    const current=bgMedia||bg?.querySelector('video,img');
    retireMedia(current);
    if(bg)bg.replaceChildren();
    bgMedia=null;
  }

  window.setBgSource=function(src,label,kind='image'){
    retireCurrentBackground();
    if(!src){
      $('#bgStatus').textContent='No background selected.';
      $('#videoTrimBox').classList.add('hidden');
      return;
    }
    if(kind==='video'){
      const v=document.createElement('video');
      v.muted=true;v.playsInline=true;v.preload='metadata';v.disablePictureInPicture=true;
      v.src=src;
      v.onloadedmetadata=()=>{
        $('#videoDurationLabel').textContent=ft(v.duration||0);
        $('#videoTrimBox').classList.remove('hidden');
        updateTrimUI();
      };
      bg.append(v);bgMedia=v;
    }else{
      const img=document.createElement('img');
      img.decoding='async';img.loading='eager';img.src=src;
      bg.append(img);bgMedia=img;$('#videoTrimBox').classList.add('hidden');
      if(typeof img.decode==='function')img.decode().catch(()=>{});
    }
    if(label)$('#bgStatus').textContent=label;
    bgStyle();
  };

  window.setBgFile=function(f,type){
    if(!f)return;
    manualBgFile=f;
    if(bgURL){try{URL.revokeObjectURL(bgURL)}catch{}bgURL=null}
    bgURL=URL.createObjectURL(f);
    syncArtworkChecks(false);
    setBgSource(bgURL,`${type==='video'?'Video':'Image'}: ${f.name}`,type);
    scheduleMediaSave('background',f);markDirty();
  };

  window.artworkToggle=function(v){
    syncArtworkChecks(v);
    if(v&&artworkObjectURL){
      setBgSource(artworkObjectURL,'Selected artwork','image');
    }else if(manualBgFile){
      if(bgURL){try{URL.revokeObjectURL(bgURL)}catch{}bgURL=null}
      bgURL=URL.createObjectURL(manualBgFile);
      setBgSource(bgURL,manualBgFile.name,manualBgFile.type.startsWith('video')?'video':'image');
    }else if(!v){
      setBgSource(null);
    }
    markDirty();
  };

  function suspendBackground(){
    if(bgMedia?.tagName==='VIDEO')try{bgMedia.pause()}catch{}
  }
  function resumeBackground(){
    if(bgMedia?.tagName==='VIDEO'&&!audio.paused){
      syncBgVideo(audio.currentTime,true,bgMedia);
      bgMedia.play().catch(()=>{});
    }
  }

  document.addEventListener('visibilitychange',()=>document.hidden?suspendBackground():resumeBackground());
  window.addEventListener('pagehide',()=>{
    suspendBackground();
    retireCurrentBackground();
    for(const key of ['audioURL','bgURL','artworkObjectURL']){
      try{
        const value=eval(key);
        if(typeof value==='string'&&value.startsWith('blob:'))URL.revokeObjectURL(value);
      }catch{}
    }
  },{once:true});

  window.linaMediaLifecycle={retireMedia,retireCurrentBackground,suspendBackground,resumeBackground};
})();
