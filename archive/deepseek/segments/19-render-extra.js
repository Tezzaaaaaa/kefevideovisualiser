import { $, qsa, toast } from '../core/utils.js';
import { state, saveLinaPrefs } from '../state.js';
import { EFFECT_LABELS, ASPECTS } from '../core/config.js';
import { redrawCurrentPreviewFrame } from '../core/render.js';

export function setEffect(name) {
    if (state.isExporting) { 
        toast('Finish or cancel the current export first', 'error'); 
        return false; 
    }
    state.state.style.effect = name;
    qsa("[data-effect]").forEach(b => b.classList.toggle("active-effect", b.dataset.effect === name));
    const label = $('effectLabel');
    if (label) label.textContent = EFFECT_LABELS[name] || "";
    renderEffectControls();
    redrawCurrentPreviewFrame();
    saveLinaPrefs();
    return true;
}

export function setAspectRatio(key) {
    if (state.isExporting) { 
        toast('Finish or cancel the current export first', 'error'); 
        return; 
    }
    const aspect = ASPECTS[key];
    if (!aspect) return;
    state.state.aspect = key;
    const canvas = $('stageCanvas');
    if (canvas) {
        canvas.width = aspect.w;
        canvas.height = aspect.h;
    }
    qsa('[data-aspect]').forEach(b => b.classList.toggle('active-aspect', b.dataset.aspect === key));
    const info = $('aspectInfo');
    if (info) info.textContent = aspect.label;
    saveLinaPrefs();
    redrawCurrentPreviewFrame();
}

export function renderEffectControls() {
    const effect = state.state.style.effect;
    const container = $('effectControls');
    if (!container) return;
    container.innerHTML = "";
    
    const controls = [{ 
        key: "fontSize", 
        label: "Size", 
        type: "range", 
        min: 36, 
        max: 150, 
        step: 1, 
        suffix: "px", 
        scale: 1 
    }];
    
    if (effect === "apple") {
        controls.push({ 
            key: "align", 
            label: "Alignment", 
            type: "select", 
            options: [["left","Left"],["center","Center"],["right","Right"]] 
        });
    }
    
    let extraControls = [];
    if (effect === "apple") {
        extraControls = [
            { key: "appleTopOffset", label: "Lyrics position", type: "range", min: 20, max: 38, step: 0.5, suffix: "%", scale: 0.01 },
            { key: "appleLineSpacing", label: "Line spacing", type: "range", min: 45, max: 110, step: 1, suffix: "%", scale: 0.01 },
            { key: "appleInactiveOpacity", label: "Upcoming opacity", type: "range", min: 10, max: 45, step: 1, suffix: "%", scale: 0.01 },
            { key: "appleVisibleLines", label: "Upcoming lines", type: "range", min: 2, max: 6, step: 1, suffix: "", scale: 1 }
        ];
    }
    if (effect === "brat") {
        extraControls = [
            { key: "bratTypingSpeed", label: "Typing speed", type: "range", min: 50, max: 180, step: 5, suffix: "%", scale: 0.01 },
            { key: "bratSideMargin", label: "Side margin", type: "range", min: 1, max: 10, step: 0.5, suffix: "%", scale: 1 },
            { key: "bratTopMargin", label: "Top margin", type: "range", min: 1, max: 10, step: 0.5, suffix: "%", scale: 1 }
        ];
    }
    if (effect === "eternal") {
        extraControls = [
            { key: "eternalPenWidth", label: "Ink width", type: "range", min: 8, max: 40, step: 1, suffix: "%", scale: 1 },
            { key: "eternalWriteSpan", label: "Writing speed", type: "range", min: 60, max: 100, step: 1, suffix: "%", scale: 0.01 },
            { key: "eternalGlow", label: "Ink glow", type: "range", min: 0, max: 15, step: 1, suffix: "", scale: 1 },
            { key: "eternalPresence", label: "Presence", type: "range", min: 0, max: 100, step: 1, suffix: "%", scale: 0.01 },
            { key: "eternalInkColor", label: "Ink colour", type: "color" }
        ];
    }
    if (effect === "aurora") {
        extraControls = [
            { key: "auroraSpeed", label: "Flow speed", type: "range", min: 0.2, max: 2.5, step: 0.1, suffix: "x", scale: 1 },
            { key: "auroraIntensity", label: "Glow intensity", type: "range", min: 0.1, max: 1.5, step: 0.1, suffix: "", scale: 1 },
            { key: "auroraSaturation", label: "Colour saturation", type: "range", min: 0.2, max: 1.8, step: 0.1, suffix: "", scale: 1 }
        ];
    }
    if (effect === "pulse") {
        extraControls = [
            { key: "pulseAmplitude", label: "Pulse strength", type: "range", min: 0.05, max: 1, step: 0.05, suffix: "", scale: 1 },
            { key: "pulseFrequency", label: "Pulse speed", type: "range", min: 0.3, max: 2.5, step: 0.1, suffix: "x", scale: 1 },
            { key: "pulseGlowSize", label: "Glow size", type: "range", min: 0.1, max: 2, step: 0.1, suffix: "", scale: 1 },
            { key: "accentColor", label: "Glow colour", type: "color" }
        ];
    }
    
    // Title card toggle
    const tr = document.createElement("div");
    tr.className = "toggle-row";
    const tl = document.createElement("label");
    tl.textContent = "Title Card";
    tr.appendChild(tl);
    const ts = document.createElement("label");
    ts.className = "toggle-switch";
    const ti = document.createElement("input");
    ti.type = "checkbox";
    ti.checked = state.state.style.titleCardEnabled !== false;
    ti.addEventListener("change", () => {
        if (state.isExporting) { 
            toast('Finish or cancel the current export first', 'error'); 
            ti.checked = state.state.style.titleCardEnabled; 
            return; 
        }
        state.state.style.titleCardEnabled = ti.checked;
        redrawCurrentPreviewFrame();
    });
    const tsl = document.createElement("span");
    tsl.className = "slider";
    ts.appendChild(ti); 
    ts.appendChild(tsl);
    tr.appendChild(ts);
    container.appendChild(tr);

    // Title card duration
    const durRow = document.createElement("div");
    durRow.className = "control-row";
    const durLabel = document.createElement("label");
    durLabel.textContent = "Title Card Duration";
    const durVal = document.createElement("span");
    durVal.style.marginLeft = "6px";
    durVal.textContent = `${state.state.style.titleCardDuration || 3}s`;
    durLabel.appendChild(durVal);
    durRow.appendChild(durLabel);
    const durInput = document.createElement("input");
    durInput.type = "range";
    durInput.min = 1; 
    durInput.max = 5; 
    durInput.step = 1;
    durInput.value = state.state.style.titleCardDuration || 3;
    durInput.addEventListener("input", () => {
        if (state.isExporting) { 
            toast('Finish or cancel the current export first', 'error'); 
            durInput.value = state.state.style.titleCardDuration || 3; 
            return; 
        }
        state.state.style.titleCardDuration = linaClamp(Number(durInput.value) || 3, 1, 5);
        durVal.textContent = `${state.state.style.titleCardDuration}s`;
        redrawCurrentPreviewFrame();
    });
    durRow.appendChild(durInput);
    container.appendChild(durRow);

    const allControls = [...controls, ...extraControls];
    for (const control of allControls) {
        const row = document.createElement("div");
        row.className = "control-row";
        const label = document.createElement("label");
        label.textContent = control.label;
        row.appendChild(label);
        
        if (control.type === "range") {
            const val = document.createElement("span");
            val.style.marginLeft = "6px";
            const raw = state.state.style[control.key] !== undefined ? state.state.style[control.key] : 76;
            const disp = control.scale !== 1 ? Math.round(raw / control.scale * 100) / 100 : raw;
            val.textContent = `${disp}${control.suffix || ""}`;
            label.appendChild(val);
            const input = document.createElement("input");
            input.type = "range"; 
            input.min = control.min; 
            input.max = control.max; 
            input.step = control.step;
            input.value = disp;
            input.addEventListener("input", () => {
                if (state.isExporting) { 
                    toast('Finish or cancel the current export first', 'error'); 
                    input.value = control.scale !== 1 ? Math.round(state.state.style[control.key] / control.scale * 100) / 100 : state.state.style[control.key]; 
                    return; 
                }
                const next = Number(input.value);
                const scaled = control.scale !== 1 ? next * control.scale : next;
                state.state.style[control.key] = scaled;
                val.textContent = `${control.scale !== 1 ? Math.round(next * 100) / 100 : next}${control.suffix || ""}`;
                redrawCurrentPreviewFrame();
            });
            row.appendChild(input);
        } else if (control.type === "select") {
            const select = document.createElement("select");
            for (const [value, text] of control.options) {
                const opt = document.createElement("option");
                opt.value = value; 
                opt.textContent = text;
                select.appendChild(opt);
            }
            select.value = state.state.style.align || "left";
            select.addEventListener("change", () => {
                if (state.isExporting) { 
                    toast('Finish or cancel the current export first', 'error'); 
                    select.value = state.state.style.align || "left"; 
                    return; 
                }
                state.state.style.align = select.value;
                redrawCurrentPreviewFrame();
            });
            row.appendChild(select);
        } else if (control.type === "color") {
            const input = document.createElement("input");
            input.type = "color";
            input.value = state.state.style[control.key] || "#FFFFFF";
            input.addEventListener("input", () => {
                if (state.isExporting) { 
                    toast('Finish or cancel the current export first', 'error'); 
                    input.value = state.state.style[control.key] || "#FFFFFF"; 
                    return; 
                }
                state.state.style[control.key] = input.value;
                redrawCurrentPreviewFrame();
            });
            row.appendChild(input);
        }
        container.appendChild(row);
    }
}

import { linaClamp } from '../core/utils.js';