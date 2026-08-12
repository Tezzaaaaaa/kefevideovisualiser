'use strict';
(()=>{
  class SafariWasmExportBridge{
    constructor(canvas){this.canvas=canvas;this.isSafari=/AppleWebKit/i.test(navigator.userAgent)&&!/CriOS|Chrome|Chromium|Edg|Firefox/i.test(navigator.userAgent)}
    prepareCanvasForExport(){if(!this.isSafari)return;const ctx=this.canvas?.getContext?.('2d',{alpha:false});if(ctx){ctx.save();ctx.restore()}}
    generateFallbackFrame(){return new Promise((resolve,reject)=>{if(!this.canvas?.toBlob){reject(new Error('Canvas frame capture is unavailable.'));return}this.canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Safari could not capture the export frame.')),'image/png',.95)})}
  }
  window.SafariWasmExportBridge=SafariWasmExportBridge;
})();
