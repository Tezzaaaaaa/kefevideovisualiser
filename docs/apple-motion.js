let linaMotionRoot=null,linaMotionEditor=-1,linaMotionCount=-1,linaMotionTextSig='';
function smoother(x){x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10)}
function mix(a,b,t){return a+(b-a)*t}
function phraseWeight(line){const us=units(line),chars=us.reduce((n,w)=>n+String(w.text||'').length,0);return clamp(chars/38,.45,1.45)}
function speakerKey(line){
  const explicit=String(line?.singer||line?.speaker||line?.voice||'').trim();if(explicit)return explicit.toLowerCase();
  const m=String(line?.text||'').match(/^([^:]{1,24}):\s+/);return m?m[1].trim().toLowerCase():'';
}
function speakerSide(key){if(!key)return 0;let h=0;for(let i=0;i<key.length;i++)h=(h*31+key.charCodeAt(i))|0;return Math.abs(h)%2?-1:1}
function vocalRole(line,i){
  const text=String(line?.text||'').trim(),explicit=String(line?.vocalRole||line?.role||'').toLowerCase(),speaker=speakerKey(line);
  const parenthetical=/^[\(（\[\{].*[\)）\]\}]$/.test(text),prev=lines[i-1],next=lines[i+1],start=Number(line?.start)||0,end=start+Math.max(120,Number(line?.duration)||0);
  const overlapPrev=!!prev&&start<(Number(prev.start)||0)+Math.max(120,Number(prev.duration)||0)-80;
  const overlapNext=!!next&&(Number(next.start)||0)<end-80;
  const backing=explicit==='backing'||explicit==='background'||explicit==='bg'||parenthetical;
  const duet=explicit==='duet'||explicit==='lead2'||!!speaker||((overlapPrev||overlapNext)&&!backing);
  let side=0;if(String(line?.side||'').toLowerCase()==='left')side=-1;else if(String(line?.side||'').toLowerCase()==='right')side=1;else if(duet)side=speakerSide(speaker||String(i));
  return{backing,duet,overlap:overlapPrev||overlapNext,side,scale:backing?.91:duet?.97:1,alpha:backing?.72:1,blur:backing?.22:0,word:backing?.72:1,shift:side*(backing?.018:.042)};
}
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
function sceneEnvelope(ms){
  if(!lines.length)return{alpha:0,rise:0,scale:1};
  const ent=entranceMs(),first=lines[0].start+offset,lastLine=lines.at(-1),lastEnd=lastLine.start+offset+Math.max(280,lastLine.duration||0);
  const inStart=Math.min(ent,first),inEnd=Math.max(inStart+180,Math.min(first+160,inStart+520));
  const enter=smoother(clamp((ms-inStart)/Math.max(1,inEnd-inStart),0,1));
  const outStart=lastEnd+420,outEnd=outStart+760,leave=1-smoother(clamp((ms-outStart)/Math.max(1,outEnd-outStart),0,1));
  const alpha=clamp(enter*leave,0,1);
  return{alpha,rise:(1-enter)*18-(1-leave)*10,scale:.985+.015*enter-.008*(1-leave)};
}
function silencePresence(i,ms){
  if(!lines[i])return 0;
  const t=ms-offset,line=lines[i],start=line.start,end=start+Math.max(240,line.duration||0),next=lines[i+1];
  if(!next)return 1;
  const gap=next.start-end;
  if(gap<1500||t<=end)return 1;
  const travel=travelWindowFor(i),travelStart=next.start-travel;
  if(t>=travelStart)return mix(.58,1,smoother(clamp((t-travelStart)/Math.max(1,travel),0,1)));
  const settle=Math.max(400,Math.min(1200,gap*.28)),fade=smoother(clamp((t-end)/settle,0,1));
  return mix(1,.58,fade);
}
function lineVisual(distance){
  const d=Math.abs(distance),near=smoother(clamp(d,0,1)),far=smoother(clamp((d-1)/2.8,0,1));
  const alpha=clamp(mix(1,.50,near)*(1-.84*far),.04,1);
  const scale=mix(1,.938,near)*(1-.10*far);
  const blur=mix(0,.20,near)+1.38*far;
  const saturation=mix(1,.96,near)*(1-.09*far);
  return{alpha,scale,blur,saturation};
}
function wordTimingCharacter(line,w){
  const us=units(line),idx=Math.max(0,us.indexOf(w)),dur=Math.max(60,Number(w.duration)||0),durations=us.map(x=>Math.max(60,Number(x.duration)||0)).sort((a,b)=>a-b),median=durations[Math.floor(durations.length/2)]||dur;
  const text=String(w.text||'').trim(),letters=text.replace(/[^\p{L}\p{N}]/gu,''),punct=/[,.!?;:…—-]$/.test(text),breathOnly=!letters&&!!text,paren=/^[\(（\[\{]|[\)）\]\}]$/.test(text);
  const prev=us[idx-1],next=us[idx+1],prevDur=Math.max(60,Number(prev?.duration)||median),nextDur=Math.max(60,Number(next?.duration)||median),ratio=dur/Math.max(1,median);
  const held=ratio>=1.55||dur>=900,quick=dur<=Math.min(260,median*.62),run=quick&&(prevDur<=Math.max(330,median*.78)||nextDur<=Math.max(330,median*.78));
  const adlib=paren||/^(oh+|ooh+|ah+|aah+|yeah+|hey+|woo+|woah+|uh+|mm+|mmm+)$/i.test(letters);
  return{dur,median,ratio,held,quick,run,punct,breathOnly,adlib};
}
function wordMotion(line,w,ms){
  const c=wordTimingCharacter(line,w),hold=Math.max(.25,w.hold||1),duration=Math.max(90,c.dur*hold),raw=clamp((ms-(w.start+offset))/duration,0,1);
  let attack=.20,release=.24,plateau=.56,depthMul=1,glowMul=1,riseMul=1;
  if(c.held){attack=.13;release=.17;plateau=.70;depthMul=1.08;glowMul=.92;riseMul=.92}
  if(c.run){attack=.28;release=.31;plateau=.41;depthMul=.78;glowMul=.72;riseMul=.70}
  if(c.adlib){attack=.17;release=.20;plateau=.63;depthMul=.94;glowMul=.88;riseMul=.84}
  if(c.punct){release=Math.min(.38,release+.08);plateau=Math.max(.42,plateau-.06)}
  if(c.breathOnly){attack=.34;release=.38;plateau=.28;depthMul=.38;glowMul=.26;riseMul=.25}
  const a=smoother(clamp(raw/Math.max(.05,attack),0,1)),r=smoother(clamp((1-raw)/Math.max(.05,release),0,1));
  let presence=Math.min(a,r);
  if(raw>attack&&raw<1-release)presence=1;
  const singStart=attack*.38,singEnd=1-release*.35,progress=smoother(clamp((raw-singStart)/Math.max(.05,singEnd-singStart),0,1));
  const strength=wordTimingEmphasis(line,w),depth=(.052+Math.max(0,strength-1)*.080)*depthMul;
  const scale=1+presence*depth,bright=1+presence*(.14+Math.max(0,strength-1)*.17)*glowMul,glow=presence*(.66+Math.max(0,strength-1)*.46)*glowMul,rise=-presence*(1.45+Math.max(0,strength-1)*1.55)*riseMul;
  return{raw,progress,pulse:presence,presence,strength,scale,bright,glow,rise,held:c.held,quick:c.quick,run:c.run,adlib:c.adlib,breath:c.breathOnly,plateau};
}
function wordMarkup(line){return units(line).map((w,i)=>`<span class="apple-word" data-w="${i}">${esc(w.text)}</span>`).join(' ')}
function motionTextSignature(){return lines.length+'|'+lines.map(x=>x.text).join('\u0001')+'|'+lines.map((x,i)=>temporalGapAfter(i).toFixed(3)+'/'+JSON.stringify(vocalRole(x,i))).join(',')}
function buildMotionDOM(){
  const sig=motionTextSignature();if(linaMotionRoot&&linaMotionCount===lines.length&&linaMotionTextSig===sig)return;
  linaMotionCount=lines.length;linaMotionTextSig=sig;
  lyricsEl.innerHTML='<div class="apple-flow">'+lines.map((l,i)=>{const r=vocalRole(l,i),cls=r.backing?' vocal-backing':r.duet?' vocal-duet':'';return`<div class="apple-line${cls}" data-line="${i}" data-vocal-side="${r.side}" style="--line-gap-after:${temporalGapAfter(i).toFixed(3)}em">${wordMarkup(l)}</div>`}).join('')+'</div>';
  linaMotionRoot=lyricsEl.querySelector('.apple-flow');
}
function updateMotionWords(ms,state){
  if(!linaMotionRoot)return;
  const els=[...linaMotionRoot.children],lo=Math.max(0,Math.floor(state.anchor)-4),hi=Math.min(lines.length-1,Math.ceil(state.anchor)+4),glowSetting=+$('#glow').value/100;
  for(let i=lo;i<=hi;i++){
    const line=lines[i],el=els[i];if(!line||!el)continue;
    const role=vocalRole(line,i),focus=lineVisual(i-state.anchor),us=units(line),spans=[...el.querySelectorAll('.apple-word')];
    spans.forEach((span,n)=>{
      const w=us[n];if(!w)return;const m=wordMotion(line,w,ms),fill=m.progress*100;
      const feather=m.run?3.1:m.held?5.5:clamp(3.8+2.8*m.pulse,3.8,6.6),fa=clamp(fill-feather,0,100),fb=clamp(fill+feather,0,100),roleFocus=focus.alpha*role.word;
      const halo1=(.8+6.2*m.glow)*glowSetting,halo2=(2+12.8*m.glow)*glowSetting,ha=clamp(.02+.31*m.glow,0,.36),ha2=clamp(.006+.08*m.glow,0,.10);
      span.dataset.motion=m.held?'held':m.run?'run':m.adlib?'adlib':m.breath?'breath':'normal';
      span.style.setProperty('--fill',fill.toFixed(2)+'%');span.style.setProperty('--fill-a',fa.toFixed(2)+'%');span.style.setProperty('--fill-b',fb.toFixed(2)+'%');
      span.style.setProperty('--word-scale',(1+(m.scale-1)*roleFocus).toFixed(4));span.style.setProperty('--word-rise',(m.rise*roleFocus).toFixed(2)+'px');span.style.setProperty('--word-bright',(1+(m.bright-1)*roleFocus).toFixed(3));
      span.style.setProperty('--halo1',halo1.toFixed(2)+'px');span.style.setProperty('--halo2',halo2.toFixed(2)+'px');span.style.setProperty('--halo-alpha',(ha*roleFocus).toFixed(3));span.style.setProperty('--halo-alpha2',(ha2*roleFocus).toFixed(3));
    });
  }
}
function updateMotionLayout(ms){
  if(!linaMotionRoot)return null;
  const state=lyricMotionAnchor(ms),env=sceneEnvelope(ms),els=[...linaMotionRoot.children],from=els[state.from],to=els[state.to]||from;if(!from)return state;
  const fromC=from.offsetTop+from.offsetHeight/2,toC=to.offsetTop+to.offsetHeight/2,anchorY=mix(fromC,toC,state.p);
  linaMotionRoot.style.opacity=env.alpha.toFixed(4);
  linaMotionRoot.style.transform=`translate3d(0,${(-anchorY+env.rise).toFixed(3)}px,0) scale(${env.scale.toFixed(4)})`;
  const lo=Math.max(0,Math.floor(state.anchor)-6),hi=Math.min(lines.length-1,Math.ceil(state.anchor)+6),stageW=story?.clientWidth||620;
  for(let idx=0;idx<els.length;idx++){
    const el=els[idx];if(idx<lo||idx>hi){el.style.visibility='hidden';continue}el.style.visibility='visible';
    const role=vocalRole(lines[idx],idx),v=lineVisual(idx-state.anchor),quiet=silencePresence(idx,ms),alpha=v.alpha*(idx===state.from?quiet:1)*role.alpha,shift=role.shift*stageW;
    el.style.opacity=alpha.toFixed(4);
    el.style.transform=`translate3d(${shift.toFixed(2)}px,0,0) scale(${(v.scale*role.scale).toFixed(4)})`;
    el.style.filter=`blur(${(v.blur+role.blur).toFixed(3)}px) saturate(${v.saturation.toFixed(3)})`;
    el.style.zIndex=String(Math.max(1,20-Math.round(Math.abs(idx-state.anchor)*3)+(role.duet?1:0)));
  }
  return state;
}
function transitionProgress(ms,i){const state=lyricMotionAnchor(ms);return state.from===i&&state.to===i+1?state.p:0}
function render(ms){
  updateIntro(ms);
  if(!lines.length){linaMotionRoot=null;linaMotionCount=-1;lyricsEl.textContent='Add lyrics to begin';$('#activeMeta').textContent='No lyrics loaded';return}
  buildMotionDOM();
  const i=ci(ms),cw=contextWindow(),state=updateMotionLayout(ms);updateMotionWords(ms,state||lyricMotionAnchor(ms));selected=i;
  $('#activeMeta').textContent=ms<entranceMs()?'Waiting for lyrics entrance':`Lyric ${i+1} of ${lines.length} · ${cw.total} on screen`;
  $$('.line').forEach((x,n)=>x.classList.toggle('active',n===i));if(linaMotionEditor!==i){linaMotionEditor=i;fillEditor(i)}
}
function canvasRows(ctx,line,maxW){
  const us=units(line),space=ctx.measureText(' ').width,rows=[];let row=[],rw=0;
  for(const u of us){const ww=ctx.measureText(u.text).width,add=(row.length?space:0)+ww;if(row.length&&rw+add>maxW){rows.push({items:row,w:rw});row=[];rw=0}row.push({...u,x:rw+(row.length?space:0),w:ww});rw+=add}
  if(row.length)rows.push({items:row,w:rw});return rows;
}
function canvasLineHeight(ctx,line,w,h){
  const size=(+$('#size').value/620)*Math.min(w,h*.9),lh=size*(+$('#lineHeight').value);ctx.save();ctx.font=`${$('#fontWeight').value} ${Math.round(size)}px -apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",sans-serif`;const rows=canvasRows(ctx,line,w*.84);ctx.restore();return Math.max(lh,rows.length*lh);
}
function canvasCenters(ctx,w,h){
  const centers=new Array(lines.length).fill(0),heights=lines.map(l=>canvasLineHeight(ctx,l,w,h)),baseGap=(+$('#size').value/620)*Math.min(w,h*.9)*.22;centers[0]=heights[0]/2;
  for(let i=1;i<lines.length;i++){const gap=baseGap*(1+temporalGapAfter(i-1));centers[i]=centers[i-1]+heights[i-1]/2+gap+heights[i]/2}return{centers,heights};
}
function canvasLine(ctx,line,ms,w,h,y,scale,alpha,focus=1,role={shift:0,word:1}){
  if(!line||alpha<=0)return;
  const size=(+$('#size').value/620)*Math.min(w,h*.9),lh=size*(+$('#lineHeight').value),maxW=w*.84,align=$('#textAlign').value,weight=$('#fontWeight').value,shift=(role.shift||0)*w;
  ctx.save();ctx.globalAlpha=clamp(alpha,0,1);ctx.translate(w/2+shift,y);ctx.scale(scale,scale);ctx.translate(-(w/2+shift),-y);ctx.translate(shift,0);ctx.font=`${weight} ${Math.round(size)}px -apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",sans-serif`;ctx.textBaseline='middle';
  const rows=canvasRows(ctx,line,maxW);let yy=y-(rows.length-1)*lh/2;
  for(const rr of rows){
    let left=w*.08;if(align==='center')left=(w-rr.w)/2;if(align==='right')left=w*.92-rr.w;
    for(const u of rr.items){
      const x=left+u.x,m=wordMotion(line,u,ms),cx=x+u.w/2,wordFocus=focus*(role.word??1);ctx.save();ctx.translate(cx,yy+m.rise*wordFocus*(w/620));ctx.scale(1+(m.scale-1)*wordFocus,1+(m.scale-1)*wordFocus);ctx.translate(-cx,-yy);
      ctx.fillStyle='rgba(255,255,255,.235)';ctx.shadowBlur=0;ctx.fillText(u.text,x,yy);
      if(m.progress>0){const glowSetting=+$('#glow').value/100;ctx.save();ctx.beginPath();ctx.rect(x-size*.07,yy-lh*.72,u.w*m.progress+size*.14,lh*1.44);ctx.clip();ctx.fillStyle=$('#textColor').value;ctx.shadowColor=`rgba(255,255,255,${clamp(.045+.28*m.glow*wordFocus,.045,.34)})`;ctx.shadowBlur=(2.5+12.8*m.glow*wordFocus)*glowSetting*(w/620);ctx.fillText(u.text,x,yy);ctx.shadowBlur=(.8+5.8*m.glow*wordFocus)*glowSetting*(w/620);ctx.fillText(u.text,x,yy);ctx.restore()}ctx.restore();
    }yy+=lh;
  }ctx.restore();
}
function drawApple(ctx,line,ms,w,h){
  const state=lyricMotionAnchor(ms),env=sceneEnvelope(ms);if(env.alpha<=.001)return;
  const centerY=h*(+$('#yPos').value/100),cw=contextWindow(),radius=Math.max(cw.before,cw.after)+3,{centers}=canvasCenters(ctx,w,h),fromC=centers[state.from]??0,toC=centers[state.to]??fromC,anchorC=mix(fromC,toC,state.p);
  ctx.save();ctx.globalAlpha=env.alpha;ctx.translate(w/2,centerY+env.rise);ctx.scale(env.scale,env.scale);ctx.translate(-w/2,-(centerY+env.rise));
  for(let idx=Math.max(0,Math.floor(state.anchor)-radius);idx<=Math.min(lines.length-1,Math.ceil(state.anchor)+radius);idx++){
    const role=vocalRole(lines[idx],idx),dist=idx-state.anchor,v=lineVisual(dist),quiet=idx===state.from?silencePresence(idx,ms):1,y=centerY+(centers[idx]-anchorC)+env.rise;
    canvasLine(ctx,lines[idx],ms,w,h,y,v.scale*role.scale,v.alpha*quiet*role.alpha,v.alpha,role);
  }
  ctx.restore();
}
