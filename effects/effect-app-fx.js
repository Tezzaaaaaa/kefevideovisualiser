/*
 * KEFE Visual FX — Effect.app-inspired real-time frame effects.
 *
 * This is an independent Canvas implementation inspired by the visual
 * vocabulary of modern browser effect editors: VHS, CRT, RGB separation,
 * bloom, motion blur, camera shake, glitch, halftone and vignette.
 * It does not import or copy Effect.app source code.
 */
(() => {
    'use strict';

    if (typeof window === 'undefined' || typeof window.render !== 'function') return;
    if (!window.state || !window.canvas) return;

    const FX_KEY = 'kefe-visual-fx-v1';
    const originalRender = window.render;
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d', { alpha: false });
    const scratchCanvas = document.createElement('canvas');
    const scratchCtx = scratchCanvas.getContext('2d', { alpha: true });

    const defaults = {
        visualFx: 'none',
        fxIntensity: 0.55,
        fxSpeed: 1,
        fxGrain: 0.18,
        fxScanlines: 0.24,
        fxRgbShift: 0.008,
        fxBlur: 0.18,
        fxShake: 0.18,
        fxVignette: 0.18,
        fxHalftone: 0.22
    };

    Object.assign(window.state.style, defaults, window.state.style);
    try {
        const saved = JSON.parse(localStorage.getItem(FX_KEY) || '{}');
        if (saved && typeof saved === 'object') Object.assign(window.state.style, saved);
    } catch (_) {}

    function clamp(v, min = 0, max = 1) {
        return Math.max(min, Math.min(max, Number(v) || 0));
    }

    function ensureBuffers(w, h) {
        if (sourceCanvas.width !== w || sourceCanvas.height !== h) {
            sourceCanvas.width = w;
            sourceCanvas.height = h;
        }
        if (scratchCanvas.width !== w || scratchCanvas.height !== h) {
            scratchCanvas.width = w;
            scratchCanvas.height = h;
        }
    }

    function savePrefs() {
        try {
            const s = window.state.style;
            localStorage.setItem(FX_KEY, JSON.stringify({
                visualFx: s.visualFx,
                fxIntensity: s.fxIntensity,
                fxSpeed: s.fxSpeed,
                fxGrain: s.fxGrain,
                fxScanlines: s.fxScanlines,
                fxRgbShift: s.fxRgbShift,
                fxBlur: s.fxBlur,
                fxShake: s.fxShake,
                fxVignette: s.fxVignette,
                fxHalftone: s.fxHalftone
            }));
        } catch (_) {}
    }

    function seeded(t, salt = 0) {
        const x = Math.sin(t * 12.9898 + salt * 78.233) * 43758.5453;
        return x - Math.floor(x);
    }

    function drawBase(ctx, source, w, h, transform = null) {
        ctx.save();
        if (transform) transform(ctx);
        ctx.drawImage(source, 0, 0, w, h);
        ctx.restore();
    }

    function drawVignette(ctx, w, h, amount) {
        if (amount <= 0) return;
        const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.72);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.62, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${clamp(amount, 0, 0.75)})`);
        ctx.save();
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    function drawScanlines(ctx, w, h, amount, density = 4) {
        if (amount <= 0) return;
        ctx.save();
        ctx.globalAlpha = clamp(amount, 0, 0.6);
        ctx.fillStyle = '#000';
        const step = Math.max(2, Math.round(density));
        for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, 1);
        ctx.restore();
    }

    function drawGrain(ctx, w, h, amount, time, density = 0.012) {
        if (amount <= 0) return;
        const grain = Math.max(1, Math.round(Math.min(w, h) * density));
        const count = Math.round(w * h * clamp(amount, 0, 0.35) * 0.015 / (grain * grain));
        ctx.save();
        ctx.globalAlpha = clamp(amount * 0.45, 0, 0.22);
        for (let i = 0; i < count; i++) {
            const x = Math.floor(seeded(time * 97 + i, 1) * w);
            const y = Math.floor(seeded(time * 89 + i, 2) * h);
            const v = seeded(time * 71 + i, 3) > 0.5 ? 255 : 0;
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x, y, grain, grain);
        }
        ctx.restore();
    }

    function rgbShift(ctx, source, w, h, amount, time) {
        const px = Math.max(1, Math.round(Math.min(w, h) * amount));
        if (px < 1) return;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.72;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(source, px, 0, w, h, 0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(source, 0, 0, w, h);
        ctx.restore();

        scratchCtx.clearRect(0, 0, w, h);
        scratchCtx.globalCompositeOperation = 'source-over';
        scratchCtx.globalAlpha = 0.82;
        scratchCtx.drawImage(source, -px, 0, w, h, 0, 0, w, h);
        scratchCtx.globalCompositeOperation = 'destination-in';
        scratchCtx.drawImage(source, 0, 0, w, h);
        ctx.save();
        ctx.globalAlpha = 0.36;
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(scratchCanvas, 0, 0);
        ctx.restore();
    }

    function bloom(ctx, source, w, h, amount) {
        if (amount <= 0) return;
        scratchCtx.clearRect(0, 0, w, h);
        scratchCtx.filter = `blur(${Math.max(1, Math.min(28, Math.min(w, h) * amount * 0.018))}px)`;
        scratchCtx.globalAlpha = clamp(amount * 0.42, 0, 0.45);
        scratchCtx.drawImage(source, 0, 0, w, h);
        scratchCtx.filter = 'none';
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = clamp(amount * 0.9, 0, 0.65);
        ctx.drawImage(scratchCanvas, 0, 0);
        ctx.restore();
    }

    function cameraShake(ctx, source, w, h, amount, time, speed) {
        const energy = amount * (0.45 + 0.55 * Math.sin(time * speed * 9.3) ** 2);
        const x = (seeded(time * speed * 7.1, 4) - 0.5) * w * 0.018 * energy;
        const y = (seeded(time * speed * 8.7, 5) - 0.5) * h * 0.018 * energy;
        const rot = (seeded(time * speed * 6.2, 6) - 0.5) * 0.012 * energy;
        const scale = 1 + energy * 0.008;
        ctx.save();
        ctx.translate(w / 2 + x, h / 2 + y);
        ctx.rotate(rot);
        ctx.scale(scale, scale);
        ctx.drawImage(source, -w / 2, -h / 2, w, h);
        ctx.restore();
    }

    function motionBlur(ctx, source, w, h, amount, time) {
        if (amount <= 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = amount * 0.14;
        const dx = Math.sin(time * 3.2) * Math.min(w, h) * 0.006 * amount;
        const dy = Math.cos(time * 2.4) * Math.min(w, h) * 0.004 * amount;
        for (let i = 1; i <= 4; i++) ctx.drawImage(source, dx * i, dy * i, w, h);
        ctx.restore();
    }

    function glitch(ctx, source, w, h, amount, time) {
        const burst = seeded(Math.floor(time * 8), 19);
        if (burst > 0.72) {
            const slices = 2 + Math.floor(seeded(time * 10, 20) * 6);
            for (let i = 0; i < slices; i++) {
                const y = Math.floor(seeded(time * 11 + i, 21) * h);
                const sh = Math.max(2, Math.floor(h * (0.002 + seeded(i, 22) * 0.012) * amount));
                const shift = (seeded(time * 13 + i, 23) - 0.5) * w * 0.06 * amount;
                ctx.drawImage(source, 0, y, w, sh, shift, y, w, sh);
            }
        }
        if (amount > 0.1) {
            ctx.save();
            ctx.globalAlpha = amount * 0.18;
            ctx.fillStyle = '#fff';
            const lineY = Math.floor(seeded(time * 31, 24) * h);
            ctx.fillRect(0, lineY, w, Math.max(1, Math.floor(h * 0.0015)));
            ctx.restore();
        }
    }

    function halftone(ctx, source, w, h, amount) {
        if (amount <= 0) return;
        const cell = Math.max(5, Math.round(Math.min(w, h) * 0.012));
        const sample = Math.min(128, Math.max(32, Math.round(w / cell)));
        scratchCanvas.width = sample;
        scratchCanvas.height = Math.max(1, Math.round(h / w * sample));
        scratchCtx.filter = 'grayscale(1) contrast(1.2)';
        scratchCtx.drawImage(source, 0, 0, scratchCanvas.width, scratchCanvas.height);
        const data = scratchCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
        ctx.save();
        ctx.globalAlpha = clamp(amount * 0.75, 0, 0.7);
        ctx.fillStyle = '#000';
        const sx = w / scratchCanvas.width;
        const sy = h / scratchCanvas.height;
        for (let y = 0; y < scratchCanvas.height; y++) {
            for (let x = 0; x < scratchCanvas.width; x++) {
                const i = (y * scratchCanvas.width + x) * 4;
                const lum = (data[i] + data[i + 1] + data[i + 2]) / (255 * 3);
                const r = (1 - lum) * Math.min(sx, sy) * 0.48;
                if (r < 0.5) continue;
                ctx.beginPath();
                ctx.arc(x * sx + sx / 2, y * sy + sy / 2, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
        scratchCanvas.width = w;
        scratchCanvas.height = h;
    }

    function applyFx(ctx, w, h, style, time) {
        const fx = style.visualFx || 'none';
        if (fx === 'none') return;
        const intensity = clamp(style.fxIntensity, 0, 1);
        const speed = Math.max(0.1, Number(style.fxSpeed) || 1);
        ensureBuffers(w, h);
        sourceCtx.clearRect(0, 0, w, h);
        sourceCtx.drawImage(ctx.canvas, 0, 0, w, h);
        ctx.clearRect(0, 0, w, h);

        switch (fx) {
            case 'vhs':
                cameraShake(ctx, sourceCanvas, w, h, intensity * 0.45, time, speed * 0.8);
                rgbShift(ctx, sourceCanvas, w, h, 0.004 * intensity, time);
                motionBlur(ctx, sourceCanvas, w, h, intensity * 0.65, time);
                drawScanlines(ctx, w, h, clamp(style.fxScanlines * 0.75 + intensity * 0.12), 5);
                drawGrain(ctx, w, h, style.fxGrain + intensity * 0.28, time);
                glitch(ctx, sourceCanvas, w, h, intensity * 0.7, time);
                break;
            case 'crt':
                drawBase(ctx, sourceCanvas, w, h);
                rgbShift(ctx, sourceCanvas, w, h, 0.0025 * intensity, time);
                bloom(ctx, sourceCanvas, w, h, intensity * 0.55);
                drawScanlines(ctx, w, h, style.fxScanlines + intensity * 0.22, 4);
                drawVignette(ctx, w, h, style.fxVignette + intensity * 0.18);
                break;
            case 'rgb':
                drawBase(ctx, sourceCanvas, w, h);
                rgbShift(ctx, sourceCanvas, w, h, style.fxRgbShift * intensity, time);
                break;
            case 'bloom':
                drawBase(ctx, sourceCanvas, w, h);
                bloom(ctx, sourceCanvas, w, h, intensity);
                break;
            case 'motion':
                drawBase(ctx, sourceCanvas, w, h);
                motionBlur(ctx, sourceCanvas, w, h, style.fxBlur * intensity + intensity * 0.35, time);
                break;
            case 'shake':
                cameraShake(ctx, sourceCanvas, w, h, style.fxShake * intensity + intensity * 0.35, time, speed);
                motionBlur(ctx, sourceCanvas, w, h, intensity * 0.35, time);
                break;
            case 'glitch':
                drawBase(ctx, sourceCanvas, w, h);
                glitch(ctx, sourceCanvas, w, h, intensity, time);
                rgbShift(ctx, sourceCanvas, w, h, 0.004 * intensity, time);
                break;
            case 'halftone':
                drawBase(ctx, sourceCanvas, w, h);
                halftone(ctx, sourceCanvas, w, h, style.fxHalftone * intensity);
                break;
            case 'vignette':
                drawBase(ctx, sourceCanvas, w, h);
                drawVignette(ctx, w, h, style.fxVignette * intensity + 0.12 * intensity);
                break;
            default:
                drawBase(ctx, sourceCanvas, w, h);
        }
    }

    window.render = function kefeRenderWithVisualFx(ctx, w, h, appState, mediaCache) {
        const fx = appState?.style?.visualFx || 'none';
        if (!fx || fx === 'none') {
            return originalRender(ctx, w, h, appState, mediaCache);
        }
        ensureBuffers(w, h);
        originalRender(sourceCtx, w, h, appState, mediaCache);
        ctx.save();
        applyFx(ctx, w, h, appState.style, Number(appState.playback?.currentTime) || 0);
        ctx.restore();
    };

    const labels = {
        none: 'Off — clean KEFE rendering',
        vhs: 'VHS — tape wobble, tracking, chroma bleed, scanlines and grain',
        crt: 'CRT — scanlines, phosphor-style glow, RGB separation and vignette',
        rgb: 'RGB Shift — chromatic lens separation for movement and transitions',
        bloom: 'Bloom — soft highlight diffusion and cinematic light bleed',
        motion: 'Motion Blur — directional trails for faster lyric movement',
        shake: 'Camera Shake — subtle handheld movement with motion blur',
        glitch: 'Glitch — controlled signal breaks, slices and chromatic distortion',
        halftone: 'Halftone — graphic print-screen texture',
        vignette: 'Vignette — restrained cinematic edge falloff'
    };

    function setFx(name) {
        if (!labels[name] || window.isExporting) return;
        window.state.style.visualFx = name;
        qsa('.kefe-fx-button').forEach(b => b.classList.toggle('active-effect', b.dataset.fx === name));
        const label = document.getElementById('visualFxLabel');
        if (label) label.textContent = labels[name];
        savePrefs();
        if (typeof window.redrawCurrentPreviewFrame === 'function') window.redrawCurrentPreviewFrame();
    }

    function addControl(container, key, labelText, min, max, step, suffix = '') {
        const row = document.createElement('div');
        row.className = 'control-row';
        const label = document.createElement('label');
        const value = document.createElement('span');
        value.style.marginLeft = '6px';
        const input = document.createElement('input');
        input.type = 'range'; input.min = min; input.max = max; input.step = step;
        input.value = Number(window.state.style[key]);
        value.textContent = `${Number(input.value).toFixed(step < 0.1 ? 2 : 1)}${suffix}`;
        label.textContent = labelText;
        label.appendChild(value);
        input.addEventListener('input', () => {
            if (window.isExporting) return;
            window.state.style[key] = Number(input.value);
            value.textContent = `${Number(input.value).toFixed(step < 0.1 ? 2 : 1)}${suffix}`;
            savePrefs();
            if (typeof window.redrawCurrentPreviewFrame === 'function') window.redrawCurrentPreviewFrame();
        });
        row.append(label, input);
        container.appendChild(row);
    }

    function buildUi() {
        const effectSection = document.querySelector('.sidebar .section:has(#effectControls)');
        if (!effectSection || document.getElementById('visualFxSection')) return;
        const section = document.createElement('div');
        section.className = 'section';
        section.id = 'visualFxSection';
        const title = document.createElement('h3');
        title.textContent = 'Visual FX';
        section.appendChild(title);

        const buttons = document.createElement('div');
        buttons.className = 'effect-buttons';
        buttons.style.maxHeight = 'none';
        ['none','vhs','crt','rgb','bloom','motion','shake','glitch','halftone','vignette'].forEach(name => {
            const b = document.createElement('button');
            b.type = 'button'; b.dataset.fx = name; b.className = 'kefe-fx-button';
            b.textContent = name === 'rgb' ? 'RGB' : name === 'none' ? 'Off' : name.charAt(0).toUpperCase() + name.slice(1);
            b.addEventListener('click', () => setFx(name));
            buttons.appendChild(b);
        });
        section.appendChild(buttons);

        const desc = document.createElement('div');
        desc.className = 'effect-label'; desc.id = 'visualFxLabel';
        desc.textContent = labels[window.state.style.visualFx] || labels.none;
        section.appendChild(desc);

        const controls = document.createElement('div');
        controls.id = 'visualFxControls';
        addControl(controls, 'fxIntensity', 'Intensity', 0, 1, 0.05, '');
        addControl(controls, 'fxSpeed', 'Animation speed', 0.25, 2.5, 0.05, '×');
        section.appendChild(controls);

        effectSection.insertAdjacentElement('afterend', section);
        qsa('.kefe-fx-button').forEach(b => b.classList.toggle('active-effect', b.dataset.fx === window.state.style.visualFx));
    }

    buildUi();
})();
