'use strict';
let linaExportActive=false,linaExportCancelCurrent=null;
function requestLinaExportCancel(){
  if(!linaExportActive)return;
  abort=true;
  status('Cancelling export…');
  try{linaExportCancelCurrent?.()}catch(e){console.warn('LINA export cancel signal failed',e)}
}
window.linaRequestExportCancel=requestLinaExportCancel;
document.getElementById('cancel')?.addEventListener('click',requestLinaExportCancel);

async function exportVideo(){
  if(linaExportActive)return status('An export is already running.');
  if(!audioFile||!lines.length)return status('Add audio and synced lyrics before exporting.');
  if(!HTMLCanvasElement.prototype.captureStream||!window.MediaRecorder)return status('This browser cannot record canvas video.');

  abort=false;linaExportActive=true;linaExportCancelCurrent=null;
  const seconds=Math.min(Number(audio.duration)||0,MAX);
  if(!seconds){linaExportActive=false;return status('Audio duration unavailable.');}

  const q=+$('#quality').value,[w,h]=dims(q,$('#aspect').value),fps=q===1080?24:30,canvas=$('#canvas'),ctx=canvas.getContext('2d',{alpha:false});
  canvas.width=w;canvas.height=h;

  let stream=null,renderAudio=null,ac=null,src=null,dest=null,rec=null,exportBg=null,recorderDone=null,dlg=$('#dlg'),dialogOpen=false,completedBlob=null;
  const chunks=[];
  const stopTracks=s=>{try{s?.getTracks().forEach(t=>t.stop())}catch{}};
  const closeDialog=()=>{if(dialogOpen&&dlg?.open)try{dlg.close()}catch{}dialogOpen=false};
  const retireExportBg=()=>{
    if(exportBg?.tagName==='VIDEO'){
      try{exportBg.pause()}catch{}
      try{exportBg.removeAttribute('src');exportBg.load()}catch{}
    }
    exportBg=null;
  };
  const stopRecorder=async()=>{
    if(!rec)return;
    if(rec.state!=='inactive')try{rec.stop()}catch{}
    if(recorderDone)await Promise.race([recorderDone,new Promise(r=>setTimeout(r,1500))]).catch(()=>{});
  };
  const cleanup=async()=>{
    linaExportCancelCurrent=null;
    try{renderAudio?.pause()}catch{}
    retireExportBg();
    try{src?.disconnect()}catch{}
    try{dest?.disconnect?.()}catch{}
    stopTracks(stream);stopTracks(dest?.stream);
    try{if(ac&&ac.state!=='closed')await ac.close()}catch{}
    if(renderAudio){try{renderAudio.removeAttribute('src');renderAudio.load()}catch{}}
    closeDialog();
    linaExportActive=false;
  };

  try{
    stream=canvas.captureStream(fps);
    renderAudio=new Audio(audio.src);renderAudio.preload='auto';renderAudio.muted=false;renderAudio.volume=1;
    ac=new AudioContext();src=ac.createMediaElementSource(renderAudio);dest=ac.createMediaStreamDestination();src.connect(dest);
    dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));

    const type=['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'';
    const bits=q===1080?6000000:3000000;
    rec=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:bits,audioBitsPerSecond:192000}:undefined);
    recorderDone=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(e.error||new Error('Recorder failed'));});
    rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};

    exportBg=bgMedia;
    if(bgMedia?.tagName==='VIDEO'){
      exportBg=document.createElement('video');exportBg.src=bgMedia.src;exportBg.muted=true;exportBg.playsInline=true;exportBg.preload='metadata';
      await new Promise(res=>{let done=false;const finish=()=>{if(done)return;done=true;exportBg.onloadedmetadata=null;exportBg.onerror=null;res()};exportBg.onloadedmetadata=finish;exportBg.onerror=finish;setTimeout(finish,2500)});
      if(Number.isFinite(exportBg.duration)){exportBg.currentTime=0;await exportBg.play().catch(()=>{})}
    }

    if(dlg&&!dlg.open){dlg.showModal();dialogOpen=true}
    $('#progress').value=0;$('#renderText').textContent='Preparing audio…';
    await ac.resume();
    rec.start(1000);
    renderAudio.currentTime=0;
    await renderAudio.play();

    let lastUi=0,lastT=-1;
    await new Promise((resolve,reject)=>{
      let finished=false,raf=0;
      const finish=()=>{if(finished)return;finished=true;if(raf)cancelAnimationFrame(raf);linaExportCancelCurrent=null;resolve()};
      const fail=err=>{if(finished)return;finished=true;if(raf)cancelAnimationFrame(raf);linaExportCancelCurrent=null;reject(err)};
      linaExportCancelCurrent=()=>{abort=true;finish()};
      const frame=now=>{
        if(abort){finish();return}
        const e=Math.min(seconds,Number(renderAudio.currentTime)||0);
        if(renderAudio.ended||e>=seconds-.015){finish();return}
        try{
          if(exportBg?.tagName==='VIDEO')syncBgVideo(e,false,exportBg);
          ctx.fillStyle='#171719';ctx.fillRect(0,0,w,h);
          if(exportBg)try{drawCover(ctx,exportBg,w,h)}catch{}
          else{const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#5e35b1');g.addColorStop(.56,'#d81b60');g.addColorStop(1,'#fb8c00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}
          ctx.fillStyle=`rgba(0,0,0,${+$('#dim').value/100})`;ctx.fillRect(0,0,w,h);
          const ms=e*1000,ent=entranceMs(),tw=titleWindowMs();if(tw>0&&ms<tw&&ms<ent)drawIntro(ctx,w,h);if(ms>=ent)drawApple(ctx,lines[ci(ms)]||lines[0],ms,w,h);
          if(now-lastUi>120||e===0){$('#progress').value=e/seconds*100;$('#renderText').textContent=`Rendering ${ft(e)} of ${ft(seconds)}`;lastUi=now}
          lastT=e;raf=requestAnimationFrame(frame);
        }catch(err){fail(err)}
      };
      raf=requestAnimationFrame(frame);
    });

    try{renderAudio.pause()}catch{}
    if(exportBg?.tagName==='VIDEO')try{exportBg.pause()}catch{}
    await stopRecorder();

    if(abort){status('Export cancelled.');return}
    if(!chunks.length)throw new Error('Recorder produced no video data');

    completedBlob=new Blob(chunks,{type:rec.mimeType||type||'video/webm'});chunks.length=0;
    const ext=completedBlob.type.includes('mp4')?'mp4':'webm',file=new File([completedBlob],`LINA-lyric-video-${Math.round(seconds)}s.${ext}`,{type:completedBlob.type});
    closeDialog();
    if(navigator.canShare?.({files:[file]})){
      try{await navigator.share({files:[file],title:'LINA: Lyric Video Visualizer'});status('Export complete.');return}catch(err){if(err?.name==='AbortError'){status('Export complete.');return}}
    }
    const a=document.createElement('a'),url=URL.createObjectURL(completedBlob);a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);status('Export complete.');
  }catch(err){
    console.error('LINA export failed',err);
    try{await stopRecorder()}catch{}
    status(abort?'Export cancelled.':'Export failed. Your project is safe — try again.');
  }finally{
    chunks.length=0;
    await cleanup();
  }
}
window.linaExportState=()=>({active:linaExportActive,cancellable:!!linaExportCancelCurrent});
