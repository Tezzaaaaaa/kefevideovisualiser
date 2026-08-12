'use strict';
(()=>{
  let active=false,phase='idle',cancelled=false,ffmpeg=null,loadPromise=null,classWorkerBlobURL='',coreBlobURL='',wasmBlobURL='',prewarmQueued=false;
  let startedAt=0,lastProgress=0;
  const $=s=>document.querySelector(s);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const exportState=()=>({active,cancellable:active,phase,ffmpeg:true,engineReady:!!ffmpeg?.loaded,progress:lastProgress});
  window.linaFFmpegActive=()=>active;

  function ensureExportUI(){
    if($('#linaExportOverlay'))return;
    const style=document.createElement('style');
    style.textContent=`
      #linaExportOverlay{position:fixed;inset:0;z-index:100000;display:none;place-items:center;padding:24px;background:rgba(6,6,8,.72);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      #linaExportOverlay.open{display:grid}
      .lina-export-card{width:min(520px,100%);border:1px solid rgba(255,255,255,.14);border-radius:26px;padding:26px;background:rgba(22,22,26,.94);box-shadow:0 28px 80px rgba(0,0,0,.48);color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif}
      .lina-export-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:22px}.lina-export-title{font-size:22px;font-weight:750;letter-spacing:-.02em}.lina-export-sub{margin-top:5px;color:rgba(255,255,255,.62);font-size:13px}
      .lina-export-percent{font-size:30px;font-weight:780;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
      .lina-export-track{height:12px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)}
      .lina-export-fill{height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#fff 0%,#d7d7ff 45%,#9ea7ff 100%);transition:width .16s ease;box-shadow:0 0 24px rgba(158,167,255,.45)}
      .lina-export-meta{display:grid;grid-template-columns:1fr auto;gap:12px;margin-top:14px;font-size:13px;color:rgba(255,255,255,.64)}
      .lina-export-stage{color:#fff;font-weight:600}.lina-export-time{font-variant-numeric:tabular-nums}
      .lina-export-actions{display:flex;justify-content:flex-end;margin-top:22px}.lina-export-cancel{appearance:none;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#fff;border-radius:999px;padding:10px 16px;font:inherit;font-weight:650}
      @media(max-width:600px){.lina-export-card{padding:22px;border-radius:22px}.lina-export-title{font-size:20px}.lina-export-percent{font-size:26px}}
    `;
    document.head.append(style);
    const overlay=document.createElement('div');
    overlay.id='linaExportOverlay';
    overlay.innerHTML=`<div class="lina-export-card" role="dialog" aria-modal="true" aria-labelledby="linaExportTitle"><div class="lina-export-top"><div><div id="linaExportTitle" class="lina-export-title">Creating your lyric video</div><div class="lina-export-sub">Smooth high-quality MP4 · audio, lyrics and background locked together</div></div><div id="linaExportPercent" class="lina-export-percent">0%</div></div><div class="lina-export-track"><div id="linaExportFill" class="lina-export-fill"></div></div><div class="lina-export-meta"><div id="linaExportStage" class="lina-export-stage">Preparing…</div><div id="linaExportTime" class="lina-export-time">Calculating…</div></div><div class="lina-export-actions"><button id="linaExportCancel" class="lina-export-cancel" type="button">Cancel export</button></div></div>`;
    document.body.append(overlay);
    $('#linaExportCancel')?.addEventListener('click',requestCancel);
  }

  function formatRemaining(seconds){
    if(!Number.isFinite(seconds)||seconds<0)return'Calculating…';
    if(seconds<2)return'Almost done';
    const m=Math.floor(seconds/60),s=Math.max(0,Math.round(seconds%60));
    return m?`About ${m}:${String(s).padStart(2,'0')} left`:`About ${s}s left`;
  }
  function setProgress(value,text){
    ensureExportUI();
    lastProgress=clamp(Number(value)||0,0,100);
    const p=Math.round(lastProgress);
    if($('#linaExportPercent'))$('#linaExportPercent').textContent=`${p}%`;
    if($('#linaExportFill'))$('#linaExportFill').style.width=`${lastProgress}%`;
    if(text&&$('#linaExportStage'))$('#linaExportStage').textContent=text;
    const elapsed=(performance.now()-startedAt)/1000;
    const remaining=lastProgress>2?elapsed*(100-lastProgress)/lastProgress:NaN;
    if($('#linaExportTime'))$('#linaExportTime').textContent=formatRemaining(remaining);
    if($('#progress'))$('#progress').value=lastProgress;
  }
  function setPhase(next,text){phase=next;if(text&&$('#renderText'))$('#renderText').textContent=text;if(active&&text)setProgress(lastProgress,text)}
  function closeDialog(){const d=$('#dlg');if(d?.open)try{d.close()}catch{};$('#linaExportOverlay')?.classList.remove('open')}
  function openDialog(){ensureExportUI();startedAt=performance.now();lastProgress=0;$('#linaExportOverlay')?.classList.add('open');setProgress(0,'Preparing export…')}
  function requestCancel(){if(!active)return;cancelled=true;phase='cancelling';status('Stopping export…');setProgress(lastProgress,'Stopping export…');try{ffmpeg?.terminate?.()}catch{};ffmpeg=null;loadPromise=null}
  $('#cancel')?.addEventListener('click',requestCancel);
  window.linaRequestExportCancel=requestCancel;
  window.linaExportState=exportState;

  function cleanFilenamePart(value,fallback=''){
    const raw=String(value||'').trim()||fallback;
    return raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').replace(/\s+/g,' ').replace(/[. ]+$/g,'').trim().slice(0,100);
  }
  function exportFilename(){
    const title=cleanFilenamePart($('#titleInput')?.value||$('#title')?.value,'Untitled');
    const artist=cleanFilenamePart($('#artistInput')?.value||$('#artist')?.value,'');
    return `${title}${artist?` - ${artist}`:''} - lyric visualiser.mp4`;
  }
  window.linaExportFilename=exportFilename;

  function exportMetadata(){
    const title=cleanFilenamePart($('#titleInput')?.value||$('#title')?.value,'Untitled');
    const artist=cleanFilenamePart($('#artistInput')?.value||$('#artist')?.value,'');
    const album=cleanFilenamePart($('#albumInput')?.value||'','');
    const website=new URL('.',location.href).href;
    return{
      title,
      artist:artist||'LINA user',
      album:album||undefined,
      genre:'Lyric Video',
      date:new Date(),
      lyrics:(Array.isArray(lines)?lines:[]).map(line=>String(line?.text||'').trim()).filter(Boolean).join('\n'),
      description:'Lyric video created with LINA: Lyric Video Visualizer.',
      comment:`Created with LINA · ${website}`
    };
  }
  function ffmpegMetadataArgs(){
    const meta=exportMetadata(),pairs=[['title',meta.title],['artist',meta.artist],['album',meta.album],['genre',meta.genre],['date',meta.date.toISOString()],['description',meta.description],['comment',meta.comment],['lyrics',meta.lyrics]];
    return pairs.flatMap(([key,value])=>value?['-metadata',`${key}=${value}`]:[]);
  }
  function drawExportWatermark(ctx,w,h){
    const quality=+($('#quality')?.value||720);
    if(quality>720)return;
    const unit=Math.max(1,Math.min(w,h)/720),pad=20*unit,logoSize=22*unit,subSize=8.5*unit;
    ctx.save();
    ctx.globalAlpha=.46;ctx.textAlign='right';ctx.textBaseline='alphabetic';
    ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=6*unit;ctx.shadowOffsetY=1.5*unit;
    ctx.fillStyle='#fff';ctx.font=`800 ${logoSize}px system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif`;
    ctx.fillText('LINA',w-pad,h-pad-subSize*1.45);
    ctx.globalAlpha=.34;ctx.shadowBlur=3*unit;ctx.font=`650 ${subSize}px system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif`;
    ctx.fillText('LYRIC VIDEO VISUALIZER',w-pad,h-pad);
    ctx.restore();
  }
  window.linaExportMetadata=exportMetadata;

  async function loadScript(url){if(window.FFmpegWASM?.FFmpeg)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.crossOrigin='anonymous';s.onload=resolve;s.onerror=()=>reject(new Error(`Could not load ${url}`));document.head.append(s)});if(!window.FFmpegWASM?.FFmpeg)throw new Error('FFmpeg browser runtime did not initialise.')}
  async function toBlobURL(url,type){const r=await fetch(url,{mode:'cors',cache:'force-cache'});if(!r.ok)throw new Error(`Could not load ${url}`);const b=await r.blob();return URL.createObjectURL(new Blob([b],{type}))}
  async function makeClassWorkerURL(){const base='https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/esm/';const r=await fetch(`${base}worker.js`,{mode:'cors',cache:'force-cache'});if(!r.ok)throw new Error('Could not load FFmpeg worker.');let text=await r.text();text=text.replace(/from\s+(["'])\.\/([^"']+)\1/g,(m,q,p)=>`from ${q}${base}${p}${q}`);return URL.createObjectURL(new Blob([text],{type:'text/javascript'}))}
  async function getFFmpeg(){
    if(ffmpeg?.loaded)return ffmpeg;
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      if(active)setPhase('loading-engine','Loading compatibility encoder…');
      await loadScript('https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js');
      const coreBase='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
      [classWorkerBlobURL,coreBlobURL,wasmBlobURL]=await Promise.all([makeClassWorkerURL(),toBlobURL(`${coreBase}/ffmpeg-core.js`,'text/javascript'),toBlobURL(`${coreBase}/ffmpeg-core.wasm`,'application/wasm')]);
      const engine=new window.FFmpegWASM.FFmpeg();
      engine.on('progress',({progress})=>{if(active&&Number.isFinite(progress))setProgress(Math.max(lastProgress,Math.min(98,progress*100)),'Encoding MP4…')});
      await engine.load({classWorkerURL:classWorkerBlobURL,coreURL:coreBlobURL,wasmURL:wasmBlobURL});
      ffmpeg=engine;return engine;
    })().catch(err=>{loadPromise=null;ffmpeg=null;throw err});
    return loadPromise;
  }
  function queuePrewarm(){if(prewarmQueued)return;prewarmQueued=true;const run=()=>{prewarmQueued=false;if(!('VideoEncoder'in window&&'AudioEncoder'in window))void getFFmpeg().catch(()=>{})};if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1800});else setTimeout(run,500)}
  document.addEventListener('change',e=>{if(e.target?.id==='audioFile'&&e.target.files?.length)queuePrewarm()},true);

  function extForAudio(file){const name=file?.name||'';const m=name.match(/\.([a-z0-9]{2,5})$/i);if(m)return m[1].toLowerCase();const type=file?.type||'';if(type.includes('wav'))return'wav';if(type.includes('mpeg'))return'mp3';if(type.includes('mp4')||type.includes('m4a'))return'm4a';if(type.includes('aac'))return'aac';return'bin'}
  async function safeDelete(engine,path){try{await engine.deleteFile(path)}catch{}}
  function canvasBlob(canvas,type='image/jpeg',quality=.84){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not encode export frame.')),type,quality))}

  function bgClock(t,video){
    if(!video||!Number.isFinite(video.duration)||video.duration<=0)return 0;
    const mode=$('#videoMode')?.value||'auto';
    if(mode==='trimLoop'){
      const a=clamp(+(($('#videoStart')?.value)||0),0,video.duration),b=clamp(+(($('#videoEnd')?.value)||video.duration),a+.05,video.duration),span=Math.max(.05,b-a);
      return a+((t%span)+span)%span;
    }
    return Math.min(video.duration-.001,Math.max(0,t));
  }
  async function seekVideoExact(video,t){
    const target=bgClock(t,video);
    if(Math.abs((video.currentTime||0)-target)<.001)return;
    await new Promise(resolve=>{
      let settled=false;
      const done=()=>{if(settled)return;settled=true;video.removeEventListener('seeked',done);resolve()};
      video.addEventListener('seeked',done,{once:true});
      try{video.currentTime=target}catch{done()}
      setTimeout(done,500);
    });
    if('requestVideoFrameCallback'in video){
      await Promise.race([new Promise(resolve=>video.requestVideoFrameCallback(()=>resolve())),sleep(120)]);
    }
  }
  async function cloneBackground(){
    if(!bgMedia)return null;
    if(bgMedia.tagName==='IMG')return bgMedia;
    if(bgMedia.tagName!=='VIDEO')return null;
    const v=document.createElement('video');v.src=bgMedia.src;v.muted=true;v.playsInline=true;v.preload='auto';
    await Promise.race([new Promise(resolve=>{v.onloadedmetadata=resolve;v.onerror=resolve}),sleep(1500)]);
    return v;
  }
  async function drawFrame(ctx,bgSource,t,w,h){
    if(bgSource?.tagName==='VIDEO')await seekVideoExact(bgSource,t);
    ctx.save();ctx.filter='none';ctx.fillStyle='#171719';ctx.fillRect(0,0,w,h);
    if(bgSource){
      const blur=+($('#blur')?.value||0);if(blur>0)ctx.filter=`blur(${blur*(w/540)}px)`;
      try{drawCover(ctx,bgSource,w,h)}catch{}
      ctx.filter='none';
    }else{
      const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#5e35b1');g.addColorStop(.56,'#d81b60');g.addColorStop(1,'#fb8c00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    }
    ctx.fillStyle=`rgba(0,0,0,${+($('#dim')?.value||0)/100})`;ctx.fillRect(0,0,w,h);
    const ms=t*1000,ent=entranceMs(),tw=titleWindowMs();
    if(tw>0&&ms<tw&&ms<ent)drawIntro(ctx,w,h);
    if(ms>=ent)drawApple(ctx,lines[ci(ms)]||lines[0],ms,w,h);
    drawExportWatermark(ctx,w,h);
    ctx.restore();
  }

  async function deliverFile(file){
    const url=URL.createObjectURL(file);closeDialog();
    const mobileShare=(navigator.maxTouchPoints||0)>0&&matchMedia('(pointer:coarse)').matches&&navigator.canShare?.({files:[file]});
    if(mobileShare){try{await navigator.share({files:[file],title:file.name.replace(/\.mp4$/i,'')})}catch(e){if(e?.name!=='AbortError')throw e}}
    else{const a=document.createElement('a');a.href=url;a.download=file.name;a.style.display='none';document.body.appendChild(a);a.click();a.remove()}
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }

  async function chooseFastProfile(M,w,h,q){
    const candidates=q>=1080?
      [{fps:30,bitrate:10_000_000},{fps:24,bitrate:9_000_000},{fps:20,bitrate:8_000_000}]:
      [{fps:30,bitrate:6_000_000},{fps:24,bitrate:5_500_000},{fps:20,bitrate:5_000_000}];
    for(const candidate of candidates){
      const ok=await M.canEncodeVideo('avc',{width:w,height:h,bitrate:candidate.bitrate,framerate:candidate.fps,hardwareAcceleration:'prefer-hardware'});
      if(ok)return candidate;
    }
    return null;
  }

  async function fastWebCodecsExport(){
    if(!('VideoEncoder'in window&&'AudioEncoder'in window))throw new Error('LINA_FAST_UNAVAILABLE');
    setPhase('fast-init','Starting hardware encoder…');setProgress(2,'Starting hardware encoder…');
    const warmed=window.linaMediabunnyReady?.()||window.linaExportPrewarm?.();
    const M=(warmed?await warmed:null)||await import('https://cdn.jsdelivr.net/npm/mediabunny@1.51.0/+esm');
    const seconds=Math.min(Number(audio.duration)||0,MAX||600);if(!seconds)throw new Error('Audio duration unavailable.');
    const q=+($('#quality')?.value||720),[w,h]=dims(q,$('#aspect')?.value||'9:16');
    const profile=await chooseFastProfile(M,w,h,q);if(!profile)throw new Error('LINA_FAST_UNAVAILABLE');
    const {fps,bitrate}=profile;
    const canAudio=await M.canEncodeAudio('aac',{numberOfChannels:2,sampleRate:48000,bitrate:192000});
    if(!canAudio)throw new Error('LINA_FAST_UNAVAILABLE');
    const target=new M.BufferTarget();
    const output=new M.Output({format:new M.Mp4OutputFormat({fastStart:'in-memory'}),target});
    const canvas=$('#canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
    const totalFrames=Math.max(1,Math.ceil(seconds*fps));let encodedFrames=0;
    const videoSource=new M.CanvasSource(canvas,{codec:'avc',bitrate,bitrateMode:'variable',latencyMode:'quality',hardwareAcceleration:'prefer-hardware',keyFrameInterval:2,contentHint:'detail',onEncodedPacket:()=>{encodedFrames++;setProgress(8+(encodedFrames/totalFrames)*82,`Encoding ${q}p · ${fps} fps…`)}});
    const audioSource=new M.AudioBufferSource({codec:'aac',bitrate:192000});
    output.addVideoTrack(videoSource,{frameRate:fps});output.addAudioTrack(audioSource);
    output.setMetadataTags(exportMetadata());
    await output.start();
    setProgress(6,'Preparing audio…');
    const audioCtx=new (window.AudioContext||window.webkitAudioContext)({sampleRate:48000});
    const decoded=await audioCtx.decodeAudioData((await audioFile.arrayBuffer()).slice(0));
    const audioPromise=audioSource.add(decoded);
    const bgSource=await cloneBackground();
    const frameDuration=1/fps;
    for(let i=0;i<totalFrames;i++){
      if(cancelled)throw new Error('LINA_FFMPEG_CANCELLED');
      const t=Math.min(seconds-.001,i*frameDuration);
      await drawFrame(ctx,bgSource,t,w,h);
      await videoSource.add(t,Math.min(frameDuration,seconds-t),{keyFrame:i===0||i%(fps*2)===0});
      if(i%12===0)await sleep(0);
    }
    await audioPromise;
    setProgress(93,'Finishing MP4…');
    await output.finalize();
    setProgress(100,'Export complete');
    try{await audioCtx.close()}catch{}
    try{if(bgSource?.tagName==='VIDEO'){bgSource.pause();bgSource.removeAttribute('src');bgSource.load()}}catch{}
    const bytes=target.buffer instanceof Uint8Array?target.buffer:new Uint8Array(target.buffer);
    if(!bytes?.byteLength)throw new Error('Fast export produced no file.');
    await deliverFile(new File([bytes],exportFilename(),{type:'video/mp4'}));
    return true;
  }

  async function encodeSegment(engine,segIndex,start,duration,fps,canvas,ctx,bgSource,w,h,totalSeconds){
    const prefix=`lina_${Date.now()}_${segIndex}_`,frames=Math.max(1,Math.ceil(duration*fps));
    for(let i=0;i<frames;i++){
      if(cancelled)throw new Error('LINA_FFMPEG_CANCELLED');
      const t=Math.min(start+duration-.001,start+i/fps);
      await drawFrame(ctx,bgSource,t,w,h);
      const blob=await canvasBlob(canvas,'image/jpeg',.84),data=new Uint8Array(await blob.arrayBuffer()),name=`${prefix}${String(i).padStart(4,'0')}.jpg`;
      await engine.writeFile(name,data);
      setProgress(Math.min(86,8+((start+(i+1)/fps)/Math.max(.001,totalSeconds))*78),'Compatibility export…');
      if(i%12===0)await sleep(0);
    }
    const out=`segment_${String(segIndex).padStart(4,'0')}.mp4`,pattern=`${prefix}%04d.jpg`;
    let code=await engine.exec(['-framerate',String(fps),'-i',pattern,'-t',String(duration),'-an','-c:v','libx264','-preset','ultrafast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',out]);
    if(code!==0){await safeDelete(engine,out);code=await engine.exec(['-framerate',String(fps),'-i',pattern,'-t',String(duration),'-an','-c:v','mpeg4','-q:v','3','-pix_fmt','yuv420p',out])}
    await Promise.all(Array.from({length:frames},(_,i)=>safeDelete(engine,`${prefix}${String(i).padStart(4,'0')}.jpg`)));
    if(code!==0)throw new Error('MP4 segment encoding failed.');
    return out;
  }

  async function ffmpegFallbackExport(){
    let bgSource=null,engine=null,output='LINA-export.mp4',audioName='',segmentFiles=[];
    const canvas=$('#canvas'),ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
    try{
      engine=await getFFmpeg();if(cancelled)throw new Error('LINA_FFMPEG_CANCELLED');
      const seconds=Math.min(Number(audio.duration)||0,MAX||600);if(!seconds)throw new Error('Audio duration unavailable.');
      const q=+($('#quality')?.value||720),[w,h]=dims(q,$('#aspect')?.value||'9:16');canvas.width=w;canvas.height=h;
      bgSource=await cloneBackground();
      const fps=24,segmentSpan=12,totalSegments=Math.ceil(seconds/segmentSpan);
      for(let s=0;s<totalSegments;s++){
        const start=s*segmentSpan,duration=Math.min(segmentSpan,seconds-start);
        segmentFiles.push(await encodeSegment(engine,s,start,duration,fps,canvas,ctx,bgSource,w,h,seconds));
      }
      setProgress(88,'Adding audio…');
      const concat='segments.txt';await engine.writeFile(concat,new TextEncoder().encode(segmentFiles.map(f=>`file '${f}'`).join('\n')));
      audioName=`audio.${extForAudio(audioFile)}`;await engine.writeFile(audioName,new Uint8Array(await audioFile.arrayBuffer()));
      const code=await engine.exec(['-f','concat','-safe','0','-i',concat,'-i',audioName,'-c:v','copy','-c:a','aac','-b:a','192k','-shortest',...ffmpegMetadataArgs(),'-movflags','+faststart',output]);
      if(code!==0)throw new Error('Final MP4 mux failed.');
      const data=await engine.readFile(output);if(!data?.byteLength)throw new Error('MP4 export produced no file.');
      setProgress(100,'Export complete');
      await deliverFile(new File([data.buffer],exportFilename(),{type:'video/mp4'}));
    }finally{
      if(engine?.loaded){await Promise.all(segmentFiles.map(f=>safeDelete(engine,f)));await safeDelete(engine,'segments.txt');if(audioName)await safeDelete(engine,audioName);await safeDelete(engine,output)}
      try{if(bgSource?.tagName==='VIDEO'){bgSource.pause();bgSource.removeAttribute('src');bgSource.load()}}catch{}
    }
  }

  async function exportVideoFast(){
    if(active)return status('An export is already running.');
    if(!audioFile||!lines.length)return status('Add audio and synced lyrics before exporting.');
    const requestedQuality=+($('#quality')?.value||$('#quickQuality')?.value||720);
    if(requestedQuality>720&&!window.linaHasPaidMembership?.())return status('1080p export is available to paid members.');
    active=true;cancelled=false;phase='starting';openDialog();status('Export starting…');
    try{
      try{await fastWebCodecsExport()}
      catch(err){
        if(cancelled||String(err?.message||err).includes('LINA_FFMPEG_CANCELLED'))throw err;
        console.warn('LINA fast export unavailable; using compatibility export.',err);
        setProgress(2,'Using compatibility encoder…');
        await ffmpegFallbackExport();
      }
      status('Export complete.');phase='complete';
    }catch(err){
      if(cancelled||String(err?.message||err).includes('LINA_FFMPEG_CANCELLED'))status('Export cancelled.');
      else{console.error('LINA export failed',err);status('Export failed. Your project is safe — try again.')}
    }finally{closeDialog();active=false;cancelled=false;phase='idle'}
  }

  window.linaFFmpegExport=exportVideoFast;
  window.exportVideo=exportVideoFast;
  window.linaFastExport=fastWebCodecsExport;
})();