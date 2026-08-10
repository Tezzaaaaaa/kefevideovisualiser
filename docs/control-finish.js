'use strict';
(()=>{
  const $=s=>document.querySelector(s),S=window.linaConsolidatedState,audit=window.linaControlAudit;
  const dirty=()=>{try{markDirty?.()}catch{}};
  const redraw=()=>{try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}};
  const mark=(el)=>{if(el)el.dataset.linaBound=el.dataset.linaBound||'control-finish'};

  // Keep signature effects permanently visible beside the live preview controls.
  const effects=$('.consolidated-effects'),preview=$('.preview-controls'),previewGrid=$('.preview-control-grid');
  if(effects&&preview&&previewGrid&&effects.parentElement!==preview){preview.insertBefore(effects,previewGrid);effects.classList.add('persistent-effects')}

  const showTitle=$('#showTitle');if(showTitle){const label=showTitle.closest('.toggle')?.querySelector('span');if(label)label.textContent='Show title + artist at start';mark(showTitle)}
  const duration=$('#titleDuration');if(duration){duration.onchange=()=>{redraw();dirty()};mark(duration)}
  const album=$('#albumInput');if(album){album.oninput=()=>{selectedSong={...(selectedSong||{}),collectionName:album.value};redraw();dirty()};mark(album)}
  const introArtToggle=$('#userArtworkIntro');if(introArtToggle){introArtToggle.onchange=()=>{if($('#showArtworkIntro'))$('#showArtworkIntro').checked=introArtToggle.checked;$('#introArt')?.classList.toggle('on',introArtToggle.checked&&!!$('#introArt')?.src);redraw();dirty()};mark(introArtToggle)}

  function syncEntranceUI(){
    const select=$('#lyricsEntrance'),wrap=$('#customEntranceWrap');
    if(!select||!wrap)return;
    const custom=select.value==='custom';
    wrap.classList.toggle('hidden',!custom);
    wrap.hidden=!custom;
    wrap.setAttribute('aria-hidden',custom?'false':'true');
  }
  const entrance=$('#lyricsEntrance');if(entrance){entrance.onchange=()=>{syncEntranceUI();redraw();dirty()};mark(entrance)}
  syncEntranceUI();
  Promise.resolve(window.linaRestorePromise).finally(()=>{syncEntranceUI();redraw()});

  const checks=[
    ['audioFile','onchange'],['lyricsFile','onchange'],['bgImageFile','onchange'],['bgVideoFile','onchange'],
    ['autosaveToggle','onchange'],['syncMethod','onchange'],['seek','oninput'],['useArtworkBg2','onchange'],
    ['letterCase',null],['userArtworkFile','onchange'],['userArtworkIntro','onchange'],['albumInput','oninput'],['titleDuration','onchange'],
    ['size',null],['yPos',null],['textColor',null],['glow',null],['offset',null],['contextMode',null],['lyricsEntrance',null],
    ['aspect',null],['quality',null],['safeToggle',null],['cropX',null],['cropY',null],['cropZoom',null],['bgFit',null],['dim',null],['blur',null]
  ];
  const extra=[];
  for(const [id,prop] of checks){const el=$('#'+id);if(!el){extra.push(`${id}:missing`);continue}if(prop&&typeof el[prop]!=='function'&&!el.dataset.linaBound)extra.push(`${id}:unbound`);else if(!prop&&!el.dataset.linaBound&&typeof el.oninput!=='function'&&typeof el.onchange!=='function')extra.push(`${id}:unbound`)}
  if(audit){for(const issue of extra)if(!audit.missing.includes(issue))audit.missing.push(issue);audit.checked+=checks.length;audit.passed=Math.max(0,audit.checked-audit.missing.length);audit.featureChecks=checks.length;document.documentElement.dataset.linaControls=audit.missing.length?'failed':'passed'}
  window.linaFeatureAudit={checked:checks.length,missing:extra};
})();
