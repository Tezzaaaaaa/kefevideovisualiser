/*
 * KEFE fast exporter
 *
 * Replaces the JPEG -> ffmpeg.wasm export path with Mediabunny's native
 * WebCodecs-backed CanvasSource/AudioBufferSource pipeline. The existing
 * renderer remains the source of truth, so lyric timing and visual effects
 * stay frame-accurate while video encoding can use the browser's native
 * H.264 encoder instead of a single-threaded WASM libx264 process.
 */

(() => {
    const MEDIABUNNY_URL = 'https://cdn.jsdelivr.net/npm/mediabunny@1.52.2/+esm';
    let mediabunnyPromise = null;
    let fastExportRunning = false;

    function loadMediabunny() {
        if (!mediabunnyPromise) {
            mediabunnyPromise = import(MEDIABUNNY_URL).catch(error => {
                mediabunnyPromise = null;
                throw error;
            });
        }
        return mediabunnyPromise;
    }

    function fastExportSupported() {
        return typeof VideoEncoder !== 'undefined' &&
            typeof VideoFrame !== 'undefined' &&
            typeof AudioContext !== 'undefined';
    }

    function bitrateFor(width, height) {
        const pixels = width * height;
        if (pixels >= 1920 * 1080) return 8_000_000;
        if (pixels >= 1280 * 720) return 5_000_000;
        return 3_000_000;
    }

    async function decodeAudioForExport(file) {
        const bytes = await file.arrayBuffer();
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextCtor();
        try {
            return await audioContext.decodeAudioData(bytes.slice(0));
        } finally {
            try { await audioContext.close(); } catch (e) {}
        }
    }

    function setExportProgress(percent, status) {
        const pct = Math.max(0, Math.min(100, percent));
        const pctEl = document.getElementById('exportPct');
        const progressEl = document.getElementById('exportProgress');
        const statusEl = document.getElementById('exportStatus');
        if (pctEl) pctEl.textContent = Math.round(pct) + '%';
        if (progressEl) progressEl.value = pct;
        if (statusEl && status) statusEl.textContent = status;
    }

    async function startFastExport() {
        if (fastExportRunning || isExporting) return;
        if (!fastExportSupported()) {
            toast('Fast export needs WebCodecs. Use a current Chrome, Edge, or Safari release.', 'error');
            return;
        }

        const issues = projectValidationIssues();
        if (issues.length) {
            toast('Before export, add: ' + issues.join(', '), 'error');
            return;
        }

        ensureDefaultBackground();
        const config = getExportDimensions(document.getElementById('exportPreset').value);
        const duration = Number(state.audio.duration) || Number(audio.duration) || 0;
        if (!duration || !state.audio.file) {
            toast('Audio file is needed for export', 'error');
            return;
        }

        const totalFrames = Math.ceil(duration * config.fps);
        const frameDuration = 1 / config.fps;
        const bitrate = bitrateFor(config.width, config.height);
        const presetEl = document.getElementById('exportPreset');

        fastExportRunning = true;
        isExporting = true;
        offlineExportActive = false;
        exportCancelled = false;
        previewRestored = false;
        previewTimeBeforeExport = audio.currentTime || 0;
        exportAbortController = new AbortController();
        audio.pause();
        if (presetEl) presetEl.disabled = true;
        document.getElementById('exportOverlay')?.classList.remove('hidden');
        setExportProgress(0, 'Loading native video encoder…');

        let output = null;
        let videoSource = null;
        let audioSource = null;
        let exportAudioBuffer = null;

        try {
            const {
                Output,
                Mp4OutputFormat,
                BufferTarget,
                CanvasSource,
                AudioBufferSource,
                Quality,
            } = await loadMediabunny();

            if (exportCancelled || exportAbortController.signal.aborted) {
                throw new DOMException('Export cancelled', 'AbortError');
            }

            if (state.style.effect === 'eternal') {
                const ready = await ensureEternalFont();
                if (!ready) throw new Error('Homemade Apple font could not be loaded');
            }

            setExportProgress(2, 'Preparing audio…');
            exportAudioBuffer = await decodeAudioForExport(state.audio.file);

            if (exportCancelled || exportAbortController.signal.aborted) {
                throw new DOMException('Export cancelled', 'AbortError');
            }

            exportCanvas = createOffscreenExportCanvas(config);
            exportCtx = exportCanvas.getContext('2d', { alpha: false, desynchronized: true });
            if (!exportCtx) throw new Error('Could not create export canvas');

            if (media.video) {
                media.video.pause();
                media.video.muted = true;
                media.video.loop = true;
            }

            output = new Output({
                format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
                target: new BufferTarget(),
            });

            videoSource = new CanvasSource(exportCanvas, {
                codec: 'avc',
                quality: new Quality({ bitrate }),
            });
            audioSource = new AudioBufferSource({
                codec: 'aac',
                bitrate: 192_000,
            });

            output.addVideoTrack(videoSource, { frameRate: config.fps });
            output.addAudioTrack(audioSource);
            output.setMetadataTags({
                title: state.audio.metadata.title || '',
                artist: state.audio.metadata.artist || '',
                album: state.audio.metadata.album || '',
            });

            await output.start();

            // Audio is encoded by the browser's native WebCodecs AAC encoder.
            // It is fed directly from the decoded AudioBuffer rather than being
            // written to a virtual FFmpeg filesystem and transcoded again.
            setExportProgress(5, 'Encoding audio…');
            await audioSource.add(exportAudioBuffer);
            audioSource.close();

            // Render the exact same timestamps used by the existing preview.
            // CanvasSource hands each canvas frame directly to WebCodecs, so no
            // JPEG files, WASM filesystem writes, or intermediate MP4 segments
            // are created.
            for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
                if (exportCancelled || exportAbortController.signal.aborted) {
                    throw new DOMException('Export cancelled', 'AbortError');
                }

                const frameTime = frameIndex / config.fps;
                if (media.video && Number.isFinite(media.video.duration) && media.video.duration > 0) {
                    await seekVideoForExport(
                        media.video,
                        wrappedVideoTime(frameTime, media.video.duration),
                        exportAbortController.signal
                    );
                }

                exportClockTime = frameTime;
                state.playback.currentTime = frameTime;
                render(exportCtx, config.width, config.height, state, media);

                await videoSource.add(frameTime, frameDuration);

                // Give the browser a chance to service UI/cancel events without
                // forcing the export to run at real-time speed.
                if ((frameIndex & 7) === 0) {
                    const progress = 5 + ((frameIndex + 1) / totalFrames) * 90;
                    setExportProgress(progress, `Rendering frame ${frameIndex + 1} of ${totalFrames}…`);
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            videoSource.close();
            setExportProgress(97, 'Finalising MP4…');
            await output.finalize();

            if (exportCancelled || exportAbortController.signal.aborted) {
                throw new DOMException('Export cancelled', 'AbortError');
            }

            const buffer = output.target.buffer;
            if (!buffer || buffer.byteLength < 1024) {
                throw new Error('Encoder produced an empty MP4');
            }

            const blob = new Blob([buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = buildExportFilename('mp4');
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60_000);

            setExportProgress(100, 'Done');
            toast('Export complete', 'success');
        } catch (error) {
            if (error?.name === 'AbortError' || exportCancelled || exportAbortController?.signal.aborted) {
                toast('Export cancelled');
            } else {
                console.error('Fast WebCodecs export error:', error);
                toast('Fast export failed: ' + (error?.message || 'unknown error'), 'error');
                const status = document.getElementById('exportStatus');
                if (status) status.textContent = 'Fast export failed — use the standard exporter if needed.';
            }
        } finally {
            try { videoSource?.close(); } catch (e) {}
            try { audioSource?.close(); } catch (e) {}
            try { await output?.cancel?.(); } catch (e) {}
            if (exportCanvas?.isConnected) {
                try { exportCanvas.remove(); } catch (e) {}
            }
            exportCanvas = null;
            exportCtx = null;
            exportClockTime = null;
            if (presetEl) presetEl.disabled = false;
            fastExportRunning = false;
            isExporting = false;
            exportAbortController = null;
            exportCancelled = false;
            setTimeout(() => document.getElementById('exportOverlay')?.classList.add('hidden'), 1200);
            try { restorePreviewAfterExport(); } catch (e) {}
        }
    }

    // The existing app attaches its normal FFmpeg exporter directly to the
    // confirmation button. Capture the click before it reaches that handler,
    // while leaving the rest of the application untouched.
    document.addEventListener('click', event => {
        if (event.target?.id !== 'confirmExport') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        startFastExport();
    }, true);

    // Replace the export capability warning with the actual fast-export check.
    // The normal FFmpeg fallback remains in app.js but is no longer selected by
    // the Export MP4 confirmation path.
    window.addEventListener('load', () => {
        if (!fastExportSupported()) {
            const info = document.getElementById('offlineExportInfo');
            if (info) info.textContent = 'Fast MP4 export needs a browser with WebCodecs. The standard exporter remains available as a fallback.';
        }
    });
})();
