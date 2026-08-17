/* KEFE Visualiser — Mixed Media lyric effect
 * Inspired by Effect.app's Mixed media preset vocabulary: layered collage,
 * paper/print texture, ink-like edges, halftone fields and imperfect registration.
 * Independent implementation; no Effect.app source is copied.
 */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
function hash(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);}
function paperNoise(ctx,w,h,time){
  const step=Math.max(8,Math.round(Math.min(w,h)/150));
  ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.08;
  for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){const n=hash(x*.013+y*.017+Math.floor(time*5));if(n>.80){ctx.fillStyle=`rgba(20,16,12,${(n-.80)*.42})`;ctx.fillRect(x,y,step*(.35+n*.9),step*(.2+n*.55));}}
  ctx.restore();
}
window.kefeEffects.mixedmedia=function(ctx,w,h,style,lines,time){
  const a=u.activeLine(lines,time);if(!a)return;
  const words=u.wordsFor(a.line,a.next);if(!words.length)return;
  const c=u.contract('mixedmedia');
  const size=u.fitContractText(ctx,'mixedmedia',words.map(x=>x.text).join(' '),Number(style.fontSize)||76,w*.82);
  const centerY=h*.50,tracking=size*(c.tracking||.015),gap=size*.16;
  let total=words.reduce((s,x)=>s+ctx.measureText(x.text).width,0)+gap*Math.max(0,words.length-1)+tracking*Math.max(0,words.join('').length-words.length);
  if(!Number.isFinite(total)||total<=0)total=w*.72;
  const x0=(w-total)/2;

  // Collage substrate: torn paper strips remain behind the typography.
  ctx.save();ctx.globalAlpha=.22+.08*Math.sin(time*1.7);const stripY=centerY-size*.92;
  for(let i=0;i<3;i++){
    const yy=stripY+i*size*.72,drift=Math.sin(time*.8+i*2.1)*size*.18;
    ctx.fillStyle=i===1?'#e8d8b8':i===2?'#c7d2d7':'#ded6c9';ctx.beginPath();
    for(let j=0;j<=12;j++){const px=w*.08+j*w*.84/12,py=yy+(hash(i*31+j*7)*2-1)*size*.06;if(j===0)ctx.moveTo(px+drift,py);else ctx.lineTo(px+drift,py);}
    ctx.lineTo(w*.92+drift,yy+size*.40);ctx.lineTo(w*.08+drift,yy+size*.40);ctx.closePath();ctx.fill();
  }ctx.restore();

  // Fine print texture and halftone field.
  paperNoise(ctx,w,h,time);
  ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.10;
  const dot=size*.055,spacing=size*.16;
  for(let yy=centerY-size*1.35;yy<centerY+size*1.35;yy+=spacing)for(let xx=w*.08;xx<w*.92;xx+=spacing){const r=dot*(.35+.65*hash(xx*.021+yy*.017+Math.floor(time*3)));ctx.beginPath();ctx.arc(xx+Math.sin(time*.8+yy)*2,yy,r,0,Math.PI*2);ctx.fillStyle='#161616';ctx.fill();}
  ctx.restore();

  // Imperfect CMY registration behind the black ink.
  const layers=[{dx:-size*.018,dy:size*.012,color:'rgba(224,52,68,.34)'},{dx:size*.018,dy:-size*.010,color:'rgba(34,104,210,.30)'}];
  for(const layer of layers){ctx.save();ctx.translate(layer.dx,layer.dy);ctx.fillStyle=layer.color;u.setContractFont(ctx,'mixedmedia',size);let lx=x0;
    for(const word of words){const wp=u.wordProgress(word,time),reveal=u.smoother((wp.raw+.04)/.30);if(reveal>0){ctx.globalAlpha=.9*reveal;u.drawTrackedText(ctx,word.text,lx,centerY+size*.02,tracking,'fillText');}lx+=ctx.measureText(word.text).width+gap;}ctx.restore();}

  // Main printed lyric: hard ink, restrained paper offset, crisp word timing.
  ctx.fillStyle='#111';u.setContractFont(ctx,'mixedmedia',size);let inkX=x0;
  for(let wi=0;wi<words.length;wi++){const word=words[wi],wp=u.wordProgress(word,time),enter=u.smoother((wp.raw+.02)/.24),active=u.smoother((wp.raw-.02)/.22);if(enter>0){const jitter=(hash(wi*41.7+Math.floor(time*7))-.5)*size*.018;ctx.save();ctx.globalAlpha=Math.min(1,enter);ctx.translate(inkX+jitter,centerY+jitter);ctx.scale(.97+.03*enter,.97+.03*enter);u.drawTrackedText(ctx,word.text,0,0,tracking,'fillText');ctx.restore();if(active>.12){ctx.save();ctx.globalAlpha=.16*active;ctx.globalCompositeOperation='screen';ctx.fillStyle='#fff';u.drawTrackedText(ctx,word.text,inkX+size*.012,centerY-size*.012,tracking,'fillText');ctx.restore();}}inkX+=ctx.measureText(word.text).width+gap;}
};
})();
