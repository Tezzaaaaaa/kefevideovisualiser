import assert from 'node:assert/strict';
import { chromium } from 'playwright';

function wavBuffer(seconds=1.4,sampleRate=44100){
  const count=Math.floor(seconds*sampleRate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF',0);b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);return b;
}

const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1100,height:800}});
await page.goto(base,{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:20000});
await page.waitForSelector('#resetProjectVisible',{state:'visible',timeout:10000});

assert.equal(await page.locator('#resetProjectVisible').textContent(),'Reset project','visible reset label is wrong');
assert.match(await page.locator('#resetProjectVisible').getAttribute('href'),/^reset\.html\?v=/,'visible reset does not use standalone reset page');
assert.equal(await page.locator('#resetProjectVisible').count(),1,'more than one Reset control is visible');
assert.equal(await page.locator('#quickResetLayout,#linaFreshReset,#resetLyricsBtn,#resetBtn').count(),0,'retired reset control is still present');

await page.locator('#autosaveToggle').setChecked(true);
await page.fill('#titleInput','Reset Test Song');
await page.fill('#artistInput','Reset Test Artist');
await page.fill('#albumInput','Reset Test Album');
for(const id of ['titleInput','artistInput','albumInput'])await page.locator(`#${id}`).dispatchEvent('input');
await page.setInputFiles('#audioFile',{name:'must-disappear.wav',mimeType:'audio/wav',buffer:wavBuffer()});
await page.waitForFunction(()=>Number(document.querySelector('#audio')?.duration)>1);
await page.evaluate(async()=>{await saveProgress(true,false)});

const before=await page.evaluate(async()=>{
  const saved=JSON.parse(localStorage.getItem('lina.project.v2')||'null');
  const audioState={src:document.querySelector('#audio')?.currentSrc||document.querySelector('#audio')?.src||'',duration:document.querySelector('#audio')?.duration||0,fileName:audioFile?.name||''};
  const media=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('lina-project-media',1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files')};
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{const db=request.result,tx=db.transaction('files','readonly'),get=tx.objectStore('files').get('audio');get.onsuccess=()=>{const result=get.result;db.close();resolve(result?{name:result.name||'',size:result.size||0}:null)};get.onerror=()=>reject(get.error)};
  });
  return{saved,audioState,media};
});
assert.ok(before.saved,'project was not saved before Reset');
assert.equal(before.saved.controls?.titleInput,'Reset Test Song','title was not saved before Reset');
assert.equal(before.audioState.fileName,'must-disappear.wav','loaded audio was not present before Reset');
assert.ok(before.audioState.duration>1,'loaded audio was not playable before Reset');
assert.equal(before.media?.name,'must-disappear.wav','loaded audio was not persisted before Reset');

await page.locator('#resetProjectVisible').click();
await page.waitForURL(/\/index\.html\?fresh=\d+$/,{timeout:20000});
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:20000});
await page.waitForSelector('#resetProjectVisible',{state:'visible',timeout:10000});

assert.equal(await page.locator('#titleInput').inputValue(),'','Reset restored the old song title');
assert.equal(await page.locator('#artistInput').inputValue(),'','Reset restored the old artist');
assert.equal(await page.locator('#albumInput').inputValue(),'','Reset restored the old album');
assert.equal(await page.locator('#audioFile').inputValue(),'','Reset left the audio file input populated');
assert.equal(await page.evaluate(()=>document.querySelector('#audio')?.currentSrc||document.querySelector('#audio')?.getAttribute('src')||''),'','Reset restored the loaded audio source');
assert.equal(await page.evaluate(()=>localStorage.getItem('lina.project.v2')),null,'Reset left the saved project in localStorage');
assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(key=>/^lina(?:[.:-]|$)/i.test(key))),[],'Reset left LINA localStorage keys behind');
assert.deepEqual(await page.evaluate(()=>Object.keys(sessionStorage).filter(key=>/^lina(?:[.:-]|$)/i.test(key))),[],'Reset left LINA sessionStorage keys behind');

const mediaAfter=await page.evaluate(async()=>{
  return await new Promise((resolve,reject)=>{
    const request=indexedDB.open('lina-project-media',1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files')};
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('files','readonly');
      const store=tx.objectStore('files'),audio=store.get('audio'),background=store.get('background');
      tx.oncomplete=()=>{const result={audio:!!audio.result,background:!!background.result};db.close();resolve(result)};
      tx.onerror=()=>reject(tx.error);
    };
  });
});
assert.deepEqual(mediaAfter,{audio:false,background:false},'Reset left saved media behind');

await browser.close();
console.log('VISIBLE FULL PROJECT RESET WITH AUDIO PASS');
