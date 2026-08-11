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

  window.drawIntro=function(ctx,w,h){
    const title=document.querySelector('#titleInput')?.value.trim()||'';
    if(!title)return;
    const artist=document.querySelector('#artistInput')?.value.trim()||'';
    const album=document.querySelector('#albumInput')?.value.trim()||
      (typeof selectedSong!=='undefined'&&selectedSong?.collectionName?String(selectedSong.collectionName).trim():'');
    const landscape=w/h>1.2;
    const family='-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif';

    ctx.save();
    ctx.fillStyle='rgba(15,15,18,.78)';

    if(landscape){
      const cardW=w*.68;
      const cardH=h*(album?.28:.24);
      const x=(w-cardW)/2,y=(h-cardH)/2;
      const r=Math.min(26,w*.022),pad=cardH*.16;
      roundRect(ctx,x,y,cardW,cardH,r);ctx.fill();

      const tx=x+pad,tw=cardW-pad*2;
      let cy=y+pad*.78;
      ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#fff';
      const titlePx=fitText(ctx,title,tw,Math.min(w*.045,h*.095),Math.max(22,w*.02),800,family);
      ctx.fillText(title,tx,cy);cy+=titlePx*1.12;

      if(artist){
        ctx.fillStyle='rgba(255,255,255,.82)';
        const artistPx=fitText(ctx,artist,tw,Math.min(w*.019,h*.043),Math.max(14,w*.011),650,family);
        ctx.fillText(artist,tx,cy);cy+=artistPx*1.28;
      }
      if(album){
        ctx.fillStyle='rgba(255,255,255,.52)';
        const albumPx=fitText(ctx,album,tw,Math.min(w*.014,h*.032),Math.max(11,w*.009),600,family);
        ctx.fillText(album,tx,cy);
      }
    }else{
      const s=Math.min(w/440,h/780);
      const cardW=Math.min(w*.84,420*s);
      const cardH=Math.min(h*(album?.30:.25),280*s);
      const x=(w-cardW)/2,y=(h-cardH)/2,pad=18*s;
      roundRect(ctx,x,y,cardW,cardH,22*s);ctx.fill();

      const tx=x+pad,tw=cardW-pad*2;
      let cy=y+cardH*.20;
      ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#fff';
      const titlePx=fitText(ctx,title,tw,44*s,26*s,800,family);
      ctx.fillText(title,tx,cy);cy+=titlePx*1.12;

      if(artist){
        ctx.fillStyle='rgba(255,255,255,.78)';
        const artistPx=fitText(ctx,artist,tw,19*s,13*s,650,family);
        ctx.fillText(artist,tx,cy);cy+=artistPx*1.35;
      }
      if(album){
        ctx.fillStyle='rgba(255,255,255,.50)';
        const albumPx=fitText(ctx,album,tw,13*s,10*s,600,family);
        ctx.fillText(album,tx,cy);
      }
    }
    ctx.restore();
  };

  requestAnimationFrame(()=>window.aspect());
})();
