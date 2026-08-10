'use strict';
(()=>{
  const originalAspect=window.aspect;
  window.aspect=function(){
    if(originalAspect)originalAspect();
    const r=document.querySelector('#aspect')?.value||'16:9';
    const story=document.querySelector('#story');
    if(story)story.dataset.aspect=r;
  };
  window.drawIntro=function(ctx,w,h){
    const title=document.querySelector('#titleInput')?.value.trim()||'';
    if(!title)return;
    const artist=document.querySelector('#artistInput')?.value.trim()||'';
    const album=typeof selectedSong!=='undefined'&&selectedSong?.collectionName?selectedSong.collectionName:'';
    const art=document.querySelector('#showArtworkIntro')?.checked?document.querySelector('#introArt'):null;
    const hasArt=!!(art&&art.complete&&art.naturalWidth);
    const landscape=w/h>1.2;
    ctx.save();
    ctx.fillStyle='rgba(15,15,18,.78)';
    if(landscape){
      const cardW=w*.78,cardH=h*.54,x=(w-cardW)/2,y=(h-cardH)/2,r=Math.min(28,w*.025),pad=cardH*.09;
      roundRect(ctx,x,y,cardW,cardH,r);ctx.fill();
      let tx=x+pad,tw=cardW-pad*2,ty=y+cardH*.27;
      if(hasArt){
        const artSize=Math.min(cardH-pad*2,cardW*.34),ax=x+pad,ay=y+(cardH-artSize)/2;
        ctx.save();roundRect(ctx,ax,ay,artSize,artSize,Math.min(22,artSize*.08));ctx.clip();ctx.drawImage(art,ax,ay,artSize,artSize);ctx.restore();
        tx=ax+artSize+pad;tw=x+cardW-pad-tx;ty=y+cardH*.29;
      }
      ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#fff';
      const titlePx=Math.round(hasArt?Math.min(w*.042,h*.09):Math.min(w*.052,h*.11));
      ctx.font=`800 ${titlePx}px -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif`;wrapText(ctx,title,tx,ty,tw,titlePx*1.04,2);
      ctx.fillStyle='rgba(255,255,255,.82)';ctx.font=`650 ${Math.round(Math.min(w*.019,h*.043))}px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif`;if(artist)ctx.fillText(artist,tx,y+cardH*.62);
      ctx.fillStyle='rgba(255,255,255,.52)';ctx.font=`600 ${Math.round(Math.min(w*.015,h*.034))}px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif`;if(album)ctx.fillText(album,tx,y+cardH*.72);
    }else{
      const s=Math.min(w/440,h/780),cardW=Math.min(w*.84,420*s),cardH=hasArt?Math.min(h*.68,610*s):Math.min(h*.38,330*s),x=(w-cardW)/2,y=hasArt?h*.14:(h-cardH)/2;
      roundRect(ctx,x,y,cardW,cardH,24*s);ctx.fill();
      let cy=y+(hasArt?18*s:cardH*.22);
      if(hasArt){
        const a=Math.min(cardW-36*s,360*s);ctx.save();roundRect(ctx,x+(cardW-a)/2,cy,a,a,18*s);ctx.clip();ctx.drawImage(art,x+(cardW-a)/2,cy,a,a);ctx.restore();cy+=a+20*s;
      }
      ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#fff';
      const titlePx=Math.round((hasArt?40:46)*s);ctx.font=`800 ${titlePx}px -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif`;wrapText(ctx,title,x+18*s,cy,cardW-36*s,titlePx*1.04,2);cy+=hasArt?90*s:Math.max(72*s,titlePx*1.75);
      ctx.fillStyle='rgba(255,255,255,.76)';ctx.font=`650 ${Math.round(17*s)}px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif`;if(artist){ctx.fillText(artist,x+18*s,cy);cy+=26*s;}
      ctx.fillStyle='rgba(255,255,255,.48)';ctx.font=`600 ${Math.round(12*s)}px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif`;if(album)ctx.fillText(album,x+18*s,cy);
    }
    ctx.restore();
  };
  requestAnimationFrame(()=>window.aspect());
})();
