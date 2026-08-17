/* KEFE Visualiser — Starfield lyric conveyor */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.starfield=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time);if(!a)return;
 const words=u.wordsFor(a.line,a.next);if(!words.length)return;
 const base=Number(style.fontSize)||76,colour=style.accentColor||'#FFFFFF';
 const laneY=h*.62,spacing=Math.max(base*.52,Math.min(h*.065,base*.76));
 const line=u.lineProgress(a.line,time,.10,.16);
 const local=u.clamp((time-a.line.time)/Math.max(.16,a.line.endTime-a.line.time));
 const travel=u.smoother(local);
 const visible=Math.min(12,Math.max(7,words.length+4));
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 for(let n=-3;n<visible;n++){
   const position=n+travel*1.72;
   if(position<-.95||position>visible-.65)continue;
   const depth=u.clamp(1-position/(visible-1));
   const perspective=u.smoother(depth);
   const scale=.22+.78*perspective;
   const y=laneY+(position-(visible-2))*spacing*(.42+.58*perspective);
   const word=words[((n%words.length)+words.length)%words.length];
   const size=u.fitText(ctx,'TikTok Sans',word.text,base*scale,w*.76,800);
   const edge=u.clamp(Math.min((position+.65)/.9,(visible-.25-position)/.9));
   const alpha=edge*(.08+.92*perspective)*(.82+.18*line.opacity);
   ctx.globalAlpha=alpha;
   ctx.fillStyle=colour;
   ctx.shadowColor=colour;
   ctx.shadowBlur=size*.016*perspective;
   ctx.fillText(word.text,w/2,y);
 }
 ctx.restore();
};
})();
