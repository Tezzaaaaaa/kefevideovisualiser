'use strict';
(()=>{
  const APPLE={size:'52',weight:'700',align:'left',lineHeight:'1.02',letterSpacing:'-0.022',textColor:'#ffffff',glow:'100'};
  const CHARLI={size:'58',weight:'900',align:'left',lineHeight:'.88',letterSpacing:'-0.055',textColor:'#ffffff',glow:'72'};
  let sentenceGap=.34,caseMode='original',effect='apple';
  const $id=id=>document.getElementById(id),cl=(x,a,b)=>Math.max(a,Math.min(b,x));
  const setValue=(id,value)=>{const el=$id(id);if(el)el.value=String(value)};
  const preset=()=>effect==='charli'?CHARLI:APPLE;

  function lockValues(){
    const p=preset();
    setValue('size',p.size);setValue('fontWeight',p.weight);setValue('textAlign',p.align);setValue('lineHeight',p.lineHeight);setValue('letterSpacing',p.letterSpacing);setValue('textColor',p.textColor);setValue('glow',p.glow);
    document.documentElement.style.setProperty('--lyric-weight',p.weight);document.documentElement.style.setProperty('--lyric-lh',p.lineHeight);document.documentElement.style.setProperty('--accent',p.textColor);
    if(typeof lyricsEl!=='undefined'&&lyricsEl){
      lyricsEl.style.fontSize=p.size+'px';lyricsEl.style.textAlign=p.align;lyricsEl.style.fontWeight=p.weight;lyricsEl.style.letterSpacing=p.letterSpacing+'em';
      lyricsEl.style.fontStyle=effect==='charli'?'italic':'normal';
      lyricsEl.style.fontFamily=effect==='charli'?'"Helvetica Now Pro Display","Helvetica Now Display","Helvetica Neue",Arial,sans-serif':'-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif';
      lyricsEl.dataset.lyricEffect=effect;
    }
  }

  function gapFor(i){
    if(!Array.isArray(lines)||i<0||i>=lines.length-1)return sentenceGap;
    const timingGap=Math.max(0,(Number(lines[i+1]?.start)||0)-(Number(lines[i]?.start)||0));
    const x=cl((timingGap-1500)/3600,0,1),pause=x*x*(3-2*x);
    return effect==='charli'?Math.max(.06,sentenceGap*.44+pause*.08):sentenceGap+pause*.26;
  }

  function applySpacing(){
    document.querySelectorAll('#lyrics .apple-line').forEach((el,i)=>el.style.setProperty('--line-gap-after',gapFor(i).toFixed(3)+'em'));
    if(typeof window.invalidateLinaMotion==='function')window.invalidateLinaMotion(false);
  }

  function applyCase(){
    if(typeof lyricsEl==='undefined'||!lyricsEl)return;
    lyricsEl.style.textTransform=caseMode==='upper'?'uppercase':caseMode==='lower'?'lowercase':'none';
  }

  function hideLegacyControls(){
    ['size','textColor','glow','offset','fontChoice','fontWeight','textAlign','lineHeight','letterSpacing'].forEach(id=>{const el=$id(id),label=el?.closest('label');if(label)label.classList.add('apple-locked-control')});
    const stylePanel=document.querySelector('[data-panel="style"] .body');
    if(stylePanel)stylePanel.innerHTML='<div class="subsection apple-preset-note"><div class="subhead"><b>Lyric effects</b><span>Preset driven</span></div><div class="helper">Typography and animation are designed as complete effects. Choose the effect and case; only position, sentence spacing and background brightness remain adjustable.</div></div>';
  }

  function snap(input,points,tolerance){
    input.addEventListener('change',()=>{const v=+input.value;let nearest=points[0];for(const p of points)if(Math.abs(p-v)<Math.abs(nearest-v))nearest=p;if(Math.abs(nearest-v)<=tolerance){input.value=nearest;input.dispatchEvent(new Event('input',{bubbles:true}))}});
  }
  function ticks(points,min,max,format=v=>v){return `<div class="range-ticks">${points.map(v=>`<i style="left:${((v-min)/(max-min)*100).toFixed(2)}%"><span>${format(v)}</span></i>`).join('')}</div>`}

  function buildCompactControls(){
    const grid=document.querySelector('.preview-control-grid');if(!grid)return;
    grid.className='preview-control-grid apple-compact-grid';
    const y=$id('yPos');
    const yWrap=document.createElement('label');yWrap.className='apple-control';yWrap.innerHTML=`<span>Position <b id="positionVal">${Math.round(+y?.value||50)}%</b></span><input id="applePosition" type="range" min="18" max="82" step="1" value="${+y?.value||50}">${ticks([25,35,50,65,75],18,82,v=>v+'%')}`;
    const spacing=document.createElement('label');spacing.className='apple-control';spacing.innerHTML=`<span>Sentence spacing <b id="sentenceGapVal">34%</b></span><input id="sentenceGap" type="range" min="20" max="70" step="1" value="34">${ticks([24,34,44,56,68],20,70,v=>v+'%')}`;
    const dim=+$id('dim')?.value||38,brightnessValue=cl(100-dim,15,100);
    const brightness=document.createElement('label');brightness.className='apple-control';brightness.innerHTML=`<span>Background brightness <b id="bgBrightnessVal">${Math.round(brightnessValue)}%</b></span><input id="bgBrightness" type="range" min="15" max="100" step="1" value="${brightnessValue}">${ticks([25,40,62,75,100],15,100,v=>v+'%')}`;
    const caseControl=document.createElement('div');caseControl.className='apple-segmented';caseControl.innerHTML='<span>Case</span><div><button type="button" data-case="original" class="active">Aa</button><button type="button" data-case="upper">AA</button><button type="button" data-case="lower">aa</button></div>';
    const effectControl=document.createElement('label');effectControl.className='apple-effect-select';effectControl.innerHTML='<span>Effect</span><select id="lyricEffect"><option value="apple" selected>Apple Lyrics</option><option value="charli">Charli — Black Italic</option></select>';
    grid.replaceChildren(effectControl,yWrap,spacing,brightness,caseControl);

    $id('applePosition')?.addEventListener('input',e=>{const v=+e.target.value;$id('positionVal').textContent=Math.round(v)+'%';if(y)y.value=String(v);if(typeof look==='function')look()});
    $id('sentenceGap')?.addEventListener('input',e=>{const v=+e.target.value;sentenceGap=v/100;$id('sentenceGapVal').textContent=Math.round(v)+'%';applySpacing();if(typeof render==='function')render(audio.currentTime*1000)});
    $id('bgBrightness')?.addEventListener('input',e=>{const b=+e.target.value;$id('bgBrightnessVal').textContent=Math.round(b)+'%';const dimEl=$id('dim');if(dimEl)dimEl.value=String(cl(100-b,0,85));if(typeof bgStyle==='function')bgStyle()});
    $id('lyricEffect')?.addEventListener('change',e=>{effect=e.target.value==='charli'?'charli':'apple';sentenceGap=effect==='charli'?.24:.34;const sg=$id('sentenceGap');if(sg){sg.value=String(Math.round(sentenceGap*100));sg.dispatchEvent(new Event('input',{bubbles:true}))}lockValues();applyCase();if(typeof window.invalidateLinaMotion==='function')window.invalidateLinaMotion(true);if(typeof render==='function')render(audio.currentTime*1000)});
    caseControl.addEventListener('click',e=>{const b=e.target.closest('[data-case]');if(!b)return;caseMode=b.dataset.case;caseControl.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));applyCase()});
    snap($id('applePosition'),[25,35,50,65,75],3);snap($id('sentenceGap'),[24,34,44,56,68],3);snap($id('bgBrightness'),[25,40,62,75,100],4);
    const head=document.querySelector('.preview-controls-head span');if(head)head.textContent='Lyric controls';
  }

  const baseRender=window.render;
  if(typeof baseRender==='function')window.render=function(ms){lockValues();const out=baseRender(ms);applySpacing();applyCase();return out};
  lockValues();hideLegacyControls();buildCompactControls();applyCase();
  requestAnimationFrame(()=>{lockValues();applySpacing();applyCase();if(typeof render==='function')render(audio.currentTime*1000)});
  window.linaApplePreset={lockValues,applySpacing,applyCase,get sentenceGap(){return sentenceGap},get effect(){return effect},get caseMode(){return caseMode}};
})();
