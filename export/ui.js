import { exportVideo } from './index.js';

const $ = id => document.getElementById(id);
const PRESETS = Object.freeze({
  '1080p': { size: 1080, fps: 30 },
  '720p': { size: 720, fps: 30 },
  '480p': { size: 480, fps: 30 },
  instagram: { size: 1080, fps: 30, forceVertical: true },
  tiktok: { size: 1080, fps: 30, forceVertical: true }
});

function getConfig(preset) {
  const selected = PRESETS[preset] || PRESETS['720p'];
  const aspect = selected.forceVertical ? '9:16' : (window.state?.aspect || '9:16');
  const [a, b] = aspect.split(':').map(Number);
  const size = selected.size;
  return aspect === '16:9'
    ? { width: Math.round(size * 16 / 9), height: size, fps: selected.fps }
    : { width: size, height: Math.round(size * b / a), fps: selected.fps };
}

function buildFilename() {
  const clean = v => String(v || '').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ');
  return `${clean(window.state?.audio?.metadata?.title) || 'Untitled'} - ${clean(window.state?.audio?.metadata?.artist) || 'Unknown Artist'} - KEFE Visualiser.mp4`;
}

function updateUI(percent, message) {
  if ($('exportStatus')) $('exportStatus').textContent = message || 'Exporting…';
  if ($('exportPct')) $('exportPct').textContent = `${Math.round(percent)}%`;
  if ($('exportProgress')) $('exportProgress').value = percent;
}

function getFFmpeg() {
  return window.kefeFFmpeg || window.ffmpeg;
}

async function runExport() {
  const state = window.state;
  const previewCanvas = window.canvas;
  const redraw = window.redrawCurrentPreviewFrame;
  const audioFile = state?.audio?.file;
  const duration = Number(state?.audio?.duration);
  const ffmpeg = getFFmpeg();

  if (!state || !previewCanvas || typeof redraw !== 'function') throw new Error('KEFE preview is not ready');
  if (!audioFile) throw new Error('No audio loaded');
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Audio duration is unavailable');
  if (!ffmpeg) throw new Error('FFmpeg is not loaded');
  if (typeof ffmpeg.writeFile !== 'function' || typeof ffmpeg.exec !== 'function') throw new Error('FFmpeg is not ready');

  const config = getConfig($('exportPreset')?.value);
  const target = document.createElement('canvas');
  target.width = config.width;
  target.height = config.height;
  const ctx = target.getContext('2d');

  for (let frame = 0; frame < Math.ceil(duration * config.fps); frame++) {
    if (window.kefeExportAbort?.signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
    const time = frame / config.fps;
    state.playback.currentTime = time;
    redraw();
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(previewCanvas, 0, 0, target.width, target.height);
    const blob = await new Promise((resolve, reject) => target.toBlob(b => b ? resolve(b) : reject(new Error('Could not render export frame')), 'image/jpeg', 0.92));
    await ffmpeg.writeFile(`frame_${String(frame).padStart(5, '0')}.jpg`, new Uint8Array(await blob.arrayBuffer()));
    updateUI(frame / Math.ceil(duration * config.fps) * 80, `Rendering frame ${frame + 1}`);
  }

  await ffmpeg.writeFile('input-audio', new Uint8Array(await audioFile.arrayBuffer()));
  updateUI(85, 'Encoding MP4…');
  const outputName = 'kefe-output.mp4';
  await ffmpeg.exec(['-framerate', String(config.fps), '-i', 'frame_%05d.jpg', '-i', 'input-audio', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outputName]);
  const data = await ffmpeg.readFile(outputName);
  if (!data?.byteLength) throw new Error('FFmpeg produced an empty MP4');
  return { blob: new Blob([data.buffer], { type: 'video/mp4' }), filename: buildFilename() };
}

window.startOfflineExport = async () => {
  if (window.isExporting) return;
  window.isExporting = true;
  window.kefeExportAbort = new AbortController();
  $('exportOverlay')?.classList.remove('hidden');
  try {
    const result = await runExport();
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    updateUI(100, 'Export complete');
  } catch (error) {
    updateUI(0, `Export failed: ${error.message || error}`);
    console.error('[KEFE] Export failed:', error);
  } finally {
    window.isExporting = false;
    window.kefeExportAbort = null;
  }
};

window.kefeCancelExport = () => window.kefeExportAbort?.abort();
console.info('[KEFE] Modular export loaded');
