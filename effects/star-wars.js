/* KEFE Visualiser — Star Wars opening-crawl lyric effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.starwars=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time); if(!a)return;
 const words=u.wordsFor(a.line,a.next); if(!words.length)return;
 const text=words.map(word=>word.text).join(' ');
 const base=Number(style.fontSize)||76;
 const colour=style.accentColor||'#FFE81F';
 const progress=u.clamp((time-a.line.time)/Math.max(.2,a.line.endTime-a.line.time));
 const travel=u.smoother(progress);
 const size=u.fitContractText(ctx,'starwars',text,base,w*.78);
 const horizon=h*.20;
 const crawlBottom=h*.92;
 const y=crawlBottom-(crawlBottom-horizon)*travel;
 const perspective=.18+.82*(1-travel*.72);
 const alpha=u.smoother(Math.min(progress/.12,(1-progress)/.12));
 ctx.save();
 ctx.translate(w/2,y);
 ctx.rotate(-Math.PI/2.92);
 ctx.scale(perspective,perspective);
 ctx.globalAlpha=Math.max(.12,alpha);
 ctx.textAlign='center';
 ctx.textBaseline='middle';
 ctx.fillStyle=colour;
 ctx.shadowColor='rgba(0,0,0,.8)';
 ctx.shadowBlur=Math.max(2,size*.035);
 u.drawTrackedText(ctx,text,0,0,size*(u.contract('starwars').tracking||0),'fillText');
 ctx.restore();
};
})();
