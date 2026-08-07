'use strict';
(()=>{
  const LOCKED={size:'52',weight:'700',align:'left',lineHeight:'1.02',letterSpacing:'-0.022',textColor:'#ffffff',glow:'100'};
  let sentenceGap=.34;

  const $id=id=>document.getElementById(id);
  const setValue=(id,value)=>{const el=$id(id);if(el)el.value=String(value)};

  function lockValues(){
    setValue('size',LOCKED.size);setValue('fontWeight',LOCKED.weight);setValue('textAlign',LOCKED.align);
    setValue('lineHeight',LOCKED.lineHeight);setValue('letterSpacing',LOCKED.letterSpacing);
    setValue('textColor',LOCKED.textColor);setValue('glow',LOCKED.glow);
    document.documentElement.style.setProperty('--lyric-weight',LOCKED.weight);
    document.documentElement.style.setProperty('--lyric-lh',LOCKED.lineHeight);
    document.documentElement.style.setProperty('--accent',LOCKED.textColor);
    if(typeof lyricsEl!=='undefined'&&lyricsEl){
      lyricsEl.style.fontSize=LOCKED.size+'px';lyricsEl.style.textAlign=LOCKED.align;
      lyricsEl.style.fontWeight=LOCKED.weight;lyricsEl.style.letterSpacing=LOCKED.letterSpacing+'em';
    }
  }

  function gapFor(i){
    if(!Array.isArray(lines)||i<0||i>=lines.length-1)return sentenceGap;
    const gap=Math.max(0,(Number(lines[i+1]?.start)||0)-(Number(lines[i]?.start)||0));
    const x=Math.max(0,Math.min(1,(gap-1500)/3600)),pause=x*x*(3-2*x);
    return sentenceGap+pause*.26;
  }

  if(typeof window.temporalGapAfter==='function')window.temporalGapAfter=i=>gapFor(i);

  function applySpacing(){
    document.querySelectorAll('#lyrics .apple-line').forEach((el,i)=>el.style.setProperty('--line-gap-after',gapFor(i).toFixed(3)+'em'));
    if(typeof window.invalidateLinaMotion==='function')window.invalidateLinaMotion(false);
  }

  function hideLegacyControls(){
    ['size','textColor','glow','offset'].forEach(id=>{const el=$id(id),label=el?.closest('label');if(label)label.classList.add('apple-locked-control')});
    ['fontChoice','fontWeight','textAlign','lineHeight','letterSpacing'].forEach(id=>{const el=$id(id),label=el?.closest('label');if(label)label.classList.add('apple-locked-control')});
    const stylePanel=document.querySelector('[data-panel="style"] .body');
    if(stylePanel)stylePanel.innerHTML='<div class="subsection apple-preset-note"><div class="subhead"><b>Apple Lyrics</b><span>Locked preset</span></div><div class="helper">Typography, scale, tracking, alignment, colour and lyric illumination are fixed to the Apple-style preset.</div></div>';
  }

  function buildCompactControls(){
    const grid=document.querySelector('.preview-control-grid');if(!grid)return;
    grid.classList.add('apple-compact-grid');
    const y=$id('yPos')?.closest('label');if(y){y.classList.remove('wide');y.querySelector('span').firstChild.textContent='Position ';}
    const spacing=document.createElement('label');spacing.className='field apple-live-control';spacing.innerHTML='<span>Sentence spacing <b id="sentenceGapVal">0.34em</b></span><input id="sentenceGap" type="range" min="0.20" max="0.70" step="0.01" value="0.34">';
    const brightness=document.createElement('label');brightness.className='field apple-live-control';const dim=+$id('dim')?.value||38,initial=Math.max(15,Math.min(100,100-dim));brightness.innerHTML=`<span>Background brightness <b id="bgBrightnessVal">${initial}%</b></span><input id="bgBrightness" type="range" min="15" max="100" step="1" value="${initial}">`;
    if(y){grid.replaceChildren(y,spacing,brightness)}else grid.replaceChildren(spacing,brightness);
    $id('sentenceGap')?.addEventListener('input',e=>{sentenceGap=+e.target.value||.34;$id('sentenceGapVal').textContent=sentenceGap.toFixed(2)+'em';applySpacing();if(typeof render==='function')render(audio.currentTime*1000)});
    $id('bgBrightness')?.addEventListener('input',e=>{const b=+e.target.value||62;$id('bgBrightnessVal').textContent=Math.round(b)+'%';const dimEl=$id('dim');if(dimEl)dimEl.value=String(Math.max(0,Math.min(85,100-b)));if(typeof bgStyle==='function')bgStyle();});
    const dimEl=$id('dim');if(dimEl){const dimLabel=dimEl.closest('label');if(dimLabel)dimLabel.classList.add('apple-secondary-brightness')}
    const status=document.querySelector('.preview-controls-head span');if(status)status.textContent='Apple preset';
  }

  const baseRender=window.render;
  if(typeof baseRender==='function')window.render=function(ms){lockValues();const out=baseRender(ms);applySpacing();return out};

  lockValues();hideLegacyControls();buildCompactControls();
  requestAnimationFrame(()=>{lockValues();applySpacing();if(typeof render==='function')render(audio.currentTime*1000)});
  window.linaApplePreset={lockValues,applySpacing,get sentenceGap(){return sentenceGap}};
})();
