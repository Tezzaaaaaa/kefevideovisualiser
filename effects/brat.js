/* KEFE Visualiser — Brat effect */
(() => {
'use strict';
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.brat=function(ctx,w,h,style,lines,time){
 const active=lines&&lines.reduce((i,l,n)=>time>=Number(l?.time)?n:i,-1); if(active<0)return;
 const line=lines[active]||{}, next=lines[active+1]||null, text=String(line.text||'').trim(); if(!text)return;
 const tokens=Array.isArray(line.words)&&line.words.length?line.words.map(x=>String(x.text||'')).filter(Boolean):text.split(/\s+/);
 const side=w*(Number(style.bratSideMargin)||4.5)/100,top=h*(Number(style.bratTopMargin)||4.5)/100,bottom=h*.05,rowPitch=(h-top-bottom)/5,baseSize=Number(style.fontSize)||76,scaleX=.78,maxWidth=w-side*2;
 let current=-1; (Array.isArray(line.words)&&line.words.length?line.words:tokens.map((x,i)=>({time:Number(line.time)+(i/(Math.max(1,tokens.length-1)))*((Number(next?.time)||Number(line.endTime)||Number(line.time)+3)-Number(line.time)),text:x}))).forEach((x,i)=>{if(time>=Number(x.time))current=i;}); if(current<0)return;
 const patterns=[3,3,2,2,3],scales=[1.16,.91,1.10,.96,1.20],rows=[];let cursor=0,r=0;
 while(cursor<tokens.length){const rw=tokens.slice(cursor,cursor+patterns[r%patterns.length]);cursor+=rw.length;const size=Math.max(34,Math.min(rowPitch*.72,baseSize*1.75*scales[r%scales.length]));ctx.font=`400 ${size}px Arial, sans-serif`;const measured=rw.reduce((s,x)=>s+ctx.measureText(x).width*scaleX,0),gap=rw.length>1?Math.max(0,(maxWidth-measured)/(rw.length-1)):0;rows.push({words:rw,size,gap,row:r++});}
 const activeRow=rows.findIndex(row=>row.words.some(x=>tokens.indexOf(x)===current));if(activeRow<0)return;const page=Math.floor(activeRow/5),start=page*5;
 ctx.save();ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=style.bratTextColor||style.textColor||'#FFF';
 for(let ri=start;ri<Math.min(rows.length,start+5);ri++){const row=rows[ri];ctx.font=`400 ${row.size}px Arial, sans-serif`;const y=top+rowPitch*(ri-start)+rowPitch*.70;let x=side;for(const word of row.words){const gi=tokens.indexOf(word);if(gi>current)break;const width=ctx.measureText(word).width;ctx.save();ctx.translate(x,y);ctx.scale(scaleX,1);ctx.fillText(word,0,0);ctx.restore();x+=width*scaleX+row.gap;}}ctx.restore();
};})();
