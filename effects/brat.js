/* KEFE Visualiser — Brat effect */
(() => {
'use strict';
const u=window.kefeEffectUtils;
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.brat=function(ctx,w,h,style,lines,time){
 const a=u.activeLine(lines,time);if(!a)return;const words=u.wordsFor(a.line,a.next);if(!words.length)return;
 const side=w*(Number(style.bratSideMargin)||4.5)/100,top=h*(Number(style.bratTopMargin)||4.5)/100,bottom=h*.05,rowPitch=(h-top-bottom)/5,baseSize=Number(style.fontSize)||76,transformX=.78,maxWidth=w-side*2,patterns=[3,3,2,2,3],scales=[1.16,.91,1.10,.96,1.20];
 let currentIndex=-1;for(let i=0;i<words.length;i++){if(time>=words[i].time)currentIndex=i;else break;}if(currentIndex<0)return;
 const rows=[];let cursor=0,rowNumber=0;
 while(cursor<words.length){const count=patterns[rowNumber%patterns.length],rowWords=words.slice(cursor,cursor+count);cursor+=rowWords.length;const size=Math.max(34,Math.min(rowPitch*.72,baseSize*1.75*scales[rowNumber%scales.length]));u.setFont(ctx,'Arial',size,400);const measured=rowWords.reduce((sum,word)=>sum+ctx.measureText(word.text).width*transformX,0),gap=rowWords.length>1?Math.max(0,(maxWidth-measured)/(rowWords.length-1)):0;rows.push({words:rowWords,size,gap,rowNumber});rowNumber++;}
 const activeRow=rows.findIndex(row=>row.words.some(word=>words.indexOf(word)===currentIndex));if(activeRow<0)return;const page=Math.floor(activeRow/5),pageStart=page*5;
 ctx.save();ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=style.bratTextColor||style.textColor||'#FFFFFF';
 for(let ri=pageStart;ri<Math.min(rows.length,pageStart+5);ri++){const row=rows[ri];u.setFont(ctx,'Arial',row.size,400);const baseline=top+rowPitch*(ri-pageStart)+rowPitch*.70;let x=side;for(const word of row.words){const globalIndex=words.indexOf(word);if(globalIndex>currentIndex)break;const rawWidth=ctx.measureText(word.text).width;ctx.save();ctx.translate(x,baseline);ctx.scale(transformX,1);ctx.fillText(word.text,0,0);ctx.restore();x+=rawWidth*transformX+row.gap;}}
 ctx.restore();
};
})();
