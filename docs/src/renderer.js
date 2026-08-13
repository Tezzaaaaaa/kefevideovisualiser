// renderer.js — one renderer shared by preview and export.
// Apple, Brat and Eternal are all driven from the same playback clock.

import { getSyncState } from "./sync.js";

const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smootherstep=v=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10)};

function applyCase(text,mode){
  switch(mode){
    case "upper":return text.toUpperCase();
    case "lower":return text.toLowerCase();
    case "title":return text.replace(/\w\S*/g,w=>w[0].toUpperCase()+w.slice(1).toLowerCase());
    default:return text;
  }
}

function drawCover(ctx,media,w,h,blur){
  const mw=media.videoWidth||media.width,mh=media.videoHeight||media.height;
  if(!mw||!mh)return;
  const scale=Math.max(w/mw,h/mh),dw=mw*scale,dh=mh*scale,dx=(w-dw)/2,dy=(h-dh)/2;
  if(blur>0){ctx.filter=`blur(${blur}px)`;ctx.drawImage(media,dx-blur*2,dy-blur*2,dw+blur*4,dh+blur*4);ctx.filter="none"}
  else ctx.drawImage(media,dx,dy,dw,dh);
}

function hexToRgba(hex,alpha){
  const value=String(hex||"#000000").replace("#","");
  const expanded=value.length===3?value.split("").map(c=>c+c).join(""):value.padEnd(6,"0").slice(0,6);
  const n=Number.parseInt(expanded,16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  return `rgba(${r},${g},${b},${clamp(Number(alpha)||0)})`;
}

function drawBackground(ctx,w,h,bg,media){
  ctx.save();
  if(bg.type==="solid"){ctx.fillStyle=bg.solid;ctx.fillRect(0,0,w,h)}
  else if(bg.type==="gradient"){
    const rad=(bg.gradientAngle*Math.PI)/180,x1=w/2-Math.cos(rad)*w,y1=h/2-Math.sin(rad)*h,x2=w/2+Math.cos(rad)*w,y2=h/2+Math.sin(rad)*h;
    const grad=ctx.createLinearGradient(x1,y1,x2,y2);grad.addColorStop(0,bg.gradientFrom);grad.addColorStop(1,bg.gradientTo);ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  }else if(bg.type==="image"&&media.image)drawCover(ctx,media.image,w,h,bg.blur);
  else if(bg.type==="video"&&media.video&&media.video.readyState>=2)drawCover(ctx,media.video,w,h,bg.blur);
  else{ctx.fillStyle="#0A0A0A";ctx.fillRect(0,0,w,h)}
  if(bg.dim>0){ctx.fillStyle=`rgba(0,0,0,${clamp(bg.dim)})`;ctx.fillRect(0,0,w,h)}
  if(bg.hazeEnabled&&bg.hazeOpacity>0){ctx.fillStyle=hexToRgba(bg.hazeColor,bg.hazeOpacity);ctx.fillRect(0,0,w,h)}
  ctx.restore();
}

function textX(align,w,pad){if(align==="left")return pad;if(align==="right")return w-pad;return w/2}
function rowStartX(align,w,pad,rowWidth){if(align==="left")return pad;if(align==="right")return w-pad-rowWidth;return(w-rowWidth)/2}

function wrapText(ctx,text,maxWidth){
  const words=String(text||"").split(/\s+/).filter(Boolean),rows=[];let row="";
  for(const word of words){const test=row?`${row} ${word}`:word;if(row&&ctx.measureText(test).width>maxWidth){rows.push(row);row=word}else row=test}
  if(row)rows.push(row);return rows.length?rows:[""];
}

// ---------------- Apple Music ----------------
function appleWordFocus(word,time){
  if(!Number.isFinite(word?.time)||!Number.isFinite(word?.endTime))return 0;
  const duration=Math.max(.06,word.endTime-word.time),attack=Math.min(.14,Math.max(.045,duration*.24)),release=Math.min(.18,Math.max(.06,duration*.28));
  if(time<word.time)return 0;
  if(time<word.time+attack)return smootherstep((time-word.time)/attack);
  if(time<=word.endTime)return 1;
  if(time<word.endTime+release)return 1-smootherstep((time-word.endTime)/release);
  return 0;
}

function glyphLayout(ctx,text){
  const glyphs=Array.from(text);
  return glyphs.map((glyph,index)=>{
    const before=glyphs.slice(0,index).join(""),through=glyphs.slice(0,index+1).join("");
    return{glyph,x:ctx.measureText(before).width,width:Math.max(0,ctx.measureText(through).width-ctx.measureText(before).width)};
  });
}

function drawAppleTimedWord(ctx,ref,x,y,style,time){
  const text=ref.text,textWidth=ref.textWidth,start=Number(ref.time),end=Number(ref.endTime),duration=Math.max(.06,end-start),completed=time>=end,active=time>=start&&time<end;
  const focus=appleWordFocus(ref,time),scale=1+focus*.045;
  ctx.save();ctx.translate(x+textWidth/2,y);ctx.scale(scale,scale);const left=-textWidth/2;
  ctx.shadowBlur=0;ctx.shadowColor="transparent";ctx.fillStyle=style.dimColor;ctx.fillText(text,left,0);
  if(completed){ctx.fillStyle=style.accentColor;ctx.fillText(text,left,0);ctx.restore();return}
  if(!active){ctx.restore();return}

  // Long sung words finish their letter sweep early, then remain fully lit for the held note.
  const holdFraction=clamp((duration-.50)/3,0,.30),sweepFraction=1-holdFraction,rawProgress=clamp((time-start)/duration),progress=clamp(rawProgress/Math.max(.60,sweepFraction));
  const layout=glyphLayout(ctx,text),count=Math.max(1,layout.length),transitionWidth=Math.min(.22,1/count);
  for(let i=0;i<layout.length;i++){
    const{glyph,x:glyphX}=layout[i],letterStart=i/count,letterEnd=(i+1)/count;let alpha=0;
    if(progress>=letterEnd)alpha=1;
    else if(progress>letterStart)alpha=smootherstep((progress-letterStart)/Math.max(.001,transitionWidth));
    if(alpha<=0)continue;
    // Highlight only the glyph itself. No rectangle, glow or bleed touches neighbouring letters.
    ctx.save();ctx.globalAlpha=alpha;ctx.shadowBlur=0;ctx.shadowColor="transparent";ctx.fillStyle=style.accentColor;ctx.fillText(glyph,left+glyphX,0);ctx.restore();
  }
  ctx.restore();
}

function appleBlock(ctx,w,style,line,active){
  const pad=w*.09,maxWidth=w-pad*2,timed=Boolean(line?.words?.length);
  const source=timed?line.words:String(line?.text||"").split(/\s+/).filter(Boolean).map(text=>({text,time:null,endTime:null})),spaceWidth=ctx.measureText(" ").width;
  const words=source.map((word,i)=>{const text=applyCase(word.text,style.textCase),textWidth=ctx.measureText(text).width;return{...word,text,i,textWidth,advance:textWidth+spaceWidth}});
  const rows=[];let row=[],width=0;
  for(const ref of words){if(row.length&&width+ref.advance>maxWidth){rows.push(row);row=[];width=0}row.push(ref);width+=ref.advance}if(row.length)rows.push(row);
  const lineHeight=style.fontSize*style.lineSpacing;
  return{rows,height:Math.max(lineHeight,rows.length*lineHeight),lineHeight,pad,active,timed,time:line?.time,endTime:line?.endTime};
}

function drawAppleBlock(ctx,w,yCenter,style,block,alpha,time){
  if(!block?.rows?.length||alpha<=0)return;
  ctx.save();ctx.globalAlpha=clamp(alpha);let y=yCenter-block.height/2+block.lineHeight/2;
  const lineSpan=Math.max(.08,(block.endTime||0)-(block.time||0)),lineReveal=block.active&&!block.timed?smootherstep((time-block.time)/Math.min(.18,lineSpan*.22)):0,space=ctx.measureText(" ").width;
  for(const row of block.rows){
    const rowWidth=row.reduce((sum,ref)=>sum+ref.advance,0)-(row.length?space:0);let x=rowStartX(style.align,w,block.pad,rowWidth);
    for(const ref of row){
      if(!block.active){ctx.fillStyle=style.dimColor;ctx.fillText(ref.text,x,y)}
      else if(!block.timed){ctx.fillStyle=style.dimColor;ctx.fillText(ref.text,x,y);ctx.save();ctx.globalAlpha*=lineReveal;ctx.fillStyle=style.accentColor;ctx.fillText(ref.text,x,y);ctx.restore()}
      else drawAppleTimedWord(ctx,ref,x,y,style,time);
      x+=ref.advance;
    }
    y+=block.lineHeight;
  }
  ctx.restore();
}

function drawApple(ctx,w,h,style,sync,lines,time){
  const{lineIndex}=sync;if(lineIndex<0||!lines[lineIndex])return;
  ctx.save();ctx.font=`700 ${style.fontSize}px -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif`;ctx.textBaseline="middle";ctx.textAlign="left";
  const prevLine=lines[lineIndex-1],currentLine=lines[lineIndex],nextLine=lines[lineIndex+1],next2Line=lines[lineIndex+2];
  const prev=prevLine?appleBlock(ctx,w,style,prevLine,false):null,current=appleBlock(ctx,w,style,currentLine,true),next=nextLine?appleBlock(ctx,w,style,nextLine,false):null,next2=next2Line?appleBlock(ctx,w,style,next2Line,false):null;
  let transition=0;
  if(next&&Number.isFinite(nextLine.time)){
    const span=Math.max(.12,nextLine.time-currentLine.time),lead=Math.min(.46,Math.max(.18,span*.20));transition=smootherstep((time-(nextLine.time-lead))/lead);
  }
  const gap=style.fontSize*.82,currentToNext=next?current.height/2+next.height/2+gap:0,prevToCurrent=prev?prev.height/2+current.height/2+gap:0,nextToNext2=next&&next2?next.height/2+next2.height/2+gap:0,focusY=h*.5,shift=currentToNext*transition;
  if(prev)drawAppleBlock(ctx,w,focusY-prevToCurrent-shift,style,prev,.18*(1-transition),time);
  drawAppleBlock(ctx,w,focusY-shift,style,current,lerp(1,.18,transition),time);
  if(next)drawAppleBlock(ctx,w,focusY+currentToNext-shift,style,next,lerp(.34,1,transition),time);
  if(next2)drawAppleBlock(ctx,w,focusY+currentToNext+nextToNext2-shift,style,next2,lerp(.12,.20,transition),time);
  ctx.restore();
}

// ---------------- Brat ----------------
function bratSourceWords(line){
  if(line?.words?.length)return line.words.map((word,i)=>({...word,index:i,realTiming:true}));
  return String(line?.text||"").split(/\s+/).filter(Boolean).map((text,i)=>({text,index:i,time:line?.time,endTime:line?.endTime,realTiming:false}));
}

function layoutBratLine(ctx,line,maxWidth,stretchX){
  const words=bratSourceWords(line).map(ref=>({...ref,text:String(ref.text||"").toLowerCase()})),space=ctx.measureText(" ").width,rawMax=maxWidth/stretchX,rows=[];let row=[],width=0;
  for(const word of words){const textWidth=ctx.measureText(word.text).width,advance=textWidth+space;if(row.length&&width+advance>rawMax){rows.push({words:row,width:Math.max(0,width-space)});row=[];width=0}row.push({...word,textWidth,advance});width+=advance}
  if(row.length)rows.push({words:row,width:Math.max(0,width-space)});return rows;
}

function buildBratPages(ctx,lines,w,h,style){
  const top=h*.065,bottom=h*.935,available=bottom-top,pad=w*.075,maxWidth=w-pad*2,stretchX=1.12,squashY=.88,rowHeight=style.fontSize*1.12*squashY,minGap=style.fontSize*.42;
  const blocks=lines.map((line,lineIndex)=>{const rows=layoutBratLine(ctx,line,maxWidth,stretchX),height=Math.max(rowHeight,rows.length*rowHeight);return{line,lineIndex,rows,height}});
  const pages=[];let page=[],used=0;
  for(const block of blocks){const added=block.height+(page.length?minGap:0);if(page.length&&used+added>available){pages.push(page);page=[];used=0}page.push(block);used+=block.height+(page.length>1?minGap:0)}
  if(page.length)pages.push(page);return{pages,top,bottom,pad,stretchX,squashY,rowHeight,minGap};
}

function currentBratPage(pages,lineIndex){if(lineIndex<0)return null;return pages.find(page=>page.some(block=>block.lineIndex===lineIndex))||null}
function bratWordVisible(ref,line,time){if(!Number.isFinite(line?.time)||time<line.time)return false;if(!line?.words?.length)return true;return Number.isFinite(ref.time)&&time>=ref.time}
function drawBratWord(ctx,ref,x,y,line,time,stretchX,squashY){
  if(!bratWordVisible(ref,line,time))return;
  const born=line.words?.length?ref.time:line.time,age=Math.max(0,time-(Number(born)||0)),impact=age<.055?1.07:1;
  ctx.save();ctx.translate(x,y);ctx.scale(stretchX*impact,squashY);ctx.fillText(ref.text,0,0);ctx.restore();
}

function drawBrat(ctx,w,h,style,sync,lines,time){
  const{lineIndex}=sync;if(lineIndex<0||!lines[lineIndex])return;
  ctx.save();ctx.font=`400 ${style.fontSize}px "Arial Narrow",Arial,sans-serif`;ctx.textBaseline="top";ctx.textAlign="left";ctx.fillStyle="#101010";ctx.filter="blur(.42px)";ctx.globalAlpha=.98;
  const layout=buildBratPages(ctx,lines,w,h,style),page=currentBratPage(layout.pages,lineIndex);if(!page){ctx.restore();return}
  const totalHeights=page.reduce((sum,block)=>sum+block.height,0),remaining=Math.max(0,(layout.bottom-layout.top)-totalHeights),gap=page.length>1?Math.max(layout.minGap,remaining/(page.length-1)):0;let y=layout.top;
  for(const block of page){let rowY=y;for(const row of block.rows){const scaledRowWidth=row.width*layout.stretchX,startX=rowStartX(style.align,w,layout.pad,scaledRowWidth);let rawX=0;for(const ref of row.words){const x=startX+rawX*layout.stretchX;drawBratWord(ctx,ref,x,rowY,block.line,time,layout.stretchX,layout.squashY);rawX+=ref.advance}rowY+=layout.rowHeight}y+=block.height+gap}
  ctx.restore();
}

// ---------------- Eternal Sunshine ----------------
function eternalTimedReveal(line,sync){
  if(!line?.words?.length)return smootherstep(clamp(sync.lineProgress/.78));
  const words=line.words,total=words.reduce((sum,w)=>sum+Array.from(String(w.text||"")).length,0)+Math.max(0,words.length-1);if(!total)return 1;if(sync.wordIndex<0)return 0;
  let completed=0;for(let i=0;i<sync.wordIndex;i++)completed+=Array.from(String(words[i].text||"")).length+1;
  const current=words[sync.wordIndex],currentChars=Array.from(String(current?.text||"")).length;completed+=currentChars*clamp(sync.wordProgress);return clamp(completed/total);
}

function eternalRowReveal(globalReveal,rows,index){
  const counts=rows.map(row=>Math.max(1,Array.from(row).length)),total=counts.reduce((a,b)=>a+b,0)+Math.max(0,rows.length-1),before=counts.slice(0,index).reduce((a,b)=>a+b,0)+index;
  return clamp((globalReveal*total-before)/counts[index]);
}

function drawEternal(ctx,w,h,style,sync){
  const{line,lineProgress}=sync;if(!line)return;
  const pad=w*.09,maxWidth=w-pad*2;
  ctx.save();ctx.font=`${style.fontSize*1.06}px "Homemade Apple", cursive`;ctx.textBaseline="middle";ctx.textAlign=style.align;ctx.fillStyle=style.textColor;
  const rows=wrapText(ctx,applyCase(line.text,style.textCase),maxWidth),lineHeight=style.fontSize*style.lineSpacing*1.18,totalHeight=rows.length*lineHeight,x=textX(style.align,w,pad),reveal=eternalTimedReveal(line,sync),fadeOut=lineProgress>.94?1-smootherstep((lineProgress-.94)/.06):1;
  ctx.globalAlpha=.98*fadeOut;let y=h*.5-totalHeight/2+lineHeight/2;
  rows.forEach((row,index)=>{const width=ctx.measureText(row).width,progress=eternalRowReveal(reveal,rows,index),left=style.align==="left"?x:style.align==="right"?x-width:x-width/2;if(progress>0){ctx.save();ctx.beginPath();ctx.rect(left-style.fontSize*.05,y-lineHeight*.55,(width+style.fontSize*.1)*progress,lineHeight*1.1);ctx.clip();ctx.shadowBlur=style.fontSize*.012;ctx.shadowColor="rgba(255,255,255,.18)";ctx.fillText(row,x,y);ctx.restore()}y+=lineHeight});
  ctx.restore();
}

function drawClassic(ctx,w,h,style,sync){if(!sync.line)return;ctx.save();ctx.font=`500 ${style.fontSize*.8}px "Helvetica Neue",Arial,sans-serif`;ctx.textBaseline="middle";ctx.textAlign=style.align;ctx.fillStyle=style.textColor;const x=textX(style.align,w,w*.1),rows=wrapText(ctx,applyCase(sync.line.text,style.textCase),w*.8);rows.forEach((row,i)=>ctx.fillText(row,x,h*.82+(i-(rows.length-1)/2)*style.fontSize*style.lineSpacing));ctx.restore()}

export function render(ctx,w,h,appState,mediaCache){
  ctx.clearRect(0,0,w,h);drawBackground(ctx,w,h,appState.background,mediaCache);
  const time=appState.playback.currentTime,sync=getSyncState(appState.lyrics.lines,time),base=appState.style,profile=base.effects?.[base.effect]||{},style={...base,...profile};
  if(style.letterSpacing)ctx.letterSpacing=`${style.letterSpacing}px`;
  switch(base.effect){case"apple":drawApple(ctx,w,h,style,sync,appState.lyrics.lines,time);break;case"brat":drawBrat(ctx,w,h,style,sync,appState.lyrics.lines,time);break;case"eternal":drawEternal(ctx,w,h,style,sync);break;default:drawClassic(ctx,w,h,style,sync)}
  ctx.globalAlpha=1;ctx.filter="none";ctx.letterSpacing="0px";return sync;
}
