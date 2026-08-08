// LINA — adaptive Apple Music-style karaoke renderer.
(function(){
'use strict';
if(window.__LINA_ADAPTIVE_KARAOKE__)return;window.__LINA_ADAPTIVE_KARAOKE__=true;

// Remove any emphasis UI if an older build injected one. Emphasis stays automatic/listening-driven.
function removeEmphasisUI(){document.querySelectorAll('#emphasis,.emphasis-section,[data-emphasis],.emphasis-controls,[class*="emphasis-control"]').forEach(el=>el.remove())}
removeEmphasisUI();new MutationObserver(removeEmphasisUI).observe(document.documentElement,{childList:true,subtree:true});

const style=document.createElement('style');
style.textContent=`
.effect-karaoke .current-line.word-karaoke{display:block;line-height:var(--lina-line-height,1.03);text-wrap:balance;will-change:opacity,transform;transform:translate3d(0,var(--lina-line-y,0px),0) scale(var(--lina-line-scale,1));opacity:var(--lina-line-opacity,1);transition:opacity 180ms linear,transform 260ms cubic-bezier(.16,1,.3,1)}
.effect-karaoke .timed-word{display:inline-block;position:relative;background:linear-gradient(90deg,var(--accent) 0%,var(--accent) var(--word-progress,0%),rgba(255,255,255,.30) calc(var(--word-progress,0%) + .01%),rgba(255,255,255,.30) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;will-change:background-image,opacity,transform,filter;opacity:var(--word-opacity,.72);transform:translate3d(0,var(--word-y,0px),0) scale(var(--word-scale,1));filter:blur(var(--word-blur,0px));transition:opacity 90ms linear,transform 120ms linear,filter 120ms linear}
.effect-karaoke .timed-word.lina-active{opacity:1;filter:blur(0);}
.effect-karaoke .timed-word.lina-past{opacity:.96}
.effect-karaoke .timed-word.lina-future{opacity:.54}
.effect-karaoke .current-line:not(.word-karaoke){background:linear-gradient(90deg,var(--accent) 0%,var(--accent) var(--progress,0%),rgba(255,255,255,.30) calc(var(--progress,0%) + .01%),rgba(255,255,255,.30) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;will-change:background-image,opacity,transform}
@media(prefers-reduced-motion:reduce){.effect-karaoke .current-line.word-karaoke,.effect-karaoke .timed-word{transition:none!important}}
`;
document.head.appendChild(style);

if(typeof renderAt!=='function')return;
const fallbackRenderAt=renderAt;
let cache={lineIndex:-1,lineStart:-1,spans:[],progress:[],lastMs:null,lastWall:performance.now(),snapNext:false};
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
function adaptiveAlpha(dt,duration){
  // Faster syllables react quicker; longer held words glide more slowly.
  const d=Math.max(70,Math.min(1800,duration||500));
  const response=14+(650/d)*6;
  return 1-Math.exp(-Math.max(1,dt)/1000*response);
}
function resetClock({snap=true}={}){cache.lastMs=null;cache.lastWall=performance.now();cache.progress=[];cache.snapNext=!!snap}
function rebuildTimedLine(layer,line,i,{animate=true}={}){
  const container=document.createElement('div');container.className='current-line word-karaoke';
  const frag=document.createDocumentFragment();const spans=[];
  line.words.forEach((w,n)=>{if(n){frag.appendChild(document.createTextNode(' '))}const s=document.createElement('span');s.className='timed-word lina-future';s.textContent=displayText(w.text);s.dataset.word=String(n);s.style.setProperty('--word-progress','0%');frag.appendChild(s);spans.push(s)});
  container.appendChild(frag);layer.replaceChildren(container);
  cache.lineIndex=i;cache.lineStart=line.start_ms;cache.spans=spans;cache.progress=new Array(spans.length).fill(0);
  if(animate)container.animate([{opacity:.72,transform:'translate3d(0,7px,0) scale(.992)'},{opacity:1,transform:'translate3d(0,0,0) scale(1)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
}
function renderAdaptive(ms){
  if(effect!=='karaoke'||!doc?.lines?.length)return fallbackRenderAt(ms);
  const layer=document.getElementById('lyricsLayer');if(!layer)return fallbackRenderAt(ms);
  const i=currentIndex(ms),line=doc.lines[i],span=lineSpan(i);selected=i;
  document.querySelectorAll('.timeline .line').forEach((x,n)=>x.classList.toggle('active',n===i));
  const now=performance.now();const dt=Math.max(1,Math.min(80,now-cache.lastWall||16));cache.lastWall=now;
  const seekJump=cache.snapNext||cache.lastMs==null||Math.abs(ms-cache.lastMs)>260;cache.snapNext=false;cache.lastMs=ms;
  const adjusted=ms-offset;

  if(line.words?.length){
    if(cache.lineIndex!==i||cache.lineStart!==line.start_ms||cache.spans.length!==line.words.length)rebuildTimedLine(layer,line,i,{animate:!seekJump});
    for(let n=0;n<line.words.length;n++){
      const w=line.words[n];const start=w.start_ms;const end=start+Math.max(40,w.duration_ms||500);
      const raw=clamp((adjusted-start)/Math.max(1,end-start));
      // Near-linear centre with softened take-off/landing, closer to sung phrasing than a hard wipe.
      const eased=raw<.12?(.12*smooth(raw/.12)):raw>.88?.88+.12*smooth((raw-.88)/.12):raw;
      const a=seekJump?1:adaptiveAlpha(dt,end-start);
      const prev=cache.progress[n]??0;const p=prev+(eased-prev)*a;cache.progress[n]=p;
      const s=cache.spans[n];if(!s)continue;
      s.style.setProperty('--word-progress',`${(p*100).toFixed(3)}%`);
      const isPast=raw>=1,isActive=raw>0&&raw<1;
      s.classList.toggle('lina-past',isPast);s.classList.toggle('lina-active',isActive);s.classList.toggle('lina-future',!isPast&&!isActive);
      const energy=isActive?Math.sin(raw*Math.PI):0;
      s.style.setProperty('--word-opacity',isPast?'.96':isActive:String(.76+energy*.24):'.54');
      s.style.setProperty('--word-scale',String(1+energy*.006));
      s.style.setProperty('--word-y',`${(-energy*0.45).toFixed(3)}px`);
      s.style.setProperty('--word-blur',isActive?'0px':isPast?'0px':'.12px');
    }
    return;
  }
  // Line-timed fallback: smooth the whole line rather than snapping.
  const p=clamp((ms-shiftedStart(line))/Math.max(1,span));
  if(cache.lineIndex!==i){layer.innerHTML=`<div class="current-line">${esc(displayText(line.text))}</div>`;cache.lineIndex=i;cache.lineStart=line.start_ms;cache.progress=[seekJump?p:0]}
  const a=seekJump?1:adaptiveAlpha(dt,span);cache.progress[0]=(cache.progress[0]??0)+(p-(cache.progress[0]??0))*a;
  layer.querySelector('.current-line')?.style.setProperty('--progress',`${(cache.progress[0]*100).toFixed(3)}%`);
}
renderAt=renderAdaptive;

// Keep renderer exact after seeking, pausing/resuming, rate changes and returning from the background.
['seeking','seeked','ratechange','loadedmetadata','play','pause','ended'].forEach(ev=>audio?.addEventListener(ev,()=>resetClock({snap:true})));
document.addEventListener('visibilitychange',()=>resetClock({snap:true}));
})();
