// LINA — keep preview/export blank before the first cue and through explicit lyric gaps.
(function(){
'use strict';
if(window.__LINA_TIMING_GAP_FIX__)return;window.__LINA_TIMING_GAP_FIX__=true;

function activeIndex(ms){
  if(!Array.isArray(doc?.lines)||!doc.lines.length)return -1;
  let i=-1;
  for(let n=0;n<doc.lines.length;n++){
    if(shiftedStart(doc.lines[n])<=ms)i=n;else break;
  }
  if(i<0)return -1;
  const line=doc.lines[i],next=doc.lines[i+1],start=shiftedStart(line);
  const span=Math.max(100,Number(line.duration_ms)||((next?shiftedStart(next):start+2600)-start)||2600);
  const end=start+span;
  if(ms>=end&&(!next||ms<shiftedStart(next)))return -1;
  return i;
}

function clearPreview(){
  document.getElementById('lyricsLayer')?.replaceChildren();
  document.querySelectorAll('.timeline .line.active').forEach(x=>x.classList.remove('active'));
}

try{currentIndex=activeIndex}catch{}
try{window.currentIndex=activeIndex}catch{}

if(typeof renderAt==='function'){
  const priorRender=renderAt;
  renderAt=function(ms){if(activeIndex(ms)<0){clearPreview();return}return priorRender(ms)};
  try{window.renderAt=renderAt}catch{}
}

try{exportLineIndex=activeIndex}catch{}
try{window.exportLineIndex=activeIndex}catch{}

if(typeof drawExportLyrics==='function'){
  const priorDraw=drawExportLyrics;
  drawExportLyrics=function(ctx,ms,w,h){if(activeIndex(ms)<0)return;return priorDraw(ctx,ms,w,h)};
  try{window.drawExportLyrics=drawExportLyrics}catch{}
}
})();
