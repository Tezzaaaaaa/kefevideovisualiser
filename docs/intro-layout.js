'use strict';
(()=>{
  const originalAspect=window.aspect;
  window.aspect=function(){
    if(originalAspect)originalAspect();
    const r=document.querySelector('#aspect')?.value||'16:9';
    const story=document.querySelector('#story');
    if(story)story.dataset.aspect=r;
  };

  function fitText(ctx,text,maxWidth,startPx,minPx,weight,family){
    let px=Math.max(minPx,startPx);
    while(px>minPx){
      ctx.font=`${weight} ${Math.round(px)}px ${family}`;
      if(ctx.measureText(text).width<=maxWidth)break;
      px-=1;
    }
    ctx.font=`${weight} ${Math.round(px)}px ${family}`;
    return px;
  }

  function wrapTwo(ctx,text,maxWidth){
    const words=String(text||'').trim().split(/\s+/).filter(Boolean);
    if(!words.length)return[];
    const lines=[];let line='';
    for(const word of words){
      const test=line?`${line} ${word}`:word;
      if(line&&ctx.measureText(test).width>maxWidth&&lines.length<1){lines.push(line);line=word}
      else line=test;
    }
    if(line)lines.push(line);
    return lines.slice(0,2);
  }

  window.drawIntro=function(ctx,w,h){
    const title=document.querySelector('#titleInput')?.value.trim()||'';
    if(!title)return;
    const artist=document.querySelector('#artistInput')?.value.trim()||'';
    const album=document.querySelector('#albumInput')?.value.trim()||
      (typeof selectedSong!=='undefined'&&selectedSong?.collectionName?String(selectedSong.collectionName).trim():'');
    const landscape=w/h>1.2;
    const family='-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif';

    ctx.save();
    ctx.textAlign='left';
    ctx.textBaseline='top';

    const blockW=landscape?w*.68:Math.min(w*.84,w-36);
    const x=(w-blockW)/2;
    const titleStart=landscape?Math.min(w*.045,h*.095):Math.min(w*.095,h*.07);
    const titleMin=landscape?Math.max(22,w*.02):Math.max(24,w*.055);
    const titlePx=fitText(ctx,title,blockW,titleStart,titleMin,800,family);
    const titleLines=wrapTwo(ctx,title,blockW);
    const titleH=Math.max(1,titleLines.length)*titlePx*1.05;
    const artistPx=artist?fitText(ctx,artist,blockW,landscape?Math.min(w*.019,h*.043):Math.min(w*.042,h*.032),landscape?Math.max(14,w*.011):Math.max(14,w*.03),650,family):0;
    const albumPx=album?fitText(ctx,album,blockW,landscape?Math.min(w*.014,h*.032):Math.min(w*.032,h*.024),landscape?Math.max(11,w*.009):Math.max(11,w*.024),600,family):0;
    const gap1=artist?Math.max(7,titlePx*.16):0;
    const gap2=album?Math.max(5,artistPx*.22):0;
    const blockH=titleH+gap1+(artist?artistPx*1.15:0)+gap2+(album?albumPx*1.15:0);
    let y=(h-blockH)/2;

    ctx.fillStyle='#fff';
    ctx.font=`800 ${Math.round(titlePx)}px ${family}`;
    for(const line of titleLines){ctx.fillText(line,x,y);y+=titlePx*1.05}

    if(artist){
      y+=gap1;
      ctx.fillStyle='rgba(255,255,255,.82)';
      ctx.font=`650 ${Math.round(artistPx)}px ${family}`;
      ctx.fillText(artist,x,y);y+=artistPx*1.15;
    }
    if(album){
      y+=gap2;
      ctx.fillStyle='rgba(255,255,255,.52)';
      ctx.font=`600 ${Math.round(albumPx)}px ${family}`;
      ctx.fillText(album,x,y);
    }
    ctx.restore();
  };

  requestAnimationFrame(()=>window.aspect());
})();
