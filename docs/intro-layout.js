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
    const album=window.selectedSong?.collectionName||'';
    const art=document.querySelector('#showArtworkIntro')?.checked?document.querySelector('#introArt'):null;
    const landscape=w/h>1.2;
    ctx.save();
    ctx.fillStyle='rgba(15,15,18,.78)';
    if(landscape){
      const cardW=w*.78,cardH=h*.54,x=(w-cardW)/2,y=(h-cardH)/2,r=Math.min(28,w*.025);
      roundRect(ctx,x,y,cardW,cardH,r);ctx.fill();
      const pad=cardH*.09,artSize=Math.min(cardH-pad*2,cardW*.34),ax=x+pad,ay=y+(cardH-artSize)/2;
      if(art&&art.complete&&art.naturalWidth){ctx.save();roundRect(ctx,ax,ay,artSize,artSize,Math.min(22,artSize*.08));ctx.clip();ctx.drawImage(art,ax,ay,artSize,artSize);ctx.restore();}
      const tx=ax+artSize+pad,tw=x+cardW-pad-tx,ty=y+cardH*.29;
      ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#fff';ctx.font=`800 ${Math.round(Math.min(w*.042,h*.09))}px -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif`;wrapText(ctx,title,tx,ty,tw,Math.min(w*.048,h*.1),2);
      ctx.fillStyle='rgba(255,255,255,.82)';ctx.font=`650 ${Math.round(Math.min(w*.019,h*.043))}px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif`;if(artist)ctx.fillText(artist,tx,y+cardH*.62);
      ctx.fillStyle='rgba(255,255,255,.52)';ctx.font=`600 ${Math.round(Math.min(w*.015,h*.034))}px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif`;if(album)ctx.fillText(album,tx,y+cardH*.72);
    }else{
      const s=Math.min(w/440,h/780),cardW=Math.min(w*.84,420*s),x=(w-cardW)/2,y=h*.14,cardH=Math.min(h*.68,610*s);
      roundRect(ctx,x,y,cardW,cardH,24*s);ctx.fill();
      let cy=y+18*s;if(art&&art.complete&&art.naturalWidth){const a=Math.min(cardW-36*s,360*s);ctx.save();roundRect(ctx,x+(cardW-a)/2,cy,a,a,18*s);ctx.clip();ctx.drawImage(art,x+(cardW-a)/2,cy,a,a);ctx.restore();cy+=a+20*s;}
      ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#fff';ctx.font=`800 ${Math.round(40*s)}px -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif`;wrapText(ctx,title,x+18*s,cy,cardW-36*s,42*s,2);cy+=90*s;
      ctx.fillStyle='rgba(255,255,255,.76)';ctx.font=`650 ${Math.round(17*s)}px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif`;if(artist){ctx.fillText(artist,x+18*s,cy);cy+=26*s;}
      ctx.fillStyle='rgba(255,255,255,.48)';ctx.font=`600 ${Math.round(12*s)}px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif`;if(album)ctx.fillText(album,x+18*s,cy);
    }
    ctx.restore();
  };
  requestAnimationFrame(()=>window.aspect());
})();
