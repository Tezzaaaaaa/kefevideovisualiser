/* KEFE Visualiser — Starfield lyric conveyor */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.starfield=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time);if(!a)return;const words=u.wordsFor(a.line,a.next);if(!words.length)return;
 const base=Number(style.fontSize)||76,colour=style.accentColor||'#FFFFFF',laneY=h*.62,spacing=Math.max(base*.52,Math.min(h*.065,base*.76)),local=u.clamp((time-a.line.time)/Math.max(.16,a.line.endTime-a.line.time)),visible=Math.min(10,Math.max(6,words.length+3));
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 for(let n=-2;n<visible;n++){const position=n+local*1.85;if(position<-.9||position>visible-.8)continue;const depth=u.clamp(1-position/(visible-1)),perspective=u.smoother(depth),scale=.24+.76*perspective,y=laneY+(position-(visible-2))*spacing*(.50+.50*perspective),word=words[((n%words.length)+words.length)%words.length],size=u.fitText(ctx,'TikTok Sans',word.text,base*scale,w*.76,800),fade=u.clamp(Math.min((position+.55)/.8,(visible-.35-position)/.8));ctx.globalAlpha=fade*(.12+.88*perspective);ctx.fillStyle=colour;ctx.shadowColor=colour;ctx.shadowBlur=size*.012*perspective;ctx.fillText(word.text,w/2,y);}
 ctx.restore();
};
})();
