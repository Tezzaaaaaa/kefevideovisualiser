/* KEFE Visualiser — Aurora lyric effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.aurora=function(ctx,w,h,style,lines,time){
  const a=u.activeLine(lines,time); if(!a)return;
  const words=u.wordsFor(a.line,a.next); if(!words.length)return;
  const c=u.contract('aurora');
  const size=u.fitContractText(ctx,'aurora',words.map(x=>x.text).join(' '),Number(style.fontSize)||76,w*.84);
  const beat=Math.sin(time*5.4)*.5+.5;
  const intensity=.70+.30*beat;
  ctx.save();
  ctx.globalCompositeOperation='screen';
  for(let band=0;band<7;band++){
    const phase=time*(.55+band*.075)+band*1.37;
    const yBase=h*(.20+band*.105);
    const amp=h*(.055+band*.008);
    const grad=ctx.createLinearGradient(0,yBase-amp,w,yBase+amp);
    const hue=(145+band*43+time*18)%360;
    grad.addColorStop(0,`hsla(${hue},95%,62%,0)`);
    grad.addColorStop(.5,`hsla(${(hue+38)%360},100%,70%,${.085*intensity})`);
    grad.addColorStop(1,`hsla(${(hue+90)%360},95%,60%,0)`);
    ctx.strokeStyle=grad; ctx.lineWidth=h*(.016+.005*Math.sin(band+time));
    ctx.shadowBlur=h*.038; ctx.shadowColor=`hsla(${hue},100%,65%,.34)`;
    ctx.beginPath();
    for(let x=0;x<=w;x+=Math.max(8,w/90)){
      const n=x/w;
      const y=yBase+Math.sin(n*7.4+phase)*amp+Math.sin(n*15.2-phase*.7)*amp*.32;
      if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  ctx.restore();
  const lineY=h*.50+Math.sin(time*1.8)*h*.010;
  let total=words.reduce((sum,x)=>sum+ctx.measureText(x.text).width,0)+size*.09*(words.length-1);
  if(!Number.isFinite(total)||total<=0)total=w*.7;
  let x=(w-total)/2;
  ctx.save(); ctx.textAlign='left'; ctx.textBaseline='middle'; u.setContractFont(ctx,'aurora',size);
  for(const word of words){
    const wp=u.wordProgress(word,time);
    const enter=u.smoother(wp.raw/.22), active=u.smoother((wp.raw-.10)/.34);
    if(enter>0){
      ctx.save();
      ctx.translate(x+ctx.measureText(word.text).width/2,lineY+(1-enter)*size*.34);
      ctx.globalAlpha=Math.min(1,enter)*(.78+.22*active);
      ctx.shadowBlur=size*(.07+.11*active);
      const g=ctx.createLinearGradient(-size,0,size,0);
      const hue=(155+time*28)%360;
      g.addColorStop(0,`hsl(${hue},100%,88%)`); g.addColorStop(.5,`hsl(${(hue+48)%360},100%,96%)`); g.addColorStop(1,`hsl(${(hue+105)%360},100%,88%)`);
      ctx.fillStyle=g; ctx.shadowColor=`hsla(${(hue+55)%360},100%,70%,.70)`;
      ctx.scale(.97+.03*active,.97+.03*active);
      u.drawTrackedText(ctx,word.text,0,0,size*(c.tracking||0),'fillText');
      ctx.restore();
    }
    x+=ctx.measureText(word.text).width+size*.09;
  }
  ctx.restore();
};
})();
