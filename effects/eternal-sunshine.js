/* KEFE Visualiser — Eternal Sunshine effect adapter.
 * The established Homemade Apple ink renderer remains in app.js so its font/cache
 * pipeline is preserved. This module provides the independent production entry point.
 */
(() => {
'use strict';
window.kefeEffects=window.kefeEffects||{};
window.kefeEffects.eternal=function(ctx,w,h,style,lines,time){
 if(typeof window.kefeBuiltInEternal==='function') return window.kefeBuiltInEternal(ctx,w,h,style,lines,time);
};
})();
