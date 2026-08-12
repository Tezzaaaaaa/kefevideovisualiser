'use strict';
(()=>{
  const ua=navigator.userAgent||'';
  const isWebKit=/AppleWebKit/i.test(ua)&&!/Chrom(?:e|ium)|CriOS|Edg|Firefox/i.test(ua);
  if(!isWebKit||typeof window.exportVideo!=='function')return;

  const nativeCancel=window.linaRequestExportCancel;
  const nativeState=window.linaExportState;
  let active=false,phase='idle',cancelled=false,ffmpeg=null,loadPromise=null,classWorkerBlobURL='',coreBlobURL='',wasmBlobURL='';
  const $=s=>document.querySelector(s);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const safariState=()=>({active,cancellable:active,phase,safariWasm:true});
  window.linaSafariWasmActive=()=>active;

  function setPhase(next,text){phase=next;if(text&&$('#renderText'))$('#renderText').textContent=text}
  function closeDialog(){const d=$('#dlg');if(d?.open)try{d.close()}catch{}}
  function openDialog(){const d=$('#dlg');if(d&&!d.open)try{d.showModal()}catch{};if($('#progress'))$('#progress').value=0}
  function requestCancel(){if(!active)return;cancelled=true;phase='cancelling';status('Stopping export…');closeDialog();try{ffmpeg?.terminate?.()}catch{};ffmpeg=null;loadPromise=null}
  $('#cancel')?.addEventListener('click',requestCancel);
  window.linaRequestExportCancel=()=>active?requestCancel():nativeCancel?.();
  window.linaExportState=()=>active?safariState():(nativeState?.()||{active:false});

  async function loadScript(url){
    if(window.FFmpegWASM?.FFmpeg)return;
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.crossOrigin='anonymous';s.onload=resolve;s.onerror=()=>reject(new Error(`Could not load ${url}`));document.head.append(s)});
    if(!window.FFmpegWASM?.FFmpeg)throw new Error('FFmpeg browser runtime did not initialise.');
  }
  async function toBlobURL(url,type){
    const r=await fetch(url,{mode:'cors',cache:'force-cache'});if(!r.ok)throw new Error(`Could not load ${url}`);const b=await r.blob();return URL.createObjectURL(new Blob([b],{type}));
  }
  async function makeClassWorkerURL(){
    const base='https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/esm/';
    const r=await fetch(`${base}worker.js`,{mode:'cors',cache:'force-cache'});if(!r.ok)throw new Error('Could not load FFmpeg worker.');
    let text=await r.text();
    text=text.replace(/from\s+(["'])\.\/([^"']+)\1/g,(m,q,p)=>`from ${q}${base}${p}${q}`);
    return URL.createObjectURL(new Blob([text],{type:'text/javascript'}));
  }
  async function getFFmpeg(){
    if(ffmpeg?.loaded)return ffmpeg;
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      setPhase('loading-engine','Loading MP4 export engine…');
      await loadScript('https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js');
      // classWorkerURL creates a module worker, so it must be paired with the ESM core.
      // The previous Safari failure came from pairing this module worker with UMD core.
      const coreBase='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
      [classWorkerBlobURL,coreBlobURL,wasmBlobURL]=await Promise.all([
        makeClassWorkerURL(),
        toBlobURL(`${coreBase}/ffmpeg-core.js`,'text/javascript'),
        toBlobURL(`${coreBase}/ffmpeg-core.wasm`,'application/wasm')
      ]);
      const engine=new window.FFmpegWASM.FFmpeg();
      engine.on('log',({message})=>console.debug('LINA FFmpeg:',message));
      engine.on('progress',({progress})=>{if(active&&Number.isFinite(progress)&&$('#progress'))$('#progress').value=Math.max($('#progress').value||0,Math.min(99,progress*100))});
      await engine.load({classWorkerURL:classWorkerBlobURL,coreURL:coreBlobURL,wasmURL:wasmBlobURL});
      ffmpeg=engine;return engine;
    })().catch(err=>{loadPromise=null;ffmpeg=null;throw err});
    return loadPromise;
  }

  function canvasBlob(canvas,type='image/jpeg',quality=.9){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not encode export frame.')),type,quality))}
  function extForAudio(file){const name=file?.name||'';const m=name.match(/\.([a-z0-9]{2,5})$/i);if(m)return m[1].toLowerCase();const type=file?.type||'';if(type.includes('wav'))return'wav';if(type.includes('mpeg'))return'mp3';if(type.includes('mp4')||type.includes('m4a'))return'm4a';if(type.includes('aac'))return'aac';return'bin'}
  async function safeDelete(engine,path){try{await engine.deleteFile(path)}catch{}}
  function bgClock(t,video){
    if(!video||!Number.isFinite(video.duration)||video.duration<=0)return 0;
    const mode=$('#videoMode')?.value||'auto';
    if(mode==='trimLoop'){
      const a=clamp(+(($('#videoStart')?.value)||0),0,video.duration),b=clamp(+(($('#videoEnd')?.value)||video.duration),a+.05,video.duration),span=Math.max(.05,b-a);
      return a+((t%span)+span)%span;
    }
    return Math.min(video.duration-.001,Math.max(0,t));
  }
  async function seekVideo(video,t){
    const target=bgClock(t,video);if(Math.abs((video.currentTime||0)-target)<.025)return;
    await Promise.race([new Promise(resolve=>{const done=()=>{video.removeEventListener('seeked',done);resolve()};video.addEventListener('seeked',done,{once:true});try{video.currentTime=target}catch{resolve()}}),sleep(350)]);
  }
  async function cloneBackground(){
    if(!window.bgMedia)return null;
    if(bgMedia.tagName==='IMG')return bgMedia;
    if(bgMedia.tagName!=='VIDEO')return null;
    const v=document.createElement('video');v.src=bgMedia.src;v.muted=true;v.playsInline=true;v.preload='auto';
    await Promise.race([new Promise(resolve=>{v.onloadedmetadata=resolve;v.onerror=resolve}),sleep(2000)]);return v;
  }
  async function drawFrame(ctx,canvas,bg,t,w,h){
    if(bg?.tagName==='VIDEO')await seekVideo(bg,t);
    ctx.save();ctx.filter='none';ctx.fillStyle='#171719';ctx.fillRect(0,0,w,h);
    if(bg){
      const blur=+($('#blur')?.value||0);if(blur>0)ctx.filter=`blur(${blur*(w/540)}px)`;
      try{drawCover(ctx,bg,w,h)}catch{}
      ctx.filter='none';
    }else{
      const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#5e35b1');g.addColorStop(.56,'#d81b60');g.addColorStop(1,'#fb8c00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    }
    ctx.fillStyle=`rgba(0,0,0,${+($('#dim')?.value||0)/100})`;ctx.fillRect(0,0,w,h);
    const ms=t*1000,ent=entranceMs(),tw=titleWindowMs();if(tw>0&&ms<tw&&ms<ent)drawIntro(ctx,w,h);if(ms>=ent)drawApple(ctx,lines[ci(ms)]||lines[0],ms,w,h);
    ctx.restore();
  }
  async function encodeSegment(engine,segIndex,start,duration,fps,canvas,ctx,bg,w,h){
    const prefix=`lina_${Date.now()}_${segIndex}_`,frames=Math.max(1,Math.ceil(duration*fps));
    setPhase('rendering-frames',`Rendering ${ft(start)}–${ft(start+duration)}`);
    for(let i=0;i<frames;i++){
      if(cancelled)throw new Error('LINA_FFMPEG_CANCELLED');
      const t=Math.min(start+duration-.001,start+i/fps);
      await drawFrame(ctx,canvas,bg,t,w,h);
      const blob=await canvasBlob(canvas,'image/jpeg',.9),data=new Uint8Array(await blob.arrayBuffer()),name=`${prefix}${String(i).padStart(4,'0')}.jpg`;
      await engine.writeFile(name,data);
      if($('#progress'))$('#progress').value=Math.min(88,((start+(i+1)/fps)/Math.max(.001,Number(audio.duration)||1))*82);
      if(i%5===0)await sleep(0);
    }
    const out=`segment_${String(segIndex).padStart(4,'0')}.mp4`,pattern=`${prefix}%04d.jpg`;
    setPhase('encoding-segment',`Encoding segment ${segIndex+1}`);
    let code=await engine.exec(['-framerate',String(fps),'-i',pattern,'-t',String(duration),'-an','-c:v','libx264','-preset','ultrafast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',out]);
    if(code!==0){await safeDelete(engine,out);code=await engine.exec(['-framerate',String(fps),'-i',pattern,'-t',String(duration),'-an','-c:v','mpeg4','-q:v','3','-pix_fmt','yuv420p',out])}
    for(let i=0;i<frames;i++)await safeDelete(engine,`${prefix}${String(i).padStart(4,'0')}.jpg`);
    if(code!==0)throw new Error('MP4 segment encoding failed.');
    return out;
  }

  async function safariExport(){
    if(active)return status('An export is already running.');
    if(!window.audioFile||!window.lines?.length)return status('Add audio and synced lyrics before exporting.');
    active=true;cancelled=false;phase='starting';openDialog();status('MP4 export starting…');
    let bg=null,engine=null,output='LINA-export.mp4',audioName='',segmentFiles=[];
    const canvas=$('#canvas'),ctx=canvas.getContext('2d',{alpha:false});
    try{
      engine=await getFFmpeg();if(cancelled)throw new Error('LINA_FFMPEG_CANCELLED');
      const seconds=Math.min(Number(audio.duration)||0,window.MAX||600);if(!seconds)throw new Error('Audio duration unavailable.');
      const q=+($('#quality')?.value||720),[w,h]=dims(q,$('#aspect')?.value||'9:16');canvas.width=w;canvas.height=h;
      bg=await cloneBackground();
      const touch=(navigator.maxTouchPoints||0)>0,fps=touch?12:(q>=1080?15:18),segmentSpan=touch?3:5,totalSegments=Math.ceil(seconds/segmentSpan);
      for(let s=0;s<totalSegments;s++){
        const start=s*segmentSpan,duration=Math.min(segmentSpan,seconds-start);segmentFiles.push(await encodeSegment(engine,s,start,duration,fps,canvas,ctx,bg,w,h));
      }
      if(cancelled)throw new Error('LINA_FFMPEG_CANCELLED');
      setPhase('muxing','Adding audio…');
      const concat='segments.txt';await engine.writeFile(concat,new TextEncoder().encode(segmentFiles.map(f=>`file '${f}'`).join('\n')));
      audioName=`audio.${extForAudio(audioFile)}`;await engine.writeFile(audioName,new Uint8Array(await audioFile.arrayBuffer()));
      const code=await engine.exec(['-f','concat','-safe','0','-i',concat,'-i',audioName,'-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',output]);
      if(code!==0)throw new Error('Final MP4 mux failed.');
      const data=await engine.readFile(output);if(!data?.byteLength)throw new Error('MP4 export produced no file.');
      const file=new File([data.buffer],`LINA-lyric-video-${Math.round(seconds)}s.mp4`,{type:'video/mp4'}),url=URL.createObjectURL(file);
      closeDialog();
      const mobileShare=(navigator.maxTouchPoints||0)>0&&matchMedia('(pointer:coarse)').matches&&navigator.canShare?.({files:[file]});
      if(mobileShare){try{await navigator.share({files:[file],title:'LINA: Lyric Video Visualizer'})}catch(e){if(e?.name!=='AbortError')throw e}}
      else{const a=document.createElement('a');a.href=url;a.download=file.name;a.style.display='none';document.body.appendChild(a);a.click();a.remove()}
      setTimeout(()=>URL.revokeObjectURL(url),30000);status('Export complete.');phase='complete';
    }catch(err){
      if(cancelled||String(err?.message||err).includes('LINA_FFMPEG_CANCELLED'))status('Export cancelled.');
      else{console.error('LINA FFmpeg export failed',err);status('Export failed. Your project is safe — try again.');}
    }finally{
      if(engine?.loaded){for(const f of segmentFiles)await safeDelete(engine,f);await safeDelete(engine,'segments.txt');if(audioName)await safeDelete(engine,audioName);await safeDelete(engine,output)}
      try{if(bg?.tagName==='VIDEO'){bg.pause();bg.removeAttribute('src');bg.load()}}catch{}
      closeDialog();active=false;cancelled=false;phase='idle';
    }
  }

  window.linaSafariWasmExport=safariExport;
  window.exportVideo=exportVideo=function(){return safariExport()};
})();
