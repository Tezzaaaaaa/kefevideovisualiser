import {state,ASPECTS} from './state.js';
import {parseLyrics} from './parser.js';
import {render} from './renderer.js';
import {exportVideo,downloadBlob} from './exporter.js';

const $=s=>document.querySelector(s);
const canvas=$('#stageCanvas'),ctx=canvas.getContext('2d'),audio=$('#audioEl'),backgroundVideo=$('#backgroundVideo');
const media={image:null,video:null};
let audioURL='',backgroundURL='',exportJob=null,backgroundLoadId=0;
const fmt=t=>`${Math.floor((t||0)/60)}:${String(Math.floor((t||0)%60)).padStart(2,'0')}`;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function toast(message,error=false){const el=$('#toast');el.textContent=message;el.classList.toggle('error',error);el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3500)}
function readiness(){const ready=!!state.audio.file&&state.lyrics.lines.length>0&&(media.image||media.video);$('#readyStatus').textContent=ready?'Ready to export':'Add audio, lyrics and background';$('#exportBtn').disabled=$('#exportBottom').disabled=!ready}
function songFromFilename(name){const base=name.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').trim();const parts=base.split(/\s+-\s+/);return parts.length>1?{artist:parts[0].trim(),track:parts.slice(1).join(' - ').trim()}:{artist:'',track:base}}
function activeEffectStyle(){const effect=state.style.effect;if(!state.style.effects[effect])state.style.effects[effect]={fontSize:76,align:'center'};return state.style.effects[effect]}
function syncEffectControls(){const profile=activeEffectStyle();$('#lyricSize').value=profile.fontSize;$('#lyricSizeValue').textContent=String(profile.fontSize);document.querySelectorAll('[data-align]').forEach(button=>button.classList.toggle('active',button.dataset.align===profile.align))}
function wrappedVideoTime(time,duration){if(!Number.isFinite(duration)||duration<=0)return 0;return ((Number(time)||0)%duration+duration)%duration}
function circularDrift(current,target,duration){let drift=target-current;if(duration>0){if(drift>duration/2)drift-=duration;else if(drift<-duration/2)drift+=duration}return drift}
function syncBackgroundClock(targetTime,shouldRun){
  const video=media.video;
  if(!video||video.readyState<2||!Number.isFinite(video.duration)||video.duration<=0)return;
  const target=wrappedVideoTime(targetTime,video.duration);
  const drift=circularDrift(video.currentTime,target,video.duration);
  const distance=Math.abs(drift);
  if(shouldRun){
    if(distance>.10&&!video.seeking)video.currentTime=target;
    video.playbackRate=distance<=.10?clamp(1+drift*.30,.97,1.03):1;
    if(video.paused)video.play().catch(()=>{});
  }else{
    video.playbackRate=1;
    if(!video.paused)video.pause();
    if(distance>.018&&!video.seeking)video.currentTime=target;
  }
}

async function findLyrics(){
  if(!state.audio.file)return;
  const {artist,track}=songFromFilename(state.audio.file.name);
  $('#lyricsStatus').textContent='Finding synced lyrics…';$('#findLyrics').disabled=true;
  try{
    const params=new URLSearchParams({track_name:track});if(artist)params.set('artist_name',artist);
    const response=await fetch(`https://lrclib.net/api/search?${params}`);
    if(!response.ok)throw new Error('Lyrics service unavailable');
    const results=await response.json();
    const match=results.find(item=>item.syncedLyrics)||results[0];
    if(!match?.syncedLyrics)throw new Error('No synced lyrics found');
    const parsed=parseLyrics(match.syncedLyrics);
    state.lyrics.raw=match.syncedLyrics;state.lyrics.format=parsed.format;state.lyrics.lines=parsed.lines;
    state.project.title=match.trackName||track;state.project.artist=match.artistName||artist;
    const firstLyricTime=parsed.lines.find(line=>Number.isFinite(line.time))?.time;
    if(audio.paused&&Number.isFinite(firstLyricTime))audio.currentTime=Math.min(audio.duration||firstLyricTime,firstLyricTime+.05);
    $('#lyricsStatus').textContent=`${parsed.lines.length} synced lines found`;
    toast('Synced lyrics loaded');readiness();
  }catch(error){$('#lyricsStatus').textContent='Could not find synced lyrics automatically';toast(error.message,true)}
  finally{$('#findLyrics').disabled=false}
}

$('#audioInput').addEventListener('change',event=>{
  const file=event.target.files[0];if(!file)return;
  if(audioURL)URL.revokeObjectURL(audioURL);audioURL=URL.createObjectURL(file);
  state.audio.file=file;state.audio.url=audioURL;state.lyrics.lines=[];audio.src=audioURL;audio.load();
  $('#audioStatus').textContent=file.name;$('#lyricsStatus').textContent='Waiting for audio';readiness();
});
audio.addEventListener('loadedmetadata',()=>{state.audio.duration=audio.duration;$('#seek').max=audio.duration;$('#lyricsStatus').textContent='Ready to find lyrics';$('#findLyrics').disabled=false;void findLyrics()});
$('#findLyrics').addEventListener('click',findLyrics);

$('#backgroundInput').addEventListener('change',event=>{
  const file=event.target.files[0];if(!file)return;
  const loadId=++backgroundLoadId;
  if(backgroundURL)URL.revokeObjectURL(backgroundURL);backgroundURL=URL.createObjectURL(file);
  media.image=null;media.video=null;
  readiness();$('#backgroundStatus').textContent=`Loading ${file.name}…`;
  if(file.type.startsWith('video/')){
    backgroundVideo.pause();backgroundVideo.playbackRate=1;
    backgroundVideo.onloadedmetadata=()=>{if(loadId===backgroundLoadId&&backgroundVideo.duration>0)backgroundVideo.currentTime=wrappedVideoTime(audio.currentTime,backgroundVideo.duration)};
    backgroundVideo.onloadeddata=()=>{if(loadId!==backgroundLoadId)return;media.video=backgroundVideo;state.background.type='video';$('#backgroundStatus').textContent=file.name;syncBackgroundClock(audio.currentTime,!audio.paused);readiness()};
    backgroundVideo.onerror=()=>{if(loadId!==backgroundLoadId)return;$('#backgroundStatus').textContent='Video could not be loaded';toast('This background video format is not supported on this device',true);readiness()};
    backgroundVideo.src=backgroundURL;backgroundVideo.load();
  }else{
    backgroundVideo.pause();backgroundVideo.removeAttribute('src');backgroundVideo.load();
    const image=new Image();
    image.onload=()=>{if(loadId!==backgroundLoadId)return;media.image=image;state.background.type='image';$('#backgroundStatus').textContent=file.name;readiness()};
    image.onerror=()=>{if(loadId!==backgroundLoadId)return;$('#backgroundStatus').textContent='Image could not be loaded';toast('This background image could not be loaded',true);readiness()};
    image.src=backgroundURL;
  }
});

$('#effects').addEventListener('click',event=>{const button=event.target.closest('[data-effect]');if(!button)return;state.style.effect=button.dataset.effect;document.querySelectorAll('[data-effect]').forEach(item=>item.classList.toggle('active',item===button));syncEffectControls()});
$('#alignment').addEventListener('click',event=>{const button=event.target.closest('[data-align]');if(!button)return;activeEffectStyle().align=button.dataset.align;syncEffectControls()});
$('#lyricSize').addEventListener('input',event=>{const value=Number(event.target.value);activeEffectStyle().fontSize=value;$('#lyricSizeValue').textContent=String(value)});
$('#aspects').addEventListener('click',event=>{const button=event.target.closest('[data-aspect]');if(!button)return;state.canvas.aspect=button.dataset.aspect;const size=ASPECTS[state.canvas.aspect];canvas.width=size.w;canvas.height=size.h;document.querySelectorAll('[data-aspect]').forEach(item=>item.classList.toggle('active',item===button))});
$('#playBtn').addEventListener('click',()=>audio.paused?audio.play():audio.pause());
audio.addEventListener('play',()=>$('#playBtn').textContent='❚❚');audio.addEventListener('pause',()=>$('#playBtn').textContent='▶');
$('#seek').addEventListener('input',event=>{audio.currentTime=Number(event.target.value);syncBackgroundClock(audio.currentTime,false)});

async function startExport(){
  if(exportJob)return;if($('#exportBtn').disabled)return;
  audio.pause();syncBackgroundClock(audio.currentTime,false);$('#exportOverlay').classList.remove('hidden');$('#exportPct').textContent='0%';$('#exportProgress').value=0;
  try{exportJob=await exportVideo({canvas,audioEl:audio,fps:30,onProgress:p=>{$('#exportPct').textContent=`${Math.round(p*100)}%`;$('#exportProgress').value=p*100},onFinalizing:()=>$('#exportStatus').textContent='Finalising video…',onDone:(blob,format)=>{exportJob=null;syncBackgroundClock(audio.currentTime,false);$('#exportOverlay').classList.add('hidden');downloadBlob(blob,`${(state.project.title||'LINA lyric video').replace(/[^a-z0-9 _-]/gi,'')}.${format.extension}`);toast('Video exported')},onError:error=>{exportJob=null;syncBackgroundClock(audio.currentTime,false);$('#exportOverlay').classList.add('hidden');toast(`Export failed: ${error.message}`,true)},onCancel:()=>{exportJob=null;syncBackgroundClock(audio.currentTime,false);$('#exportOverlay').classList.add('hidden');toast('Export cancelled')}})}catch(error){exportJob=null;syncBackgroundClock(audio.currentTime,false);$('#exportOverlay').classList.add('hidden');toast(`Export failed: ${error.message}`,true)}
}
$('#exportBtn').addEventListener('click',startExport);$('#exportBottom').addEventListener('click',startExport);$('#cancelExport').addEventListener('click',()=>exportJob?.cancel());

function tick(){
  state.playback.currentTime=audio.currentTime||0;
  $('#seek').value=state.playback.currentTime;
  $('#clock').textContent=`${fmt(state.playback.currentTime)} / ${fmt(audio.duration)}`;
  const exporting=exportJob?.phase==='recording'||exportJob?.phase==='finalizing';
  syncBackgroundClock(state.playback.currentTime,!audio.paused||exporting);
  render(ctx,canvas.width,canvas.height,state,media);
  requestAnimationFrame(tick);
}
state.canvas.aspect='9:16';state.style.effect='apple';state.style.textColor='#fff';state.style.accentColor='#fff';state.style.dimColor='rgba(255,255,255,.42)';state.background.dim=.35;syncEffectControls();readiness();requestAnimationFrame(tick);