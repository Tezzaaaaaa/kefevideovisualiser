/* KEFE Visualiser — Story Fade effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.storyfade=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time);if(!a)return;const words=u.wordsFor(a.line,a.next);if(!words.length)return;const base=Number(style.fontSize)||76,margin=Math.max(44,w*.07);let size=base,gap=base*.20;u.setFont(ctx,'DM Sans',size,700);let widths=words.map(word=>ctx.measureText(word.text).width),total=widths.reduce((s,width)=>s+width,0)+gap*(words.length-1);
 if(total>w-margin*2){size=base*(w-margin*2)/total;gap=size*.20;u.setFont(ctx,'DM Sans',size,700);widths=words.map(word=>ctx.measureText(word.text).width);total=widths.reduce((s,width)=>s+width,0)+gap*(words.length-1);}
 let x=(w-total)/2;const y=h*.46;ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';
 for(let i=0;i<words.length;i++){const word=words[i],progress=u.clamp((time-word.time)/Math.max(.08,word.endTime-word.time)),enter=u.smoother(progress/.20);ctx.save();ctx.globalAlpha=enter;ctx.fillStyle=style.textColor||'#FFFFFF';ctx.fillText(word.text,x,y+(1-enter)*size*.48);ctx.restore();x+=widths[i]+gap;}
 ctx.restore();
};
})();
