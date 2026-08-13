import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {parseLyrics} from '../docs/src/parser.js';

const rendererSource=readFileSync('docs/src/renderer.js','utf8');
const mainSource=readFileSync('docs/src/main.js','utf8');
const exporterSource=readFileSync('docs/src/exporter.js','utf8');
assert.match(rendererSource,/"Arial Narrow"/,'Brat must use Arial Narrow when available');
assert.match(rendererSource,/impact\s*=\s*age\s*<\s*0\.055/,'Brat word impact must stay abrupt');
assert.doesNotMatch(rendererSource,/insetX|fillRect\(rectX/,'old green lyric-box logic must be deleted');
assert.match(mainSource,/fps\s*:\s*60/,'export must request 60fps');
assert.doesNotMatch(exporterSource,/audioEl\.currentTime\s*=\s*time/,'export must use one master clock');

const plain=parseLyrics('[00:00.00]one two three\n[00:01.00]four five six');
assert.equal(plain.lines[0].words,null,'plain LRC must not invent word timing');
const enhanced=parseLyrics('[00:00.00]<00:00.00>one <00:00.30>two <00:00.60>three\n[00:00.80]<00:00.80>four <00:01.10>five <00:01.40>six\n[00:01.60]<00:01.60>seven <00:01.90>eight <00:02.15>nine');
assert.equal(enhanced.lines[0].words.length,3);

function wav(seconds=2.4,rate=44100){
  const count=Math.floor(seconds*rate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
  for(let i=0;i<count;i++)b.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*6000),44+i*2);
  return b;
}
const whiteBackground=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="white"/></svg>');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>console.log('BROWSER',m.type(),m.text()));

const darkStats=async()=>page.locator('#stageCanvas').evaluate(canvas=>{
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let count=0,minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
  for(let y=0;y<canvas.height;y+=3)for(let x=0;x<canvas.width;x+=3){const i=(y*canvas.width+x)*4;if(data[i]+data[i+1]+data[i+2]<210){count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
  return {count,minX,minY,maxX,maxY,width:canvas.width,height:canvas.height};
});
const darkCountIn=async box=>page.locator('#stageCanvas').evaluate((canvas,box)=>{
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let count=0;
  for(let y=Math.max(0,box.minY-6);y<=Math.min(canvas.height-1,box.maxY+6);y+=2)for(let x=Math.max(0,box.minX-6);x<=Math.min(canvas.width-1,box.maxX+6);x+=2){const i=(y*canvas.width+x)*4;if(data[i]+data[i+1]+data[i+2]<210)count++}
  return count;
},box);

const syncedLyrics='[00:00.00]<00:00.00>one <00:00.30>two <00:00.60>three\n[00:00.80]<00:00.80>four <00:01.10>five <00:01.40>six\n[00:01.60]<00:01.60>seven <00:01.90>eight <00:02.15>nine';
await page.route('https://lrclib.net/api/search**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{trackName:'Test Song',artistName:'Lady Gaga',syncedLyrics}])}));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
assert.equal(await page.locator('#hazeEnabled').isChecked(),false);
await page.click('[data-effect="brat"]');
assert.equal(await page.locator('#hazeEnabled').isChecked(),true,'Brat must auto-enable haze');
assert.equal((await page.locator('#hazeColor').inputValue()).toLowerCase(),'#8ace00');
await page.click('[data-haze-preset="white"]');
assert.equal((await page.locator('#hazeColor').inputValue()).toLowerCase(),'#ffffff');
await page.click('[data-haze-preset="green"]');
assert.equal((await page.locator('#hazeColor').inputValue()).toLowerCase(),'#8ace00');
await page.locator('#hazeOpacity').fill('24');

let chooserPromise=page.waitForEvent('filechooser');
await page.click('label[for="audioInput"]');
let chooser=await chooserPromise;
await chooser.setFiles({name:'Lady Gaga - Test Song.wav',mimeType:'audio/wav',buffer:wav()});
await page.waitForFunction(()=>/synced lines found/i.test(document.querySelector('#lyricsStatus')?.textContent||''),null,{timeout:15000});
chooserPromise=page.waitForEvent('filechooser');
await page.click('label[for="backgroundInput"]');
chooser=await chooserPromise;
await chooser.setFiles({name:'white.svg',mimeType:'image/svg+xml',buffer:whiteBackground});
await page.waitForFunction(()=>!document.querySelector('#exportBottom').disabled,null,{timeout:10000});

await page.locator('#seek').fill('0.12');await page.waitForTimeout(100);
const first=await darkStats();
assert.ok(first.count>20,'first Brat word did not hit the page');
assert.ok(first.minY<first.height*.2,'Brat page must start near the top');
const firstRegionBefore=await darkCountIn(first);
await page.locator('#seek').fill('0.42');await page.waitForTimeout(100);
const second=await darkStats();
assert.ok(second.count>first.count*1.25,`second timed word did not add abruptly: ${JSON.stringify({first,second})}`);
const firstRegionAfter=await darkCountIn(first);
assert.ok(Math.abs(firstRegionAfter-firstRegionBefore)/Math.max(1,firstRegionBefore)<.18,'earlier Brat word moved or changed after the next word arrived');
await page.locator('#seek').fill('2.22');await page.waitForTimeout(100);
const full=await darkStats();
assert.ok(full.minY<full.height*.2&&full.maxY>full.height*.75,`Brat page did not build top-to-bottom: ${JSON.stringify(full)}`);

const previewTime=await page.locator('#audioEl').evaluate(el=>el.currentTime);
const downloadPromise=page.waitForEvent('download',{timeout:15000});
await page.click('#exportBottom');
const download=await downloadPromise;
const path=await download.path();assert.ok(path,'Brat export file missing');
const streams=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/);
assert.ok(streams.includes('video')&&streams.includes('audio'),'Brat export must contain video and audio');
const frameTimes=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/).map(Number).filter(Number.isFinite);
const duration=Math.max(...frameTimes),cadence=frameTimes.length/Math.max(duration,.001);
assert.ok(duration>2,'Brat export duration invalid');
console.log(`brat: ${cadence.toFixed(1)}fps delivered by headless browser (60fps requested)`);
assert.ok(cadence>20,`Brat export cadence too low: ${cadence.toFixed(1)}fps`);
execFileSync('ffmpeg',['-v','error','-i',path,'-f','null','-']);
await page.waitForFunction(()=>document.querySelector('#exportOverlay').classList.contains('hidden'));
assert.ok(Math.abs((await page.locator('#audioEl').evaluate(el=>el.currentTime))-previewTime)<.08,'Brat export did not restore preview time');
assert.deepEqual(errors,[]);
await browser.close();
console.log('BRAT EFFECT QA: PASS');