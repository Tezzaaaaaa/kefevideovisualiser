let linaMotionRoot=null,linaMotionEditor=-1,linaMotionCount=-1,linaMotionTextSig='';
function smoother(x){x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10)}
function mix(a,b,t){return a+(b-a)*t}
function phraseWeight(line){const us=units(line),chars=us.reduce((n,w)=>n+String(w.text||'').length,0);return clamp(chars/38,.45,1.45)}
function temporalGapAfter(i){
  if(i<0||i>=lines.length-1)return .22;
  const gap=Math.max(0,lines[i+1].start-lines[i].start),pause=smoother(clamp((gap-1450)/3600,0,1)),shortness=1-clamp(phraseWeight(lines[i]),0,1);
  return .22+.30*pause+.08*shortness;
}
function travelWindowFor(i){
  if(i<0||i>=lines.length-1)return 0;
  const a=lines[i].start,b=lines[i+1].start,gap=Math.max(120,b-a);
  if(gap<700)return clamp(gap*.78,240,gap*.92);
  if(gap<1800)return clamp(gap*.52,420,860);
  if(gap<4200)return clamp(720+(gap-1800)*.08,720,920);
  return clamp(900+(gap-4200)*.025,900,1250);
}
function lyricMotionAnchor(ms){
  if(!lines.length)return{anchor:0,from:0,to:0,p:0};
  const t=ms-offset,last=lines.length-1;
  if(t<=lines[0].start)return{anchor:0,from:0,to:0,p:0};
  if(t>=lines[last].start)return{anchor:last,from:last,to:last,p:0};
  let i=0;
  while(i<last-1&&lines[i+1].start<=t)i++;
  const next=i+1,b=lines[next].start,travel=travelWindowFor(i),begin=Math.max(lines[i].start,b-travel);
  if(t<=begin)return{anchor:i,from:i,to:i,p:0};
  const u=clamp((t-begin)/Math.max(1,b-begin),0,1),p=smoother(u);
  return{anchor:i+p,from:i,to:next,p};
}
function lineVisual(distance){
  const d=Math.abs(distance),near=smoother(clamp(d,0,1)),far=smoother(clamp((d-1)/2.8,0,1));
  const alpha=clamp(mix(1,.50,near)*(1-.84*far),.04,1);
  const scale=mix(1,.938,near)*(1-.10*far);
  const blur=mix(0,.20,near)+1.38*far;
  const saturation=mix(1,.96,near)*(1-.09*far);
  return{alpha,scale,blur,saturation};
}
function wordMotion(line,w,ms){
  const hold=Math.max(.25,w.hold||1),duration=Math.max(90,w.duration*hold),raw=clamp((ms-(w.start+offset))/duration,0,1),progress=smoother(raw);
  const attack=smoother(clamp(raw/.20,0,1)),release=smoother(clamp((1-raw)/.24,0,1)),presence=Math.min(attack,release);
  const strength=wordTimingEmphasis(line,w),depth=.052+Math.max(0,strength-1)*.080;
  const scale=1+presence*depth,bright=1+presence*(.14+Math.max(0,strength-1)*.17),glow=presence*(.66+Math.max(0,strength-1)*.46),rise=-presence*(1.45+Math.max(0,strength-1)*1.55);
  return{raw,progress,pulse:presence,strength,scale,bright,glow,rise};
}
function wordMarkup(line){return units(line).map((w,i)=>`<span class="apple-word" data-w="${i}">${esc(w.text)}</span>`).join(' ')}
function motionTextSignature(){return lines.length+'|'+lines.map(x=>x.text).join('\u0001')+'|'+lines.map((x,i)=>temporalGapAfter(i).toFixed(3)).join(',')}
function buildMotionDOM(){
  const sig=motionTextSignature();if(linaMotionRoot&&linaMotionCount===lines.length&&linaMotionTextSig===sig)return;
  linaMotionCount=lines.length;linaMotionTextSig=sig;
  lyricsEl.innerHTML='<div class="apple-flow">'+lines.map((l,i)=>`<div class="apple-line" data-line="${i}" style="--line-gap-after:${temporalGapAfter(i).toFixed(3)}em">${wordMarkup(l)}</div>`).join('')+'</div>';
  linaMotionRoot=lyricsEl.querySelector('.apple-flow');
}
function updateMotionWords(ms,state){
  if(!linaMotionRoot)return;
  const els=[...linaMotionRoot.children],lo=Math.max(0,Math.floor(state.anchor)-4),hi=Math.min(lines.length-1,Math.ceil(state.anchor)+4),glowSetting=+$('#glow').value/100;
  for(let i=lo;i<=hi;i++){
    const line=lines[i],el=els[i];if(!line||!el)continue;
    const focus=lineVisual(i-state.anchor),us=units(line),spans=[...el.querySelectorAll('.apple-word')];
    spans.forEach((span,n)=>{
      const w=us[n];if(!w)return;const m=wordMotion(line,w,ms),fill=m.progress*100;
      const feather=clamp(3.8+2.8*m.pulse,3.8,6.6),fa=clamp(fill-feather,0,100),fb=clamp(fill+feather,0,100);
      const halo1=(.8+6.2*m.glow)*glowSetting,halo2=(2+12.8*m.glow)*glowSetting,ha=clamp(.02+.31*m.glow,0,.36),ha2=clamp(.006+.08*m.glow,0,.10);
      span.style.setProperty('--fill',fill.toFixed(2)+'%');span.style.setProperty('--fill-a',fa.toFixed(2)+'%');span.style.setProperty('--fill-b',fb.toFixed(2)+'%');
      span.style.setProperty('--word-scale',(1+(m.scale-1)*focus.alpha).toFixed(4));span.style.setProperty('--word-rise',(m.rise*focus.alpha).toFixed(2)+'px');span.style.setProperty('--word-bright',(1+(m.bright-1)*focus.alpha).toFixed(3));
      span.style.setProperty('--halo1',halo1.toFixed(2)+'px');span.style.setProperty('--halo2',halo2.toFixed(2)+'px');span.style.setProperty('--halo-alpha',(ha*focus.alpha).toFixed(3));span.style.setProperty('--halo-alpha2',(ha2*focus.alpha).toFixed(3));
    });
  }
}
function updateMotionLayout(ms){
  if(!linaMotionRoot)return null;
  const state=lyricMotionAnchor(ms),els=[...linaMotionRoot.children],from=els[state.from],to=els[state.to]||from;if(!from)return state;
  const fromC=from.offsetTop+from.offsetHeight/2,toC=to.offsetTop+to.offsetHeight/2,anchorY=mix(fromC,toC,state.p);
  linaMotionRoot.style.transform=`translate3d(0,${(-anchorY).toFixed(3)}px,0)`;
  for(let idx=0;idx<els.length;idx++){
    const el=els[idx],v=lineVisual(idx-state.anchor);
    el.style.opacity=v.alpha.toFixed(4);
    el.style.transform=`translate3d(0,0,0) scale(${v.scale.toFixed(4)})`;
    el.style.filter=`blur(${v.blur.toFixed(3)}px) saturate(${v.saturation.toFixed(3)})`;
    el.style.zIndex=String(Math.max(1,20-Math.round(Math.abs(idx-state.anchor)*3)));
  }
  return state;
}
function transitionProgress(ms,i){const state=lyricMotionAnchor(ms);return state.from===i&&state.to===i+1?state.p:0}
function render(ms){
  updateIntro(ms);if(!lines.length){linaMotionRoot=null;linaMotionCount=-1;lyricsEl.textContent='Add lyrics to begin';$('#activeMeta').textContent='No lyrics loaded';return}
  if(ms<entranceMs()){lyricsEl.innerHTML='';linaMotionRoot=null;linaMotionCount=-1;$('#activeMeta').textContent='Waiting for lyrics entrance';return}
  buildMotionDOM();const i=ci(ms),cw=contextWindow(),state=updateMotionLayout(ms);updateMotionWords(ms,state||lyricMotionAnchor(ms));selected=i;$('#activeMeta').textContent=`Lyric ${i+1} of ${lines.length} · ${cw.total} on screen`;$$('.line').forEach((x,n)=>x.classList.toggle('active',n===i));if(linaMotionEditor!==i){linaMotionEditor=i;fillEditor(i)}
}
function canvasRows(ctx,line,maxW){
  const us=units(line),space=ctx.measureText(' ').width,rows=[];let row=[],rw=0;
  for(const u of us){
    const ww=ctx.measureText(u.text).width,add=(row.length?space:0)+ww;
    if(row.length&&rw+add>maxW){rows.push({items:row,w:rw});row=[];rw=0}
    row.push({...u,x:rw+(row.length?space:0),w:ww});rw+=add;
  }
  if(row.length)rows.push({items:row,w:rw});
  return rows;
}
function canvasLineHeight(ctx,line,w,h){
  const size=(+$('#size').value/620)*Math.min(w,h*.9),lh=size*(+$('#lineHeight').value);
  ctx.save();ctx.font=`${$('#fontWeight').value} ${Math.round(size)}px -apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",sans-serif`;const rows=canvasRows(ctx,line,w*.84);ctx.restore();
  return Math.max(lh,rows.length*lh);
}
function canvasCenters(ctx,w,h){
  const centers=new Array(lines.length).fill(0),heights=lines.map(l=>canvasLineHeight(ctx,l,w,h)),baseGap=(+$('#size').value/620)*Math.min(w,h*.9)*.22;
  centers[0]=heights[0]/2;
  for(let i=1;i<lines.length;i++){const gap=baseGap*(1+temporalGapAfter(i-1));centers[i]=centers[i-1]+heights[i-1]/2+gap+heights[i]/2}
  return{centers,heights};
}
function canvasLine(ctx,line,ms,w,h,y,scale,alpha,focus=1){
  if(!line||alpha<=0)return;
  const size=(+$('#size').value/620)*Math.min(w,h*.9),lh=size*(+$('#lineHeight').value),maxW=w*.84,align=$('#textAlign').value,weight=$('#fontWeight').value;
  ctx.save();ctx.globalAlpha=clamp(alpha,0,1);ctx.translate(w/2,y);ctx.scale(scale,scale);ctx.translate(-w/2,-y);ctx.font=`${weight} ${Math.round(size)}px -apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",sans-serif`;ctx.textBaseline='middle';
  const rows=canvasRows(ctx,line,maxW);
  let yy=y-(rows.length-1)*lh/2;
  for(const rr of rows){
    let left=w*.08;if(align==='center')left=(w-rr.w)/2;if(align==='right')left=w*.92-rr.w;
    for(const u of rr.items){
      const x=left+u.x,m=wordMotion(line,u,ms),cx=x+u.w/2;
      ctx.save();ctx.translate(cx,yy+m.rise*focus*(w/620));ctx.scale(1+(m.scale-1)*focus,1+(m.scale-1)*focus);ctx.translate(-cx,-yy);
      ctx.fillStyle='rgba(255,255,255,.235)';ctx.shadowBlur=0;ctx.fillText(u.text,x,yy);
      if(m.progress>0){
        const glowSetting=+$('#glow').value/100;
        ctx.save();ctx.beginPath();ctx.rect(x-size*.07,yy-lh*.72,u.w*m.progress+size*.14,lh*1.44);ctx.clip();ctx.fillStyle=$('#textColor').value;
        ctx.shadowColor=`rgba(255,255,255,${clamp(.045+.28*m.glow*focus,.045,.34)})`;ctx.shadowBlur=(2.5+12.8*m.glow*focus)*glowSetting*(w/620);ctx.fillText(u.text,x,yy);
        ctx.shadowBlur=(.8+5.8*m.glow*focus)*glowSetting*(w/620);ctx.fillText(u.text,x,yy);ctx.restore();
      }
      ctx.restore();
    }
    yy+=lh;
  }
  ctx.restore();
}
function drawApple(ctx,line,ms,w,h){
  const state=lyricMotionAnchor(ms),centerY=h*(+$('#yPos').value/100),cw=contextWindow(),radius=Math.max(cw.before,cw.after)+3,{centers}=canvasCenters(ctx,w,h);
  const fromC=centers[state.from]??0,toC=centers[state.to]??fromC,anchorC=mix(fromC,toC,state.p);
  for(let idx=Math.max(0,Math.floor(state.anchor)-radius);idx<=Math.min(lines.length-1,Math.ceil(state.anchor)+radius);idx++){
    const dist=idx-state.anchor,v=lineVisual(dist),y=centerY+(centers[idx]-anchorC);
    canvasLine(ctx,lines[idx],ms,w,h,y,v.scale,v.alpha,v.alpha);
  }
}
