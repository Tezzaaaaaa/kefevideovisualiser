'use strict';
(()=>{
  const ua=navigator.userAgent||'';
  const isWebKit=/AppleWebKit/i.test(ua)&&!/Chrom(?:e|ium)|CriOS|Edg|Firefox/i.test(ua);
  if(!isWebKit||typeof window.exportVideo!=='function')return;
  const base=window.exportVideo;
  window.exportVideo=exportVideo=async function(){
    const canvas=document.getElementById('canvas');
    if(!canvas)return base();
    const wasHidden=canvas.classList.contains('hidden');
    const oldStyle=canvas.getAttribute('style');
    canvas.classList.remove('hidden');
    canvas.style.position='fixed';
    canvas.style.left='-10000px';
    canvas.style.top='0';
    canvas.style.width='2px';
    canvas.style.height='2px';
    canvas.style.pointerEvents='none';
    canvas.style.zIndex='-1';
    canvas.style.visibility='visible';
    canvas.style.display='block';
    // Force WebKit to attach the canvas to its rendering pipeline before captureStream().
    void canvas.offsetWidth;
    try{return await base()}
    finally{
      if(oldStyle===null)canvas.removeAttribute('style');else canvas.setAttribute('style',oldStyle);
      if(wasHidden)canvas.classList.add('hidden');
    }
  };
})();
