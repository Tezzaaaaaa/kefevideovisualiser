import assert from 'node:assert/strict';
import { webkit } from 'playwright';
import { execFileSync } from 'node:child_process';

function wavBuffer(seconds=2.2,sampleRate=44100){
  const count=Math.floor(seconds*sampleRate),dataBytes=count*2,b=Buffer.alloc(44+dataBytes);
  b.write('RIFF',0);b.writeUInt32LE(36+dataBytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(dataBytes,40);
  for(let i=0;i<count;i++){const v=Math.sin(2*Math.PI*440*i/sampleRate)*.18;b.writeInt16LE(Math.round(v*32767),44+i*2)}
  return b;
}

const browser=await webkit.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
page.on('console',m=>console.log('SAFARI EXPORT CONSOLE',m.type(),m.text()));
page.on('pageerror',e=>console.log('SAFARI EXPORT PAGEERROR',e.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:15000});

await page.setInputFiles('#audioFile',{name:'safari-probe.wav',mimeType:'audio/wav',buffer:wavBuffer()});
await page.waitForFunction(()=>Number(document.querySelector('#audio')?.duration)>1.5);
await page.click('#nav [data-tool="lyrics"]');
await page.selectOption('#syncMethod','pasteTimed');
await page.fill('#lyricsText','[00:00.00] Safari export probe\n[00:00.80] Video and audio together\n[00:01.55] Final probe line');
await page.click('#applyPaste');
await page.waitForSelector('#reviewBox:not(.hidden)');
await page.click('#confirmReview');
await page.waitForFunction(()=>document.querySelectorAll('#timeline .line').length===3);
await page.check('#rightsConfirm');
await page.selectOption('#quality','720');
await page.selectOption('#aspect','9:16');
await page.click('.effect-option[data-effect="apple"]');

const start=Date.now();
const downloadPromise=page.waitForEvent('download',{timeout:90000});
await page.click('#exportBottomBtn');
const phaseTicker=setInterval(async()=>{
  try{
    const state=await page.evaluate(()=>({state:window.linaExportState?.(),status:document.querySelector('#topStatus')?.textContent||'',render:document.querySelector('#renderText')?.textContent||''}));
    console.log('SAFARI EXPORT STATE',JSON.stringify(state));
  }catch{}
},5000);
let download;
try{download=await downloadPromise}
catch(err){
  const state=await page.evaluate(()=>({state:window.linaExportState?.(),status:document.querySelector('#topStatus')?.textContent||'',render:document.querySelector('#renderText')?.textContent||''}));
  console.log('SAFARI EXPORT FINAL STATE',JSON.stringify(state));
  throw err;
}finally{clearInterval(phaseTicker)}
const elapsed=(Date.now()-start)/1000,path=await download.path();
assert.ok(path,'Safari probe produced no file');
const streams=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/).filter(Boolean);
console.log('SAFARI EXPORT RESULT',JSON.stringify({elapsed,filename:download.suggestedFilename(),streams}));
assert.ok(streams.includes('video'),'Safari probe has no video stream');
assert.ok(streams.includes('audio'),'Safari probe has no audio stream');
await browser.close();
console.log('Safari export probe: PASS');
