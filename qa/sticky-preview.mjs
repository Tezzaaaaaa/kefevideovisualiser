import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';

const base='http://127.0.0.1:4173/';
const targets=[['chromium',chromium],['firefox',firefox],['webkit',webkit]];

for(const [name,type] of targets){
  const browser=await type.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',{timeout:20000});
  await page.locator('#quickAdvanced').evaluate(el=>el.open=true);

  const css=await page.locator('.stage-wrap').evaluate(el=>({position:getComputedStyle(el).position,top:getComputedStyle(el).top}));
  assert.equal(css.position,'sticky',`${name}: preview is not sticky`);
  assert.equal(css.top,'64px',`${name}: desktop sticky offset changed`);

  await page.locator('#resetProjectVisible').scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  const pinned=await page.locator('.stage-wrap').evaluate(el=>({top:el.getBoundingClientRect().top,scrollY:window.scrollY}));
  assert.ok(pinned.scrollY>100,`${name}: page did not scroll far enough to test sticky preview`);
  assert.ok(pinned.top>=62&&pinned.top<=66,`${name}: preview did not remain pinned while editing; top=${pinned.top}`);
  await browser.close();
}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto(base,{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',{timeout:20000});
await page.locator('#quickAdvanced').evaluate(el=>el.open=true);
const mobileCss=await page.locator('.stage-wrap').evaluate(el=>({position:getComputedStyle(el).position,top:getComputedStyle(el).top}));
assert.equal(mobileCss.position,'sticky','mobile: preview is not sticky');
assert.equal(mobileCss.top,'54px','mobile: sticky offset changed');
await page.locator('#resetProjectVisible').scrollIntoViewIfNeeded();
await page.waitForTimeout(80);
const mobilePinned=await page.locator('.stage-wrap').evaluate(el=>({top:el.getBoundingClientRect().top,scrollY:window.scrollY}));
assert.ok(mobilePinned.scrollY>100,'mobile: page did not scroll far enough to test sticky preview');
assert.ok(mobilePinned.top>=52&&mobilePinned.top<=56,`mobile: preview did not remain pinned; top=${mobilePinned.top}`);
await browser.close();

console.log('STICKY PREVIEW PASS');
