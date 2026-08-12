import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

function wav(seconds=2.4,rate=44100){
  const count=Math.floor(seconds*rate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
  for(let i=0;i<count;i++)b.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*6000),44+i*2);
  return b;
}
const background=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#542788"/><circle cx="540" cy="720" r="360" fill="#ef8a62"/></svg>');
execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','color=c=0x542788:s=320x568:d=1','-c:v','libvpx-vp9','-pix_fmt','yuv420p','/tmp/lina-background.webm']);
const videoBackground=readFileSync('/tmp/lina-background.webm');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>console.log('BROWSER',message.type(),message.text()));
await page.route('https://lrclib.net/api/search**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{trackName:'Test Song',artistName:'Lady Gaga',syncedLyrics:'[00:00.00]First lyric line\n[00:00.80]Second lyric line\n[00:01.60]Final lyric line'}])}));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
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
assert.equal(await page.locator('#exportBtn').isEnabled(),true);
await page.click('#playBtn');
await page.waitForFunction(()=>!document.querySelector('#audioEl').paused);
await page.click('#playBtn');
await page.waitForFunction(()=>document.querySelector('#audioEl').paused);
await page.locator('#seek').fill('1');
assert.ok(Math.abs(await page.locator('#audioEl').evaluate(el=>el.currentTime)-1)<.1,'seek control did not move audio');
for(const [ratio,width,height] of [['9:16',1080,1920],['1:1',1080,1080],['16:9',1920,1080]]) {
  await page.click(`[data-aspect="${ratio}"]`);
  assert.match(await page.locator(`[data-aspect="${ratio}"]`).getAttribute('class'),/active/);
  assert.deepEqual(await page.locator('#stageCanvas').evaluate(el=>[el.width,el.height]),[width,height]);
}
await page.click('#exportBtn');
await page.waitForFunction(()=>!document.querySelector('#exportOverlay').classList.contains('hidden'));
await page.click('#cancelExport');
await page.waitForFunction(()=>document.querySelector('#exportOverlay').classList.contains('hidden'));
assert.match(await page.locator('#toast').textContent(),/cancelled/i);
chooserPromise=page.waitForEvent('filechooser');
await page.click('label[for="backgroundInput"]');
chooser=await chooserPromise;
await chooser.setFiles({name:'background.webm',mimeType:'video/webm',buffer:videoBackground});
await page.waitForFunction(()=>!document.querySelector('#exportBottom').disabled && document.querySelector('#backgroundStatus').textContent.includes('background.webm'),null,{timeout:10000});
for(const effect of ['apple','charli','eternal']){
  await page.click(`[data-effect="${effect}"]`);
  assert.match(await page.locator(`[data-effect="${effect}"]`).getAttribute('class'),/active/);
  const downloadPromise=page.waitForEvent('download',{timeout:15000});
  await page.click('#exportBottom');
  let download;
  try{download=await downloadPromise}catch(error){
    const diagnostic=await page.evaluate(()=>({toast:document.querySelector('#toast')?.textContent,toastClass:document.querySelector('#toast')?.className,overlayHidden:document.querySelector('#exportOverlay')?.classList.contains('hidden'),percent:document.querySelector('#exportPct')?.textContent,status:document.querySelector('#exportStatus')?.textContent,mediaRecorder:typeof MediaRecorder,canvasCapture:typeof HTMLCanvasElement.prototype.captureStream,audioDuration:document.querySelector('#audioEl')?.duration,audioTime:document.querySelector('#audioEl')?.currentTime}));
    throw new Error(`${effect}: no download; ${JSON.stringify(diagnostic)}; page errors: ${errors.join(' | ')}`);
  }
  const path=await download.path();
  assert.ok(path,`${effect}: no exported file`);
  const streams=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/);
  assert.ok(streams.includes('video'),`${effect}: video stream missing`);assert.ok(streams.includes('audio'),`${effect}: audio stream missing`);
  const frameTimes=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/).map(Number).filter(Number.isFinite);
  const duration=Math.max(...frameTimes);
  assert.ok(duration>2,`${effect}: invalid packet duration ${duration}`);
  execFileSync('ffmpeg',['-v','error','-i',path,'-f','null','-']);
  await page.waitForFunction(()=>document.querySelector('#exportOverlay').classList.contains('hidden'));
}
assert.deepEqual(errors,[]);
await browser.close();
console.log('FIVE-STEP LINA EXPORT: PASS');