(() => {
    const FF_VERSION = '0.12.10';
    const CORE_VERSION = '0.12.6';
    const UTIL_VERSION = '0.12.2';
    let encoder = null;
    let encoderLoad = null;

    const setExportStage = (text, percent = null) => {
        const status = document.getElementById('exportStatus');
        const pct = document.getElementById('exportPct');
        const progress = document.getElementById('exportProgress');
        if (status) status.textContent = text;
        if (percent !== null && Number.isFinite(percent)) {
            const value = Math.max(0, Math.min(100, percent));
            if (pct) pct.textContent = `${Math.round(value)}%`;
            if (progress) progress.value = value;
        }
    };

    const fetchAsBlobURL = async (url, mime, label) => {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`${label} failed to download (${response.status})`);
        const total = Number(response.headers.get('content-length')) || 0;
        const reader = response.body?.getReader();
        if (!reader) return URL.createObjectURL(await response.blob());
        const chunks = [];
        let received = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                chunks.push(value);
                received += value.byteLength;
                if (total) setExportStage(`${label}… ${Math.round(received / total * 100)}%`, received / total * 25);
            }
        }
        return URL.createObjectURL(new Blob(chunks, { type: mime }));
    };

    const loadEncoder = async () => {
        if (encoder) return encoder;
        if (encoderLoad) return encoderLoad;
        encoderLoad = (async () => {
            setExportStage('Loading frame-accurate encoder…', 0);
            const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
                import(`https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/index.js`),
                import(`https://cdn.jsdelivr.net/npm/@ffmpeg/util@${UTIL_VERSION}/dist/esm/index.js`)
            ]);
            const ffmpeg = new FFmpeg();
            ffmpeg.on('log', ({ message }) => console.debug('[KEFE FFmpeg]', message));
            const base = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
            const coreURL = await fetchAsBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript', 'Loading encoder core');
            const wasmURL = await fetchAsBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm', 'Loading encoder WASM');
            try {
                setExportStage('Starting frame-accurate encoder…', 25);
                await ffmpeg.load({ coreURL, wasmURL });
            } finally {
                URL.revokeObjectURL(coreURL);
                URL.revokeObjectURL(wasmURL);
            }
            encoder = ffmpeg;
            setExportStage('Encoder ready', 25);
            return ffmpeg;
        })();
        try { return await encoderLoad; }
        catch (error) { encoderLoad = null; throw error; }
    };

    const frameToBytes = (canvas) => new Promise((resolve, reject) => {
        canvas.toBlob(async blob => {
            if (!blob) return reject(new Error('Could not encode rendered frame'));
            try { resolve(new Uint8Array(await blob.arrayBuffer())); }
            catch (error) { reject(error); }
        }, 'image/jpeg', 0.9);
    });

    const runWithTimeout = async (ffmpeg, args, timeoutMs, stage) => {
        let timer;
        try {
            return await Promise.race([
                ffmpeg.exec(args),
                new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error(`${stage} timed out after ${Math.round(timeoutMs / 60000)} minutes`)), timeoutMs);
                })
            ]);
        } finally { clearTimeout(timer); }
    };

    const cleanExport = async () => {
        if (isExporting || document.getElementById('exportBtn')?.disabled) return;
        const duration = Number.isFinite(state.audio.duration) && state.audio.duration > 0 ? state.audio.duration : Number(audio.duration) || 0;
        if (!duration) { toast('Could not determine audio duration', 'error'); return; }
        if (!state.audio.file) { toast('Audio file is needed for frame-accurate export', 'error'); return; }

        ensureDefaultBackground();
        const config = getExportDimensions(document.getElementById('exportPreset').value);
        const totalFrames = Math.max(1, Math.ceil(duration * config.fps));
        const framesPerSegment = Math.max(config.fps, Math.floor(config.fps * (config.width * config.height > 1500000 ? 2 : 4)));
        const segmentCount = Math.ceil(totalFrames / framesPerSegment);
        const tempFiles = new Set();
        const segments = [];
        let canvas = null;
        let ctx = null;

        isExporting = true;
        exportCancelled = false;
        previewRestored = false;
        previewTimeBeforeExport = audio.currentTime || 0;
        audio.pause();
        exportAbortController = new AbortController();
        document.getElementById('exportOverlay').classList.remove('hidden');
        document.getElementById('exportPreset').disabled = true;

        try {
            if (state.style.effect === 'eternal' && !(await ensureEternalFont())) throw new Error('Homemade Apple font could not be loaded');

            const ffmpeg = await loadEncoder();
            if (exportCancelled) throw new DOMException('Export cancelled', 'AbortError');

            canvas = createOffscreenExportCanvas(config);
            ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error('Could not create export canvas');
            if (media.video) { media.video.pause(); media.video.muted = true; media.video.loop = true; }

            for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
                const firstFrame = segmentIndex * framesPerSegment;
                const count = Math.min(framesPerSegment, totalFrames - firstFrame);
                const frameNames = [];
                setExportStage(`Rendering segment ${segmentIndex + 1} of ${segmentCount}…`, 25 + (firstFrame / totalFrames) * 50);

                for (let local = 0; local < count; local++) {
                    if (exportAbortController.signal.aborted || exportCancelled) throw new DOMException('Export cancelled', 'AbortError');
                    const frameIndex = firstFrame + local;
                    const time = frameIndex / config.fps;
                    if (media.video && Number.isFinite(media.video.duration) && media.video.duration > 0) {
                        await seekVideoForExport(media.video, wrappedVideoTime(time, media.video.duration), exportAbortController.signal);
                    }
                    exportClockTime = time;
                    state.playback.currentTime = time;
                    render(ctx, config.width, config.height, state, media);
                    const name = `seg${String(segmentIndex).padStart(4, '0')}_${String(local).padStart(5, '0')}.jpg`;
                    await ffmpeg.writeFile(name, await frameToBytes(canvas));
                    tempFiles.add(name);
                    frameNames.push(name);
                    const renderPct = 25 + ((frameIndex + 1) / totalFrames) * 50;
                    setExportStage(`Rendering segment ${segmentIndex + 1} of ${segmentCount}…`, renderPct);
                    if ((local & 3) === 0) await new Promise(requestAnimationFrame);
                }

                const segmentName = `segment${String(segmentIndex).padStart(4, '0')}.mp4`;
                setExportStage(`Encoding segment ${segmentIndex + 1} of ${segmentCount}…`, 75 + (segmentIndex / segmentCount) * 10);
                await runWithTimeout(ffmpeg, [
                    '-framerate', String(config.fps),
                    '-start_number', '0',
                    '-i', `seg${String(segmentIndex).padStart(4, '0')}_%05d.jpg`,
                    '-frames:v', String(count),
                    '-an',
                    '-c:v', 'libx264',
                    '-preset', 'veryfast',
                    '-crf', '20',
                    '-pix_fmt', 'yuv420p',
                    '-threads', '1',
                    '-movflags', '+faststart',
                    segmentName
                ], Math.max(120000, count * 2500), `Encoding segment ${segmentIndex + 1}`);
                segments.push(segmentName);
                tempFiles.add(segmentName);
                for (const name of frameNames) { try { await ffmpeg.deleteFile(name); } catch {} tempFiles.delete(name); }
            }

            setExportStage('Adding audio and finishing MP4…', 90);
            const extMatch = /\.([a-z0-9]+)$/i.exec(state.audio.file.name || '');
            const audioName = `audio_input.${(extMatch?.[1] || 'mp3').toLowerCase()}`;
            await ffmpeg.writeFile(audioName, new Uint8Array(await state.audio.file.arrayBuffer()));
            tempFiles.add(audioName);
            const concatName = 'segments.txt';
            await ffmpeg.writeFile(concatName, new TextEncoder().encode(segments.map(name => `file '${name}'`).join('\n') + '\n'));
            tempFiles.add(concatName);

            const outputName = 'kefe-output.mp4';
            tempFiles.add(outputName);
            await runWithTimeout(ffmpeg, [
                '-f', 'concat', '-safe', '0', '-i', concatName,
                '-i', audioName,
                '-map', '0:v:0', '-map', '1:a:0',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                '-shortest', '-movflags', '+faststart', outputName
            ], Math.max(120000, duration * 10000), 'Final MP4 assembly');

            setExportStage('Preparing download…', 99);
            const data = await ffmpeg.readFile(outputName);
            if (!data?.byteLength || data.byteLength < 1024) throw new Error('Encoder produced an empty MP4');
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = buildExportFilename('mp4');
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
            setExportStage('Export complete', 100);
            toast('Export complete', 'success');
        } catch (error) {
            console.error('[KEFE] Export failed:', error);
            if (error?.name === 'AbortError' || exportCancelled) toast('Export cancelled');
            else { setExportStage(`Export failed: ${error?.message || 'unknown error'}`); toast(`Export failed: ${error?.message || 'unknown error'}`, 'error'); }
        } finally {
            if (encoder) {
                for (const name of tempFiles) { try { await encoder.deleteFile(name); } catch {} }
                try { await encoder.terminate(); } catch {}
            }
            encoder = null;
            encoderLoad = null;
            if (canvas?.isConnected) canvas.remove();
            exportCanvas = null;
            exportCtx = null;
            exportAbortController = null;
            isExporting = false;
            exportCancelled = false;
            document.getElementById('exportPreset').disabled = false;
            setTimeout(() => document.getElementById('exportOverlay').classList.add('hidden'), 1200);
            restorePreviewAfterExport();
        }
    };

    window.startOfflineExport = cleanExport;
    console.info(`[KEFE] Clean export pipeline loaded: @ffmpeg/ffmpeg ${FF_VERSION} + @ffmpeg/core ${CORE_VERSION}`);
})();
