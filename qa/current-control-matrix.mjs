import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';

function wavBuffer(seconds=2.2,sampleRate=44100){
  const count=Math.floor(seconds*sampleRate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF',0);b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
  return b;
}
const audio=wavBuffer();
const timed='[00:00.00] Hello world from LINA\n[00:00.80] Second lyric line here\n[00:01.55] Final lyric line';
const targets=[['chromium',chromium],['firefox',firefox],['webkit',webkit]];

for(const [name,type] of targets){
  const browser=await type.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',{timeout:20000});

  const audit=await page.evaluate(()=>window.linaControlAudit);
  assert.ok(audit&&!audit.missing.length,`${name}: control audit failed ${JSON.stringify(audit?.missing)}`);
  assert.equal(await page.locator('#nav .navbtn[data-tool]').count(),5,`${name}: workflow tabs missing`);

  await page.fill('#titleInput','QA Song');await page.fill('#artistInput','LINA');await page.fill('#albumInput','Stability');
  await page.setInputFiles('#audioFile',{name:'qa.wav',mimeType:'audio/wav',buffer:audio});
  await page.waitForFunction(()=>Number(document.querySelector('#audio')?.duration)>1.5);

  await page.click('#nav [data-tool="lyrics"]');
  await page.locator('.other-lyrics-methods').evaluate(el=>el.open=true);
  await page.selectOption('#syncMethod','importTimed');
  await page.waitForSelector('#pasteTimedBox:not(.hidden)');
  await page.fill('#lyricsText',timed);await page.click('#applyPaste');
  await page.waitForSelector('#reviewBox:not(.hidden)');await page.click('#confirmReview');
  await page.waitForFunction(()=>document.querySelectorAll('#timeline .line').length===3);

  await page.selectOption('#quickLyricsView','current');await page.evaluate(()=>window.render(900));
  assert.equal(await page.locator('#lyrics .apple-line').evaluateAll(es=>es.filter(e=>getComputedStyle(e).visibility!=='hidden').length),1,`${name}: current-only view failed`);
  await page.selectOption('#quickLyricsView','3');await page.evaluate(()=>window.render(900));

  await page.selectOption('#quickEffect','eternal');assert.equal(await page.inputValue('#lyricEffect'),'eternal',`${name}: effect switch failed`);
  await page.selectOption('#quickEffect','apple');assert.equal(await page.inputValue('#lyricEffect'),'apple',`${name}: Apple effect restore failed`);

  await page.selectOption('#quickSize','44');assert.equal(await page.inputValue('#size'),'44',`${name}: size mirror failed`);
  await page.locator('#quickY').evaluate(el=>{el.value='58';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.inputValue('#yPos'),'58',`${name}: vertical position mirror failed`);
  await page.locator('#quickOffset').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.inputValue('#offset'),'100',`${name}: timing offset mirror failed`);

  const titleBefore=await page.isChecked('#quickTitle');await page.locator('#quickTitle').setChecked(!titleBefore);assert.equal(await page.isChecked('#showTitle'),!titleBefore,`${name}: title-card toggle failed`);await page.locator('#quickTitle').setChecked(titleBefore);
  await page.selectOption('#quickFrame','1:1');assert.equal(await page.inputValue('#aspect'),'1:1',`${name}: aspect mirror failed`);
  await page.selectOption('#quickQuality','720');assert.equal(await page.inputValue('#quality'),'720',`${name}: quality mirror failed`);

  await page.locator('#seek').evaluate(el=>{el.value='.9';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForFunction(()=>Math.abs(document.querySelector('#audio').currentTime-.9)<.2);
  await page.click('#stop');assert.ok(await page.evaluate(()=>document.querySelector('#audio').currentTime<.05),`${name}: Stop did not rewind`);

  await page.click('#quickResetLayout');await page.waitForTimeout(100);
  assert.equal(await page.inputValue('#yPos'),'50',`${name}: layout reset failed`);

  await page.click('#nav [data-tool="review"]');
  assert.equal(await page.getAttribute('#nav [data-tool="review"]','aria-selected'),'true',`${name}: Review navigation failed`);
  assert.equal(await page.locator('.tool[data-panel].active').count(),0,`${name}: Review left a form panel active`);

  assert.deepEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  await browser.close();
  console.log(`${name}: CURRENT CONTROL MATRIX PASS`);
}
