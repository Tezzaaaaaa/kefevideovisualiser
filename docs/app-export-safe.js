'use strict';
async function exportVideo(){
  if(!audioFile||!lines.length)return status('Add audio and synced lyrics before exporting.');
  if(!HTMLCanvasElement.prototype.captureStream||!window.MediaRecorder)return status('This browser cannot record canvas video.');
  abort=false;
  const seconds=Math.min(Number(audio.duration)||0,MAX);
  if(!seconds)return status('Audio duration unavailable.');
  const q=+$('#quality').value,[w,h]=dims(q,$('#aspect').value),canvas=$('#canvas'),ctx=canvas.getContext('2d');
  canvas.width=w;canvas.height=h;
  const stream=canvas.captureStream(q===1080?24:30);
  const renderAudio=new Audio(audio.src);renderAudio.preload='auto';renderAudio.muted=false;renderAudio.volume=1;
  const ac=new AudioContext(),src=ac.createMediaElementSource(renderAudio),dest=ac.createMediaStreamDestination();
  src.connect(dest);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  const type=['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'';
  const rec=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:q===1080?7000000:3500000}:undefined),chunks=[];
  rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  let exportBg=bgMedia;
  if(bgMedia?.tagName==='VIDEO'){
    exportBg=document.createElement('video');exportBg.src=bgMedia.src;exportBg.muted=true;exportBg.playsInline=true;exportBg.preload='auto';
    await new Promise(res=>{exportBg.onloadedmetadata=res;exportBg.onerror=res});
    exportBg.currentTime=0;await exportBg.play().catch(()=>{});
  }
  const dlg=$('#dlg');dlg.showModal();$('#progress').value=0;$('#renderText').textContent='Preparing audio…';
  try{
    await ac.resume();rec.start(250);renderAudio.currentTime=0;await renderAudio.play();
    const start=performance.now();
    await new Promise(resolve=>{
      rec.onstop=resolve;
      function frame(now){
        const e=(now-start)/1000;
        if(abort||e>=seconds){if(rec.state!=='inactive')rec.stop();renderAudio.pause();if(exportBg?.tagName==='VIDEO')exportBg.pause();return}
        if(exportBg?.tagName==='VIDEO')syncBgVideo(e,false,exportBg);
        ctx.fillStyle='#171719';ctx.fillRect(0,0,w,h);
        try{if(exportBg)drawCover(ctx,exportBg,w,h);else{const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#5e35b1');g.addColorStop(.56,'#d81b60');g.addColorStop(1,'#fb8c00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}}catch{}
        ctx.fillStyle=`rgba(0,0,0,${+$('#dim').value/100})`;ctx.fillRect(0,0,w,h);
        const ms=e*1000,ent=entranceMs(),tw=titleWindowMs();if(tw>0&&ms<tw&&ms<ent)drawIntro(ctx,w,h);if(ms>=ent)drawApple(ctx,lines[ci(ms)]||lines[0],ms,w,h);
        $('#progress').value=e/seconds*100;$('#renderText').textContent=`Rendering ${ft(e)} of ${ft(seconds)}`;requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    if(abort){dlg.close();await ac.close();return status('Export cancelled.');}
    const blob=new Blob(chunks,{type:type||'video/webm'}),ext=blob.type.includes('mp4')?'mp4':'webm',file=new File([blob],`LINA-lyric-video-${Math.round(seconds)}s.${ext}`,{type:blob.type});
    dlg.close();await ac.close();
    if(navigator.canShare?.({files:[file]}))try{await navigator.share({files:[file],title:'LINA: Lyric Video Visualizer'});return}catch{}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),60000);status('Export complete.');
  }catch(err){console.error('LINA export failed',err);if(rec.state!=='inactive')try{rec.stop()}catch{}renderAudio.pause();dlg.close();try{await ac.close()}catch{}status('Export failed. Your project is safe — try again.');}
}
