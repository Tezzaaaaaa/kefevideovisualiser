'use strict';
(()=>{
  const baseMotion=window.wordMotion;
  if(typeof baseMotion!=='function')return;
  const clampLocal=(x,a,b)=>Math.max(a,Math.min(b,x));
  const ease=x=>{x=clampLocal(x,0,1);return x*x*(3-2*x)};
  function heuristicSweep(raw,count,held,run){
    count=Math.max(1,Math.min(7,Number(count)||1));
    if(count===1)return ease(raw);
    const edge=run?.015:held?.055:.035,x=clampLocal((raw-edge)/Math.max(.05,1-edge*1.6),0,1),scaled=x*count,k=Math.min(count-1,Math.floor(scaled)),local=scaled-k;
    let p=(k+ease(local))/count;
    if(held)p=Math.pow(p,.92);
    if(run)p=Math.pow(p,1.06);
    return clampLocal(p,0,1);
  }
  function explicitSweep(w,ms){
    if(!Array.isArray(w?.syllables)||!w.syllables.length)return null;
    const segs=w.syllables.map((s,i)=>{
      if(typeof s==='number')return{start:s,duration:0,index:i};
      return{start:Number(s?.start),duration:Number(s?.duration)||0,index:i};
    }).filter(s=>Number.isFinite(s.start)).sort((a,b)=>a.start-b.start);
    if(!segs.length)return null;
    const t=ms-(window.offset||0),n=segs.length;
    if(t<=segs[0].start)return 0;
    for(let i=0;i<n;i++){
      const a=segs[i].start,b=segs[i+1]?.start??(a+Math.max(60,segs[i].duration||Number(w.duration)||120));
      if(t<b){const local=ease((t-a)/Math.max(1,b-a));return clampLocal((i+local)/n,0,1)}
    }
    return 1;
  }
  window.wordMotion=function(line,w,ms){
    const m=baseMotion(line,w,ms),exact=explicitSweep(w,ms),count=Math.max(1,Number(w?.syllableCount)||1);
    const progress=exact==null?heuristicSweep(m.raw,count,m.held,m.run):exact;
    return{...m,progress,subwordCount:Array.isArray(w?.syllables)&&w.syllables.length?w.syllables.length:count,subwordExact:exact!=null,timingSource:w?.timingSource||'exact'};
  };
})();
