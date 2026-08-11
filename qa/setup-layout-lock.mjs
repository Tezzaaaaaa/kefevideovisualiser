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
const controls=['#albumInput','#titleInput','#artistInput','label.upload:has(#audioFile)'];

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
    await page.waitForFunction(()=>{
      const panel=document.querySelector('[data-panel="setup"]');
      const stash=document.querySelector('#linaHiddenControlStash');
      return document.documentElement.dataset.setupStructure==='vertical-v2'&&
        !!panel?.querySelector('#audioFile')&&!!panel?.querySelector('#titleInput')&&!!panel?.querySelector('#artistInput')&&!!panel?.querySelector('#albumInput')&&
        !!stash?.querySelector('#showTitle')&&!!stash?.querySelector('#titleDuration')&&
        !panel?.querySelector('#userArtworkFile')&&!panel?.querySelector('#userArtworkIntro');
    },null,{timeout:10000});
    await page.click('#nav [data-tool="setup"]');

    const setup=page.locator('[data-panel="setup"]');
    assert.equal(await setup.locator('.setup-shell-section').count(),2,`${name}/${vpName}: Setup should contain only Audio and Track details sections`);
    assert.equal(await setup.locator('.setup-audio-drop-section').count(),1,`${name}/${vpName}: Add audio section is missing`);
    assert.equal(await setup.locator('.setup-details-grid').count(),1,`${name}/${vpName}: Track details grid is missing`);
    assert.equal(await setup.locator('#showTitle,#titleDuration').count(),0,`${name}/${vpName}: title-card controls returned to Setup`);
    assert.equal(await page.locator('#linaHiddenControlStash #showTitle').count(),1,`${name}/${vpName}: title-card toggle source is missing`);
    assert.equal(await page.locator('#linaHiddenControlStash #titleDuration').count(),1,`${name}/${vpName}: title-card duration source is missing`);
    assert.equal(await page.locator('#userArtworkFile,#userArtworkIntro,label[for="userArtworkFile"],.track-art').count(),0,`${name}/${vpName}: retired artwork controls returned`);

    const flow=page.locator('.flow-controls');
    if(await flow.count()){
      await flow.evaluate(el=>el.classList.add('workflow-floating'));
      const flowState=await flow.evaluate(el=>({position:getComputedStyle(el).position,display:getComputedStyle(el).display}));
      assert.notEqual(flowState.position,'fixed',`${name}/${vpName}: workflow controls became a fixed overlay`);
      assert.equal(flowState.display,'none',`${name}/${vpName}: redundant Back/Next workflow controls are visible`);
    }

    const setupOverflow=await setup.evaluate(el=>getComputedStyle(el).overflow);
    assert.notEqual(setupOverflow,'hidden',`${name}/${vpName}: Setup panel clips its controls`);

    for(const selector of controls)await assertUsable(page,name,vpName,selector);

    const albumBox=await page.locator('#albumInput').boundingBox();
    assert.ok(albumBox&&albumBox.width>=150,`${name}/${vpName}: Track details edit column is squeezed (${albumBox?.width||0}px)`);

    const setupBounds=await setup.evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right}});
    const visibleSetupOverflow=await setup.locator('input,select,textarea,button,.upload,.toggle').evaluateAll((els,bounds)=>els.filter(el=>{
      const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return false;
      const r=el.getBoundingClientRect();if(r.width<1||r.height<1)return false;
      return r.left<bounds.left-1||r.right>bounds.right+1;
    }).map(el=>({tag:el.tagName,id:el.id||'',className:el.className||'',left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})),setupBounds);
    assert.deepEqual(visibleSetupOverflow,[],`${name}/${vpName}: visible Setup controls overflow panel: ${JSON.stringify(visibleSetupOverflow)}`);

    const detailBounds=await setup.locator('.setup-details-grid').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right}});
    assert.ok(detailBounds.left>=setupBounds.left-1&&detailBounds.right<=setupBounds.right+1,`${name}/${vpName}: Track details overflow the Setup panel`);

    const retiredSearch=await page.locator('.legacy-lookup-retired').count();
    assert.ok(retiredSearch>=1,`${name}/${vpName}: retired lookup unexpectedly returned to active Setup`);

    if(viewport.width<=900){
      const shell=await page.locator('.workspace').evaluate(el=>({display:getComputedStyle(el).display,direction:getComputedStyle(el).flexDirection,box:el.getBoundingClientRect()}));
      assert.equal(shell.display,'flex',`${name}/${vpName}: narrow workspace is not the locked single-column flex shell`);
      assert.equal(shell.direction,'column',`${name}/${vpName}: narrow workspace is not column ordered`);
      assert.ok(Math.abs(shell.box.width-viewport.width)<=24,`${name}/${vpName}: workspace does not use viewport width (${shell.box.width}px of ${viewport.width}px)`);
      assert.ok(shell.box.left<=12,`${name}/${vpName}: workspace has unexplained left offset (${shell.box.left}px)`);

      const leftBox=await page.locator('.left').boundingBox();
      const setupBox=await setup.boundingBox();
      assert.ok(leftBox&&leftBox.width>=viewport.width-24,`${name}/${vpName}: Setup column is still squeezed (${leftBox?.width||0}px)`);
      assert.ok(setupBox&&setupBox.width>=viewport.width-24,`${name}/${vpName}: Setup panel is still squeezed (${setupBox?.width||0}px)`);
      assert.ok(leftBox.x<=12,`${name}/${vpName}: Setup has unexplained left offset (${leftBox.x}px)`);

      const navBox=await page.locator('#nav').boundingBox();
      assert.ok(navBox&&setupBox&&navBox.y+navBox.height<=setupBox.y+2,`${name}/${vpName}: navigation overlaps Setup panel`);

      const docWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
      assert.ok(docWidth<=viewport.width+2,`${name}/${vpName}: horizontal page overflow ${docWidth}>${viewport.width}`);

      if(viewport.width>=400)assert.ok(albumBox&&albumBox.width>=200,`${name}/${vpName}: Album / release is still squeezed (${albumBox?.width||0}px)`);
    }else{
      const leftWidth=await page.locator('.left').evaluate(el=>el.getBoundingClientRect().width);
      assert.ok(leftWidth>=430,`${name}/${vpName}: Setup column too narrow (${leftWidth}px)`);
    }

    await page.close();
  }
  await browser.close();
  console.log(`${name}: SETUP LAYOUT LOCK PASS`);
}
