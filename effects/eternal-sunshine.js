/* KEFE Visualiser — Eternal Sunshine handwritten ink effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};

function hash(s){let n=2166136261;for(const ch of String(s)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0)/4294967295;}
function ease(v){return u.smoother(v);}

// A handwriting reveal should feel like a pen actually travelling through the
// glyph, not like a rectangular wipe over a finished character. The path is
// deliberately made of several short passes so every character has a start,
// travel and finish point of its own.
function penPath(ctx,x,y,w,h,seed,progress){
  const flip=seed>.5;
  const sx=x+(flip?w*.82:w*.18);
  const ex=x+(flip?w*.16:w*.84);
  const top=y-h*.34;
  const mid=y-h*.02;
  const low=y+h*.30;
  const bend=(hash(seed+':bend')-.5)*w*.28;
  const points=[
    [sx,low],
    [x+w*(flip?.72:.28)+bend,top],
    [x+w*(flip?.28:.72)-bend,mid],
    [x+w*(flip?.68:.32)+bend*.45,low],
    [ex,top+h*.12]
  ];
  const segments=[];
  let total=0;
  for(let i=1;i<points.length;i++){
    const dx=points[i][0]-points[i-1][0],dy=points[i][1]-points[i-1][1];
    const len=Math.hypot(dx,dy);segments.push(len);total+=len;
  }
  let target=total*u.clamp(progress), travelled=0;
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++){
    const len=segments[i-1];
    if(target>=len){ctx.lineTo(points[i][0],points[i][1]);target-=len;travelled+=len;continue;}
    const t=len?target/len:0;
    ctx.lineTo(points[i-1][0]+(points[i][0]-points[i-1][0])*t,points[i-1][1]+(points[i][1]-points[i-1][1])*t);
    break;
  }
  return points[Math.min(points.length-1,Math.floor((progress||0)*(points.length-1)))];
}

window.kefeEffects.eternal=function(ctx,w,h,style,lines,time){
  const a=u.activeLine(lines,time); if(!a)return;
  const words=u.wordsFor(a.line,a.next); if(!words.length)return;
  const size=u.fitContractText(ctx,'eternal',words.map(x=>x.text).join(' '),Number(style.fontSize)||76,w*.86);
  u.setContractFont(ctx,'eternal',size);
  const gap=size*.055;
  const wordWidths=words.map(word=>ctx.measureText(word.text).width);
  const total=wordWidths.reduce((s,n)=>s+n,0)+gap*(words.length-1);
  let x=(w-total)/2;
  const y=h*.52;
  const ink=style.eternalInkColor||'#FFFFFF';

  ctx.save();
  ctx.textAlign='left';ctx.textBaseline='middle';

  for(let wi=0;wi<words.length;wi++){
    const word=words[wi];
    const chars=Array.from(word.text);
    const widths=chars.map(ch=>ctx.measureText(ch).width);
    const strokeWeights=chars.map(ch=>Math.max(1,Array.from(ch).length + /[mwMW]/.test(ch)*.55));
    const strokeTotal=strokeWeights.reduce((s,n)=>s+n,0);

    // Tight timing: the word begins drawing immediately and finishes early,
    // leaving only a short natural hold before the next sung word.
    const duration=Math.max(.06,Number(word.endTime)-Number(word.time));
    const revealWindow=Math.min(duration*.62,.34);
    const p=ease(u.clamp((time-Number(word.time))/revealWindow));

    let charX=x;
    for(let ci=0;ci<chars.length;ci++){
      const ch=chars[ci], cw=widths[ci];
      const start=strokeWeights.slice(0,ci).reduce((s,n)=>s+n,0)/strokeTotal;
      const span=strokeWeights[ci]/strokeTotal;
      const cp=ease(u.clamp((p-start)/(span*.86+.035)));
      if(cp<=0){charX+=cw;continue;}

      // Render the glyph once, then reveal it through a moving ballpoint mask.
      // This avoids the old single rectangle sweeping across the entire face.
      const pad=Math.max(3,size*.10);
      const ox=charX-pad,oy=y-size*.62,ow=cw+pad*2,oh=size*1.25;
      const mask=document.createElement('canvas');
      mask.width=Math.ceil(ow+pad*2);mask.height=Math.ceil(oh+pad*2);
      const m=mask.getContext('2d');
      const seed=hash(`${word.text}:${ci}`);
      const localX=pad,localY=pad+size*.62;
      const nib=penPath(m,localX,localY,cw, size*.72,seed,cp);
      m.lineCap='round';m.lineJoin='round';
      m.lineWidth=Math.max(1.8,size*.095);
      m.strokeStyle='#fff';m.stroke();
      // A small second pass gives the pen pressure its organic irregularity.
      m.globalAlpha=.34;
      m.lineWidth=Math.max(1,size*.035);
      m.stroke();

      ctx.save();
      ctx.globalCompositeOperation='source-over';
      ctx.globalAlpha=.96;
      ctx.fillStyle=ink;
      ctx.shadowColor=ink;
      ctx.shadowBlur=Math.max(0,Number(style.eternalGlow)||2)*.45;
      ctx.drawImage(mask,ox-pad,oy-pad);
      ctx.globalCompositeOperation='destination-in';
      // Draw the glyph into the same local region before applying the mask.
      const glyph=document.createElement('canvas');
      glyph.width=mask.width;glyph.height=mask.height;
      const g=glyph.getContext('2d');
      g.textAlign='left';g.textBaseline='middle';
      u.setContractFont(g,'eternal',size);
      g.fillStyle='#fff';g.fillText(ch,pad,y-oy);
      ctx.drawImage(glyph,ox-pad,oy-pad);
      ctx.restore();

      // The visible nib is the ballpoint lead, not a glow travelling over the face.
      ctx.save();
      ctx.globalAlpha=.78*cp;
      ctx.fillStyle=ink;ctx.shadowColor=ink;ctx.shadowBlur=size*.035;
      ctx.beginPath();ctx.arc(ox-pad+nib[0],oy-pad+nib[1],Math.max(1.2,size*.018),0,Math.PI*2);ctx.fill();
      ctx.restore();

      charX+=cw;
    }
    x+=wordWidths[wi]+gap;
  }
  ctx.restore();
};
})();
