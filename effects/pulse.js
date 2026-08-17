/* KEFE Visualiser — Pulse effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.pulse=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time); if(!a)return;
 const words=u.wordsFor(a.line,a.next); if(!words.length)return;
 const text=words.map(word=>word.text).join(' ');
 const size=u.fitContractText(ctx,'pulse',text,Number(style.fontSize)||78,w*.84);
 const p=u.lineProgress(a.line,time,.08,.14);
 const beat=0.5+0.5*Math.sin(time*Math.PI*10);
 const scale=1+(0.018+0.018*beat)*p.opacity;
 const y=h*.52;
 ctx.save();
 ctx.translate(w/2,y);
 ctx.scale(scale,scale);
 u.setContractFont(ctx,'pulse',size);
 ctx.textAlign='center'; ctx.textBaseline='middle';
 ctx.globalAlpha=p.opacity;
 ctx.fillStyle=style.textColor||'#FFFFFF';
 ctx.shadowColor=style.accentColor||'#FFFFFF';
 ctx.shadowBlur=(10+24*beat)*p.opacity;
 u.drawTrackedText(ctx,text,0,0,size*(u.contract('pulse').tracking||0),'fillText');
 ctx.shadowBlur=0;
 ctx.globalAlpha=p.opacity*(0.16+0.12*beat);
 ctx.strokeStyle=style.accentColor||'#FFFFFF';
 ctx.lineWidth=Math.max(1.5,size*.012);
 ctx.strokeText(text,0,0);
 ctx.restore();
};
})();
