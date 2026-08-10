import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const base='http://127.0.0.1:4173/';
const browsers=[['chromium',chromium],['firefox',firefox],['webkit',webkit]];
const viewports=[
  ['desktop',{width:1440,height:900}],
  ['compact-desktop',{width:1100,height:800}],
  ['tablet',{width:820,height:1000}],
  ['mobile',{width:430,height:850}],
];
const controls=['#albumInput','#titleInput','#artistInput','label[for="userArtworkFile"]','label.upload:has(#audioFile)'];

async function assertUsable(page,name,viewport,selector){
  const el=page.locator(selector);
  await el.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest'}));
  await page.waitForTimeout(80);
  const box=await el.boundingBox();
  assert.ok(box,`${name}/${viewport}: ${selector} has no layout box`);
  assert.ok(box.width>=44,`${name}/${viewport}: ${selector} collapsed to ${box.width}px`);
  assert.ok(box.height>=30,`${name}/${viewport}: ${selector} collapsed to ${box.height}px`);
  const hit=await el.evaluate(node=>{
    const r=node.getBoundingClientRect();
    const x=Math.min(innerWidth-1,Math.max(0,r.left+r.width/2));
    const y=Math.min(innerHeight-1,Math.max(0,r.top+r.height/2));
    const top=document.elementFromPoint(x,y);
    return top===node||node.contains(top)||top?.closest('label')===node.closest('label');
  });
  assert.equal(hit,true,`${name}/${viewport}: ${selector} is covered by another element`);
}

for(const [name,type] of browsers){
  const browser=await type.launch({headless:true});
  for(const [vpName,viewport] of viewports){
    const page=await browser.newPage({viewport});
    await page.goto(base,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:20000});
    await page.click('#nav [data-tool="setup"]');

    await page.locator('.flow-controls').evaluate(el=>el.classList.add('workflow-floating'));
    const position=await page.locator('.flow-controls').evaluate(el=>getComputedStyle(el).position);
    assert.notEqual(position,'fixed',`${name}/${vpName}: workflow controls became a fixed overlay`);

    const setupOverflow=await page.locator('[data-panel="setup"]').evaluate(el=>getComputedStyle(el).overflow);
    assert.notEqual(setupOverflow,'hidden',`${name}/${vpName}: Setup panel clips its controls`);

    for(const selector of controls)await assertUsable(page,name,vpName,selector);

    const retiredSearch=await page.locator('.legacy-lookup-retired').count();
    assert.ok(retiredSearch>=1,`${name}/${vpName}: retired lookup unexpectedly returned to active Setup`);

    if(viewport.width<=900){
      const shell=await page.locator('.workspace').evaluate(el=>({display:getComputedStyle(el).display,direction:getComputedStyle(el).flexDirection}));
      assert.equal(shell.display,'flex',`${name}/${vpName}: narrow workspace is not the locked single-column flex shell`);
      assert.equal(shell.direction,'column',`${name}/${vpName}: narrow workspace is not column ordered`);
      const leftWidth=await page.locator('.left').evaluate(el=>el.getBoundingClientRect().width);
      assert.ok(leftWidth>=viewport.width-30,`${name}/${vpName}: Setup column is still squeezed (${leftWidth}px)`);
    }else{
      const leftWidth=await page.locator('.left').evaluate(el=>el.getBoundingClientRect().width);
      assert.ok(leftWidth>=290,`${name}/${vpName}: Setup column too narrow (${leftWidth}px)`);
    }

    await page.close();
  }
  await browser.close();
  console.log(`${name}: SETUP LAYOUT LOCK PASS`);
}
