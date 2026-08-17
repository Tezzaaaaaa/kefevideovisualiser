/* Shared lyric timing/text helpers for KEFE production effects. */
(() => {
  'use strict';
  window.kefeEffects = window.kefeEffects || {};
  window.kefeEffectUtils = {
    clamp(v,min=0,max=1){ return Math.max(min,Math.min(max,Number(v)||0)); },
    smooth(v){ const t=this.clamp(v); return t*t*(3-2*t); },
    smoother(v){ const t=this.clamp(v); return t*t*t*(t*(t*6-15)+10); },
    activeLine(lines,time){
      let index=-1;
      for(let i=0;i<(lines||[]).length;i++){
        if(Number.isFinite(Number(lines[i]?.time)) && time>=Number(lines[i].time)) index=i; else break;
      }
      if(index<0)return null;
      const line=lines[index]||{},next=lines[index+1]||null;
      return {index,line:{...line,time:Number(line.time)||0,endTime:Number.isFinite(Number(line.endTime))?Number(line.endTime):(Number(next?.time)||((Number(line.time)||0)+3))},next};
    },
    wordsFor(line,next){
      if(Array.isArray(line?.words)&&line.words.length)return line.words.map((word,i,all)=>({text:String(word.text||''),time:Number(word.time)||Number(line.time)||0,endTime:Number.isFinite(Number(word.endTime))?Number(word.endTime):(Number(all[i+1]?.time)||Number(line.endTime)||(Number(line.time)+3))})).filter(word=>word.text);
      const tokens=String(line?.text||'').trim().split(/\s+/).filter(Boolean); if(!tokens.length)return [];
      const start=Number(line.time)||0,end=Math.max(start+.25,Number(next?.time)||Number(line.endTime)||start+3);
      const weights=tokens.map(token=>Math.max(1,Array.from(token.replace(/[^\p{L}\p{N}]/gu,'')).length**.72));
      const total=weights.reduce((a,b)=>a+b,0)||tokens.length; let cursor=0;
      return tokens.map((text,i)=>{const time=start+(end-start)*cursor/total;cursor+=weights[i];const endTime=start+(end-start)*cursor/total;return{text,time,endTime:Math.max(time+.05,endTime)};});
    },
    setFont(ctx,family,size,weight=700){ctx.font=`${weight} ${Math.max(18,size)}px "${family}", Arial, sans-serif`;},
    fitText(ctx,family,text,size,maxWidth,weight=700){let fitted=Math.max(18,Number(size)||76);this.setFont(ctx,family,fitted,weight);while(fitted>24&&ctx.measureText(text).width>maxWidth){fitted-=1;this.setFont(ctx,family,fitted,weight);}return fitted;}
  };
})();
