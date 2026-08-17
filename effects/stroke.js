/* KEFE Visualiser — Subject Stroke effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.stroke=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time);if(!a)return;
 const words=u.wordsFor(a.line,a.next);if(!words.length)return;
 const text=words.map(word=>word.text).join(' ');
 const size=u.fitTextBinary(ctx,'Montserrat',text,Number(style.fontSize)||76,w*.82,800,28);
 const lp=u.lineProgress(a.line,time,.10,.20);
 const fade=u.smoother(Math.min(lp.enter,lp.exit));
 ctx.save();
 u.setFont(ctx,'Montserrat',size,800);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=fade;
 ctx.lineJoin='round';ctx.lineCap='round';
 ctx.lineWidth=Math.max(2,Math.round(size*.026));
 ctx.strokeStyle=style.accentColor||'#FFFFFF';
 ctx.strokeText(text,w/2,h*.57);
 ctx.restore();
};
})();
