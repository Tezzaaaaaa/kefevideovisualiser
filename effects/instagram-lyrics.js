/* KEFE Visualiser — Instagram Lyrics */
(() => {
  'use strict';
  const u = window.kefeEffectUtils;
  window.kefeEffects = window.kefeEffects || {};
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
  const ease=v=>{v=clamp(v);return v*v*(3-2*v)};
  const lineAt=(lines,i)=>{
    if(!Array.isArray(lines)||i<0||i>=lines.length)return null;
    const s=lines[i], t=Number(s?.time)||0, n=Number(lines[i+1]?.time), e=Number(s?.endTime);
    return {...s,time:t,endTime:Number.isFinite(e)&&e>t?e:Number.isFinite(n)&&n>t?n:t+3};
  };
  const activeIndex=(lines,time)=>{
    let i=-1;
    for(let n=0;n<lines.length;n++){const t=Number(lines[n]?.time);if(!Number.isFinite(t))continue;if(time>=t)i=n;else break}
    return i;
  };
  function fit(ctx,text,size,maxWidth){
    const target=Math.max(30,size||88);
    if(u?.fitContractText)return u.fitContractText(ctx,'instagram',text,target,maxWidth);
    let s=target;while(s>30){ctx.font=`800 ${s}px "Inter Tight",Arial,sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;s--}return s;
  }
  function text(ctx,text,x,y,size,alpha,scale,colour,tracking){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=alpha;ctx.fillStyle=colour;
    ctx.font=`800 ${size}px "Inter Tight",Arial,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    if(u?.drawTrackedText)u.drawTrackedText(ctx,text,0,0,size*tracking,'fillText');else ctx.fillText(text,0,0);
    ctx.restore();
  }
  window.kefeEffects.instagram=(ctx,w,h,style,lines,time)=>{
    if(!Array.isArray(lines)||!lines.length||!Number.isFinite(time))return;
    const i=activeIndex(lines,time);if(i<0)return;
    const base=clamp(style.instagramFontSize||88,48,150), colour=style.instagramTextColor||'#FFFFFF';
    const maxWidth=w*clamp(style.instagramMaxWidth||.86,.64,.92), activeScale=clamp(style.instagramActiveScale||1.20,1.05,1.40);
    const inactiveScale=clamp(style.instagramInactiveScale||.76,.58,.94), inactiveAlpha=clamp(style.instagramInactiveOpacity||.32,.10,.65);
    const spacing=clamp(style.instagramLineSpacing||.80,.60,1.04), yPos=clamp(style.instagramY||.50,.30,.70);
    const transition=clamp(style.instagramTransition||.18,.08,.42), tracking=Number.isFinite(Number(style.instagramTracking))?Number(style.instagramTracking):-.032;
    const previous=Math.round(clamp(style.instagramPreviousLines||1,0,2)), next=Math.round(clamp(style.instagramNextLines||2,1,3));
    const current=lineAt(lines,i), following=lineAt(lines,i+1);if(!current)return;
    const handoff=following&&time>=following.time-transition?ease((time-following.time+transition)/transition):0;
    const lineHeight=Math.max(base*spacing,Math.min(w,h)*.031), centre=h*yPos;
    ctx.save();ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.textAlign='center';ctx.textBaseline='middle';
    for(let d=-previous;d<=next;d++){
      const line=lineAt(lines,i+d);if(!line)continue;const value=String(line.text||'').trim().toUpperCase();if(!value)continue;
      const isActive=d===0,isNext=d===1,isPrevious=d<0;
      let alpha=isActive?1:inactiveAlpha;if(isPrevious)alpha*=.78;if(d>1)alpha*=Math.pow(.78,d-1);
      let scale=isActive?activeScale:inactiveScale;let y=centre+d*lineHeight;
      if(handoff){y-=handoff*lineHeight;if(isActive){alpha*=1-handoff*.10;scale=activeScale-(activeScale-inactiveScale)*handoff*.08}if(isNext){alpha=inactiveAlpha+(1-inactiveAlpha)*handoff;scale=inactiveScale+(activeScale-inactiveScale)*handoff}}
      const size=fit(ctx,value,base,maxWidth);
      text(ctx,value,w/2,y,size,clamp(alpha),scale,colour,tracking);
    }
    ctx.restore();
  };
})();
