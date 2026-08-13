import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {parseLyrics} from '../docs/src/parser.js';

const mainSource=readFileSync('docs/src/main.js','utf8');
const exporterSource=readFileSync('docs/src/exporter.js','utf8');
assert.match(mainSource,/fps\s*:\s*60/,'export must request 60fps');
assert.match(exporterSource,/fps\s*=\s*60/,'exporter default must be 60fps');
assert.doesNotMatch(exporterSource,/audioEl\.currentTime\s*=\s*time/,'export must not force a second audio clock');

const plain=parseLyrics('[00:00.00]One two three\n[00:01.00]Four five six');
assert.equal(plain.format,'lrc');
assert.equal(plain.lines[0].words,null,'plain LRC must not invent word timing');
const enhanced=parseLyrics('[00:00.00]<00:00.00>One <00:00.30>two <00:00.60>three\n[00:01.00]<00:01.00>Four <00:01.30>five <00:01.60>six');
assert.equal(enhanced.format,'enhanced');
assert.equal(enhanced.lines[0].words.length,3);
assert.equal(enhanced.lines[0].words[1].time,0.30);

function wav(seconds=2.4,rate=44100){
  const count=Math.floor(seconds*rate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
  for(let i=0;i<count;i++)b.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*6000),44+i*2);
  return b;
}
const background=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#111111"/><circle cx="540" cy="720" r="360" fill="#222222"/></svg>');
execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','testsrc2=size=320x568:rate=60:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','/tmp/lina-background.mp4']);
execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','testsrc2=size=320x568:rate=60:duration=1','-c:v','libvpx-vp9','-pix_fmt','yuv420p','/tmp/lina-background.webm']);
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>console.log('BROWSER',message.type(),message.text()));
const canvasSample=()=>page.locator('#stageCanvas').evaluate(canvas=>{
  const pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
  let visible=0,bright=0,bratGreen=0;
  for(let i=0;i<pixels.length;i+=64){
    const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
    if(r+g+b>12)visible++;
    if(r+g+b>450)bright++;
    if(g>150&&g>r+35&&g>b+80)bratGreen++;
  }
  return {visible,bright,bratGreen};
});
const videoDrift=()=>page.evaluate(()=>{
  const audio=document.querySelector('#audioEl'),video=document.querySelector('#backgroundVideo');
  if(!Number.isFinite(video.duration)||video.duration<=0)return Infinity;
  const target=((audio.currentTime%video.duration)+video.duration)%video.duration;
  const direct=Math.abs(video.currentTime-target);
  return Math.min(direct,Math.abs(video.duration-direct));
});
const syncedLyrics='[00:00.00]<00:00.00>First <00:00.28>lyric <00:00.58>line\n[00:00.80]<00:00.80>Second <00:01.05>lyric <00:01.35>line\n[00:01.60]<00:01.60>Final <00:01.85>lyric <00:02.15>line';
await page.route('https://lrclib.net/api/search**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{trackName:'Test Song',artistName:'Lady Gaga',syncedLyrics}])}));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
assert.equal((await page.locator('[data-effect="apple"]').textContent()).trim(),'Apple Music');
assert.equal((await page.locator('[data-effect="brat"]').textContent()).trim(),'Brat');
assert.equal((await page.locator('[data-effect="eternal"]').textContent()).trim(),'Eternal Sunshine');
assert.equal(await page.locator('#lyricSize').getAttribute('type'),'range');
assert.equal(await page.locator('#hazeEnabled').isChecked(),false,'haze must start off outside Brat');

await page.click('[data-align="left"]');
await page.locator('#lyricSize').fill('90');
await page.click('[data-effect="brat"]');
assert.match(await page.locator('[data-align="center"]').getAttribute('class'),/active/);
assert.equal(await page.locator('#lyricSize').inputValue(),'88');
assert.equal(await page.locator('#hazeEnabled').isChecked(),true,'Brat must auto-enable haze');
assert.equal((await page.locator('#hazeColor').inputValue()).toLowerCase(),'#8ace00','Brat must preload green haze');
await page.click('[data-haze-preset="white"]');
assert.equal((await page.locator('#hazeColor').inputValue()).toLowerCase(),'#ffffff','white haze preset failed');
await page.click('[data-haze-preset="green"]');
assert.equal((await page.locator('#hazeColor').inputValue()).toLowerCase(),'#8ace00','green haze preset failed');
await page.locator('#hazeOpacity').fill('31');
assert.equal(await page.locator('#hazeOpacityValue').textContent(),'31%');
await page.click('[data-align="right"]');
await page.locator('#lyricSize').fill('110');
await page.click('[data-effect="eternal"]');
assert.match(await page.locator('[data-align="center"]').getAttribute('class'),/active/);
assert.equal(await page.locator('#lyricSize').inputValue(),'82');
assert.equal(await page.locator('#hazeEnabled').isChecked(),true,'global haze choice must persist across effects');
await page.click('[data-align="left"]');
await page.locator('#lyricSize').fill('65');
await page.click('[data-effect="apple"]');
assert.match(await page.locator('[data-align="left"]').getAttribute('class'),/active/);
assert.equal(await page.locator('#lyricSize').inputValue(),'90');
await page.click('[data-effect="brat"]');
assert.match(await page.locator('[data-align="right"]').getAttribute('class'),/active/);
assert.equal(await page.locator('#lyricSize').inputValue(),'110');
await page.click('[data-effect="eternal"]');
assert.match(await page.locator('[data-align="left"]').getAttribute('class'),/active/);
assert.equal(await page.locator('#lyricSize').inputValue(),'65');
await page.click('[data-effect="apple"]');

let chooserPromise=page.waitForEvent('filechooser');
await page.click('label[for="audioInput"]');
let chooser=await chooserPromise;
await chooser.setFiles({name:'Lady Gaga - Test Song.wav',mimeType:'audio/wav',buffer:wav()});
await page.waitForFunction(()=>/synced lines found/i.test(document.querySelector('#lyricsStatus')?.textContent||''),null,{timeout:15000});
chooserPromise=page.waitForEvent('filechooser');
await page.click('label[for="backgroundInput"]');
chooser=await chooserPromise;
await chooser.setFiles({name:'background.svg',mimeType:'image/svg+xml',buffer:background});
await page.waitForFunction(()=>!document.querySelector('#exportBottom').disabled,null,{timeout:10000});
await page.waitForTimeout(250);
let sample=await canvasSample();
assert.ok(sample.visible>10000,`image preview blank: ${JSON.stringify(sample)}`);
assert.ok(sample.bright>0,`lyrics not visible in image preview: ${JSON.stringify(sample)}`);
assert.equal(await page.locator('#exportBtn').isEnabled(),true);

await page.locator('#seek').fill('0.06');await page.waitForTimeout(80);const earlyApple=await canvasSample();
await page.locator('#seek').fill('0.22');await page.waitForTimeout(80);const midApple=await canvasSample();
await page.locator('#seek').fill('0.62');await page.waitForTimeout(80);const lateApple=await canvasSample();
assert.ok(midApple.bright>earlyApple.bright,`Apple glyph progression did not advance: ${JSON.stringify({earlyApple,midApple})}`);
assert.ok(lateApple.bright>=midApple.bright,`Apple completed glyphs did not stay highlighted: ${JSON.stringify({midApple,lateApple})}`);

await page.click('#playBtn');
await page.waitForFunction(()=>!document.querySelector('#audioEl').paused);
await page.click('#playBtn');
await page.waitForFunction(()=>document.querySelector('#audioEl').paused);
await page.locator('#seek').fill('1');
assert.ok(Math.abs(await page.locator('#audioEl').evaluate(el=>el.currentTime)-1)<.1,'seek control did not move audio');
await page.waitForTimeout(100);
sample=await canvasSample();
assert.ok(sample.visible>10000 && sample.bright>0,`seek preview blank: ${JSON.stringify(sample)}`);
for(const [ratio,width,height] of [['9:16',1080,1920],['1:1',1080,1080],['16:9',1920,1080]]) {
  await page.click(`[data-aspect="${ratio}"]`);
  assert.match(await page.locator(`[data-aspect="${ratio}"]`).getAttribute('class'),/active/);
  assert.deepEqual(await page.locator('#stageCanvas').evaluate(el=>[el.width,el.height]),[width,height]);
}
const beforeCancelTime=await page.locator('#audioEl').evaluate(el=>el.currentTime);
await page.click('#exportBtn');
await page.waitForFunction(()=>!document.querySelector('#exportOverlay').classList.contains('hidden'));
await page.click('#cancelExport');
await page.waitForFunction(()=>document.querySelector('#exportOverlay').classList.contains('hidden'));
assert.match(await page.locator('#toast').textContent(),/cancelled/i);
assert.ok(Math.abs((await page.locator('#audioEl').evaluate(el=>el.currentTime))-beforeCancelTime)<.08,'cancelled export did not restore preview time');
chooserPromise=page.waitForEvent('filechooser');
await page.click('label[for="backgroundInput"]');
chooser=await chooserPromise;
const supportsMp4=await page.locator('#backgroundVideo').evaluate(video=>!!video.canPlayType('video/mp4; codecs="avc1.42E01E"'));
const videoName=supportsMp4?'background.mp4':'background.webm';
const videoMime=supportsMp4?'video/mp4':'video/webm';
const videoPath=supportsMp4?'/tmp/lina-background.mp4':'/tmp/lina-background.webm';
await chooser.setFiles({name:videoName,mimeType:videoMime,buffer:readFileSync(videoPath)});
await page.waitForFunction(name=>!document.querySelector('#exportBottom').disabled && document.querySelector('#backgroundStatus').textContent.includes(name),videoName,{timeout:10000});
await page.locator('#seek').fill('0.4');
await page.waitForTimeout(180);
assert.ok(await videoDrift()<.08,`paused video background drifted by ${await videoDrift()}s`);
sample=await canvasSample();
assert.ok(sample.visible>10000 && sample.bright>0,`video preview blank: ${JSON.stringify(sample)}`);
await page.click('#playBtn');
await page.waitForTimeout(420);
assert.ok(await videoDrift()<.14,`playing 60fps video background drifted by ${await videoDrift()}s`);
await page.click('#playBtn');
await page.waitForFunction(()=>document.querySelector('#audioEl').paused);
for(const effect of ['apple','brat','eternal']){
  await page.click(`[data-effect="${effect}"]`);
  assert.match(await page.locator(`[data-effect="${effect}"]`).getAttribute('class'),/active/);
  await page.waitForTimeout(100);
  sample=await canvasSample();
  const effectVisible=effect==='brat'?sample.bratGreen>0:sample.bright>0;
  assert.ok(sample.visible>10000&&effectVisible,`${effect} preview blank: ${JSON.stringify(sample)}`);
  const previewTime=await page.locator('#audioEl').evaluate(el=>el.currentTime);
  const downloadPromise=page.waitForEvent('download',{timeout:15000});
  await page.click('#exportBottom');
  let download;
  try{download=await downloadPromise}catch(error){
    const diagnostic=await page.evaluate(()=>({toast:document.querySelector('#toast')?.textContent,toastClass:document.querySelector('#toast')?.className,overlayHidden:document.querySelector('#exportOverlay')?.classList.contains('hidden'),percent:document.querySelector('#exportPct')?.textContent,status:document.querySelector('#exportStatus')?.textContent,mediaRecorder:typeof MediaRecorder,canvasCapture:typeof HTMLCanvasElement.prototype.captureStream,audioDuration:document.querySelector('#audioEl')?.duration,audioTime:document.querySelector('#audioEl')?.currentTime,videoTime:document.querySelector('#backgroundVideo')?.currentTime}));
    throw new Error(`${effect}: no download; ${JSON.stringify(diagnostic)}; page errors: ${errors.join(' | ')}`);
  }
  const path=await download.path();
  assert.ok(path,`${effect}: no exported file`);
  const streams=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/);
  assert.ok(streams.includes('video'),`${effect}: video stream missing`);assert.ok(streams.includes('audio'),`${effect}: audio stream missing`);
  const frameTimes=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/).map(Number).filter(Number.isFinite);
  const duration=Math.max(...frameTimes);
  assert.ok(duration>2,`${effect}: invalid packet duration ${duration}`);
  const cadence=frameTimes.length/Math.max(duration,.001);
  console.log(`${effect}: ${frameTimes.length} decoded frames across ${duration.toFixed(3)}s = ${cadence.toFixed(1)}fps delivered by headless browser (60fps requested)`);
  assert.ok(cadence>20,`${effect}: export cadence too low (${cadence.toFixed(1)}fps)`);
  execFileSync('ffmpeg',['-v','error','-i',path,'-f','null','-']);
  await page.waitForFunction(()=>document.querySelector('#exportOverlay').classList.contains('hidden'));
  assert.ok(Math.abs((await page.locator('#audioEl').evaluate(el=>el.currentTime))-previewTime)<.08,`${effect}: export did not restore preview time`);
}
assert.deepEqual(errors,[]);
await browser.close();
console.log('FIVE-STEP LINA EXPORT: PASS');