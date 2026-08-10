import { firefox } from 'playwright';

const base='http://127.0.0.1:4173/';
function wavBuffer(seconds=2.2,sampleRate=44100){const count=Math.floor(seconds*sampleRate),dataBytes=count*2,b=Buffer.alloc(44+dataBytes);b.write('RIFF',0);b.writeUInt32LE(36+dataBytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(dataBytes,40);for(let i=0;i<count;i++){const v=Math.sin(2*Math.PI*440*i/sampleRate)*.18;b.writeInt16LE(Math.round(v*32767),44+i*2)}return b}
const browser=await firefox.launch({headless:true});
const page=await browser.newPage({viewport:{width:1200,height:900},acceptDownloads:true});
page.on('console',m=>console.log(`FIREFOX CONSOLE ${m.type()}: ${m.text()}`));
page.on('pageerror',e=>console.log(`FIREFOX PAGEERROR: ${e.message}`));
await page.goto(base,{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true');
await page.setInputFiles('#audioFile',{name:'qa.wav',mimeType:'audio/wav',buffer:wavBuffer()});
await page.waitForFunction(()=>Number(document.querySelector('#audio')?.duration)>1.5);
await page.click('#nav [data-tool="lyrics"]');
await page.fill('#lyricsText','[00:00.00] Hello world\n[00:00.80] Second line\n[00:01.55] Final line');
await page.click('#applyPaste');await page.waitForSelector('#reviewBox:not(.hidden)');await page.click('#confirmReview');
await page.check('#rightsConfirm');
await page.click('.effect-option[data-effect="apple"]');
console.log('FIREFOX PREEXPORT',await page.evaluate(()=>({status:document.querySelector('#topStatus')?.textContent,state:window.linaExportState?.(),capture:!!HTMLCanvasElement.prototype.captureStream,mediaRecorder:!!window.MediaRecorder,support:{mp4:MediaRecorder.isTypeSupported('video/mp4'),webm:MediaRecorder.isTypeSupported('video/webm'),vp9:MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus'),vp8:MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')}})));
let download=null;
page.once('download',d=>{download=d;console.log('FIREFOX DOWNLOAD',d.suggestedFilename())});
await page.click('#exportBottomBtn');
for(let i=0;i<24;i++){
  await page.waitForTimeout(500);
  const d=await page.evaluate(()=>({status:document.querySelector('#topStatus')?.textContent,render:document.querySelector('#renderText')?.textContent,progress:document.querySelector('#progress')?.value,state:window.linaExportState?.(),dialog:document.querySelector('#dlg')?.open}));
  console.log(`FIREFOX EXPORT T+${((i+1)*.5).toFixed(1)}s`,d);
  if(download||/Export complete|Export failed/i.test(d.status||''))break;
}
console.log('FIREFOX FINAL',await page.evaluate(()=>({status:document.querySelector('#topStatus')?.textContent,state:window.linaExportState?.(),dialog:document.querySelector('#dlg')?.open})));
await browser.close();
