import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {webkit} from 'playwright';

function wav(seconds=2.4,rate=44100){
  const count=Math.floor(seconds*rate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
  for(let i=0;i<count;i++)b.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*6000),44+i*2);
  return b;
}
const background=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#542788"/><circle cx="540" cy="720" r="360" fill="#ef8a62"/></svg>');
const browser=await webkit.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://lrclib.net/api/search**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{trackName:'Test Song',artistName:'Lady Gaga',syncedLyrics:'[00:00.00]First lyric line\n[00:00.80]Second lyric line\n[00:01.60]Final lyric line'}])}));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.setInputFiles('#audioInput',{name:'Lady Gaga - Test Song.wav',mimeType:'audio/wav',buffer:wav()});
await page.waitForFunction(()=>/synced lines found/i.test(document.querySelector('#lyricsStatus')?.textContent||''),null,{timeout:15000});
await page.setInputFiles('#backgroundInput',{name:'background.svg',mimeType:'image/svg+xml',buffer:background});
await page.waitForFunction(()=>!document.querySelector('#exportBottom').disabled,null,{timeout:10000});
for(const ratio of ['9:16','1:1','16:9']){await page.click(`[data-aspect="${ratio}"]`);assert.equal(await page.locator(`[data-aspect="${ratio}"]`).getAttribute('class'),'active')}
for(const effect of ['apple','charli','eternal']){
  await page.click(`[data-effect="${effect}"]`);
  const downloadPromise=page.waitForEvent('download',{timeout:30000});
  await page.click('#exportBottom');
  const download=await downloadPromise,path=await download.path();
  assert.ok(path,`${effect}: no exported file`);
  const streams=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/);
  assert.ok(streams.includes('video'),`${effect}: video stream missing`);assert.ok(streams.includes('audio'),`${effect}: audio stream missing`);
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',path],{encoding:'utf8'}).trim());
  assert.ok(duration>2,`${effect}: invalid duration ${duration}`);
  execFileSync('ffmpeg',['-v','error','-i',path,'-t','2','-f','null','-']);
  await page.waitForFunction(()=>document.querySelector('#exportOverlay').classList.contains('hidden'));
}
assert.deepEqual(errors,[]);
await browser.close();
console.log('FIVE-STEP LINA EXPORT: PASS');
