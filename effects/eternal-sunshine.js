/* KEFE Visualiser — Eternal Sunshine handwritten ink effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
function hash(s){let n=2166136261;for(const ch of String(s)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0)/4294967295;}
window.kefeEffects.eternal=function(ctx,w,h,style,lines,time){
  const a=u.activeLine(lines,time); if(!a)return;
  const words=u.wordsFor(a.line,a.next); if(!words.length)return;
  const c=u.contract('eternal');
  const size=u.fitContractText(ctx,'eternal',words.map(x=>x.text).join(' '),Number(style.fontSize)||76,w*.86);
  u.setContractFont(ctx,'eternal',size);
  const gap=size*.055;
  const wordWidths=words.map(word=>ctx.measureText(word.text).width);
  const total=wordWidths.reduce((s,n)=>s+n,0)+gap*(words.length-1);
  let x=(w-total)/2;
  const y=h*.52;
  const ink=style.eternalInkColor||'#FFFFFF';
  ctx.save(); ctx.textAlign='left'; ctx.textBaseline='middle';
  for(let wi=0;wi<words.length;wi++){
    const word=words[wi];
    const wp=u.wordProgress(word,time);
    const p=wp.raw;
    const chars=Array.from(word.text);
    let charX=x;
    for(let ci=0;ci<chars.length;ci++){
      const ch=chars[ci], cw=ctx.measureText(ch).width;
      const cp=u.clamp((p*chars.length-ci)/1.0);
      if(cp>0){
        const reveal=u.smoother(cp/.82);
        const seed=hash(`${word.text}:${ci}`);
        const startY=y-size*.40+seed*size*.72;
        const endY=y+size*.28+(hash(`${word.text}:${ci}:end`)-.5)*size*.12;
        const sweep=ci%2===0 ? 1 : -1;
        const nibX=charX+cw*(sweep>0 ? reveal : 1-reveal);
        const nibY=startY+(endY-startY)*reveal;
        ctx.save();
        ctx.beginPath();
        const pad=Math.max(2,size*.025);
        ctx.rect(charX-pad,y-size*.62,cw+pad*2,size*1.25);
        ctx.clip();
        ctx.globalAlpha=Math.min(1,reveal)*(.86+.14*u.smoother((p-.55)/.45));
        ctx.fillStyle=ink;
        ctx.shadowColor=ink;
        ctx.shadowBlur=Math.max(0,Number(style.eternalGlow)||2)*(.35+.65*reveal);
        ctx.fillText(ch,charX,y);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha=.75*reveal;
        ctx.fillStyle=ink;
        ctx.shadowColor=ink; ctx.shadowBlur=size*.055;
        ctx.beginPath(); ctx.arc(nibX,nibY,Math.max(1.2,size*.018),0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      charX+=cw;
    }
    x+=wordWidths[wi]+gap;
  }
  ctx.restore();
};
})();
