'use strict';
(()=>{
  const q=s=>document.querySelector(s);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const escapeHTML=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const caseText=v=>window.linaCaseText?window.linaCaseText(v):String(v??'');
  const isEternal=()=>q('#story')?.dataset.lyricEffect==='eternal';

  function activeAt(ms){
    if(!lines?.length)return null;
    const i=ci(ms),line=lines[i],start=line.start+offset,duration=Math.max(120,line.duration||1200);
    return{i,line,progress:clamp((ms-start)/duration,0,1)};
  }

  function writtenText(line,ms,progress){
    const full=caseText(line.text);
    if(!line.words?.length){
      const eased=progress*progress*(3-2*progress);
      return full.slice(0,Math.ceil(full.length*eased));
    }
    const parts=[];
    for(const word of units(line)){
      const text=caseText(word.text),x=clamp((ms-(word.start+offset))/Math.max(80,word.duration||300),0,1);
      if(x<=0)break;
      parts.push(text.slice(0,Math.max(1,Math.ceil(text.length*x))));
      if(x<1)break;
    }
    return parts.join(' ');
  }

  function polishEternalPreview(ms){
    if(!isEternal()||!lines?.length||ms<entranceMs())return;
    updateIntro(ms);
    const a=activeAt(ms);if(!a)return;
    const {i,line,progress}=a,full=caseText(line.text),written=writtenText(line,ms,progress),pending=full.slice(Math.min(full.length,written.length));
    const far=i>1?caseText(lines[i-2].text):'',near=i>0?caseText(lines[i-1].text):'';
    const tilt=(((i*17)%9)-4)*.14;
    const driftX=Math.sin((progress+i*.37)*Math.PI*1.4)*.055;
    const driftY=Math.cos((progress+i*.23)*Math.PI*1.2)*.035;
    const fade=.72+.28*Math.min(1,progress*4);
    lyricsEl.style.opacity=1;
    lyricsEl.innerHTML=`<div class="eternal-page" style="--eternal-drift-x:${driftX.toFixed(3)}em;--eternal-drift-y:${driftY.toFixed(3)}em;--eternal-tilt:${tilt.toFixed(2)}deg;opacity:${fade.toFixed(3)}">${far?`<div class="eternal-memory memory-far">${escapeHTML(far)}</div>`:''}${near?`<div class="eternal-memory memory-near">${escapeHTML(near)}</div>`:''}<div class="eternal-current"><span class="eternal-ink-written">${escapeHTML(written)}</span><span class="eternal-caret"></span><span class="eternal-ink-pending">${escapeHTML(pending)}</span></div></div>`;
    const meta=q('#activeMeta');if(meta)meta.textContent=`Eternal Sunshine · handwritten reveal · Lyric ${i+1} of ${lines.length}`;
  }

  function gradientCanvas(ctx,w,h){
    const mode=q('#studioGradient')?.value||'none';
    const map={sunset:['#ff5f6d55','#ffc37118','#6a11cb66'],ocean:['#00c6ff55','#0072ff2d','#07195277'],violet:['#fc466b44','#3f5efb66'],mono:['#00000012','#00000088'],warm:['#7b493b33','#3a241f66','#160d0b88']};
    const stops=map[mode];if(!stops)return;
    const g=ctx.createLinearGradient(0,0,w,h);stops.forEach((c,n)=>g.addColorStop(n/(stops.length-1),c));ctx.save();ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.restore();
  }

  function wrapRows(ctx,text,maxWidth){
    const words=String(text||'').split(/\s+/).filter(Boolean),rows=[];let row='';
    for(const word of words){const test=row?`${row} ${word}`:word;if(row&&ctx.measureText(test).width>maxWidth){rows.push(row);row=word}else row=test}
    if(row)rows.push(row);return rows;
  }

  function visibleRows(ctx,full,written,maxWidth){
    const rows=wrapRows(ctx,full,maxWidth),out=[];let remain=written.length;
    for(const row of rows){if(remain<=0){out.push('');continue}const take=Math.min(row.length,remain);out.push(row.slice(0,take));remain-=take;if(remain>0)remain-=1}
    return{rows,out};
  }

  function drawEternalPolished(ctx,line,ms,w,h){
    gradientCanvas(ctx,w,h);
    const a=activeAt(ms);if(!a?.line)return;
    const {i,line:l,progress}=a,full=caseText(l.text),written=writtenText(l,ms,progress),far=i>1?caseText(lines[i-2].text):'',near=i>0?caseText(lines[i-1].text):'';
    const sizeControl=+(q('#size')?.value||52),fs=Math.max(20,Math.round((sizeControl/620)*Math.min(w,h*.9))),maxW=w*.82;
    const x=w*.09,y=h*(+(q('#yPos')?.value||50)/100),tilt=((((i*17)%9)-4)*.14)*Math.PI/180,driftX=Math.sin((progress+i*.37)*Math.PI*1.4)*fs*.055,driftY=Math.cos((progress+i*.23)*Math.PI*1.2)*fs*.035;
    ctx.save();ctx.translate(x+driftX,y+driftY);ctx.rotate(tilt);ctx.translate(-(x+driftX),-(y+driftY));ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle=q('#textColor')?.value||'#fff';ctx.shadowColor='rgba(0,0,0,.62)';ctx.shadowBlur=Math.max(2,w*.006);
    const memoryFont=Math.max(12,Math.round(fs*.44));ctx.font=`500 ${memoryFont}px "Bradley Hand","Noteworthy","Chalkboard SE","Segoe Print",cursive`;
    if(far){ctx.globalAlpha=.13;const rows=wrapRows(ctx,far,maxW);rows.slice(-1).forEach((r,n)=>ctx.fillText(r,x+fs*.22,y-fs*2.15+n*memoryFont*1.18))}
    if(near){ctx.globalAlpha=.3;const rows=wrapRows(ctx,near,maxW);rows.slice(-2).forEach((r,n)=>ctx.fillText(r,x-fs*.04,y-fs*1.45+n*memoryFont*1.18))}
    ctx.globalAlpha=1;ctx.font=`500 ${fs}px "Bradley Hand","Noteworthy","Chalkboard SE","Segoe Print",cursive`;
    const {out}=visibleRows(ctx,full,written,maxW),lh=fs*1.12;
    out.forEach((row,n)=>{if(!row)return;const dx=Math.sin((i+n*2.3)*1.7)*fs*.018,dy=Math.cos((i+n*.8)*1.25)*fs*.018;ctx.globalAlpha=.22;ctx.fillText(row,x+dx+.6,y+n*lh+dy+.45);ctx.globalAlpha=1;ctx.fillText(row,x+dx,y+n*lh+dy)});
    const underlineY=y+Math.max(1,out.filter(Boolean).length)*lh+fs*.12;ctx.globalAlpha=.18;ctx.lineWidth=Math.max(1,fs*.018);ctx.beginPath();ctx.moveTo(x,underlineY);ctx.quadraticCurveTo(x+maxW*.47,underlineY+fs*.045,x+maxW*.86,underlineY-fs*.012);ctx.strokeStyle=q('#textColor')?.value||'#fff';ctx.stroke();ctx.restore();
  }

  const baseRender=window.render;
  if(typeof baseRender==='function')window.render=function(ms){const result=baseRender(ms);if(isEternal())polishEternalPreview(Number(ms)||0);return result};

  const baseDraw=window.drawApple;
  if(typeof baseDraw==='function')window.drawApple=function(ctx,line,ms,w,h){if(isEternal())return drawEternalPolished(ctx,line,Number(ms)||0,w,h);return baseDraw(ctx,line,ms,w,h)};

  window.linaVisualPolish={eternalPreview:polishEternalPreview,drawEternal:drawEternalPolished};
  try{window.render?.((Number(audio?.currentTime)||0)*1000)}catch{}
})();
