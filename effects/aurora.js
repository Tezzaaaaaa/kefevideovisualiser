/* KEFE Visualiser — Aurora effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.aurora=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time); if(!a)return; const text=String(a.line.text||'').trim(); if(!text)return;
 const size=u.fitText(ctx,'Permanent Marker',text,Number(style.fontSize)||76,w*.84,400);
 const speed=Number(style.auroraSpeed)||1.2,intensity=Number(style.auroraIntensity)||.7,saturation=u.clamp(Number(style.auroraSaturation)||1,.2,1.8),hueBase=(time*speed*28+180)%360,y=h*.46;
 ctx.save();u.setFont(ctx,'Permanent Marker',size,400);ctx.textAlign='center';ctx.textBaseline='middle';
 const gradient=ctx.createLinearGradient(w*.08,y-size,w*.92,y+size);
 for(let i=0;i<=6;i++){const stop=i/6,hue=(hueBase+stop*135)%360,light=63+12*Math.sin(time*speed+i*.85);gradient.addColorStop(stop,`hsl(${hue} ${Math.min(100,76*saturation)}% ${light}%)`);}
 ctx.fillStyle=gradient;ctx.shadowColor=`hsl(${(hueBase+65)%360} 100% 72%)`;ctx.shadowBlur=size*.20*intensity;ctx.fillText(text,w/2,y);ctx.restore();
};
})();
