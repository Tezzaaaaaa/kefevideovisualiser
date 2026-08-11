'use strict';
(()=>{
  const q=s=>document.querySelector(s);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const escapeHTML=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const caseText=v=>window.linaCaseText?window.linaCaseText(v):String(v??'');
  const isEternal=()=>q('#story')?.dataset.lyricEffect==='eternal';
  const handFont='"Bradley Hand","Noteworthy","Chalkboard SE","Segoe Print","Comic Sans MS",cursive';

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
    const out=[];
    for(const word of units(line)){
      const text=caseText(word.text),x=clamp((ms-(word.start+offset))/Math.max(80,word.duration||300),0,1);
      if(x<=0)break;
      out.push(text.slice(0,Math.max(1,Math.ceil(text.length*(x*x*(3-2*x))))));
      if(x<1)break;
    }
    return out.join(' ');
  }

  function lineMood(i,progress){
    const seed=(i*47)%17;
    return{
      tilt:((seed%9)-4)*.11,
      currentTilt:((((seed*3)%7)-3)*.075),
      driftX:Math.sin((progress+i*.31)*Math.PI*1.2)*.035,
      driftY:Math.cos((progress+i*.19)*Math.PI*1.1)*.022,
      memoryX:(((seed%5)-2)*.035),
      fade:.76+.24*Math.min(1,progress*5)
    };
  }

  function polishEternalPreview(ms){
    if(!isEternal()||!lines?.length||ms<entranceMs())return;
    updateIntro(ms);
    const a=activeAt(ms);if(!a)return;
    const {i,line,progress}=a,full=caseText(line.text),written=writtenText(line,ms,progress);
    const pending=full.slice(Math.min(full.length,written.length));
    const far=i>1?caseText(lines[i-2].text):'',near=i>0?caseText(lines[i-1].text):'';
    const mood=lineMood(i,progress),writing=written.length<full.length&&progress<.995;
    lyricsEl.style.opacity=1;
    lyricsEl.innerHTML=`<div class="eternal-page" style="--eternal-drift-x:${mood.driftX.toFixed(3)}em;--eternal-drift-y:${mood.driftY.toFixed(3)}em;--eternal-tilt:${mood.tilt.toFixed(2)}deg;--eternal-current-tilt:${mood.currentTilt.toFixed(2)}deg;--eternal-memory-x:${mood.memoryX.toFixed(3)}em;--eternal-ink-head:${writing?1:0};opacity:${mood.fade.toFixed(3)}">${far?`<div class="eternal-memory memory-far">${escapeHTML(far)}</div>`:''}${near?`<div class="eternal-memory memory-near">${escapeHTML(near)}</div>`:''}<div class="eternal-current"><span class="eternal-ink-written">${escapeHTML(written)}</span><span class="eternal-ink-head" aria-hidden="true"></span><span class="eternal-ink-pending">${escapeHTML(pending)}</span></div></div>`;
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
    for(const row of rows){
      if(remain<=0){out.push('');continue}
      const take=Math.min(row.length,remain);out.push(row.slice(0,take));remain-=take;
      if(remain>0)remain-=1;
    }
    return{rows,out};
  }

  function drawMemory(ctx,text,x,y,maxW,fontSize,alpha,tilt){
    if(!text)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.font=`500 ${fontSize}px ${handFont}`;
    const rows=wrapRows(ctx,text,maxW).slice(-2);
    rows.forEach((row,n)=>{
      const yy=y+n*fontSize*1.16,dx=Math.sin((n+text.length)*.73)*fontSize*.03;
      ctx.save();ctx.translate(x+dx,yy);ctx.rotate(tilt);ctx.fillText(row,0,0);ctx.restore();
    });
    ctx.restore();
  }

  function drawEternalPolished(ctx,line,ms,w,h){
    gradientCanvas(ctx,w,h);
    const a=activeAt(ms);if(!a?.line)return;
    const {i,line:l,progress}=a,full=caseText(l.text),written=writtenText(l,ms,progress);
    const far=i>1?caseText(lines[i-2].text):'',near=i>0?caseText(lines[i-1].text):'';
    const sizeControl=+(q('#size')?.value||52),fs=Math.max(20,Math.round((sizeControl/620)*Math.min(w,h*.9))),maxW=w*.82;
    const x=w*.09,y=h*(+(q('#yPos')?.value||50)/100),mood=lineMood(i,progress),tilt=mood.tilt*Math.PI/180;
    const driftX=mood.driftX*fs,driftY=mood.driftY*fs,color=q('#textColor')?.value||'#fff';

    ctx.save();
    ctx.translate(x+driftX,y+driftY);ctx.rotate(tilt);ctx.translate(-(x+driftX),-(y+driftY));
    ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle=color;
    ctx.shadowColor='rgba(0,0,0,.58)';ctx.shadowBlur=Math.max(2,w*.0055);

    const memoryFont=Math.max(12,Math.round(fs*.43));
    drawMemory(ctx,far,x+fs*.19,y-fs*2.15,maxW,memoryFont,.11,.008);
    drawMemory(ctx,near,x-fs*.03,y-fs*1.48,maxW,memoryFont,.26,-.006);

    ctx.globalAlpha=1;ctx.font=`560 ${fs}px ${handFont}`;
    const {out}=visibleRows(ctx,full,written,maxW),lh=fs*1.09;
    let last=null;
    out.forEach((row,n)=>{
      if(!row)return;
      const dx=Math.sin((i+n*2.17)*1.31)*fs*.014,dy=Math.cos((i+n*.83)*1.17)*fs*.013;
      const rowTilt=((((i+n*5)%7)-3)*.055)*Math.PI/180;
      const rx=x+dx,ry=y+n*lh+dy;
      ctx.save();ctx.translate(rx,ry);ctx.rotate(rowTilt);
      ctx.globalAlpha=.14;ctx.fillText(row,.55,.42);
      ctx.globalAlpha=1;ctx.fillText(row,0,0);
      ctx.restore();
      last={text:row,x:rx,y:ry,tilt:rowTilt};
    });

    if(last&&written.length<full.length&&progress<.995){
      ctx.save();ctx.font=`560 ${fs}px ${handFont}`;
      const advance=ctx.measureText(last.text).width;
      ctx.translate(last.x,last.y);ctx.rotate(last.tilt);
      ctx.globalAlpha=.58;
      ctx.fillStyle=color;
      ctx.beginPath();ctx.ellipse(advance+fs*.045,fs*.67,Math.max(1.5,fs*.042),Math.max(1,fs*.018),-.22,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  const baseRender=window.render;
  if(typeof baseRender==='function')window.render=function(ms){const result=baseRender(ms);if(isEternal())polishEternalPreview(Number(ms)||0);return result};

  const baseDraw=window.drawApple;
  if(typeof baseDraw==='function')window.drawApple=function(ctx,line,ms,w,h){if(isEternal())return drawEternalPolished(ctx,line,Number(ms)||0,w,h);return baseDraw(ctx,line,ms,w,h)};

  window.linaVisualPolish={eternalPreview:polishEternalPreview,drawEternal:drawEternalPolished};
  try{window.render?.((Number(audio?.currentTime)||0)*1000)}catch{}
})();
