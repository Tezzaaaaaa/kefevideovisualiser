'use strict';
(()=>{
  const baseRender=window.render;
  if(typeof baseRender!=='function'||typeof window.lyricMotionAnchor!=='function')return;
  let root=null,els=[],spans=[],roles=[],unitCache=[],centers=[],geomKey='',visibleLo=0,visibleHi=-1,hotLo=0,hotHi=-1,previewVisible=true,lastDormantPaint=0,lastDormantMs=-1;
  const contextRadius=()=>{
    const cw=contextWindow();
    if(cw.total<=1)return{layout:0,words:0,hot:0};
    const side=Math.max(cw.before,cw.after);
    return{layout:Math.min(5,side+1),words:Math.min(3,Math.max(1,side)),hot:Math.min(2,Math.max(1,side))};
  };
  const syncRoot=()=>{
    const next=lyricsEl.querySelector('.apple-flow');
    if(next===root)return !!root;
    root=next;
    if(!root){els=[];spans=[];roles=[];unitCache=[];centers=[];geomKey='';visibleHi=hotHi=-1;return false}
    els=Array.from(root.children);spans=els.map(el=>Array.from(el.children));roles=lines.map((line,i)=>vocalRole(line,i));unitCache=new Array(lines.length);centers=[];geomKey='';visibleLo=0;visibleHi=-1;hotLo=0;hotHi=-1;
    els.forEach(el=>{el.style.visibility='hidden';el.classList.remove('motion-hot')});
    return true;
  };
  const lineUnits=i=>unitCache[i]||(unitCache[i]=units(lines[i]));
  const geometry=()=>{
    const key=[root,story?.clientWidth||0,story?.clientHeight||0,$('#size')?.value,$('#lineHeight')?.value,$('#fontWeight')?.value,$('#letterSpacing')?.value,lines.length].join('|');
    if(key===geomKey&&centers.length===els.length)return;
    geomKey=key;centers=els.map(el=>el.offsetTop+el.offsetHeight/2);
  };
  const setVisible=(lo,hi)=>{
    if(visibleHi>=visibleLo)for(let i=visibleLo;i<=visibleHi;i++)if((i<lo||i>hi)&&els[i])els[i].style.visibility='hidden';
    for(let i=lo;i<=hi;i++)if((i<visibleLo||i>visibleHi)&&els[i])els[i].style.visibility='visible';
    visibleLo=lo;visibleHi=hi;
  };
  const setHot=(lo,hi)=>{
    if(lo===hotLo&&hi===hotHi)return;
    if(hotHi>=hotLo)for(let i=hotLo;i<=hotHi;i++)els[i]?.classList.remove('motion-hot');
    for(let i=lo;i<=hi;i++)els[i]?.classList.add('motion-hot');
    hotLo=lo;hotHi=hi;
  };
  window.updateMotionLayout=function(ms){
    if(!syncRoot())return null;
    const state=lyricMotionAnchor(ms),env=sceneEnvelope(ms),r=contextRadius();geometry();
    const fromC=centers[state.from]??0,toC=centers[state.to]??fromC,anchorY=mix(fromC,toC,state.p);
    root.style.opacity=env.alpha.toFixed(4);root.style.transform=`translate3d(0,${(-anchorY+env.rise).toFixed(3)}px,0) scale(${env.scale.toFixed(4)})`;
    const lo=Math.max(0,Math.floor(state.anchor)-r.layout),hi=Math.min(lines.length-1,Math.ceil(state.anchor)+r.layout),hlo=Math.max(0,Math.floor(state.anchor)-r.hot),hhi=Math.min(lines.length-1,Math.ceil(state.anchor)+r.hot),stageW=story?.clientWidth||620;
    setVisible(lo,hi);setHot(hlo,hhi);
    for(let idx=lo;idx<=hi;idx++){
      const el=els[idx],role=roles[idx]||vocalRole(lines[idx],idx),v=lineVisual(idx-state.anchor),quiet=silencePresence(idx,ms),alpha=v.alpha*(idx===state.from?quiet:1)*role.alpha,shift=role.shift*stageW;
      const blur=v.blur+role.blur,filter=blur<.055&&Math.abs(v.saturation-1)<.015?'none':`blur(${blur.toFixed(3)}px) saturate(${v.saturation.toFixed(3)})`;
      el.style.opacity=alpha.toFixed(4);el.style.transform=`translate3d(${shift.toFixed(2)}px,0,0) scale(${(v.scale*role.scale).toFixed(4)})`;el.style.filter=filter;el.style.zIndex=String(Math.max(1,20-Math.round(Math.abs(idx-state.anchor)*3)+(role.duet?1:0)));
    }
    return state;
  };
  window.updateMotionWords=function(ms,state){
    if(!syncRoot())return;
    const r=contextRadius(),lo=Math.max(0,Math.floor(state.anchor)-r.words),hi=Math.min(lines.length-1,Math.ceil(state.anchor)+r.words),glowSetting=+$('#glow').value/100;
    for(let i=lo;i<=hi;i++){
      const line=lines[i],role=roles[i]||vocalRole(line,i),focus=lineVisual(i-state.anchor),us=lineUnits(i),ws=spans[i];if(!line||!ws)continue;
      for(let n=0;n<ws.length;n++){
        const span=ws[n],w=us[n];if(!w)continue;const m=wordMotion(line,w,ms),fill=m.progress*100,feather=m.run?3.1:m.held?5.5:clamp(3.8+2.8*m.pulse,3.8,6.6),fa=clamp(fill-feather,0,100),fb=clamp(fill+feather,0,100),roleFocus=focus.alpha*role.word;
        const halo1=(.8+6.2*m.glow)*glowSetting,halo2=(2+12.8*m.glow)*glowSetting,ha=clamp(.02+.31*m.glow,0,.36),ha2=clamp(.006+.08*m.glow,0,.10),motion=m.held?'held':m.run?'run':m.adlib?'adlib':m.breath?'breath':'normal';
        if(span.dataset.motion!==motion)span.dataset.motion=motion;
        span.style.cssText=`--fill:${fill.toFixed(2)}%;--fill-a:${fa.toFixed(2)}%;--fill-b:${fb.toFixed(2)}%;--word-scale:${(1+(m.scale-1)*roleFocus).toFixed(4)};--word-rise:${(m.rise*roleFocus).toFixed(2)}px;--word-bright:${(1+(m.bright-1)*roleFocus).toFixed(3)};--halo1:${halo1.toFixed(2)}px;--halo2:${halo2.toFixed(2)}px;--halo-alpha:${(ha*roleFocus).toFixed(3)};--halo-alpha2:${(ha2*roleFocus).toFixed(3)};`;
      }
    }
  };
  const dormant=()=>document.hidden||!previewVisible;
  window.render=function(ms){
    if(dormant()){
      const now=performance.now(),jump=Math.abs(ms-lastDormantMs)>450;
      if(!jump&&now-lastDormantPaint<180)return;
      lastDormantPaint=now;lastDormantMs=ms;
    }
    return baseRender(ms);
  };
  if('IntersectionObserver'in window&&story){
    const io=new IntersectionObserver(entries=>{previewVisible=entries.some(e=>e.isIntersecting&&e.intersectionRatio>.02);if(previewVisible)window.render(audio.currentTime*1000)},{root:null,threshold:[0,.02,.15]});io.observe(story);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)window.render(audio.currentTime*1000)});
  $('#contextMode')?.addEventListener('change',()=>{geomKey='';window.render(audio.currentTime*1000)});
  if('ResizeObserver'in window&&story)new ResizeObserver(()=>{geomKey=''}).observe(story);
  window.linaPerformance={contextRadius,reset(){root=null;geomKey='';centers=[]}};
})();
