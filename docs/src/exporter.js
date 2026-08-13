// The only export implementation. Each export owns one playback clock:
// exportAudio.currentTime. Preview state, lyrics and background video follow
// that same time through onTime; the normal preview audio stays paused.

const FORMATS = [
  ["video/webm;codecs=vp9,opus", "webm"],
  ["video/webm;codecs=vp8,opus", "webm"],
  ["video/webm", "webm"],
  ["video/mp4;codecs=h264,aac", "mp4"],
  ["video/mp4", "mp4"],
];

function recordingFormat() {
  if (typeof MediaRecorder === "undefined") throw new Error("Video export is not supported by this browser.");
  if (typeof MediaRecorder.isTypeSupported !== "function") return { mimeType: "", extension: "webm" };
  const match = FORMATS.find(([type]) => MediaRecorder.isTypeSupported(type));
  if (!match) throw new Error("This browser has no supported video export format.");
  return { mimeType: match[0], extension: match[1] };
}

function waitForAudio(audio) {
  return new Promise((resolve, reject) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) return resolve();
    const finish = error => {
      clearTimeout(timer);
      audio.removeEventListener("loadedmetadata", loaded);
      audio.removeEventListener("error", failed);
      error ? reject(error) : resolve();
    };
    const loaded = () => finish();
    const failed = () => finish(new Error("The audio file could not be opened for export."));
    const timer = setTimeout(() => finish(new Error("The audio file did not load for export.")), 10_000);
    audio.addEventListener("loadedmetadata", loaded, { once: true });
    audio.addEventListener("error", failed, { once: true });
    audio.load();
  });
}

export async function exportVideo({ canvas, audioEl, fps = 60, onTime, onProgress, onFinalizing, onDone, onError, onCancel }) {
  if (typeof canvas?.captureStream !== "function") throw new Error("Canvas video export is not supported by this browser.");
  const sourceUrl = audioEl.currentSrc || audioEl.src;
  if (!sourceUrl) throw new Error("Load an audio file before exporting.");

  const format = recordingFormat();
  const exportAudio = new Audio();
  exportAudio.preload = "auto";
  exportAudio.src = sourceUrl;
  await waitForAudio(exportAudio);
  const duration = exportAudio.duration;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("The audio duration is invalid.");

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Audio export is not supported by this browser.");
  const audioContext = new AudioContextClass();
  const audioSource = audioContext.createMediaElementSource(exportAudio);
  const audioOutput = audioContext.createMediaStreamDestination();
  audioSource.connect(audioOutput);

  const canvasStream = canvas.captureStream(fps);
  const outputStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioOutput.stream.getAudioTracks()]);
  const options = { videoBitsPerSecond: 14_000_000 };
  if (format.mimeType) options.mimeType = format.mimeType;

  let recorder;
  try {
    recorder = new MediaRecorder(outputStream, options);
  } catch (error) {
    outputStream.getTracks().forEach(track => track.stop());
    await audioContext.close();
    throw new Error(`Video recording could not start: ${error.message}`);
  }

  let phase = "starting";
  let frame = 0;
  let watchdog = 0;
  let cancelRun = () => {};
  const chunks = [];

  const result = new Promise(resolve => {
    let settled = false;
    const cleanup = async () => {
      cancelAnimationFrame(frame);
      clearTimeout(watchdog);
      exportAudio.pause();
      exportAudio.removeAttribute("src");
      outputStream.getTracks().forEach(track => track.stop());
      try { audioSource.disconnect(); } catch {}
      if (audioContext.state !== "closed") await audioContext.close().catch(() => {});
    };
    const settle = async outcome => {
      if (settled) return;
      settled = true;
      await cleanup();
      resolve(outcome);
    };
    const fail = error => {
      phase = "failed";
      if (recorder.state !== "inactive") try { recorder.stop(); } catch {}
      settle({ type: "error", error: error instanceof Error ? error : new Error(String(error)) });
    };
    const stop = () => {
      if (phase !== "recording") return;
      phase = "finalizing";
      onTime?.(duration);
      onProgress?.(1);
      onFinalizing?.();
      try {
        recorder.requestData();
        recorder.stop();
      } catch (error) { fail(error); }
    };
    const monitor = () => {
      if (phase !== "recording") return;
      const time = Math.min(duration, exportAudio.currentTime || 0);
      onTime?.(time);
      onProgress?.(time / duration);
      if (exportAudio.ended || time >= duration - 0.02) stop();
      else frame = requestAnimationFrame(monitor);
    };

    recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
    recorder.onerror = event => fail(event.error || new Error("The video recorder failed."));
    recorder.onstop = () => {
      if (settled) return;
      const mimeType = recorder.mimeType || format.mimeType || "video/webm";
      const blob = new Blob(chunks, { type: mimeType });
      if (!blob.size) return fail(new Error("The exported video file was empty."));
      phase = "completed";
      settle({ type: "done", blob, info: { mimeType, extension: format.extension, fps } });
    };
    exportAudio.addEventListener("ended", stop, { once: true });

    cancelRun = () => {
      if (settled) return;
      phase = "cancelled";
      recorder.onstop = null;
      if (recorder.state !== "inactive") try { recorder.stop(); } catch {}
      settle({ type: "cancel" });
    };

    (async () => {
      try {
        if (audioContext.state === "suspended") await audioContext.resume();
        onTime?.(0);
        recorder.start(125);
        phase = "recording";
        await exportAudio.play();
        frame = requestAnimationFrame(monitor);
        watchdog = setTimeout(stop, Math.ceil(duration * 1000) + 5000);
      } catch (error) { fail(new Error(`Export playback could not start: ${error.message}`)); }
    })();
  });

  const job = { cancel: () => cancelRun(), get phase() { return phase; }, recorder };
  result.then(outcome => {
    if (outcome.type === "done") onDone?.(outcome.blob, outcome.info);
    else if (outcome.type === "cancel") onCancel?.();
    else onError?.(outcome.error);
  });
  return job;
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
