import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';

function wavBuffer(seconds=2.2,sampleRate=44100){
  const count=Math.floor(seconds*sampleRate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF',0);b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);return b;
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

  const system=await page.evaluate(()=>({owner:document.documentElement.dataset.systemOwner,audit:window.linaAuditSystem?.(),scripts:[...document.scripts].map(s=>s.src).filter(Boolean)}));
  assert.equal(system.owner,'canonical-unified-v1',`${name}: unified system owner missing`);
  assert.ok(system.audit&&!system.audit.missing.length,`${name}: unified system audit failed ${JSON.stringify(system.audit?.missing)}`);
  for(const retired of ['production-controls.js','control-audit.js','control-finish.js','preview-runtime.js','preview-recovery.js','layout-reset-fix.js','project-reset-button.js'])assert.equal(system.scripts.some(src=>src.includes(retired)),false,`${name}: retired controller still loaded: ${retired}`);
  assert.equal(await page.locator('#rightsConfirm').count(),0,`${name}: retired rights control returned`);
  assert.equal(await page.locator('#nav .navbtn[data-tool]').count(),5,`${name}: workflow tabs missing`);
  assert.equal(await page.locator('#resetProjectVisible').count(),1,`${name}: LINA must expose exactly one Reset control`);
  assert.equal(await page.locator('#quickResetLayout,#linaFreshReset,#resetLyricsBtn,#resetBtn').count(),0,`${name}: retired Reset control returned`);
  assert.match(await page.locator('#resetProjectVisible').getAttribute('href'),/^reset\.html\?v=/,`${name}: Reset project is not standalone`);

  await page.fill('#titleInput','QA Song');await page.fill('#artistInput','LINA');await page.fill('#albumInput','Stability');
  await page.setInputFiles('#audioFile',{name:'qa.wav',mimeType:'audio/wav',buffer:audio});
  await page.waitForFunction(()=>Number(document.querySelector('#audio')?.duration)>1.5);

  await page.click('#nav [data-tool="lyrics"]');
  await page.locator('.other-lyrics-methods').evaluate(el=>el.open=true);
  await page.selectOption('#syncMethod','importTimed');await page.waitForSelector('#pasteTimedBox:not(.hidden)');
  await page.fill('#lyricsText',timed);await page.click('#applyPaste');await page.waitForSelector('#reviewBox:not(.hidden)');await page.click('#confirmReview');
  await page.waitForFunction(()=>document.querySelectorAll('#timeline .line').length===3);

  await page.selectOption('#quickLyricsView','current');await page.evaluate(()=>window.render(900));
  assert.equal(await page.locator('#lyrics .apple-line').evaluateAll(es=>es.filter(e=>getComputedStyle(e).visibility!=='hidden').length),1,`${name}: current-only view failed`);
  await page.selectOption('#quickLyricsView','3');await page.evaluate(()=>window.render(900));

  for(const effect of ['apple','charli','eternal']){
    await page.selectOption('#quickEffect',effect);await page.waitForTimeout(60);
    assert.equal(await page.inputValue('#lyricEffect'),effect,`${name}: ${effect} effect did not reach canonical state`);
    assert.equal(await page.evaluate(()=>window.render===window.linaRuntime.render),true,`${name}: ${effect} replaced canonical renderer`);
    const ok=await page.evaluate(()=>{try{const c=document.createElement('canvas');c.width=320;c.height=180;drawApple(c.getContext('2d'),lines[0],900,320,180);return true}catch{return false}});
    assert.equal(ok,true,`${name}: ${effect} export renderer threw`);
  }
  await page.selectOption('#quickEffect','apple');

  await page.selectOption('#quickSize','44');assert.equal(await page.inputValue('#size'),'44',`${name}: text-size mirror failed`);
  await page.selectOption('#quickAlign','center');assert.equal(await page.inputValue('#textAlign'),'center',`${name}: alignment mirror failed`);
  await page.locator('#quickY').evaluate(el=>{el.value='62';el.dispatchEvent(new Event('input',{bubbles:true}))});assert.equal(await page.inputValue('#yPos'),'62',`${name}: vertical-position mirror failed`);
  await page.locator('#quickOffset').evaluate(el=>{el.value='350';el.dispatchEvent(new Event('input',{bubbles:true}))});assert.equal(await page.inputValue('#offset'),'350',`${name}: timing-offset mirror failed`);
  await page.locator('#quickTextColor').evaluate(el=>{el.value='#ff3366';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))});assert.equal(await page.inputValue('#textColor'),'#ff3366',`${name}: text-colour mirror failed`);

  await page.locator('#quickAdvanced').evaluate(el=>el.open=true);
  await page.selectOption('#quickWeight','900');assert.equal(await page.inputValue('#fontWeight'),'900',`${name}: weight mirror failed`);
  await page.selectOption('#quickCase','upper');assert.equal(await page.inputValue('#letterCase'),'upper',`${name}: case mirror failed`);
  await page.locator('#quickLineHeight').evaluate(el=>{el.value='1.18';el.dispatchEvent(new Event('input',{bubbles:true}))});assert.equal(await page.inputValue('#lineHeight'),'1.18',`${name}: line-height mirror failed`);
  await page.locator('#quickLetterSpacing').evaluate(el=>{el.value='0.03';el.dispatchEvent(new Event('input',{bubbles:true}))});assert.equal(await page.inputValue('#letterSpacing'),'0.03',`${name}: letter-spacing mirror failed`);

  const titleBefore=await page.isChecked('#quickTitle');await page.locator('#quickTitle').setChecked(!titleBefore);assert.equal(await page.isChecked('#showTitle'),!titleBefore,`${name}: title-card toggle failed`);await page.locator('#quickTitle').setChecked(titleBefore);
  await page.selectOption('#quickFrame','1:1');assert.equal(await page.inputValue('#aspect'),'1:1',`${name}: aspect mirror failed`);
  await page.selectOption('#quickQuality','720');assert.equal(await page.inputValue('#quality'),'720',`${name}: quality mirror failed`);

  await page.locator('#seek').evaluate(el=>{el.value='.9';el.dispatchEvent(new Event('input',{bubbles:true}))});await page.waitForFunction(()=>Math.abs(document.querySelector('#audio').currentTime-.9)<.2);
  await page.click('#stop');assert.ok(await page.evaluate(()=>document.querySelector('#audio').currentTime<.05),`${name}: Stop did not rewind`);

  await page.click('#nav [data-tool="review"]');
  assert.equal(await page.getAttribute('#nav [data-tool="review"]','aria-selected'),'true',`${name}: Review navigation failed`);
  assert.equal(await page.locator('.tool[data-panel].active').count(),0,`${name}: Review left a form panel active`);

  assert.deepEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  await browser.close();
  console.log(`${name}: CURRENT CONTROL MATRIX PASS`);
}
