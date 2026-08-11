import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';

const base='http://127.0.0.1:4173/';
const browsers=[['chromium',chromium],['firefox',firefox],['webkit',webkit]];
const viewports=[['desktop',{width:1440,height:900}],['compact',{width:1100,height:800}],['tablet',{width:820,height:1000}],['mobile',{width:430,height:850}]];

for(const [browserName,type] of browsers){
  const browser=await type.launch({headless:true});
  for(const [vpName,viewport] of viewports){
    const page=await browser.newPage({viewport});
    await page.goto(base,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true'&&document.documentElement.dataset.setupStructure==='vertical-v2',{timeout:20000});
    await page.click('#nav [data-tool="setup"]');

    const state=await page.evaluate(()=>{
      const setup=document.querySelector('[data-panel="setup"]');
      const workspace=document.querySelector('.workspace');
      const nav=document.querySelector('#nav');
      const flow=setup?.querySelector('.flow-controls.workflow-inline');
      const box=el=>el?el.getBoundingClientRect():null;
      return{
        workspace:{display:getComputedStyle(workspace).display,direction:getComputedStyle(workspace).flexDirection},
        sections:setup?.querySelectorAll('.setup-shell-section').length||0,
        audio:!!setup?.querySelector('#audioFile'),title:!!setup?.querySelector('#titleInput'),artist:!!setup?.querySelector('#artistInput'),album:!!setup?.querySelector('#albumInput'),
        titleInSetup:!!setup?.querySelector('#showTitle,#titleDuration'),
        titleInStash:!!document.querySelector('#linaHiddenControlStash #showTitle')&&!!document.querySelector('#linaHiddenControlStash #titleDuration'),
        artwork:document.querySelectorAll('#userArtworkFile,#userArtworkIntro,label[for="userArtworkFile"],.track-art').length,
        flow:flow?{display:getComputedStyle(flow).display,position:getComputedStyle(flow).position}:null,
        setupBox:box(setup),navBox:box(nav),docWidth:document.documentElement.scrollWidth
      };
    });

    assert.deepEqual(state.workspace,{display:'flex',direction:'column'},`${browserName}/${vpName}: workspace is not vertical`);
    assert.equal(state.sections,2,`${browserName}/${vpName}: Setup should contain Audio + Track details only`);
    assert.ok(state.audio&&state.title&&state.artist&&state.album,`${browserName}/${vpName}: required Setup controls missing`);
    assert.equal(state.titleInSetup,false,`${browserName}/${vpName}: title-card controls returned to Setup`);
    assert.equal(state.titleInStash,true,`${browserName}/${vpName}: title-card source controls missing`);
    assert.equal(state.artwork,0,`${browserName}/${vpName}: retired artwork controls returned`);
    assert.ok(state.flow&&state.flow.display!=='none'&&state.flow.position!=='fixed',`${browserName}/${vpName}: inline workflow controls are not usable`);
    assert.ok(state.setupBox&&state.setupBox.width>=Math.min(400,viewport.width-24),`${browserName}/${vpName}: Setup is squeezed`);
    assert.ok(state.navBox&&state.navBox.y+state.navBox.height<=state.setupBox.y+6,`${browserName}/${vpName}: navigation overlaps Setup`);
    assert.ok(state.docWidth<=viewport.width+2,`${browserName}/${vpName}: horizontal overflow ${state.docWidth}>${viewport.width}`);

    for(const selector of ['#titleInput','#artistInput','#albumInput','label.upload:has(#audioFile)']){
      const b=await page.locator(selector).boundingBox();
      assert.ok(b&&b.width>=44&&b.height>=30,`${browserName}/${vpName}: ${selector} collapsed`);
    }
    await page.close();
  }
  await browser.close();
  console.log(`${browserName}: CURRENT SETUP LAYOUT PASS`);
}
