// LINA — full-song preview transport with compact lyric editing controls.
(function(){
'use strict';
if(window.__LINA_PREVIEW_TRANSPORT__)return;window.__LINA_PREVIEW_TRANSPORT__=true;
const q=s=>document.querySelector(s),audio=q('#audio'),scrubber=q('#scrubber'),play=q('#playBtn'),oldClock=q('#clock');
if(!audio||!scrubber||!play)return;

function fmt(ms){ms=Math.max(0,Math.round(Number(ms)||0));const totalSeconds=Math.floor(ms/1000),minutes=Math.floor(totalSeconds/60),seconds=totalSeconds%60;return `${minutes}:${String(seconds).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`}
function safeRender(){try{if(typeof renderAt==='function')renderAt(audio.currentTime*1000)}catch{}}
function currentLyricIndex(){try{return typeof currentIndex==='function'?currentIndex(audio.currentTime*1000):-1}catch{return -1}}
function lineStart(i){try{return Math.max(0,shiftedStart(doc.lines[i]))}catch{return 0}}
function seekMs(ms){if(!Number.isFinite(audio.duration))return;audio.currentTime=Math.max(0,Math.min(audio.duration,ms/1000));safeRender();updateTime()}

const transport=q('.transport');
transport.classList.add('lina-preview-transport');
transport.innerHTML=`
  <div class="lina-transport-buttons" aria-label="Preview playback controls">
    <button type="button" id="previewPlay" aria-label="Play or pause">▶</button>
    <button type="button" id="previewStop" aria-label="Stop">■</button>
  </div>
  <div class="lina-timebar">
    <input id="previewScrubber" type="range" min="0" max="1" step="0.01" value="0" aria-label="Preview timeline">
    <div class="lina-time-stamps"><span id="previewCurrent">0:00.000</span><span id="previewRemaining">−0:00.000</span><span id="previewDuration">0:00.000</span></div>
  </div>
  <div class="lina-lyric-mini-tools" aria-label="Lyric timing controls">
    <button type="button" id="prevLyric" title="Previous lyric line">‹ Line</button>
    <button type="button" id="editCurrentLyric" title="Edit current lyric line">Edit</button>
    <button type="button" id="syncCurrentLyric" title="Set current lyric to playback time">Sync</button>
    <button type="button" id="nextLyric" title="Next lyric line">Line ›</button>
  </div>`;

const ui={play:q('#previewPlay'),stop:q('#previewStop'),range:q('#previewScrubber'),current:q('#previewCurrent'),remaining:q('#previewRemaining'),duration:q('#previewDuration'),prev:q('#prevLyric'),edit:q('#editCurrentLyric'),sync:q('#syncCurrentLyric'),next:q('#nextLyric')};
if(oldClock)oldClock.hidden=true;if(play)play.hidden=true;if(scrubber)scrubber.hidden=true;

function syncRangeToAudio(){if(Number.isFinite(audio.duration)&&audio.duration>0){ui.range.max=audio.duration;ui.range.value=Math.min(audio.currentTime,audio.duration)}}
function updateTime(){const duration=Number.isFinite(audio.duration)?audio.duration:0,current=Math.min(audio.currentTime||0,duration||Infinity),remaining=Math.max(0,duration-current);ui.current.textContent=fmt(current*1000);ui.duration.textContent=fmt(duration*1000);ui.remaining.textContent=`−${fmt(remaining*1000)}`;ui.play.textContent=audio.paused?'▶':'❚❚';syncRangeToAudio()}
function forceFullSongRange(){if(Number.isFinite(audio.duration)&&audio.duration>0){scrubber.max=audio.duration;ui.range.max=audio.duration}}

ui.play.onclick=()=>audio.paused?audio.play():audio.pause();
ui.stop.onclick=()=>{audio.pause();audio.currentTime=0;safeRender();updateTime()};
ui.range.oninput=e=>{audio.currentTime=Math.max(0,+e.target.value||0);safeRender();updateTime()};
ui.prev.onclick=()=>{if(!Array.isArray(doc?.lines)||!doc.lines.length)return;let i=currentLyricIndex();if(i<0)i=0;else if(audio.currentTime*1000-lineStart(i)<650)i=Math.max(0,i-1);seekMs(lineStart(i))};
ui.next.onclick=()=>{if(!Array.isArray(doc?.lines)||!doc.lines.length)return;let i=currentLyricIndex();i=Math.min(doc.lines.length-1,Math.max(0,i+1));seekMs(lineStart(i))};
ui.edit.onclick=()=>{if(!Array.isArray(doc?.lines)||!doc.lines.length)return;let i=currentLyricIndex();if(i<0)i=0;document.querySelector(`.timeline .line[data-line="${i}"]`)?.click()};
ui.sync.onclick=()=>{if(!Array.isArray(doc?.lines)||!doc.lines.length)return;let i=currentLyricIndex();if(i<0)i=0;selected=i;const line=doc.lines[i];line.start_ms=Math.max(0,Math.round(audio.currentTime*1000)-offset);if(i>0&&line.start_ms<doc.lines[i-1].start_ms)line.start_ms=doc.lines[i-1].start_ms+10;try{renderTimeline();renderAt(audio.currentTime*1000);window.__LV_GUARD__?.checkpoint?.('preview-sync-line')}catch{} };

audio.addEventListener('loadedmetadata',()=>{forceFullSongRange();updateTime()});
audio.addEventListener('durationchange',()=>{forceFullSongRange();updateTime()});
audio.addEventListener('timeupdate',updateTime);audio.addEventListener('play',updateTime);audio.addEventListener('pause',updateTime);audio.addEventListener('ended',updateTime);audio.addEventListener('seeked',updateTime);
document.addEventListener('click',e=>{if(e.target.closest('[data-duration]'))setTimeout(forceFullSongRange,0)});
setInterval(()=>{if(!audio.paused)updateTime()},100);
updateTime();
})();
