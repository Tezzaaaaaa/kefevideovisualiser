/* KEFE Visualiser — Story Fade effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.storyfade=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time);if(!a)return;
 const words=u.wordsFor(a.line,a.next);if(!words.length)return;
 const contract=u.contract('fadeup');
 const base=Number(style.fontSize)||76,margin=Math.max(44,w*.07);
 const text=words.map(word=>word.text).join(' ');
 let size=u.fitContractText(ctx,'fadeup',text,base,w-margin*2);
 let gap=size*.20;
 u.setContractFont(ctx,'fadeup',size);
 let widths=words.map(word=>ctx.measureText(word.text).width);
 let total=widths.reduce((s,width)=>s+width,0)+gap*(words.length-1);
 if(total>w-margin*2){
   size=Math.max(contract.min,size*(w-margin*2)/total);gap=size*.20;
   u.setContractFont(ctx,'fadeup',size);
   widths=words.map(word=>ctx.measureText(word.text).width);
   total=widths.reduce((s,width)=>s+width,0)+gap*(words.length-1);
 }
 let x=(w-total)/2;const y=h*.46;
 ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';
 for(let i=0;i<words.length;i++){
   const word=words[i],wp=u.wordProgress(word,time);
   const enter=wp.enter;
   const exit=1-wp.exit*.55;
   const alpha=enter*exit;
   if(alpha>0){
     ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=style.textColor||'#FFFFFF';
     u.drawTrackedText(ctx,word.text,x,y+(1-enter)*size*.42,size*(contract.tracking||0),'fillText');
     ctx.restore();
   }
   x+=widths[i]+gap;
 }
 ctx.restore();
};
})();
