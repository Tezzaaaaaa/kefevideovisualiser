'use strict';
(()=>{
  const baseUnits=window.units;
  if(typeof baseUnits!=='function')return;
  const cache=new WeakMap();
  const clampLocal=(x,a,b)=>Math.max(a,Math.min(b,x));
  const textWeight=t=>{
    const s=String(t||'').trim(),letters=s.replace(/[^\p{L}\p{N}]/gu,'');
    return Math.max(1,letters.length*.72+1.35);
  };
  function syllableCount(text){
    const clean=String(text||'').toLowerCase().replace(/[^\p{L}]/gu,'');
    if(!clean)return 1;
    const latin=clean.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(/^[a-z]+$/.test(latin)){
      const groups=latin.match(/[aeiouy]+/g)?.length||1;
      const tail=/e$/.test(latin)&&!/le$/.test(latin)&&groups>1?1:0;
      return clampLocal(groups-tail,1,7);
    }
    return clampLocal(Math.round([...clean].length/3),1,7);
  }
  function signature(line,raw){
    return [line.start,line.duration,line.text,raw.length,...raw.flatMap(w=>[w.text,w.start,w.duration,w.hold,w.emphasis])].join('|');
  }
  function distribute(words,start,end,from,to){
    if(to<from)return;
    const weights=[];let total=0;
    for(let i=from;i<=to;i++){const w=textWeight(words[i].text);weights.push(w);total+=w}
    const span=Math.max(0,end-start);let cursor=start;
    for(let i=from;i<=to;i++){
      words[i].start=Math.round(cursor);
      const part=span*(weights[i-from]/Math.max(1,total));cursor+=part;
    }
  }
  function normalize(line){
    const raw=baseUnits(line)||[],sig=signature(line,raw),cached=cache.get(line);
    if(cached?.sig===sig)return cached.words;
    if(!raw.length){cache.set(line,{sig,words:raw});return raw}
    const lineStart=Math.max(0,Number(line.start)||0),lineDuration=Math.max(80,Number(line.duration)||1000),lineEnd=lineStart+lineDuration;
    const explicit=Array.isArray(line.words)&&line.words.length>0;
    const words=raw.map((w,i)=>({...w,__motionIndex:i,syllableCount:Array.isArray(w.syllables)?Math.max(1,w.syllables.length):syllableCount(w.text),timingSource:explicit?'exact':'inferred'}));
    if(!explicit){cache.set(line,{sig,words});return words}
    const anchors=[];let last=-Infinity;
    for(let i=0;i<words.length;i++){
      const s=Number(raw[i].start),valid=Number.isFinite(s)&&s>=lineStart-120&&s<=lineEnd+160&&s>last+18;
      if(valid){anchors.push(i);last=s}else words[i].start=NaN;
    }
    if(!anchors.length){
      distribute(words,lineStart,lineEnd,0,words.length-1);
      words.forEach(w=>w.timingSource='repaired');
    }else{
      const first=anchors[0];
      if(first>0){distribute(words,lineStart,Number(raw[first].start),0,first-1);for(let i=0;i<first;i++)words[i].timingSource='repaired'}
      words[first].start=Number(raw[first].start);
      for(let a=0;a<anchors.length-1;a++){
        const left=anchors[a],right=anchors[a+1],leftStart=Number(raw[left].start),rightStart=Number(raw[right].start);
        words[left].start=leftStart;words[right].start=rightStart;
        if(right-left>1){distribute(words,leftStart+Math.min(90,Math.max(35,(rightStart-leftStart)*.08)),rightStart,left+1,right-1);for(let i=left+1;i<right;i++)words[i].timingSource='repaired'}
      }
      const lastAnchor=anchors.at(-1);words[lastAnchor].start=Number(raw[lastAnchor].start);
      if(lastAnchor<words.length-1){
        const tailStart=Math.min(lineEnd-40,words[lastAnchor].start+Math.min(120,Math.max(40,lineDuration*.035)));
        distribute(words,tailStart,lineEnd,lastAnchor+1,words.length-1);for(let i=lastAnchor+1;i<words.length;i++)words[i].timingSource='repaired';
      }
    }
    let cursor=lineStart;
    for(let i=0;i<words.length;i++){
      let s=Number(words[i].start);if(!Number.isFinite(s))s=cursor;
      s=clampLocal(s,lineStart,Math.max(lineStart,lineEnd-35));
      if(i>0&&s<cursor+28){s=Math.min(lineEnd-35,cursor+28);words[i].timingSource='repaired'}
      words[i].start=Math.round(s);cursor=s;
    }
    for(let i=0;i<words.length;i++){
      const next=words[i+1]?.start??lineEnd,available=Math.max(45,next-words[i].start),original=Math.max(0,Number(raw[i].duration)||0);
      let duration=available;
      if(original>=45&&original<=available*1.35)duration=Math.min(available,original);
      words[i].duration=Math.max(45,Math.round(duration));
      if(!Number.isFinite(Number(raw[i].duration))||Number(raw[i].duration)<45||Number(raw[i].duration)>available*1.65)words[i].timingSource='repaired';
    }
    cache.set(line,{sig,words});return words;
  }
  window.units=normalize;
  window.linaTiming={normalize,syllableCount};
})();
