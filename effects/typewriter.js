/* KEFE Visualiser — Typewriter lyric effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.typewriter=function(ctx,w,h,style,lines,time){
  const a=u.activeLine(lines,time); if(!a)return;
  const words=u.wordsFor(a.line,a.next); if(!words.length)return;
  const c=u.contract('typewriter');
  const text=words.map(word=>word.text).join(' ');
  const size=u.fitContractText(ctx,'typewriter',text,Number(style.fontSize)||76,w*.84);
  u.setContractFont(ctx,'typewriter',size);
  const widths=words.map(word=>ctx.measureText(word.text).width);
  const spacing=size*.09;
  const total=widths.reduce((sum,width)=>sum+width,0)+spacing*(words.length-1);
  const startX=(w-total)/2;
  const y=h*.51;
  ctx.save();
  ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.globalAlpha=.065;ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=size*.028;ctx.fillStyle='#000';
  u.drawTrackedText(ctx,text,startX,y,size*(c.tracking||0),'fillText');
  ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.fillStyle=style.textColor||'#F5F2EA';
  let cursor=startX,caretX=startX,caretVisible=false;
  for(let i=0;i<words.length;i++){
    const word=words[i],full=word.text,start=Number(word.time)||0;
    const end=Math.max(start+.06,Number(word.endTime)||start+.12),duration=end-start,elapsed=Math.max(0,time-start);
    const lead=Math.min(.028,Math.max(.010,duration*.035));
    const p=u.clamp((time-(start-lead))/Math.max(.035,duration-lead));
    const shown=time<start-lead?0:Math.min(full.length,Math.ceil(p*full.length));
    const typed=full.slice(0,shown);
    if(typed)u.drawTrackedText(ctx,typed,cursor,y,size*(c.tracking||0),'fillText');
    const typedWidth=ctx.measureText(typed).width+Math.max(0,typed.length-1)*size*(c.tracking||0);
    caretX=cursor+typedWidth;
    caretVisible=time>=start-lead&&time<=Math.min(end+.06,a.line.endTime+.06)&&(Math.floor(elapsed*10)%2===0);
    if(caretVisible)caretX=Math.min(cursor+widths[i],cursor+typedWidth);
    cursor+=widths[i]+spacing;
  }
  if(caretVisible){ctx.save();ctx.globalAlpha=.82;ctx.fillStyle=style.textColor||'#F5F2EA';ctx.fillRect(Math.round(caretX+size*.028),y-size*.40,Math.max(1,size*.018),size*.80);ctx.restore();}
  ctx.restore();
};
})();
