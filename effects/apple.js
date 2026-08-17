/* KEFE Visualiser — Apple Music effect */
(() => {
    'use strict';
    const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, Number(v) || 0));
    const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
    const smoother = v => { const t = clamp(v); return t*t*t*(t*(t*6-15)+10); };
    function activeLine(lines, time) {
        let index = -1;
        for (let i = 0; i < (lines || []).length; i++) {
            if (Number.isFinite(Number(lines[i]?.time)) && time >= Number(lines[i].time)) index = i; else break;
        }
        if (index < 0) return null;
        const line = lines[index] || {}, next = lines[index + 1] || null;
        return { index, line: { ...line, time: Number(line.time) || 0, endTime: Number.isFinite(Number(line.endTime)) ? Number(line.endTime) : (Number(next?.time) || ((Number(line.time) || 0) + 3)) }, next };
    }
    function wordsFor(line, next) {
        if (Array.isArray(line?.words) && line.words.length) return line.words.map((word, i, all) => ({ text: String(word.text || ''), time: Number(word.time) || Number(line.time) || 0, endTime: Number.isFinite(Number(word.endTime)) ? Number(word.endTime) : (Number(all[i + 1]?.time) || Number(line.endTime) || (Number(line.time) + 3)) })).filter(word => word.text);
        const tokens = String(line?.text || '').trim().split(/\s+/).filter(Boolean); if (!tokens.length) return [];
        const start = Number(line.time) || 0, end = Math.max(start + 0.25, Number(next?.time) || Number(line.endTime) || start + 3);
        const weights = tokens.map(token => Math.max(1, Array.from(token.replace(/[^\p{L}\p{N}]/gu, '')).length ** 0.72));
        const total = weights.reduce((a,b)=>a+b,0) || tokens.length; let cursor=0;
        return tokens.map((text,i)=>{ const time=start+(end-start)*cursor/total; cursor+=weights[i]; const endTime=start+(end-start)*cursor/total; return {text,time,endTime:Math.max(time+0.05,endTime)}; });
    }
    function setFont(ctx, family, size, weight=700) { ctx.font = `${weight} ${Math.max(18,size)}px "${family}", Arial, sans-serif`; }
    window.kefeEffects = window.kefeEffects || {};
    window.kefeEffects.apple = function(ctx,w,h,style,lines,time) {
        const a=activeLine(lines,time); if(!a) return; const words=wordsFor(a.line,a.next); if(!words.length)return;
        const size=Number(style.fontSize)||76, margin=Math.max(46,w*0.07), maxWidth=w-margin*2; setFont(ctx,'Inter',size,650);
        const gap=ctx.measureText(' ').width, rows=[]; let row=[],rowWidth=0;
        for(const word of words){const width=ctx.measureText(word.text).width, proposed=row.length?rowWidth+gap+width:width;if(row.length&&proposed>maxWidth){rows.push({words:row,width:rowWidth});row=[];rowWidth=0;}row.push({...word,width});rowWidth=row.length===1?width:rowWidth+gap+width;} if(row.length)rows.push({words:row,width:rowWidth});
        const rowHeight=size*1.22,totalHeight=rows.length*rowHeight,startY=h*0.245-totalHeight/2+rowHeight/2; ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';
        rows.forEach((current,rowIndex)=>{let x=style.align==='center'?(w-current.width)/2:style.align==='right'?w-margin-current.width:margin;const y=startY+rowIndex*rowHeight;for(const word of current.words){const progress=clamp((time-word.time)/Math.max(.04,word.endTime-word.time)),enter=smoother(progress/.22),complete=progress>=1,inactive=style.appleInactiveOpacity!==undefined?clamp(style.appleInactiveOpacity,.08,.6):.25;ctx.save();ctx.globalAlpha=inactive;ctx.fillStyle=style.textColor||'#FFFFFF';ctx.fillText(word.text,x,y);ctx.restore();if(enter>0){const activeWidth=word.width*smooth(progress);if(activeWidth>0){ctx.save();ctx.beginPath();ctx.rect(x-1,y-size,activeWidth+2,size*2);ctx.clip();ctx.globalAlpha=.96*enter;ctx.fillStyle=style.accentColor||'#FFFFFF';ctx.fillText(word.text,x,y);ctx.restore();}if(!complete&&progress>0&&progress<1){const edge=x+activeWidth,edgeWidth=Math.max(8,size*.14);ctx.save();ctx.beginPath();ctx.rect(edge-edgeWidth,y-size,edgeWidth,size*2);ctx.clip();const g=ctx.createLinearGradient(edge-edgeWidth,0,edge,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.88)');ctx.globalAlpha=enter;ctx.fillStyle=g;ctx.fillText(word.text,x,y);ctx.restore();}}x+=word.width+gap;}});ctx.restore();
    };
})();
