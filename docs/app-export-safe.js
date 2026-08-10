'use strict';
let linaExportActive=false,linaExportCancelCurrent=null,linaExportPhase='idle';

function requestLinaExportCancel(){
  if(!linaExportActive)return;
  abort=true;
  linaExportPhase='cancelling';
  status('Stopping export…');
  const dlg=document.getElementById('dlg');
  if(dlg?.open)try{dlg.close()}catch{}
  try{linaExportCancelCurrent?.()}catch(e){console.warn('LINA export cancel signal failed',e)}
}
window.linaRequestExportCancel=requestLinaExportCancel;
document.getElementById('cancel')?.addEventListener('click',requestLinaExportCancel);

async function exportVideo(){
  if(linaExportActive)return status('An export is already running.');
  if(!audioFile||!lines.length)return status('Add audio and synced lyrics before exporting.');
  if(!HTMLCanvasElement.prototype.captureStream||!window.MediaRecorder)return status('This browser cannot record canvas video.');

  abort=false;linaExportActive=true;linaExportPhase='initialising';
  const isFirefox=/Firefox\//i.test(navigator.userAgent);
  let cancelled=false,cancelResolve=()=>{};
  const cancelPromise=new Promise(resolve=>{cancelResolve=resolve});
  const cancelError=Object.assign(new Error('LINA_EXPORT_CANCELLED'),{name:'LinaExportCancelled'});
  const signalCancel=()=>{if(cancelled)return;cancelled=true;abort=true;cancelResolve()};
  linaExportCancelCurrent=signalCancel;
  const cancelable=async promise=>{
    const result=await Promise.race([
      Promise.resolve(promise).then(value=>({kind:'value',value}),error=>({kind:'error',error})),
      cancelPromise.then(()=>({kind:'cancel'}))
    ]);
    if(result.kind==='cancel')throw cancelError;
    if(result.kind==='error')throw result.error;
    return result.value;
  };
  const withTimeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms))]);

  // Firefox: call play() immediately, before the first await, while the Export click
  // still carries user activation. Later we capture this element's audio stream.
  let firefoxAudio=null,firefoxPlayPromise=null;
  if(isFirefox){
    firefoxAudio=new Audio(audio.src);
    firefoxAudio.preload='auto';firefoxAudio.volume=1;firefoxAudio.muted=false;
    try{firefoxAudio.currentTime=0}catch{}
    firefoxPlayPromise=firefoxAudio.play();
    firefoxPlayPromise?.catch(()=>{});
  }

  const seconds=Math.min(Number(audio.duration)||0,MAX);
  if(!seconds){linaExportCancelCurrent=null;linaExportActive=false;linaExportPhase='idle';try{firefoxAudio?.pause()}catch{};return status('Audio duration unavailable.');}

  const q=+$('#quality').value,[w,h]=dims(q,$('#aspect').value),fps=q===1080?24:30,canvas=$('#canvas'),ctx=canvas.getContext('2d',{alpha:false});
  canvas.width=w;canvas.height=h;

  let stream=null,ac=null,audioSource=null,dest=null,firefoxMediaStream=null,rec=null,exportBg=null,recorderDone=null,dlg=$('#dlg'),completedBlob=null,outcome='failed',resumePromise=null,decoded=null;
  const chunks=[];
  const stopTracks=s=>{try{s?.getTracks().forEach(t=>t.stop())}catch{}};
  const closeDialog=()=>{if(dlg?.open)try{dlg.close()}catch{}};
  const retireExportBg=()=>{
    if(exportBg?.tagName==='VIDEO'){
      try{exportBg.pause()}catch{}
      try{exportBg.removeAttribute('src');exportBg.load()}catch{}
    }
    exportBg=null;
  };
  const stopAudio=()=>{
    try{audioSource?.stop()}catch{}
    try{audioSource?.disconnect()}catch{}
    audioSource=null;
    try{firefoxAudio?.pause()}catch{}
  };
  const stopRecorder=async fast=>{
    if(!rec)return;
    if(rec.state!=='inactive')try{rec.stop()}catch{}
    if(!fast&&recorderDone)await Promise.race([recorderDone,new Promise(r=>setTimeout(r,1800))]).catch(()=>{});
  };
  const cleanup=async()=>{
    linaExportCancelCurrent=null;
    stopAudio();
    retireExportBg();
    try{dest?.disconnect?.()}catch{}
    stopTracks(stream);stopTracks(dest?.stream);stopTracks(firefoxMediaStream);
    try{if(ac&&ac.state!=='closed')await Promise.race([ac.close(),new Promise(r=>setTimeout(r,600))])}catch{}
    if(firefoxAudio){try{firefoxAudio.removeAttribute('src');firefoxAudio.load()}catch{}}
    closeDialog();
    linaExportActive=false;
    linaExportPhase='idle';
  };

  try{
    stream=canvas.captureStream(fps);

    if(isFirefox){
      linaExportPhase='starting-firefox-media';
      if(!firefoxAudio||!firefoxPlayPromise)throw new Error('Firefox audio export could not start.');
      await cancelable(withTimeout(firefoxPlayPromise,5000,'Firefox audio playback did not start.'));
      if(cancelled)throw cancelError;
      try{firefoxAudio.currentTime=0}catch{}
      const capture=firefoxAudio.captureStream||firefoxAudio.mozCaptureStream;
      if(typeof capture!=='function')throw new Error('Firefox does not expose media capture for this audio element.');
      firefoxMediaStream=capture.call(firefoxAudio);
      let tracks=firefoxMediaStream?.getAudioTracks?.()||[];
      if(!tracks.length){
        await cancelable(new Promise(resolve=>setTimeout(resolve,120)));
        firefoxMediaStream=capture.call(firefoxAudio);
        tracks=firefoxMediaStream?.getAudioTracks?.()||[];
      }
      if(!tracks.length)throw new Error('Firefox audio capture produced no audio track.');
      tracks.forEach(t=>stream.addTrack(t));
    }else{
      // Chromium/WebKit: deterministic decoded Web Audio route.
      ac=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'playback'});
      resumePromise=ac.state==='running'?Promise.resolve():ac.resume();
      dest=ac.createMediaStreamDestination();
      linaExportPhase='decoding-audio';
      const bytes=await cancelable(audioFile.arrayBuffer());
      decoded=await cancelable(ac.decodeAudioData(bytes.slice(0)));
      if(cancelled)throw cancelError;
      audioSource=ac.createBufferSource();audioSource.buffer=decoded;audioSource.connect(dest);
      dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
    }

    const type=[
      'video/mp4;codecs=h264,aac',
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ].find(x=>MediaRecorder.isTypeSupported(x))||'';
    const bits=q===1080?6000000:3000000;
    rec=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:bits,audioBitsPerSecond:192000}:undefined);
    recorderDone=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(e.error||new Error('Recorder failed'));});
    rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};

    exportBg=bgMedia;
    if(bgMedia?.tagName==='VIDEO'){
      linaExportPhase='preparing-background';
      exportBg=document.createElement('video');exportBg.src=bgMedia.src;exportBg.muted=true;exportBg.playsInline=true;exportBg.preload='auto';
      await cancelable(new Promise(res=>{
        let done=false,timer=0;
        const finish=()=>{if(done)return;done=true;clearTimeout(timer);exportBg.onloadedmetadata=null;exportBg.onerror=null;res()};
        exportBg.onloadedmetadata=finish;exportBg.onerror=finish;timer=setTimeout(finish,2500);
      }));
      try{exportBg.currentTime=0}catch{}
    }

    if(cancelled)throw cancelError;
    if(dlg&&!dlg.open)dlg.showModal();
    $('#progress').value=0;$('#renderText').textContent='Preparing audio…';

    if(!isFirefox){
      linaExportPhase='starting-audio';
      await cancelable(Promise.race([
        resumePromise,
        new Promise((resolve,reject)=>setTimeout(()=>ac.state==='running'?resolve():reject(new Error(`Audio engine did not start (${ac.state})`)),2500))
      ]));
      if(cancelled)throw cancelError;
    }

    rec.start(500);
    const wallStart=performance.now();
    if(isFirefox){
      try{firefoxAudio.currentTime=0}catch{}
      if(firefoxAudio.paused){
        await cancelable(withTimeout(firefoxAudio.play(),2500,'Firefox audio playback stopped before recording.'));
      }
    }else audioSource.start(0,0,Math.min(seconds,decoded.duration));
    linaExportPhase='rendering';
    $('#renderText').textContent=`Rendering 0:00 of ${ft(seconds)}`;

    let lastUi=0;
    await new Promise((resolve,reject)=>{
      let finished=false,raf=0;
      const finish=()=>{if(finished)return;finished=true;if(raf)cancelAnimationFrame(raf);resolve()};
      const fail=err=>{if(finished)return;finished=true;if(raf)cancelAnimationFrame(raf);reject(err)};
      cancelPromise.then(()=>{if(cancelled)finish()});
      const frame=now=>{
        if(cancelled||abort){finish();return}
        const clock=isFirefox&&Number.isFinite(firefoxAudio?.currentTime)?firefoxAudio.currentTime:(performance.now()-wallStart)/1000;
        const e=Math.min(seconds,Math.max(0,clock));
        if(e>=seconds-.008){finish();return}
        try{
          if(exportBg?.tagName==='VIDEO')syncBgVideo(e,false,exportBg);
          ctx.fillStyle='#171719';ctx.fillRect(0,0,w,h);
          if(exportBg)try{drawCover(ctx,exportBg,w,h)}catch{}
          else{const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#5e35b1');g.addColorStop(.56,'#d81b60');g.addColorStop(1,'#fb8c00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}
          ctx.fillStyle=`rgba(0,0,0,${+$('#dim').value/100})`;ctx.fillRect(0,0,w,h);
          const ms=e*1000,ent=entranceMs(),tw=titleWindowMs();
          if(tw>0&&ms<tw&&ms<ent)drawIntro(ctx,w,h);
          if(ms>=ent)drawApple(ctx,lines[ci(ms)]||lines[0],ms,w,h);
          if(now-lastUi>100||e===0){$('#progress').value=e/seconds*100;$('#renderText').textContent=`Rendering ${ft(e)} of ${ft(seconds)}`;lastUi=now}
          raf=requestAnimationFrame(frame);
        }catch(err){fail(err)}
      };
      raf=requestAnimationFrame(frame);
    });

    if(cancelled||abort)throw cancelError;
    stopAudio();
    linaExportPhase='finalising';
    await stopRecorder(false);
    if(cancelled||abort)throw cancelError;
    if(!chunks.length)throw new Error('Recorder produced no video data');

    completedBlob=new Blob(chunks,{type:rec.mimeType||type||'video/webm'});chunks.length=0;
    const ext=completedBlob.type.includes('mp4')?'mp4':'webm',file=new File([completedBlob],`LINA-lyric-video-${Math.round(seconds)}s.${ext}`,{type:completedBlob.type});
    closeDialog();

    // Desktop export is always a download. Share is reserved for touch/mobile
    // devices where the native share sheet is the expected file-delivery UI.
    const mobileShare=(navigator.maxTouchPoints||0)>0&&matchMedia('(pointer:coarse)').matches&&navigator.canShare?.({files:[file]});
    if(mobileShare){
      try{await navigator.share({files:[file],title:'LINA: Lyric Video Visualizer'});outcome='complete';return}
      catch(err){if(err?.name==='AbortError'){outcome='complete';return}}
    }
    const a=document.createElement('a'),url=URL.createObjectURL(completedBlob);a.href=url;a.download=file.name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);outcome='complete';
  }catch(err){
    if(err===cancelError||err?.name==='LinaExportCancelled'||cancelled||abort){
      cancelled=true;abort=true;outcome='cancelled';
      await stopRecorder(true);
    }else{
      console.error('LINA export failed',err);
      outcome='failed';
      await stopRecorder(false).catch(()=>{});
    }
  }finally{
    chunks.length=0;
    await cleanup();
    if(outcome==='cancelled')status('Export cancelled.');
    else if(outcome==='complete')status('Export complete.');
    else status('Export failed. Your project is safe — try again.');
  }
}
window.linaExportState=()=>({active:linaExportActive,cancellable:!!linaExportCancelCurrent,phase:linaExportPhase,firefox:/Firefox\//i.test(navigator.userAgent)});
