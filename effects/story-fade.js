/* KEFE Visualiser — Fade Up effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.fadeup=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time); if(!a)return;
 const words=u.wordsFor(a.line,a.next); if(!words.length)return;
 const c=u.contract('fadeup');
 const margin=Math.max(44,w*.07);
 const base=Number(style.fontSize)||78;
 let size=u.fitContractText(ctx,'fadeup',words.map(x=>x.text).join(' '),base,w-margin*2);
 u.setContractFont(ctx,'fadeup',size);
 const gap=size*.12;
 const widths=words.map(word=>ctx.measureText(word.text).width);
 const total=widths.reduce((s,n)=>s+n,0)+gap*(words.length-1);
 const x0=(w-total)/2;
 const y=h*.50;
 ctx.save();
 ctx.textAlign='left'; ctx.textBaseline='middle';
 for(let i=0;i<words.length;i++){
   const word=words[i], wp=u.wordProgress(word,time);
   const p=wp.raw;
   const enter=u.smoother(p/.16);
   const active=u.smoother((p-.10)/.22);
   const exit=1-u.smoother((p-.78)/.22)*.35;
   if(enter>0){
     const x=x0+widths.slice(0,i).reduce((s,n)=>s+n,0)+gap*i;
     const lift=(1-enter)*size*.58;
     const scale=1+.10*active;
     ctx.save();
     ctx.translate(x+widths[i]/2,y+lift);
     ctx.scale(scale,scale);
     ctx.globalAlpha=Math.min(1,enter)*exit;
     ctx.fillStyle=style.textColor||'#FFFFFF';
     ctx.shadowColor=style.accentColor||'transparent';
     ctx.shadowBlur=active*size*.16;
     u.drawTrackedText(ctx,word.text,0,0,size*(c.tracking||0),'fillText');
     ctx.restore();
   }
 }
 ctx.restore();
};
})();
