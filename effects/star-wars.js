/* KEFE Visualiser — Star Wars lyric crawl, rebuilt for music timing */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.starwars=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time); if(!a)return;
 const words=u.wordsFor(a.line,a.next); if(!words.length)return;
 const c=u.contract('starwars');
 const size=u.fitContractText(ctx,'starwars',words.map(x=>x.text).join(' '),Number(style.fontSize)||76,w*.82);
 u.setContractFont(ctx,'starwars',size);
 const progress=u.clamp((time-a.line.time)/Math.max(.25,a.line.endTime-a.line.time));
 const colour=style.accentColor||'#FFE81F';
 const horizon=h*.17;
 const baseY=h*.78;
 const travel=u.smoother(progress);
 const scale=.72+.28*(1-travel);
 const alpha=u.smoother(Math.min(1,progress/.10,(1-progress)/.16));
 ctx.save();
 ctx.textAlign='center'; ctx.textBaseline='middle';
 // Deep-space field: restrained so the lyric remains the hero.
 for(let i=0;i<34;i++){
   const seed=Math.sin(i*91.17)*43758.5453; const r=seed-Math.floor(seed);
   const sx=(Math.sin(i*17.3)*.5+.5)*w, sy=(Math.sin(i*43.7)*.5+.5)*h;
   const tw=.35+.65*Math.sin(time*(1.5+r*2)+i)*.5+.5;
   ctx.globalAlpha=.10*tw; ctx.fillStyle='#fff'; ctx.beginPath();ctx.arc(sx,sy,Math.max(.5,w*.0009),0,Math.PI*2);ctx.fill();
 }
 ctx.translate(w/2,baseY-(baseY-horizon)*travel);
 ctx.transform(1,0,-.16,.42,0,0);
 ctx.scale(scale,scale);
 let y=0;
 const lineGap=size*.98;
 for(let wi=0;wi<words.length;wi++){
   const word=words[wi],wp=u.wordProgress(word,time);
   const wordAlpha=u.smoother(wp.enter/.55);
   if(wordAlpha>0){
     ctx.save();
     ctx.globalAlpha=alpha*wordAlpha;
     ctx.fillStyle=colour;
     ctx.shadowColor='rgba(255,232,31,.55)'; ctx.shadowBlur=size*.025;
     const pulse=1+Math.sin(time*7+wi*.8)*.012;
     ctx.scale(pulse,pulse);
     u.drawTrackedText(ctx,word.text,0,y,size*(c.tracking||0),'fillText');
     ctx.restore();
   }
   y+=lineGap*(.78+.22*wi/Math.max(1,words.length-1));
 }
 ctx.restore();
};
})();
