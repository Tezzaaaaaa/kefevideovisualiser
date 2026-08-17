/* KEFE Visualiser — Eternal Sunshine handwritten ink effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
function hash(s){let n=2166136261;for(const ch of String(s)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0)/4294967295;}
function ease(v){return u.smoother(v);}
function nibPoint(x,y,w,h,seed,p){
  const flip=seed>.5, q=u.clamp(p);
  const sx=x+w*(flip?.78:.22), ex=x+w*(flip?.18:.82);
  const top=y-h*.34, mid=y-h*.02, low=y+h*.30;
  const bend=(hash(seed+':bend')-.5)*w*.18;
  const pts=[[sx,low],[x+w*(flip?.68:.32)+bend,top],[x+w*(flip?.30:.70)-bend,mid],[x+w*(flip?.62:.38),low],[ex,top+h*.08]];
  const lens=[];let total=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);lens.push(d);total+=d;}
  let t=total*q;for(let i=1;i<pts.length;i++){const d=lens[i-1];if(t<=d){const f=d?t/d:0;return [pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f];}t-=d;}
  return pts[pts.length-1];
}
function revealGlyph(ctx,ch,x,y,size,cw,progress,seed,ink){
  if(progress<=0)return;
  // The glyph is revealed by small, overlapping ink dabs that accumulate around
  // a pen path. There is deliberately no full-height sweep or rectangular wipe.
  const pad=Math.ceil(size*.16), W=Math.ceil(cw+pad*2), H=Math.ceil(size*1.5);
  const glyph=document.createElement('canvas');glyph.width=W;glyph.height=H;
  const g=glyph.getContext('2d');g.textBaseline='middle';g.textAlign='left';u.setContractFont(g,'eternal',size);g.fillStyle=ink;g.fillText(ch,pad,size*.72);
  const mask=document.createElement('canvas');mask.width=W;mask.height=H;const m=mask.getContext('2d');
  const p=ease(progress), steps=Math.max(4,Math.ceil(18*p));
  for(let i=0;i<steps;i++){
    const q=i/17, pt=nibPoint(pad,size*.72,cw,size*.78,seed,q);
    const r=size*(.07+.045*ease(u.clamp((p-q+.12)/.18)));
    m.globalAlpha=.22+.78*ease(u.clamp((p-q+.08)/.18));
    m.beginPath();m.arc(pt[0],pt[1],r,0,Math.PI*2);m.fillStyle='#fff';m.fill();
    if(i>0){const prev=nibPoint(pad,size*.72,cw,size*.78,seed,(i-1)/17);m.strokeStyle='#fff';m.globalAlpha=.32;m.lineWidth=Math.max(1,size*.045);m.lineCap='round';m.beginPath();m.moveTo(prev[0],prev[1]);m.lineTo(pt[0],pt[1]);m.stroke();}
  }
  // Feather the accumulated ink without adding visible shadow blobs.
  const out=document.createElement('canvas');out.width=W;out.height=H;const o=out.getContext('2d');o.drawImage(glyph,0,0);o.globalCompositeOperation='destination-in';o.drawImage(mask,0,0);
  ctx.drawImage(out,x-pad,y-size*.72);
}
window.kefeEffects.eternal=function(ctx,w,h,style,lines,time){
  const a=u.activeLine(lines,time);if(!a)return;
  const words=u.wordsFor(a.line,a.next);if(!words.length)return;
  const size=u.fitContractText(ctx,'eternal',words.map(x=>x.text).join(' '),Number(style.fontSize)||76,w*.82);
  u.setContractFont(ctx,'eternal',size);
  const gap=size*.055, widths=words.map(word=>ctx.measureText(word.text).width);
  const total=widths.reduce((s,n)=>s+n,0)+gap*(words.length-1);
  let x=(w-total)/2;
  const y=h*.50;
  const ink=style.eternalInkColor||'#FFFFFF';
  ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';ctx.globalCompositeOperation='source-over';
  for(let wi=0;wi<words.length;wi++){
    const word=words[wi], chars=Array.from(word.text), cws=chars.map(ch=>ctx.measureText(ch).width);
    const duration=Math.max(.10,Number(word.endTime)-Number(word.time));
    const window=Math.min(duration*.58,.30);
    const p=ease(u.clamp((time-Number(word.time))/window));
    let cx=x;
    for(let ci=0;ci<chars.length;ci++){
      const start=ci/chars.length, end=(ci+1)/chars.length;
      const cp=ease(u.clamp((p-start)/Math.max(.08,end-start+.025)));
      if(cp>0){
        const seed=hash(`${word.text}:${ci}`);
        revealGlyph(ctx,chars[ci],cx,y,size,cws[ci],cp,seed,ink);
      }
      cx+=cws[ci];
    }
    x+=widths[wi]+gap;
  }
  ctx.restore();
};
})();
