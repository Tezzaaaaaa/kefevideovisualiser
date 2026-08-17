/* KEFE Visualiser — Stroke effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.stroke=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time); if(!a)return;
 const words=u.wordsFor(a.line,a.next); if(!words.length)return;
 const text=words.map(word=>word.text).join(' ');
 const contract=u.contract('stroke');
 const size=u.fitContractText(ctx,'stroke',text,Number(style.fontSize)||82,w*.84);
 const p=u.lineProgress(a.line,time,.06,.14);
 const reveal=u.clamp((time-(Number(a.line.time)||0))/.32);
 const x=w/2, y=h*.52;
 ctx.save();
 u.setContractFont(ctx,'stroke',size);
 ctx.textAlign='center'; ctx.textBaseline='middle';
 ctx.lineJoin='round'; ctx.lineCap='round';
 ctx.globalAlpha=p.opacity*.42;
 ctx.lineWidth=Math.max(5,size*.075);
 ctx.strokeStyle=style.accentColor||'#FFFFFF';
 ctx.shadowColor=style.accentColor||'#FFFFFF';
 ctx.shadowBlur=Math.max(8,size*.10);
 u.drawTrackedText(ctx,text,x,y,size*(contract.tracking||0),'strokeText');
 ctx.shadowBlur=0;
 ctx.globalAlpha=p.opacity;
 ctx.lineWidth=Math.max(2,size*.026);
 ctx.strokeStyle=style.textColor||'#FFFFFF';
 u.drawTrackedText(ctx,text,x,y,size*(contract.tracking||0),'strokeText');
 if(reveal>0&&reveal<1){
   ctx.globalAlpha=p.opacity*.8;
   ctx.strokeStyle=style.accentColor||'#FFFFFF';
   ctx.lineWidth=Math.max(1.5,size*.014);
   ctx.setLineDash([size*.18,size*.12]);
   ctx.lineDashOffset=-reveal*size*2;
   u.drawTrackedText(ctx,text,x,y,size*(contract.tracking||0),'strokeText');
   ctx.setLineDash([]);
 }
 ctx.restore();
};
})();
