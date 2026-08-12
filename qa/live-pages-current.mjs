import assert from 'node:assert/strict';
import {chromium} from 'playwright';

function wavBuffer(seconds=1.2,sampleRate=44100){
  const count=Math.floor(seconds*sampleRate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF',0);b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);return b;
}

const live='https://tezzaaaaaa.github.io/lyricvideovisualiser/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));

await page.goto(`${live}?qa=${Date.now()}`,{waitUntil:'networkidle',timeout:60000});
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:30000});
await page.waitForSelector('#resetProjectVisible',{state:'visible',timeout:10000});

const liveState=await page.evaluate(()=>({
  resetCount:document.querySelectorAll('#resetProjectVisible').length,
  resetHref:document.querySelector('#resetProjectVisible')?.getAttribute('href'),
  oldResetCount:document.querySelectorAll('#quickResetLayout,#linaFreshReset,#resetLyricsBtn,#resetBtn').length,
  appEvents:[...document.scripts].map(s=>s.src).find(src=>src.includes('/app-events.js'))||'',
  sticky:{position:getComputedStyle(document.querySelector('.stage-wrap')).position,top:getComputedStyle(document.querySelector('.stage-wrap')).top}
}));
assert.equal(liveState.resetCount,1,'live: expected exactly one Reset project control');
assert.equal(liveState.oldResetCount,0,'live: retired Reset control still exists');
assert.match(liveState.resetHref||'',/^reset\.html\?v=p72$/,'live: Reset project is not the p72 standalone reset');
assert.match(liveState.appEvents,/p72-20260812-final-lock/,'live: published site is not running p72');
assert.deepEqual(liveState.sticky,{position:'sticky',top:'64px'},'live: Preview is not sticky');

await page.locator('#autosaveToggle').setChecked(true);
await page.fill('#titleInput','LIVE RESET QA');
await page.locator('#titleInput').dispatchEvent('input');
await page.setInputFiles('#audioFile',{name:'live-must-disappear.wav',mimeType:'audio/wav',buffer:wavBuffer()});
await page.waitForFunction(()=>Number(document.querySelector('#audio')?.duration)>1);
await page.evaluate(async()=>{await saveProgress(true,false)});
assert.ok(await page.evaluate(()=>Number(document.querySelector('#audio')?.duration)>1),'live: test audio never loaded');
assert.ok(await page.evaluate(async()=>await loadMedia('audio') instanceof Blob),'live: test audio was not persisted');

await page.locator('#resetProjectVisible').click();
await page.waitForURL(/\/lyricvideovisualiser\/index\.html\?fresh=\d+$/,{timeout:30000});
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:30000});

assert.equal(await page.locator('#titleInput').inputValue(),'','live: Reset restored saved title');
assert.equal(await page.locator('#audioFile').inputValue(),'','live: Reset left audio file input populated');
assert.equal(await page.evaluate(()=>document.querySelector('#audio')?.currentSrc||document.querySelector('#audio')?.getAttribute('src')||''),'','live: Reset restored loaded audio');
assert.equal(await page.evaluate(()=>localStorage.getItem('lina.project.v2')),null,'live: Reset left saved project');
assert.equal(await page.evaluate(async()=>!!(await loadMedia('audio'))),false,'live: Reset left saved audio in IndexedDB');

await page.locator('#quickAdvanced').evaluate(el=>el.open=true);
await page.locator('#resetProjectVisible').scrollIntoViewIfNeeded();
await page.waitForTimeout(100);
const pinned=await page.locator('.stage-wrap').evaluate(el=>({top:el.getBoundingClientRect().top,scrollY:window.scrollY}));
assert.ok(pinned.scrollY>100,'live: page did not scroll far enough for sticky Preview test');
assert.ok(pinned.top>=62&&pinned.top<=66,`live: Preview did not stay pinned; top=${pinned.top}`);

assert.deepEqual(errors,[],`live: page errors ${errors.join(' | ')}`);
await browser.close();
console.log('LIVE GITHUB PAGES RESET + STICKY PREVIEW PASS');
