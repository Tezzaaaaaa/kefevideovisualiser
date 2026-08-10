'use strict';
(()=>{
  if(typeof window.linaCaseText!=='function'||typeof canvasLine!=='function')return;
  const baseCanvasLine=canvasLine;
  canvasLine=function(ctx,line,ms,w,h,y,scale,alpha,focus=1,role){
    if(!line)return baseCanvasLine(ctx,line,ms,w,h,y,scale,alpha,focus,role);
    const rendered={...line,text:window.linaCaseText(line.text)};
    if(Array.isArray(line.words))rendered.words=line.words.map(word=>({...word,text:window.linaCaseText(word.text)}));
    return baseCanvasLine(ctx,rendered,ms,w,h,y,scale,alpha,focus,role);
  };
  window.invalidateLinaMotion?.(true);
})();
