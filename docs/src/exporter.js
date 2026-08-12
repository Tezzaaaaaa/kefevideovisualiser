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

export async function exportVideo({ canvas, audioEl, fps = 30, onProgress, onFinalizing, onDone, onError, onCancel }) {
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

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
