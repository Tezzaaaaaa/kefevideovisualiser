/* KEFE polished typography effects. Loaded after app.js. */
(() => {
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number(v) || 0));
    const smoother = v => { const t = clamp(v); return t*t*t*(t*(t*6-15)+10); };
    const active = (lines, time) => {
        let i = -1;
        for (let n=0;n<(lines||[]).length;n++) { if (Number.isFinite(Number(lines[n]?.time)) && time >= Number(lines[n].time)) i=n; else break; }
        if (i<0) return null;
        const line=lines[i]||{}, next=lines[i+1]||null;
        return { index:i, line:{...line,time:Number(line.time)||0,endTime:Number.isFinite(Number(line.endTime))?Number(line.endTime):(Number(next.time)||((Number(line.time)||0)+3))}, next };
    };
    const wordsFor = (line,next) => {
        if (Array.isArray(line?.words) && line.words.length) return line.words.map((w,i,a)=>({text:String(w.text||''),time:Number(w.time)||line.time,endTime:Number.isFinite(Number(w.endTime))?Number(w.endTime):(Number(a[i+1]?.time)||line.endTime)}));
        const tokens=String(line?.text||'').trim().split(/\s+/).filter(Boolean); if(!tokens.length)return[];
        const start=line.time,end=Math.max(start+.25,Number(next?.time)||line.endTime||start+3); const weights=tokens.map(t=>Math.max(1,Array.from(t.replace(/[^\p{L}\p{N}]/gu,'')).length**.72)); const total=weights.reduce((a,b)=>a+b,0);let c=0;
        return tokens.map((text,i)=>{const a=start+(end-start)*c/total;c+=weights[i];const b=start+(end-start)*c/total;return{text,time:a,endTime:Math.max(a+.05,b)};});
    };
    const font=(ctx,size,weight=700)=>{ctx.font=`${weight} ${Math.max(18,size)}px "Open Sans",Arial,sans-serif`;};
    const fit=(ctx,text,size,max,weight=700)=>{let s=size;font(ctx,s,weight);while(s>24&&ctx.measureText(text).width>max){s-=1;font(ctx,s,weight);}return s;};

    function drawApple(ctx,w,h,style,lines,time){
        const a=active(lines,time);if(!a)return;const ws=wordsFor(a.line,a.next);if(!ws.length)return;const size=Number(style.fontSize)||76,margin=Math.max(46,w*.07),max=w-margin*2;
        ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';font(ctx,size,650);const gap=ctx.measureText(' ').width;let rows=[],row=[],rw=0;
        ws.forEach(word=>{const ww=ctx.measureText(word.text).width,p=row.length?rw+gap+ww:ww;if(row.length&&p>max){rows.push({row,w:rw});row=[];rw=0;}row.push({...word,w:ww});rw=row.length===1?ww:rw+gap+ww;});if(row.length)rows.push({row,w:rw});
        const rh=size*1.22,total=rows.length*rh;let y=h*.5-total/2+rh/2;
        rows.forEach(r=>{let x=style.align==='center'?(w-r.w)/2:style.align==='right'?w-margin-r.w:margin;r.row.forEach(word=>{const p=clamp((time-word.time)/Math.max(.04,word.endTime-word.time));const enter=smoother(p/.30),sweep=smoother((p-.04)/.52);ctx.save();ctx.globalAlpha=.22;ctx.fillStyle=style.textColor||'#fff';ctx.shadowBlur=0;ctx.fillText(word.text,x,y);let cx=x;for(const ch of Array.from(word.text)){const cw=ctx.measureText(ch).width;const cp=clamp((sweep*(Array.from(word.text).length+1)-Array.from(word.text).indexOf(ch)+.35)/1.8);ctx.globalAlpha=enter*(.10+.90*cp);ctx.fillStyle=style.accentColor||'#fff';ctx.shadowColor=style.accentColor||'#fff';ctx.shadowBlur=size*.018*cp;ctx.fillText(ch,cx,y);cx+=cw;}ctx.restore();x+=word.w+gap;});y+=rh;});ctx.restore();
    }

    function drawBrat(ctx,w,h,style,lines,time){
        const a=active(lines,time);if(!a)return;const ws=wordsFor(a.line,a.next);if(!ws.length)return;const text=ws.map(x=>x.text).join(' ');const size=fit(ctx,text,Number(style.fontSize)||76,w*.90,900);font(ctx,size,900);ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';const widths=ws.map(x=>ctx.measureText(x.text).width),gap=ctx.measureText(' ').width,total=widths.reduce((s,x)=>s+x,0)+gap*(ws.length-1);let x=(w-total)/2;const y=h*.46;ws.forEach((word,i)=>{if(time>=word.time){ctx.globalAlpha=1;ctx.fillStyle=style.bratTextColor||style.textColor||'#fff';ctx.fillText(word.text,x,y);}x+=widths[i]+gap;});ctx.restore();
    }

    function drawEternal(ctx,w,h,style,lines,time){
        const a=active(lines,time);if(!a)return;const ws=wordsFor(a.line,a.next);if(!ws.length)return;const text=ws.map(x=>x.text).join(' '),size=fit(ctx,text,Number(style.fontSize)||76,w*.86,500);font(ctx,size,500);ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';const total=ctx.measureText(text).width;let x=(w-total)/2;const chars=Array.from(text);const weights=chars.map(c=>/\s/.test(c)?.35:1),sum=weights.reduce((s,v)=>s+v,0);let acc=0;const progress=clamp((time-a.line.time)/Math.max(.16,(a.line.endTime-a.line.time)*Math.max(.16,Number(style.eternalWriteSpan)||.55)));for(let i=0;i<chars.length;i++){const start=acc/sum;acc+=weights[i];const end=acc/sum;const p=smoother(clamp((progress-start)/Math.max(.012,end-start)));ctx.globalAlpha=p;ctx.fillStyle=style.eternalInkColor||style.textColor||'#fff';ctx.shadowColor=style.eternalInkColor||style.textColor||'#fff';ctx.shadowBlur=(Number(style.eternalGlow)||3)*(.25+p);ctx.fillText(chars[i],x,h*.50);x+=ctx.measureText(chars[i]).width;}ctx.restore();
    }

    function drawPulse(ctx,w,h,style,lines,time){
        const a=active(lines,time);if(!a)return;const ws=wordsFor(a.line,a.next);if(!ws.length)return;const base=Number(style.fontSize)||76,colour=style.accentColor||'#fff',laneY=h*.60,spacing=Math.max(base*.52,Math.min(h*.070,base*.78)),local=clamp((time-a.line.time)/Math.max(.16,a.line.endTime-a.line.time));ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';const visible=Math.min(10,Math.max(6,ws.length+3));
        for(let n=-2;n<visible;n++){const p=n+local*1.75;if(p<-.9||p>visible-.8)continue;const depth=clamp(1-p/(visible-1)),pers=smoother(depth),scale=.28+.72*pers,y=laneY+(p-(visible-2))*spacing*(.52+.48*pers),word=ws[((n%ws.length)+ws.length)%ws.length],fs=fit(ctx,word.text,base*scale,w*.76,800),fade=clamp(Math.min((p+.55)/.8,(visible-.35-p)/.8));ctx.globalAlpha=fade*(.14+.86*pers);ctx.fillStyle=colour;ctx.shadowColor=colour;ctx.shadowBlur=fs*.018*pers;ctx.fillText(word.text,w/2,y);}ctx.restore();
    }

    function drawStroke(ctx,w,h,style,lines,time){
        const a=active(lines,time);if(!a)return;const ws=wordsFor(a.line,a.next);if(!ws.length)return;const text=ws.map(x=>x.text).join(' '),size=fit(ctx,text,Number(style.fontSize)||76,w*.82,800),p=clamp((time-a.line.time)/Math.max(.16,a.line.endTime-a.line.time));ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';font(ctx,size,800);ctx.globalAlpha=smoother(p/.20);ctx.lineJoin='round';ctx.lineWidth=Math.max(2,Math.round(size*.028));ctx.strokeStyle=style.accentColor||'#fff';ctx.strokeText(text,w/2,h*.57);ctx.globalAlpha=.10*smoother(p/.20);ctx.fillStyle=style.textColor||'#fff';ctx.fillText(text,w/2,h*.57);ctx.restore();
    }

    function drawFadeUp(ctx,w,h,style,lines,time){
        const a=active(lines,time);if(!a)return;const ws=wordsFor(a.line,a.next);if(!ws.length)return;const base=Number(style.fontSize)||76,margin=Math.max(44,w*.07),gap=base*.20;ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';font(ctx,base,700);let widths=ws.map(x=>ctx.measureText(x.text).width),total=widths.reduce((s,x)=>s+x,0)+gap*(ws.length-1);let fs=base;if(total>w-margin*2){fs=base*(w-margin*2)/total;font(ctx,fs,700);widths=ws.map(x=>ctx.measureText(x.text).width);total=widths.reduce((s,x)=>s+x,0)+gap*(ws.length-1);}let x=(w-total)/2;const y=h*.46;ws.forEach((word,i)=>{const p=clamp((time-word.time)/Math.max(.10,word.endTime-word.time)),e=smoother(p/.24);ctx.save();ctx.globalAlpha=e;ctx.fillStyle=style.textColor||'#fff';ctx.fillText(word.text,x,y+(1-e)*fs*.42);ctx.restore();x+=widths[i]+gap;});ctx.restore();
    }

    const original=window.renderLyricsEffect;
    window.renderLyricsEffect=function(ctx,w,h,style,lines,time){
        switch(style.effect){case 'apple':return drawApple(ctx,w,h,style,lines,time);case 'brat':return drawBrat(ctx,w,h,style,lines,time);case 'eternal':return drawEternal(ctx,w,h,style,lines,time);case 'pulse':return drawPulse(ctx,w,h,style,lines,time);case 'stroke':return drawStroke(ctx,w,h,style,lines,time);case 'fadeup':return drawFadeUp(ctx,w,h,style,lines,time);case 'aurora':return original?original(ctx,w,h,style,lines,time):undefined;default:return original?original(ctx,w,h,style,lines,time):undefined;}
    };
})();