// LINA — reliable local LRC/SRT/TXT importer. No backend required.
(function(){
'use strict';
const input=document.getElementById('lyricsFile');
if(!input)return;
if(input.dataset.linaImporter==='1')return;
input.dataset.linaImporter='1';
input.accept='.lrc,.srt,.txt,.vtt,text/plain,application/x-subrip,text/vtt,application/octet-stream';

function say(msg){
  try{if(typeof notify==='function')return notify(msg)}catch{}
  const t=document.getElementById('toast');
  if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);return}
  console.log(msg);
}
function readFile(file){
  if(file?.text)return file.text().catch(()=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('File read failed'));r.readAsText(file)}));
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('File read failed'));r.readAsText(file)});
}
function msFromStamp(min,sec){return Math.round((Number(min)*60+Number(sec))*1000)}
function parseEnhancedWords(body,lineStart,lineEnd,globalOffset=0){
  const out=[];const rx=/<(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)>([^<]*)/g;let m;
  while((m=rx.exec(body))){
    const text=(m[3]||'').trim();if(!text)continue;
    const raw=msFromStamp(m[1],String(m[2]).replace(':','.'))+globalOffset;
    out.push({text,start_ms:Math.max(0,raw)});
  }
  out.sort((a,b)=>a.start_ms-b.start_ms);
  for(let i=0;i<out.length;i++){
    const next=out[i+1]?.start_ms??lineEnd??(lineStart+2600);
    out[i].duration_ms=Math.max(40,next-out[i].start_ms);
  }
  return out;
}
function parseLRC(text){
  const rows=[];let globalOffset=0;
  const source=String(text||'').replace(/^\uFEFF/,'').replace(/\r/g,'');
  for(const raw of source.split('\n')){
    const off=raw.match(/^\s*\[offset\s*:\s*([+-]?\d+)\s*\]\s*$/i);if(off){globalOffset=Number(off[1])||0;continue}
    if(/^\s*\[(ar|ti|al|by|re|ve|length|id):/i.test(raw))continue;
    const stamps=[...raw.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)];if(!stamps.length)continue;
    const body=raw.replace(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g,'').trim();
    const plain=body.replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g,'').replace(/\s+/g,' ').trim();if(!plain)continue;
    for(const s of stamps){rows.push({text:plain,start_ms:Math.max(0,msFromStamp(s[1],String(s[2]).replace(':','.'))+globalOffset),duration_ms:2600,_body:body,_offset:globalOffset})}
  }
  rows.sort((a,b)=>a.start_ms-b.start_ms);
  for(let i=0;i<rows.length;i++){
    const end=rows[i+1]?.start_ms??rows[i].start_ms+2600;
    rows[i].duration_ms=Math.max(80,end-rows[i].start_ms);
    const words=parseEnhancedWords(rows[i]._body,rows[i].start_ms,end,rows[i]._offset||0);delete rows[i]._body;delete rows[i]._offset;
    if(words.length)rows[i].words=words;
  }
  if(!rows.length)throw new Error('No timestamped LRC lines were found');
  return {format:rows.some(x=>x.words?.length)?'enhanced_lrc':'lrc',lines:rows};
}
function srtMs(v){
  const m=String(v).trim().match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/);if(!m)return null;
  return ((Number(m[1]||0)*3600+Number(m[2])*60+Number(m[3]))*1000)+Number(String(m[4]).padEnd(3,'0').slice(0,3));
}
function parseSRT(text){
  const src=String(text||'').replace(/^\uFEFF/,'').replace(/\r/g,'').replace(/^WEBVTT[^\n]*\n+/i,'');
  const blocks=src.split(/\n\s*\n/);const lines=[];
  for(const block of blocks){
    const a=block.split('\n');const ti=a.findIndex(x=>x.includes('-->'));if(ti<0)continue;
    const pair=a[ti].split('-->');const start=srtMs(pair[0]),end=srtMs(pair[1]);
    const copy=a.slice(ti+1).join(' ').replace(/<[^>]+>/g,'').replace(/\{\\[^}]+\}/g,'').trim();
    if(start==null||end==null||!copy)continue;lines.push({text:copy,start_ms:start,duration_ms:Math.max(80,end-start)});
  }
  if(!lines.length)throw new Error('No readable SRT/VTT cues were found');
  return {format:'srt',lines};
}
function parseTXT(text){
  const rows=String(text||'').replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  if(!rows.length)throw new Error('The lyric file is empty');
  return {format:'txt',lines:rows.map((text,i)=>({text,start_ms:i*2600,duration_ms:2600}))};
}
function parseAny(name,text){
  const ext=(String(name).split('.').pop()||'').toLowerCase();
  if(ext==='lrc')return parseLRC(text);
  if(ext==='srt'||ext==='vtt')return parseSRT(text);
  if(ext==='txt')return parseTXT(text);
  if(/\[\d{1,3}:\d{1,2}(?:[.:]\d+)?\]/.test(text))return parseLRC(text);
  if(/-->/.test(text))return parseSRT(text);
  return parseTXT(text);
}
function commitLyrics(data,file){
  if(typeof clone!=='function'||typeof renderTimeline!=='function'||typeof renderAt!=='function')throw new Error('Editor is not ready yet. Reload the page and try again.');
  original=clone(data);doc=clone(data);offset=0;selected=0;
  const off=document.getElementById('offset');if(off)off.value=0;
  const ol=document.getElementById('offsetLabel');if(ol)ol.textContent='0 ms';
  const badge=document.getElementById('formatBadge');if(badge)badge.textContent=data.format.replace('_',' ').toUpperCase();
  renderTimeline();renderAt((audio?.currentTime||0)*1000);
  window.__LV_GUARD__?.checkpoint?.('lyrics-file-opened');
  document.dispatchEvent(new CustomEvent('lina:lyrics-imported',{detail:{name:file.name,format:data.format,count:data.lines.length}}));
}
async function handle(file){
  if(!file)return;
  const before={doc:typeof clone==='function'?clone(doc):null,original:typeof clone==='function'?clone(original):null,offset:typeof window.offset==='number'?offset:0};
  try{
    const text=await readFile(file);if(!text.trim())throw new Error('The selected file is empty');
    const data=parseAny(file.name,text);commitLyrics(data,file);say(`${file.name} opened — ${data.lines.length} lyric lines loaded`);
  }catch(err){
    console.error('LINA lyric import failed',err);
    try{if(before.doc){doc=before.doc;original=before.original;offset=before.offset;renderTimeline();renderAt((audio?.currentTime||0)*1000)}}catch{}
    window.__LV_GUARD__?.checkpoint?.('lyrics-import-failed');say(`Could not open lyric file: ${err.message||err}`);
  }
}
input.addEventListener('click',()=>{input.value=''});
input.addEventListener('change',e=>{e.stopImmediatePropagation();handle(e.target.files?.[0])},{capture:true});
window.LINA_IMPORT_LYRICS=file=>handle(file);
})();
