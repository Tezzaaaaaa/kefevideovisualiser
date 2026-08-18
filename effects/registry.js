/* KEFE Visualiser — production lyric-effect registry */
(() => {
  'use strict';

  const originalRenderLyricsEffect = window.renderLyricsEffect;
  if (typeof originalRenderLyricsEffect !== 'function') {
    throw new Error('KEFE effect registry loaded before the base lyric renderer.');
  }

  window.kefeEffects = window.kefeEffects || {};

  const modular = {
    brat: window.kefeEffects.brat,
    typewriter: window.kefeEffects.typewriter,
    instagram: window.kefeEffects.instagram,
    fadeup: window.kefeEffects.fadeup,
    aurora: window.kefeEffects.aurora,
    eternal: window.kefeEffects.eternal
  };

  const required = Object.keys(modular);
  window.kefeEffectStatus = Object.freeze(
    Object.fromEntries(required.map(name => [name, typeof modular[name] === 'function']))
  );

  window.renderLyricsEffect = function(ctx, w, h, style, lines, time) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    try {
      const renderer = modular[style?.effect];
      if (typeof renderer === 'function') return renderer(ctx, w, h, style, lines, time);
      return originalRenderLyricsEffect(ctx, w, h, style, lines, time);
    } finally {
      ctx.restore();
    }
  };

  const labels = {
    apple: 'Apple Music — smooth focus line with continuous lyric movement',
    brat: 'Brat — abrupt word-by-word switching',
    eternal: 'Eternal Sunshine — fast per-letter handwritten ink reveal',
    aurora: 'Aurora — atmospheric curtains, colour flow and luminous depth',
    typewriter: 'Typewriter — precise character-by-character reveal with a restrained cursor',
    instagram: 'Instagram Lyrics — bold stacked Story lyrics with a dominant active line',
    fadeup: 'Fade Up — kinetic word-by-word rise, pop and settle'
  };

  const defaults = {
    instagramFontSize: 92,
    instagramActiveScale: 1.22,
    instagramInactiveScale: 0.78,
    instagramInactiveOpacity: 0.34,
    instagramLineSpacing: 0.82,
    instagramY: 0.50,
    instagramTransition: 0.20,
    instagramTracking: -0.025,
    instagramMaxWidth: 0.84,
    instagramPreviousLines: 1,
    instagramNextLines: 2,
    instagramTextColor: '#FFFFFF'
  };

  function ensureInstagramDefaults() {
    if (!window.state?.style) return;
    for (const [key, value] of Object.entries(defaults)) {
      if (window.state.style[key] === undefined) window.state.style[key] = value;
    }
  }

  function addRange(container, key, label, min, max, step, suffix = '', displayScale = 1) {
    const row = document.createElement('div');
    row.className = 'control-row';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.style.marginLeft = '6px';
    labelEl.appendChild(valueEl);
    row.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(window.state.style[key]);

    const update = () => {
      const value = Number(input.value) * displayScale;
      const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 100) / 100;
      valueEl.textContent = `${rounded}${suffix}`;
    };
    input.addEventListener('input', () => {
      if (window.isExporting) return;
      window.state.style[key] = Number(input.value);
      update();
      window.redrawCurrentPreviewFrame?.();
    });
    update();
    row.appendChild(input);
    container.appendChild(row);
  }

  function removeGenericEffectSizeControl(container) {
    const rows = [...container.querySelectorAll(':scope > .control-row')];
    if (rows.length) rows[rows.length - 1].remove();
  }

  function renderInstagramControls() {
    if (!window.state?.style || window.state.style.effect !== 'instagram') return;
    const container = document.getElementById('effectControls');
    if (!container) return;
    ensureInstagramDefaults();

    const existing = document.getElementById('instagramLyricControls');
    if (existing) existing.remove();

    removeGenericEffectSizeControl(container);

    const wrap = document.createElement('div');
    wrap.id = 'instagramLyricControls';

    addRange(wrap, 'instagramFontSize', 'Base size', 56, 130, 1, 'px');
    addRange(wrap, 'instagramActiveScale', 'Active scale', 1.05, 1.45, 0.01, '×');
    addRange(wrap, 'instagramInactiveScale', 'Inactive scale', 0.58, 0.94, 0.01, '×');
    addRange(wrap, 'instagramInactiveOpacity', 'Inactive opacity', 0.10, 0.65, 0.01, '%', 100);
    addRange(wrap, 'instagramLineSpacing', 'Line spacing', 0.60, 1.08, 0.01, '×');
    addRange(wrap, 'instagramY', 'Vertical position', 0.30, 0.70, 0.01, '%', 100);
    addRange(wrap, 'instagramTransition', 'Transition', 0.08, 0.42, 0.01, 's');
    addRange(wrap, 'instagramTracking', 'Letter spacing', -0.06, 0.02, 0.001, 'em');
    addRange(wrap, 'instagramMaxWidth', 'Maximum width', 0.62, 0.94, 0.01, '%', 100);

    const colourRow = document.createElement('div');
    colourRow.className = 'control-row';
    const colourLabel = document.createElement('label');
    colourLabel.textContent = 'Lyric colour';
    colourRow.appendChild(colourLabel);
    const colour = document.createElement('input');
    colour.type = 'color';
    colour.value = window.state.style.instagramTextColor || '#FFFFFF';
    colour.addEventListener('input', () => {
      if (window.isExporting) return;
      window.state.style.instagramTextColor = colour.value;
      window.redrawCurrentPreviewFrame?.();
    });
    colourRow.appendChild(colour);
    wrap.appendChild(colourRow);

    container.appendChild(wrap);
  }

  function bind() {
    ensureInstagramDefaults();
    const buttons = typeof qsa === 'function' ? qsa('[data-effect]') : [];
    buttons.forEach(button => {
      if (button.dataset.kefeRegistryBound === '1') return;
      button.dataset.kefeRegistryBound = '1';
      button.addEventListener('click', () => {
        const effect = button.dataset.effect;
        if (effect === 'instagram') {
          ensureInstagramDefaults();
          const label = document.getElementById('effectLabel');
          if (label) label.textContent = labels.instagram;
          renderInstagramControls();
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
