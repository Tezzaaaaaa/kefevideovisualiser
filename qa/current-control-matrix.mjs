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

  const system=await page.evaluate(()=>({owner:document.documentElement.dataset.systemOwner,audit:window.linaAuditSystem?.(),scripts:[...document.scripts].map(s=>s.src).filter(Boolean)}));
  assert.equal(system.owner,'canonical-unified-v1',`${name}: unified system owner missing`);
  assert.ok(system.audit&&!system.audit.missing.length,`${name}: unified system audit failed ${JSON.stringify(system.audit?.missing)}`);
  for(const retired of ['production-controls.js','control-audit.js','control-finish.js','preview-runtime.js','preview-recovery.js','layout-reset-fix.js']){
    assert.equal(system.scripts.some(src=>src.includes(retired)),false,`${name}: retired controller still loaded: ${retired}`);
  }
  assert.equal(await page.locator('#rightsConfirm').count(),0,`${name}: retired rights control returned`);
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

  await page.selectOption('#quickFrame','16:9');
  await page.selectOption('#quickSize','68');
  await page.selectOption('#quickLyricsView','9');
  await page.selectOption('#quickAlign','right');
  await page.locator('#quickY').evaluate(el=>{el.value='70';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.locator('#quickLineHeight').evaluate(el=>{el.value='1.25';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.locator('#quickLetterSpacing').evaluate(el=>{el.value='0.05';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.evaluate(()=>{const s=window.linaConsolidatedState;s.x=120;s.y=-40;s.scale=1.4;s.rot=8;document.querySelector('#lyrics').style.setProperty('--lina-drag-x','120px');document.querySelector('#lyrics').style.setProperty('--lina-drag-y','-40px');document.querySelector('#lyrics').style.setProperty('--lina-scale','1.4');document.querySelector('#lyrics').style.setProperty('--lina-rotation','8deg')});

  await page.click('#quickResetLayout');
  await page.waitForTimeout(650);
  const reset=await page.evaluate(()=>({
    size:document.querySelector('#size')?.value,
    quickSize:document.querySelector('#quickSize')?.value,
    y:document.querySelector('#yPos')?.value,
    quickY:document.querySelector('#quickY')?.value,
    view:document.querySelector('#contextMode')?.value,
    quickView:document.querySelector('#quickLyricsView')?.value,
    align:document.querySelector('#textAlign')?.value,
    quickAlign:document.querySelector('#quickAlign')?.value,
    lh:document.querySelector('#lineHeight')?.value,
    qlh:document.querySelector('#quickLineHeight')?.value,
    spacing:document.querySelector('#letterSpacing')?.value,
    qspacing:document.querySelector('#quickLetterSpacing')?.value,
    top:getComputedStyle(document.querySelector('#lyrics')).top,
    inlineTop:document.querySelector('#lyrics')?.style.top,
    inlineSize:document.querySelector('#lyrics')?.style.fontSize,
    x:window.linaConsolidatedState.x,yDrag:window.linaConsolidatedState.y,scale:window.linaConsolidatedState.scale,rot:window.linaConsolidatedState.rot,
    resetOwner:document.querySelector('#quickResetLayout')?.dataset.linaOwner
  }));
  assert.equal(reset.size,'32',`${name}: visible Reset did not restore Apple desktop size`);
  assert.equal(reset.quickSize,'32',`${name}: visible Reset quick size mirror failed`);
  assert.equal(reset.y,'50',`${name}: visible Reset vertical source failed`);
  assert.equal(reset.quickY,'50',`${name}: visible Reset vertical mirror failed`);
  assert.equal(reset.view,'5',`${name}: visible Reset lyric view failed`);
  assert.equal(reset.quickView,'5',`${name}: visible Reset lyric view mirror failed`);
  assert.equal(reset.align,'left',`${name}: visible Reset alignment failed`);
  assert.equal(reset.quickAlign,'left',`${name}: visible Reset alignment mirror failed`);
  assert.equal(reset.lh,'1.02',`${name}: visible Reset line height failed`);
  assert.equal(reset.qlh,'1.02',`${name}: visible Reset line height mirror failed`);
  assert.equal(reset.spacing,'-0.02',`${name}: visible Reset letter spacing failed`);
  assert.equal(reset.qspacing,'-0.02',`${name}: visible Reset letter spacing mirror failed`);
  assert.equal(reset.inlineTop,'50%',`${name}: visible Reset preview top failed`);
  assert.equal(reset.inlineSize,'32px',`${name}: visible Reset preview size failed`);
  assert.deepEqual([reset.x,reset.yDrag,reset.scale,reset.rot],[0,0,1,0],`${name}: visible Reset transform failed`);
  assert.equal(reset.resetOwner,'canonical',`${name}: visible Reset lost canonical ownership`);

  await page.locator('#quickOffset').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.inputValue('#offset'),'100',`${name}: timing offset mirror failed`);
  const titleBefore=await page.isChecked('#quickTitle');await page.locator('#quickTitle').setChecked(!titleBefore);assert.equal(await page.isChecked('#showTitle'),!titleBefore,`${name}: title-card toggle failed`);await page.locator('#quickTitle').setChecked(titleBefore);
  await page.selectOption('#quickFrame','1:1');assert.equal(await page.inputValue('#aspect'),'1:1',`${name}: aspect mirror failed`);
  await page.selectOption('#quickQuality','720');assert.equal(await page.inputValue('#quality'),'720',`${name}: quality mirror failed`);

  await page.locator('#seek').evaluate(el=>{el.value='.9';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForFunction(()=>Math.abs(document.querySelector('#audio').currentTime-.9)<.2);
  await page.click('#stop');assert.ok(await page.evaluate(()=>document.querySelector('#audio').currentTime<.05),`${name}: Stop did not rewind`);

  for(const effect of ['apple','charli','eternal']){
    await page.selectOption('#quickEffect',effect);
    const ok=await page.evaluate(()=>{try{const c=document.createElement('canvas');c.width=320;c.height=180;const ctx=c.getContext('2d');drawApple(ctx,lines[0],900,320,180);return true}catch{return false}});
    assert.equal(ok,true,`${name}: ${effect} export renderer threw`);
  }
  await page.selectOption('#quickEffect','apple');

  await page.click('#nav [data-tool="review"]');
  assert.equal(await page.getAttribute('#nav [data-tool="review"]','aria-selected'),'true',`${name}: Review navigation failed`);
  assert.equal(await page.locator('.tool[data-panel].active').count(),0,`${name}: Review left a form panel active`);

  assert.deepEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  await browser.close();
  console.log(`${name}: CURRENT UNIFIED CONTROL MATRIX PASS`);
}