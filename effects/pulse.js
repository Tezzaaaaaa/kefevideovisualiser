/* KEFE Visualiser — Pulse effect entry point. The current production Pulse design is the perspective lyric conveyor. */
(() => {
'use strict';
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.pulse=function(ctx,w,h,style,lines,time){
 const starfield=window.kefeEffects.starfield;
 if(typeof starfield==='function') return starfield(ctx,w,h,style,lines,time);
};
})();
