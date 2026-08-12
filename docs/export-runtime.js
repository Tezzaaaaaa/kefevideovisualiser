// exporter.js — the single owner of the export lifecycle.
// The preview canvas remains the only rendering source. Audio `ended`, a
// currentTime boundary, and a duration watchdog converge on one finaliser.

let sharedAudioCtx = null;
let sharedSource = null;
let sharedAudioElement = null;

function getAudioGraph(audioEl) {
  if (!sharedAudioCtx) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) throw new Error("This browser does not support Web Audio export.");
    sharedAudioCtx = new AudioContextCtor();
  }
  if (!sharedSource) {
    sharedSource = sharedAudioCtx.createMediaElementSource(audioEl);
    sharedAudioElement = audioEl;
    sharedSource.connect(sharedAudioCtx.destination);
  } else if (sharedAudioElement !== audioEl) {
    throw new Error("The export audio source changed. Reload the page and try again.");
  }
  const destination = sharedAudioCtx.createMediaStreamDestination();
  sharedSource.connect(destination);
  return { context: sharedAudioCtx, destination };
}

function pickMimeType() {
  const candidates = [
    { mime: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mime: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mime: "video/webm", extension: "webm" },
    { mime: "video/mp4;codecs=h264,aac", extension: "mp4" },
    { mime: "video/mp4", extension: "mp4" },
  ];
  if (!window.MediaRecorder) return null;
  if (typeof MediaRecorder.isTypeSupported !== "function") return { mime: "", extension: "webm" };
  return candidates.find(({ mime }) => MediaRecorder.isTypeSupported(mime)) || { mime: "", extension: "webm" };
}

function waitForSeek(audioEl, time) {
  return new Promise((resolve, reject) => {
    if (Math.abs(audioEl.currentTime - time) < 0.01) return resolve();
    const cleanup = () => {
      clearTimeout(timeout);
      audioEl.removeEventListener("seeked", onSeeked);
    };
    const onSeeked = () => { cleanup(); resolve(); };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("The audio could not seek to the beginning."));
    }, 3000);
    audioEl.addEventListener("seeked", onSeeked, { once: true });
    audioEl.currentTime = time;
  });
}

async function exportVideo({ canvas, audioEl, fps = 30, renderFrame, onProgress, onFinalizing, onDone, onError, onCancel }) {
  if (!canvas?.captureStream) throw new Error("This browser cannot record the preview canvas.");
  const duration = audioEl.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Audio duration is unknown — wait for the track to load, then try again.");
  }
  const selectedFormat = pickMimeType();
  if (!selectedFormat) throw new Error("This browser does not support video recording.");

  const { context, destination } = getAudioGraph(audioEl);
  if (context.state === "suspended") await context.resume();
  await waitForSeek(audioEl, 0);

  const videoStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
  const options = { videoBitsPerSecond: 10_000_000 };
  if (selectedFormat.mime) options.mimeType = selectedFormat.mime;

  let recorder;
  try {
    recorder = new MediaRecorder(combinedStream, options);
  } catch (error) {
    combinedStream.getTracks().forEach((track) => track.stop());
    try { sharedSource.disconnect(destination); } catch { /* already disconnected */ }
    throw new Error(`The browser could not start the video recorder: ${error.message}`);
  }

  const chunks = [];
  let phase = "recording";
  let terminal = false;
  let stopFallback = null;
  let durationWatchdog = null;
  let animationFrame = null;

  const cleanup = () => {
    cancelAnimationFrame(animationFrame);
    clearTimeout(stopFallback);
    clearTimeout(durationWatchdog);
    audioEl.removeEventListener("ended", finishRecording);
    combinedStream.getTracks().forEach((track) => track.stop());
    try { sharedSource.disconnect(destination); } catch { /* already disconnected */ }
  };

  const fail = (error) => {
    if (terminal) return;
    terminal = true;
    phase = "failed";
    audioEl.pause();
    if (recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* recorder already failed */ }
    }
    cleanup();
    onError?.(error instanceof Error ? error : new Error(String(error)));
  };

  const complete = () => {
    if (terminal) return;
    terminal = true;
    phase = "completed";
    audioEl.pause();
    cleanup();
    const type = recorder.mimeType || selectedFormat.mime || "video/webm";
    const blob = new Blob(chunks, { type });
    if (!blob.size) return onError?.(new Error("The browser produced an empty video file."));
    onDone?.(blob, { mimeType: type, extension: selectedFormat.extension });
  };

  function finishRecording() {
    if (phase !== "recording") return;
    phase = "finalizing";
    audioEl.pause();
    onProgress?.(1);
    onFinalizing?.();
    try { if (recorder.state === "recording") recorder.requestData(); } catch { /* optional */ }
    try {
      if (recorder.state !== "inactive") recorder.stop();
      else complete();
    } catch (error) {
      fail(error);
      return;
    }
    stopFallback = setTimeout(() => {
      if (!terminal) fail(new Error("The browser could not finalise the recording."));
    }, 8000);
  }

  const monitor = () => {
    if (phase !== "recording") return;
    const currentTime = Math.min(duration, audioEl.currentTime || 0);
    renderFrame?.(currentTime);
    onProgress?.(currentTime / duration);
    if (audioEl.ended || currentTime >= duration - 0.05) return finishRecording();
    animationFrame = requestAnimationFrame(monitor);
  };

  const cancel = () => {
    if (terminal) return;
    terminal = true;
    phase = "cancelled";
    audioEl.pause();
    if (recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* already stopped */ }
    }
    cleanup();
    onCancel?.();
  };

  recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
  recorder.onstop = complete;
  recorder.onerror = (event) => fail(event.error || new Error("Recorder error"));
  audioEl.addEventListener("ended", finishRecording);
  durationWatchdog = setTimeout(finishRecording, Math.ceil(duration * 1000) + 5000);

  renderFrame?.(0);
  recorder.start(250);
  try {
    await audioEl.play();
  } catch (error) {
    fail(new Error(`Audio playback could not start: ${error.message}`));
    throw error;
  }
  animationFrame = requestAnimationFrame(monitor);

  return { cancel, get phase() { return phase; }, recorder };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

// Original LINA site adapter. This is the only site-specific layer: it supplies
// the existing canvas renderer and connects the existing export controls.
(()=>{
  const $=selector=>document.querySelector(selector);
  let job=null;

  function drawFrame(context,background,time,width,height){
    const milliseconds=time*1000;
    if(background?.tagName==='VIDEO')syncBgVideo(time,false,background);
    context.fillStyle='#171719';context.fillRect(0,0,width,height);
    if(background){try{drawCover(context,background,width,height)}catch{}}
    else{
      const gradient=context.createLinearGradient(0,0,width,height);
      gradient.addColorStop(0,'#5e35b1');gradient.addColorStop(.56,'#d81b60');gradient.addColorStop(1,'#fb8c00');
      context.fillStyle=gradient;context.fillRect(0,0,width,height);
    }
    context.fillStyle=`rgba(0,0,0,${Number($('#dim')?.value||0)/100})`;context.fillRect(0,0,width,height);
    const entrance=entranceMs(),titleWindow=titleWindowMs();
    if(titleWindow>0&&milliseconds<titleWindow&&milliseconds<entrance)drawIntro(context,width,height);
    if(milliseconds>=entrance)drawApple(context,lines[ci(milliseconds)]||lines[0],milliseconds,width,height);
  }

  function clean(value){return String(value||'').trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').replace(/\s+/g,' ').slice(0,90)}
  function outputName(extension){
    const title=clean($('#titleInput')?.value)||'LINA lyric video',artist=clean($('#artistInput')?.value);
    return`${title}${artist?` - ${artist}`:''}.${extension}`;
  }
  function setProgress(value,message){
    if($('#progress'))$('#progress').value=Math.max(0,Math.min(1,value))*100;
    if(message){if($('#renderText'))$('#renderText').textContent=message;status(message)}
  }
  async function deliver(blob,meta){
    const file=new File([blob],outputName(meta.extension),{type:meta.mimeType});
    if(navigator.canShare?.({files:[file]})){
      try{await navigator.share({files:[file],title:file.name.replace(/\.[^.]+$/,'')});return}catch(error){if(error?.name==='AbortError')return}
    }
    downloadBlob(blob,file.name);
  }
  async function start(){
    if(job)return status('An export is already running.');
    if(!audioFile||!lines.length)return status('Add audio and synced lyrics before exporting.');
    const canvas=$('#canvas'),audioEl=$('#audio'),quality=Number($('#quality')?.value||720);
    const [width,height]=dims(quality,$('#aspect')?.value||'9:16');
    canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d',{alpha:false}),background=bgMedia;
    setProgress(0,'Preparing export…');
    try{
      job=await exportVideo({
        canvas,audioEl,fps:quality>=1080?24:30,
        renderFrame:time=>drawFrame(context,background,time,width,height),
        onProgress:value=>setProgress(value,`Rendering ${ft(value*audioEl.duration)} of ${ft(audioEl.duration)}`),
        onFinalizing:()=>setProgress(1,'Finalising video…'),
        onDone:async(blob,meta)=>{job=null;setProgress(1,'Export complete.');await deliver(blob,meta)},
        onError:error=>{job=null;console.error('LINA export failed',error);status(`Export failed: ${error.message}`)},
        onCancel:()=>{job=null;status('Export cancelled.')}
      });
    }catch(error){job=null;console.error('LINA export failed',error);status(`Export failed: ${error.message}`)}
  }

  for(const id of['exportBtn','exportBottomBtn']){
    const button=$('#'+id);if(button){button.onclick=start;button.dataset.linaOwner='export-runtime'}
  }
  $('#cancel')?.addEventListener('click',()=>job?.cancel());
  window.exportVideo=start;
  window.linaExport=start;
  window.linaRequestExportCancel=()=>job?.cancel();
  window.linaExportState=()=>({active:!!job,cancellable:!!job,phase:job?.phase||'idle'});
  document.documentElement.dataset.exportOwner='export-runtime';
})();
