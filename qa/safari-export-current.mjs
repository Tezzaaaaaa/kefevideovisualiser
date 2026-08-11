import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {execFileSync} from 'node:child_process';

function wavBuffer(seconds=2.2,sampleRate=44100){
  const count=Math.floor(seconds*sampleRate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF',0);b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);return b;
}

const browser=await webkit.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
page.on('console',m=>console.log('WEBKIT EXPORT',m.type(),m.text()));
page.on('pageerror',e=>console.log('WEBKIT EXPORT PAGEERROR',e.stack||e.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',{timeout:20000});
await page.setInputFiles('#audioFile',{name:'safari-probe.wav',mimeType:'audio/wav',buffer:wavBuffer()});
await page.waitForFunction(()=>Number(document.querySelector('#audio')?.duration)>1.5);
await page.click('#nav [data-tool="lyrics"]');
await page.locator('.other-lyrics-methods').evaluate(el=>el.open=true);
await page.selectOption('#syncMethod','importTimed');
await page.waitForSelector('#pasteTimedBox:not(.hidden)');
await page.fill('#lyricsText','[00:00.00] Safari export probe\n[00:00.80] Video and audio together\n[00:01.55] Final probe line');
await page.click('#applyPaste');await page.waitForSelector('#reviewBox:not(.hidden)');await page.click('#confirmReview');
await page.waitForFunction(()=>document.querySelectorAll('#timeline .line').length===3);
await page.evaluate(()=>window.linaRuntime.setEffect('apple',{dirty:false}));
await page.selectOption('#quickQuality','720');await page.selectOption('#quickFrame','9:16');

const downloadPromise=page.waitForEvent('download',{timeout:90000});
const failedPromise=page.waitForFunction(()=>/Export failed/i.test(document.querySelector('#topStatus')?.textContent||''),null,{timeout:90000}).then(async()=>{
  const info=await page.evaluate(()=>({status:document.querySelector('#topStatus')?.textContent||'',render:document.querySelector('#renderText')?.textContent||'',state:window.linaExportState?.()}));
  throw new Error(`WebKit export failed: ${JSON.stringify(info)}`);
});
await page.click('#quickExport');
let download;
try{download=await Promise.race([downloadPromise,failedPromise])}
catch(err){
  const info=await page.evaluate(()=>({status:document.querySelector('#topStatus')?.textContent||'',render:document.querySelector('#renderText')?.textContent||'',state:window.linaExportState?.()}));
  console.log('WEBKIT EXPORT FINAL',JSON.stringify(info));
  throw err;
}
const path=await download.path();assert.ok(path,'Safari export produced no file');
const streams=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/).filter(Boolean);
assert.ok(streams.includes('video'),'Safari export has no video stream');assert.ok(streams.includes('audio'),'Safari export has no audio stream');assert.match(download.suggestedFilename(),/\.mp4$/i,'Safari export filename is not MP4');
await browser.close();console.log('Safari current export probe: PASS');
