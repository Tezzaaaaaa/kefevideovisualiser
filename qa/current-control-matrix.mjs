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
const resetDefaults={
  apple:{size:'32',font:'apple-system',weight:'700',align:'left',lh:'1.02',spacing:'-0.02',view:'5'},
  charli:{size:'34',font:'charli-condensed',weight:'900',align:'center',lh:'0.84',spacing:'-0.055',view:'current'},
  eternal:{size:'30',font:'eternal-reenie',weight:'400',align:'left',lh:'1.02',spacing:'0.005',view:'5'}
};
const alternateFont={apple:'avenir',charli:'charli-black',eternal:'eternal-grace'};
const alternateWeight={apple:'900',charli:'600',eternal:'700'};

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

  await page.selectOption('#quickFrame','16:9');
  await page.locator('#quickOffset').evaluate(el=>{el.value='350';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.inputValue('#offset'),'350',`${name}: timing offset setup failed`);
  await page.locator('#quickAdvanced').evaluate(el=>el.open=true);

  for(const effect of ['apple','charli','eternal']){
    const d=resetDefaults[effect];
    await page.selectOption('#quickEffect',effect);
    await page.waitForTimeout(60);
    await page.selectOption('#quickFont',alternateFont[effect]);
    await page.selectOption('#quickWeight',alternateWeight[effect]);
    await page.selectOption('#quickSize','68');
    await page.selectOption('#quickLyricsView','9');
    await page.selectOption('#quickAlign','right');
    await page.selectOption('#quickCase','upper');
    await page.locator('#quickTextColor').evaluate(el=>{el.value='#ff3366';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))});
    await page.locator('#quickGlow').evaluate(el=>{el.value='160';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await page.locator('#quickY').evaluate(el=>{el.value='70';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await page.locator('#quickLineHeight').evaluate(el=>{el.value='1.25';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await page.locator('#quickLetterSpacing').evaluate(el=>{el.value='0.05';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await page.evaluate(()=>{
      const s=window.linaConsolidatedState;s.x=120;s.y=-40;s.scale=1.4;s.rot=8;
      const l=document.querySelector('#lyrics');l.style.setProperty('--lina-drag-x','120px');l.style.setProperty('--lina-drag-y','-40px');l.style.setProperty('--lina-scale','1.4');l.style.setProperty('--lina-rotation','8deg');
    });

    const beforeCount=await page.evaluate(()=>window.linaRuntime.state.resetCount);
    await page.click('#quickResetLayout');
    await page.waitForTimeout(750);
    const reset=await page.evaluate(()=>({
      effect:document.querySelector('#lyricEffect')?.value,
      size:document.querySelector('#size')?.value,quickSize:document.querySelector('#quickSize')?.value,
      y:document.querySelector('#yPos')?.value,quickY:document.querySelector('#quickY')?.value,
      view:document.querySelector('#contextMode')?.value,quickView:document.querySelector('#quickLyricsView')?.value,
      font:document.querySelector('#fontChoice')?.value,quickFont:document.querySelector('#quickFont')?.value,
      weight:document.querySelector('#fontWeight')?.value,quickWeight:document.querySelector('#quickWeight')?.value,
      align:document.querySelector('#textAlign')?.value,quickAlign:document.querySelector('#quickAlign')?.value,
      lh:document.querySelector('#lineHeight')?.value,qlh:document.querySelector('#quickLineHeight')?.value,
      spacing:document.querySelector('#letterSpacing')?.value,qspacing:document.querySelector('#quickLetterSpacing')?.value,
      color:document.querySelector('#textColor')?.value,quickColor:document.querySelector('#quickTextColor')?.value,
      letterCase:document.querySelector('#letterCase')?.value,quickCase:document.querySelector('#quickCase')?.value,
      glow:document.querySelector('#glow')?.value,quickGlow:document.querySelector('#quickGlow')?.value,
      offset:document.querySelector('#offset')?.value,aspect:document.querySelector('#aspect')?.value,
      inlineTop:document.querySelector('#lyrics')?.style.top,inlineSize:document.querySelector('#lyrics')?.style.fontSize,
      textTransform:document.querySelector('#lyrics')?.style.textTransform,
      accent:document.documentElement.style.getPropertyValue('--accent').trim(),
      dragX:document.querySelector('#lyrics')?.style.getPropertyValue('--lina-drag-x'),dragY:document.querySelector('#lyrics')?.style.getPropertyValue('--lina-drag-y'),
      scaleVar:document.querySelector('#lyrics')?.style.getPropertyValue('--lina-scale'),rotVar:document.querySelector('#lyrics')?.style.getPropertyValue('--lina-rotation'),
      x:window.linaConsolidatedState.x,yDrag:window.linaConsolidatedState.y,scale:window.linaConsolidatedState.scale,rot:window.linaConsolidatedState.rot,
      resetCount:window.linaRuntime.state.resetCount,resetOwner:document.querySelector('#quickResetLayout')?.dataset.linaOwner
    }));

    assert.equal(reset.effect,effect,`${name}/${effect}: Reset changed the selected effect`);
    assert.equal(reset.size,d.size,`${name}/${effect}: Reset size failed`);assert.equal(reset.quickSize,d.size,`${name}/${effect}: Reset quick size mirror failed`);
    assert.equal(reset.y,'50',`${name}/${effect}: Reset vertical position failed`);assert.equal(reset.quickY,'50',`${name}/${effect}: Reset vertical mirror failed`);
    assert.equal(reset.view,d.view,`${name}/${effect}: Reset lyric view failed`);assert.equal(reset.quickView,d.view,`${name}/${effect}: Reset lyric view mirror failed`);
    assert.equal(reset.font,d.font,`${name}/${effect}: Reset font failed`);assert.equal(reset.quickFont,d.font,`${name}/${effect}: Reset font mirror failed`);
    assert.equal(reset.weight,d.weight,`${name}/${effect}: Reset weight failed`);assert.equal(reset.quickWeight,d.weight,`${name}/${effect}: Reset weight mirror failed`);
    assert.equal(reset.align,d.align,`${name}/${effect}: Reset alignment failed`);assert.equal(reset.quickAlign,d.align,`${name}/${effect}: Reset alignment mirror failed`);
    assert.equal(reset.lh,d.lh,`${name}/${effect}: Reset line height failed`);assert.equal(reset.qlh,d.lh,`${name}/${effect}: Reset line height mirror failed`);
    assert.equal(reset.spacing,d.spacing,`${name}/${effect}: Reset letter spacing failed`);assert.equal(reset.qspacing,d.spacing,`${name}/${effect}: Reset letter spacing mirror failed`);
    assert.equal(reset.color,'#ffffff',`${name}/${effect}: Reset colour failed`);assert.equal(reset.quickColor,'#ffffff',`${name}/${effect}: Reset colour mirror failed`);
    assert.equal(reset.letterCase,'original',`${name}/${effect}: Reset case failed`);assert.equal(reset.quickCase,'original',`${name}/${effect}: Reset case mirror failed`);
    assert.equal(reset.glow,'100',`${name}/${effect}: Reset glow failed`);assert.equal(reset.quickGlow,'100',`${name}/${effect}: Reset glow mirror failed`);
    assert.equal(reset.offset,'350',`${name}/${effect}: Reset incorrectly changed lyric timing`);assert.equal(reset.aspect,'16:9',`${name}/${effect}: Reset incorrectly changed aspect ratio`);
    assert.equal(reset.inlineTop,'50%',`${name}/${effect}: Reset preview top failed`);assert.equal(reset.inlineSize,`${d.size}px`,`${name}/${effect}: Reset preview size failed`);
    assert.equal(reset.textTransform,'none',`${name}/${effect}: Reset preview case style failed`);assert.equal(reset.accent,'#ffffff',`${name}/${effect}: Reset preview colour variable failed`);
    assert.deepEqual([reset.dragX,reset.dragY,reset.scaleVar,reset.rotVar],['0px','0px','1','0deg'],`${name}/${effect}: Reset preview transform variables failed`);
    assert.deepEqual([reset.x,reset.yDrag,reset.scale,reset.rot],[0,0,1,0],`${name}/${effect}: Reset shared transform state failed`);
    assert.equal(reset.resetCount,beforeCount+1,`${name}/${effect}: visible Reset handler did not run exactly once`);
    assert.equal(reset.resetOwner,'canonical',`${name}/${effect}: visible Reset lost canonical ownership`);
  }

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
  console.log(`${name}: CURRENT HARD-RESET CONTROL MATRIX PASS`);
}