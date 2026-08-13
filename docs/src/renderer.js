// renderer.js — one renderer shared by preview and export.
// Eternal Sunshine uses Homemade Apple and a continuous ink-writing reveal.

import { getSyncState } from "./sync.js";

const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smoothstep=v=>{const t=clamp(v);return t*t*(3-2*t)};

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

function wrapText(ctx,text,maxWidth){
  const words=String(text||"").split(/\s+/).filter(Boolean),rows=[];let row="";
  for(const word of words){const test=row?`${row} ${word}`:word;if(row&&ctx.measureText(test).width>maxWidth){rows.push(row);row=word}else row=test}
  if(row)rows.push(row);return rows.length?rows:[""];
}

function drawAppleMusic(ctx,w,h,style,sync){
  if(!sync.line)return;
  const pad=w*.09,x=textX(style.align,w,pad),rows=wrapText(ctx,applyCase(sync.line.text,style.textCase),w-pad*2);
  ctx.save();ctx.font=`700 ${style.fontSize}px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif`;ctx.textBaseline="middle";ctx.textAlign=style.align;ctx.fillStyle=style.textColor;
  rows.forEach((row,i)=>ctx.fillText(row,x,h*.5+(i-(rows.length-1)/2)*style.fontSize*style.lineSpacing));ctx.restore();
}

function drawBrat(ctx,w,h,style,sync){
  if(!sync.line)return;
  const pad=w*.08,x=textX(style.align,w,pad),rows=wrapText(ctx,String(sync.line.text||"").toLowerCase(),(w-pad*2)/1.1);
  ctx.save();ctx.font=`400 ${style.fontSize}px "Arial Narrow",Arial,sans-serif`;ctx.textBaseline="middle";ctx.textAlign=style.align;ctx.fillStyle="#101010";ctx.filter="blur(.4px)";ctx.translate(x,h*.5);ctx.scale(1.1,.9);
  rows.forEach((row,i)=>ctx.fillText(row,0,(i-(rows.length-1)/2)*style.fontSize*1.05));ctx.restore();
}

function timedReveal(line,sync){
  if(!line?.words?.length)return smoothstep(clamp(sync.lineProgress/.78));
  const words=line.words,total=words.reduce((sum,w)=>sum+Array.from(String(w.text||"")).length,0)+Math.max(0,words.length-1);
  if(!total)return 1;
  if(sync.wordIndex<0)return 0;
  let completed=0;
  for(let i=0;i<sync.wordIndex;i++)completed+=Array.from(String(words[i].text||"")).length+1;
  const current=words[sync.wordIndex];
  const currentChars=Array.from(String(current?.text||"")).length;
  completed+=currentChars*clamp(sync.wordProgress);
  return clamp(completed/total);
}

function rowReveal(globalReveal,rows,index){
  const counts=rows.map(row=>Math.max(1,Array.from(row).length));
  const total=counts.reduce((a,b)=>a+b,0)+Math.max(0,rows.length-1);
  const before=counts.slice(0,index).reduce((a,b)=>a+b,0)+index;
  return clamp((globalReveal*total-before)/counts[index]);
}

function drawEternal(ctx,w,h,style,sync){
  const {line,lineProgress}=sync;if(!line)return;
  const pad=w*.09,maxWidth=w-pad*2;
  ctx.save();
  ctx.font=`${style.fontSize*1.06}px "Homemade Apple", cursive`;
  ctx.textBaseline="middle";ctx.textAlign=style.align;ctx.fillStyle=style.textColor;
  const rows=wrapText(ctx,applyCase(line.text,style.textCase),maxWidth),lineHeight=style.fontSize*style.lineSpacing*1.18,totalHeight=rows.length*lineHeight,x=textX(style.align,w,pad),reveal=timedReveal(line,sync);
  const fadeOut=lineProgress>.94?1-smoothstep((lineProgress-.94)/.06):1;
  ctx.globalAlpha=.98*fadeOut;
  let y=h*.5-totalHeight/2+lineHeight/2;
  rows.forEach((row,index)=>{
    const width=ctx.measureText(row).width,progress=rowReveal(reveal,rows,index),left=style.align==="left"?x:style.align==="right"?x-width:x-width/2;
    if(progress>0){
      ctx.save();
      // A continuous left-to-right ink reveal: no cursor and no per-letter popping.
      ctx.beginPath();ctx.rect(left-style.fontSize*.05,y-lineHeight*.55,(width+style.fontSize*.1)*progress,lineHeight*1.1);ctx.clip();
      ctx.shadowBlur=style.fontSize*.012;ctx.shadowColor="rgba(255,255,255,.18)";ctx.fillText(row,x,y);ctx.restore();
    }
    y+=lineHeight;
  });
  ctx.restore();
}

function drawClassic(ctx,w,h,style,sync){
  if(!sync.line)return;ctx.save();ctx.font=`500 ${style.fontSize*.8}px "Helvetica Neue",Arial,sans-serif`;ctx.textBaseline="middle";ctx.textAlign=style.align;ctx.fillStyle=style.textColor;const x=textX(style.align,w,w*.1),rows=wrapText(ctx,applyCase(sync.line.text,style.textCase),w*.8);rows.forEach((row,i)=>ctx.fillText(row,x,h*.82+(i-(rows.length-1)/2)*style.fontSize*style.lineSpacing));ctx.restore();
}

export function render(ctx,w,h,appState,mediaCache){
  ctx.clearRect(0,0,w,h);drawBackground(ctx,w,h,appState.background,mediaCache);
  const sync=getSyncState(appState.lyrics.lines,appState.playback.currentTime),base=appState.style,profile=base.effects?.[base.effect]||{},style={...base,...profile};
  if(style.letterSpacing)ctx.letterSpacing=`${style.letterSpacing}px`;
  switch(base.effect){case "apple":drawAppleMusic(ctx,w,h,style,sync);break;case "brat":drawBrat(ctx,w,h,style,sync);break;case "eternal":drawEternal(ctx,w,h,style,sync);break;default:drawClassic(ctx,w,h,style,sync)}
  ctx.globalAlpha=1;ctx.filter="none";ctx.letterSpacing="0px";return sync;
}
