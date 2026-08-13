import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {parseLyrics} from '../docs/src/parser.js';

const rendererSource=readFileSync('docs/src/renderer.js','utf8');
const indexSource=readFileSync('docs/index.html','utf8');
const mainSource=readFileSync('docs/src/main.js','utf8');
const exporterSource=readFileSync('docs/src/exporter.js','utf8');
assert.match(rendererSource,/"Homemade Apple"/,'Eternal must use Homemade Apple');
assert.match(indexSource,/family=Homemade\+Apple/,'Homemade Apple must be loaded by the page');
assert.doesNotMatch(rendererSource,/Snell Roundhand|Segoe Script|Bradley Hand|Reenie Beanie/,'unapproved Eternal font fallbacks must be absent');
assert.match(rendererSource,/rowReveal\(/,'Eternal must use a continuous handwriting reveal');
assert.doesNotMatch(rendererSource,/fillText\(glyph/,'Eternal must not pop individual glyphs like a typewriter');
assert.match(mainSource,/fps\s*:\s*60/,'export must request 60fps');
assert.doesNotMatch(exporterSource,/audioEl\.currentTime\s*=\s*time/,'export must use one master clock');

const plain=parseLyrics('[00:00.00]one two three\n[00:01.00]four five six');
assert.equal(plain.lines[0].words,null,'plain LRC must not invent word timing');
const enhanced=parseLyrics('[00:00.00]<00:00.00>one <00:00.30>two <00:00.60>three\n[00:00.85]<00:00.85>four <00:01.15>five <00:01.45>six\n[00:01.65]<00:01.65>seven <00:01.95>eight <00:02.18>nine');
assert.equal(enhanced.lines[0].words.length,3);

function wav(seconds=2.4,rate=44100){
  const count=Math.floor(seconds*rate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
  for(let i=0;i<count;i++)b.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*6000),44+i*2);
  return b;
}
const darkBackground=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#111111"/></svg>');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>console.log('BROWSER',m.type(),m.text()));
const brightCount=()=>page.locator('#stageCanvas').evaluate(canvas=>{
  const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;let count=0;
  for(let i=0;i<data.length;i+=32)if(data[i]+data[i+1]+data[i+2]>560)count++;
  return count;
});
const syncedLyrics='[00:00.00]<00:00.00>one <00:00.30>two <00:00.60>three\n[00:00.85]<00:00.85>four <00:01.15>five <00:01.45>six\n[00:01.65]<00:01.65>seven <00:01.95>eight <00:02.18>nine';
await page.route('https://lrclib.net/api/search**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{trackName:'Test Song',artistName:'Lady Gaga',syncedLyrics}])}));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.fonts.check('82px "Homemade Apple"'),null,{timeout:10000});
assert.equal(await page.locator('#hazeEnabled').isChecked(),false,'Eternal must not force haze on');
await page.click('[data-effect="eternal"]');
assert.match(await page.locator('[data-effect="eternal"]').getAttribute('class'),/active/);
assert.equal(await page.locator('#lyricSize').inputValue(),'82');
await page.locator('#hazeColor').fill('#f6c8d8');
await page.locator('#hazeOpacity').fill('18');
assert.equal(await page.locator('#hazeEnabled').isChecked(),true,'custom haze colour must enable global haze');
assert.equal(await page.locator('#hazeOpacityValue').textContent(),'18%');

let chooserPromise=page.waitForEvent('filechooser');
await page.click('label[for="audioInput"]');
let chooser=await chooserPromise;
await chooser.setFiles({name:'Lady Gaga - Test Song.wav',mimeType:'audio/wav',buffer:wav()});
await page.waitForFunction(()=>/synced lines found/i.test(document.querySelector('#lyricsStatus')?.textContent||''),null,{timeout:15000});
chooserPromise=page.waitForEvent('filechooser');
await page.click('label[for="backgroundInput"]');
chooser=await chooserPromise;
await chooser.setFiles({name:'dark.svg',mimeType:'image/svg+xml',buffer:darkBackground});
await page.waitForFunction(()=>!document.querySelector('#exportBottom').disabled,null,{timeout:10000});

await page.locator('#seek').fill('0.06');await page.waitForTimeout(100);const early=await brightCount();
await page.locator('#seek').fill('0.28');await page.waitForTimeout(100);const mid=await brightCount();
await page.locator('#seek').fill('0.68');await page.waitForTimeout(100);const late=await brightCount();
assert.ok(early>0,'Eternal handwriting did not begin');
assert.ok(mid>early,`Eternal handwriting did not reveal continuously: ${JSON.stringify({early,mid})}`);
assert.ok(late>mid,`Eternal handwriting did not continue across the line: ${JSON.stringify({mid,late})}`);

const previewTime=await page.locator('#audioEl').evaluate(el=>el.currentTime);
const downloadPromise=page.waitForEvent('download',{timeout:15000});
await page.click('#exportBottom');
const download=await downloadPromise;
const path=await download.path();assert.ok(path,'Eternal export file missing');
const streams=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/);
assert.ok(streams.includes('video')&&streams.includes('audio'),'Eternal export must contain video and audio');
const frameTimes=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/).map(Number).filter(Number.isFinite);
const duration=Math.max(...frameTimes),cadence=frameTimes.length/Math.max(duration,.001);
assert.ok(duration>2,'Eternal export duration invalid');
console.log(`eternal: ${cadence.toFixed(1)}fps delivered by headless browser (60fps requested)`);
assert.ok(cadence>20,`Eternal export cadence too low: ${cadence.toFixed(1)}fps`);
execFileSync('ffmpeg',['-v','error','-i',path,'-f','null','-']);
await page.waitForFunction(()=>document.querySelector('#exportOverlay').classList.contains('hidden'));
assert.ok(Math.abs((await page.locator('#audioEl').evaluate(el=>el.currentTime))-previewTime)<.08,'Eternal export did not restore preview time');
assert.deepEqual(errors,[]);
await browser.close();
console.log('ETERNAL SUNSHINE EFFECT QA: PASS');