import {state,ASPECTS} from './state.js';
import {parseLyrics} from './parser.js';
import {render} from './renderer.js';
import {exportVideo,downloadBlob} from './exporter.js';

const $=s=>document.querySelector(s);
const canvas=$('#stageCanvas'),ctx=canvas.getContext('2d'),audio=$('#audioEl');
const media={image:null,video:null};
let audioURL='',backgroundURL='',exportJob=null;
const fmt=t=>`${Math.floor((t||0)/60)}:${String(Math.floor((t||0)%60)).padStart(2,'0')}`;
function toast(message,error=false){const el=$('#toast');el.textContent=message;el.classList.toggle('error',error);el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3500)}
function readiness(){const ready=!!state.audio.file&&state.lyrics.lines.length>0&&(media.image||media.video);$('#readyStatus').textContent=ready?'Ready to export':'Add audio, lyrics and background';$('#exportBtn').disabled=$('#exportBottom').disabled=!ready}
function songFromFilename(name){const base=name.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').trim();const parts=base.split(/\s+-\s+/);return parts.length>1?{artist:parts[0].trim(),track:parts.slice(1).join(' - ').trim()}:{artist:'',track:base}}

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
  if(backgroundURL)URL.revokeObjectURL(backgroundURL);backgroundURL=URL.createObjectURL(file);
  media.image=null;media.video=null;
  if(file.type.startsWith('video/')){const video=document.createElement('video');video.src=backgroundURL;video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.addEventListener('loadeddata',()=>{media.video=video;state.background.type='video';video.play().catch(()=>{});readiness()},{once:true})}
  else{const image=new Image();image.onload=()=>{media.image=image;state.background.type='image';readiness()};image.src=backgroundURL}
  $('#backgroundStatus').textContent=file.name;
});

$('#effects').addEventListener('click',event=>{const button=event.target.closest('[data-effect]');if(!button)return;state.style.effect=button.dataset.effect;document.querySelectorAll('[data-effect]').forEach(item=>item.classList.toggle('active',item===button))});
$('#aspects').addEventListener('click',event=>{const button=event.target.closest('[data-aspect]');if(!button)return;state.canvas.aspect=button.dataset.aspect;const size=ASPECTS[state.canvas.aspect];canvas.width=size.w;canvas.height=size.h;document.querySelectorAll('[data-aspect]').forEach(item=>item.classList.toggle('active',item===button))});
$('#playBtn').addEventListener('click',()=>audio.paused?audio.play():audio.pause());
audio.addEventListener('play',()=>$('#playBtn').textContent='❚❚');audio.addEventListener('pause',()=>$('#playBtn').textContent='▶');
$('#seek').addEventListener('input',event=>audio.currentTime=Number(event.target.value));

async function startExport(){
  if(exportJob)return;if($('#exportBtn').disabled)return;
  audio.pause();$('#exportOverlay').classList.remove('hidden');$('#exportPct').textContent='0%';$('#exportProgress').value=0;
  try{exportJob=await exportVideo({canvas,audioEl:audio,fps:30,onProgress:p=>{$('#exportPct').textContent=`${Math.round(p*100)}%`;$('#exportProgress').value=p*100},onFinalizing:()=>$('#exportStatus').textContent='Finalising video…',onDone:(blob,format)=>{exportJob=null;$('#exportOverlay').classList.add('hidden');downloadBlob(blob,`${(state.project.title||'LINA lyric video').replace(/[^a-z0-9 _-]/gi,'')}.${format.extension}`);toast('Video exported')},onError:error=>{exportJob=null;$('#exportOverlay').classList.add('hidden');toast(`Export failed: ${error.message}`,true)},onCancel:()=>{exportJob=null;$('#exportOverlay').classList.add('hidden');toast('Export cancelled')}})}catch(error){exportJob=null;$('#exportOverlay').classList.add('hidden');toast(`Export failed: ${error.message}`,true)}
}
$('#exportBtn').addEventListener('click',startExport);$('#exportBottom').addEventListener('click',startExport);$('#cancelExport').addEventListener('click',()=>exportJob?.cancel());

function tick(){state.playback.currentTime=audio.currentTime||0;$('#seek').value=state.playback.currentTime;$('#clock').textContent=`${fmt(state.playback.currentTime)} / ${fmt(audio.duration)}`;if(media.video&&Number.isFinite(media.video.duration)&&Math.abs(media.video.currentTime-state.playback.currentTime%media.video.duration)>.25)media.video.currentTime=state.playback.currentTime%media.video.duration;render(ctx,canvas.width,canvas.height,state,media);requestAnimationFrame(tick)}
state.canvas.aspect='9:16';state.style.effect='apple';state.style.fontSize=76;state.style.align='center';state.style.textColor='#fff';state.style.accentColor='#fff';state.background.dim=.35;readiness();requestAnimationFrame(tick);
