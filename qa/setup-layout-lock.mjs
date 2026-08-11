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
      const intro=document.querySelector('.consolidated-track .track-intro-settings');
      const track=document.querySelector('.consolidated-track');
      return !!intro&&!!intro.querySelector('#showTitle')&&!!intro.querySelector('#titleDuration')&&!track?.querySelector('#userArtworkFile')&&!track?.querySelector('#userArtworkIntro');
    },null,{timeout:10000});
    await page.click('#nav [data-tool="setup"]');

    await page.locator('.flow-controls').evaluate(el=>el.classList.add('workflow-floating'));
    const flowState=await page.locator('.flow-controls').evaluate(el=>({position:getComputedStyle(el).position,display:getComputedStyle(el).display}));
    assert.notEqual(flowState.position,'fixed',`${name}/${vpName}: workflow controls became a fixed overlay`);
    assert.equal(flowState.display,'none',`${name}/${vpName}: redundant Back/Next workflow controls are visible`);

    const setupOverflow=await page.locator('[data-panel="setup"]').evaluate(el=>getComputedStyle(el).overflow);
    assert.notEqual(setupOverflow,'hidden',`${name}/${vpName}: Setup panel clips its controls`);

    for(const selector of controls)await assertUsable(page,name,vpName,selector);

    const track=page.locator('.consolidated-track');
    const intro=track.locator('.track-intro-settings');
    assert.equal(await intro.count(),1,`${name}/${vpName}: repaired intro settings row is missing`);
    assert.equal(await intro.locator('#showTitle').count(),1,`${name}/${vpName}: title toggle was not moved into full-width intro row`);
    assert.equal(await intro.locator('#titleDuration').count(),1,`${name}/${vpName}: intro duration was not moved into full-width intro row`);
    assert.equal(await track.locator('.track-art,#userArtworkFile,#userArtworkIntro,label[for="userArtworkFile"]').count(),0,`${name}/${vpName}: artwork controls returned to Track Identity`);

    const albumBox=await page.locator('#albumInput').boundingBox();
    assert.ok(albumBox&&albumBox.width>=150,`${name}/${vpName}: Track identity edit column is still squeezed (${albumBox?.width||0}px)`);

    const setupBounds=await page.locator('[data-panel="setup"]').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right}});
    const visibleSetupOverflow=await page.locator('[data-panel="setup"] input,[data-panel="setup"] select,[data-panel="setup"] textarea,[data-panel="setup"] button,[data-panel="setup"] .upload,[data-panel="setup"] .toggle').evaluateAll((els,bounds)=>els.filter(el=>{
      const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return false;
      const r=el.getBoundingClientRect();if(r.width<1||r.height<1)return false;
      return r.left<bounds.left-1||r.right>bounds.right+1;
    }).map(el=>({tag:el.tagName,id:el.id||'',className:el.className||'',left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})),setupBounds);
    assert.deepEqual(visibleSetupOverflow,[],`${name}/${vpName}: visible Setup controls overflow panel: ${JSON.stringify(visibleSetupOverflow)}`);

    const trackBounds=await track.evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right}});
    const fieldsBounds=await track.locator('.track-fields').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right}});
    assert.ok(fieldsBounds.left>=trackBounds.left-1&&fieldsBounds.right<=trackBounds.right+1,`${name}/${vpName}: Track identity fields overflow the Setup panel`);

    const retiredSearch=await page.locator('.legacy-lookup-retired').count();
    assert.ok(retiredSearch>=1,`${name}/${vpName}: retired lookup unexpectedly returned to active Setup`);

    if(viewport.width<=900){
      const shell=await page.locator('.workspace').evaluate(el=>({display:getComputedStyle(el).display,direction:getComputedStyle(el).flexDirection,box:el.getBoundingClientRect()}));
      assert.equal(shell.display,'flex',`${name}/${vpName}: narrow workspace is not the locked single-column flex shell`);
      assert.equal(shell.direction,'column',`${name}/${vpName}: narrow workspace is not column ordered`);
      assert.ok(Math.abs(shell.box.width-viewport.width)<=24,`${name}/${vpName}: workspace does not use viewport width (${shell.box.width}px of ${viewport.width}px)`);
      assert.ok(shell.box.left<=12,`${name}/${vpName}: workspace has unexplained left offset (${shell.box.left}px)`);

      const leftBox=await page.locator('.left').boundingBox();
      const setupBox=await page.locator('[data-panel="setup"]').boundingBox();
      assert.ok(leftBox&&leftBox.width>=viewport.width-24,`${name}/${vpName}: Setup column is still squeezed (${leftBox?.width||0}px)`);
      assert.ok(setupBox&&setupBox.width>=viewport.width-24,`${name}/${vpName}: Setup panel is still squeezed (${setupBox?.width||0}px)`);
      assert.ok(leftBox.left<=12,`${name}/${vpName}: Setup has unexplained left offset (${leftBox.left}px)`);

      const navBox=await page.locator('#nav').boundingBox();
      assert.ok(navBox&&setupBox&&navBox.y+navBox.height<=setupBox.y+2,`${name}/${vpName}: navigation overlaps Setup panel`);

      const docWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
      assert.ok(docWidth<=viewport.width+2,`${name}/${vpName}: horizontal page overflow ${docWidth}>${viewport.width}`);

      if(viewport.width>=400){
        assert.ok(albumBox&&albumBox.width>=200,`${name}/${vpName}: Album / release is still squeezed (${albumBox?.width||0}px)`);
      }

      if(viewport.width<=560){
        const introBox=await intro.boundingBox();
        const introChildren=await intro.locator(':scope > label').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{width:r.width,left:r.left,right:r.right}}));
        assert.ok(introBox,`${name}/${vpName}: intro settings have no box`);
        for(const row of introChildren){
          assert.ok(row.width>=introBox.width-4,`${name}/${vpName}: phone intro control is not full-width (${row.width}px vs ${introBox.width}px)`);
        }
      }
    }else{
      const leftWidth=await page.locator('.left').evaluate(el=>el.getBoundingClientRect().width);
      assert.ok(leftWidth>=430,`${name}/${vpName}: Setup column too narrow (${leftWidth}px)`);
    }

    await page.close();
  }
  await browser.close();
  console.log(`${name}: SETUP LAYOUT LOCK PASS`);
}
