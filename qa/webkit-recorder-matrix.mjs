import { webkit } from 'playwright';
import { execFileSync } from 'node:child_process';

const browser=await webkit.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:900,height:700}});
page.on('console',m=>console.log('WEBKIT MATRIX CONSOLE',m.type(),m.text()));
page.on('pageerror',e=>console.log('WEBKIT MATRIX PAGEERROR',e.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});

await page.evaluate(()=>{
  const button=document.createElement('button');button.id='recorderProbe';button.textContent='probe';button.style.position='fixed';button.style.top='8px';button.style.left='8px';button.style.zIndex='999999';document.body.appendChild(button);
  window.__probeVariant='video-only';
  window.__probeError='';
  button.onclick=async()=>{
    try{
      const variant=window.__probeVariant;
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;canvas.style.position='fixed';canvas.style.left='20px';canvas.style.top='60px';canvas.style.zIndex='999998';canvas.style.background='#000';document.body.appendChild(canvas);
      const ctx=canvas.getContext('2d');let tick=0;
      const paint=()=>{tick++;ctx.fillStyle=tick%2?'#ff0055':'#0055ff';ctx.fillRect(0,0,320,180);ctx.fillStyle='#fff';ctx.font='40px sans-serif';ctx.fillText(String(tick),120,105)};
      paint();
      const canvasStream=canvas.captureStream(30),videoTrack=canvasStream.getVideoTracks()[0];
      let ac=null,osc=null,dest=null,audioTrack=null;
      if(variant!=='video-only'){
        ac=new (window.AudioContext||window.webkitAudioContext)();await ac.resume();dest=ac.createMediaStreamDestination();osc=ac.createOscillator();osc.frequency.value=440;osc.connect(dest);osc.start();audioTrack=dest.stream.getAudioTracks()[0];
      }
      let stream;
      if(variant==='video-only')stream=new MediaStream([videoTrack]);
      else if(variant==='audio-first')stream=new MediaStream([audioTrack,videoTrack]);
      else if(variant==='mutated'){stream=canvasStream;stream.addTrack(audioTrack)}
      else stream=new MediaStream([videoTrack,audioTrack]);
      const explicit=variant==='explicit';
      const mime=explicit?'video/mp4;codecs=avc1.42E01E,mp4a.40.2':'video/mp4';
      console.log('probe start',variant,{video:stream.getVideoTracks().length,audio:stream.getAudioTracks().length,mime,supported:MediaRecorder.isTypeSupported(mime),vState:videoTrack?.readyState,vMuted:videoTrack?.muted});
      const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1500000,audioBitsPerSecond:128000});
      const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
      const stopped=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(e.error||new Error('recorder'))});
      rec.start(250);
      const timer=setInterval(()=>{paint();try{videoTrack.requestFrame?.()}catch{}},33);
      await new Promise(r=>setTimeout(r,1400));
      clearInterval(timer);rec.stop();await stopped;
      try{osc?.stop()}catch{};try{await ac?.close()}catch{}
      const blob=new Blob(chunks,{type:rec.mimeType||mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`probe-${variant}.mp4`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);canvas.remove();
      console.log('probe done',variant,{size:blob.size,type:blob.type,chunks:chunks.length});
    }catch(e){window.__probeError=String(e?.stack||e);console.error('probe failed',window.__probeVariant,e)}
  };
});

for(const variant of ['video-only','combined','audio-first','mutated','explicit']){
  await page.evaluate(v=>{window.__probeVariant=v;window.__probeError=''},variant);
  const downloadPromise=page.waitForEvent('download',{timeout:10000});
  await page.click('#recorderProbe');
  let download;
  try{download=await downloadPromise}catch(e){console.log('WEBKIT MATRIX RESULT',variant,'NO DOWNLOAD',await page.evaluate(()=>window.__probeError));continue}
  const path=await download.path();
  let info='';
  try{info=execFileSync('ffprobe',['-v','error','-show_entries','stream=index,codec_type,codec_name','-of','compact=p=0:nk=1',path],{encoding:'utf8'}).trim()}catch(e){info=`FFPROBE ERROR ${e.stderr||e.message}`}
  console.log('WEBKIT MATRIX RESULT',variant,JSON.stringify(info));
}
await browser.close();
