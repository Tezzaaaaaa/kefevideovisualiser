'use strict';
(()=>{
  if(typeof window.linaSafariWasmExport!=='function')return;
  const base=window.linaSafariWasmExport;
  const run=()=>{
    window.audioFile=audioFile;
    window.lines=lines;
    window.bgMedia=bgMedia;
    window.MAX=MAX;
    return base();
  };
  window.linaSafariWasmExport=run;
  window.exportVideo=exportVideo=run;
})();
