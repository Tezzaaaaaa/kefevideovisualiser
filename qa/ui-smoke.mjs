import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const targets=[['chromium',chromium],['firefox',firefox],['webkit',webkit]];
const base='http://127.0.0.1:4173/';

for(const [name,type] of targets){
  const browser=await type.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('dialog',async d=>d.accept());
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>['true','false'].includes(document.documentElement.dataset.linaReady),null,{timeout:15000});

  const ready=await page.evaluate(()=>document.documentElement.dataset.linaReady);
  const audit=await page.evaluate(()=>window.linaControlAudit);
  assert.equal(ready,'true',`${name}: startup QA failed: ${JSON.stringify(audit)}`);
  assert.deepEqual(audit.signatureEffects.sort(),['apple','charli','eternal'],`${name}: signature effects missing`);
  assert.equal(audit.missing.length,0,`${name}: unbound controls: ${audit.missing.join(', ')}`);

  // Setup: user-supplied identity/artwork controls.
  await page.click('#nav [data-tool="setup"]');
  await page.fill('#titleInput','Hello Test');
  await page.fill('#artistInput','LINA QA');
  await page.fill('#albumInput','Control Pass');
  await page.selectOption('#titleDuration','2');
  const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="white"/></svg>');
  await page.setInputFiles('#userArtworkFile',{name:'art.svg',mimeType:'image/svg+xml',buffer:svg});
  await page.waitForFunction(()=>document.querySelector('#userArtworkPreview')?.classList.contains('on'));
  assert.equal(await page.isChecked('#userArtworkIntro'),true,`${name}: artwork intro default broken`);

  // Lyrics: timed import, review, editing and word controls.
  await page.click('#nav [data-tool="lyrics"]');
  await page.fill('#lyricsText','[00:00.00] Hello world\n[00:02.00] Second line');
  await page.click('#applyPaste');
  await page.waitForSelector('#reviewBox:not(.hidden)');
  await page.click('#confirmReview');
  await page.waitForFunction(()=>document.querySelectorAll('#timeline .line').length===2);
  assert.equal(await page.locator('#wordEditor .word-row button').count(),0,`${name}: dead word buttons remain`);
  assert.ok(await page.locator('#wordEditor .word-label').count()>0,`${name}: word editor labels missing`);

  const beforeAdd=await page.locator('#timeline .line').count();
  await page.click('#addLineAfter');
  assert.equal(await page.locator('#timeline .line').count(),beforeAdd+1,`${name}: add line failed`);
  await page.click('#duplicateLine');
  assert.equal(await page.locator('#timeline .line').count(),beforeAdd+2,`${name}: duplicate line failed`);
  await page.click('#deleteLine');
  assert.equal(await page.locator('#timeline .line').count(),beforeAdd+1,`${name}: delete line failed`);
  await page.click('#earlier');
  await page.click('#later');
  await page.click('#setNow');
  await page.click('#transportSync');
  await page.click('#transportEdit');
  await page.selectOption('#contextMode','5');

  // Style: each effect must visibly switch renderer and case control must apply.
  await page.click('#nav [data-tool="style"]');
  await page.click('.effect-option[data-effect="charli"]');
  assert.equal(await page.getAttribute('#story','data-lyric-effect'),'charli',`${name}: Charli button failed`);
  await page.selectOption('#letterCase','lower');
  await page.waitForSelector('.charli-card');
  assert.match((await page.textContent('.charli-card')).trim(),/hello world/i,`${name}: Charli renderer missing text`);
  assert.equal((await page.textContent('.charli-card')).trim(),'hello world',`${name}: Charli case control failed`);

  await page.click('.effect-option[data-effect="eternal"]');
  assert.equal(await page.getAttribute('#story','data-lyric-effect'),'eternal',`${name}: Eternal button failed`);
  await page.waitForSelector('.eternal-page');

  await page.click('.effect-option[data-effect="apple"]');
  assert.equal(await page.getAttribute('#story','data-lyric-effect'),'apple',`${name}: Apple button failed`);
  await page.waitForSelector('.apple-flow');

  await page.locator('#studioScale').evaluate(el=>{el.value='125';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.evaluate(()=>document.querySelector('#lyrics').style.getPropertyValue('--lina-scale')),'1.25',`${name}: scale control failed`);
  await page.locator('#studioRotation').evaluate(el=>{el.value='5';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.evaluate(()=>document.querySelector('#lyrics').style.getPropertyValue('--lina-rotation')),'5deg',`${name}: rotation control failed`);
  await page.click('#resetLyricsTransform');
  assert.equal(await page.evaluate(()=>document.querySelector('#lyrics').style.getPropertyValue('--lina-scale')),'1',`${name}: transform reset failed`);

  await page.locator('#size').evaluate(el=>{el.value='30';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.textContent('#sizeVal'),'30',`${name}: text size failed`);

  // Background controls and uploaded media.
  await page.click('#nav [data-tool="background"]');
  await page.setInputFiles('#bgImageFile',{name:'bg.svg',mimeType:'image/svg+xml',buffer:svg});
  await page.waitForFunction(()=>document.querySelector('#bg img'));
  await page.selectOption('#studioGradient','ocean');
  assert.match(await page.evaluate(()=>document.querySelector('#story').style.getPropertyValue('--lina-gradient')),/linear-gradient/,`${name}: gradient failed`);
  assert.equal(await page.textContent('#nextStep'),'Preview',`${name}: dead Review button still present`);
  await page.click('#nextStep');

  // Transport and export gates.
  await page.click('#stop');
  assert.match(await page.textContent('#topStatus'),/Stopped/i,`${name}: stop failed`);
  await page.uncheck('#rightsConfirm');
  await page.click('#exportBtn');
  assert.match(await page.textContent('#topStatus'),/Confirm media rights/i,`${name}: export rights gate failed`);
  await page.check('#rightsConfirm');
  await page.click('#exportBottomBtn');
  assert.match(await page.textContent('#topStatus'),/Add audio and synced lyrics/i,`${name}: export button not routed to exporter`);

  // Save action must change state rather than being a decorative button.
  await page.click('#saveProgressBtn');
  await page.waitForFunction(()=>document.querySelector('#saveProgressText')?.textContent==='Saved');

  assert.deepEqual(pageErrors,[],`${name}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log(`${name}: PASS`);
}

console.log('LINA UI smoke test: PASS');
