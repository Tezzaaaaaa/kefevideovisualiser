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
    await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true'&&document.documentElement.dataset.quickControlsOrder==='priority-v2',{timeout:20000});
    await page.click('#nav [data-tool="setup"]');

    const state=await page.evaluate(()=>{
      const b=s=>document.querySelector(s)?.getBoundingClientRect()||null;
      const css=(s,p)=>getComputedStyle(document.querySelector(s))[p];
      const tools=['#transportPrevLine','#transportSync','#transportNextLine'].map(b);
      return{
        workspace:{display:css('.workspace','display'),direction:css('.workspace','flexDirection')},
        navCount:document.querySelectorAll('#nav .navbtn[data-tool]').length,
        left:b('.left'),stage:b('.stage'),stageHead:b('.stage-head'),stageWrap:b('.stage-wrap'),transport:b('.transport'),tools:b('.transport-tools'),quick:b('#previewQuickControls'),
        oldPreviewParent:document.querySelector('.preview-controls')?.parentElement?.id||'',oldExportParent:document.querySelector('.stage-export')?.parentElement?.id||'',
        editDisplay:css('#transportEdit','display'),toolBoxes:tools,
        quickGroups:document.querySelectorAll('#previewQuickControls > .quick-group').length,
        advancedOpen:document.querySelector('#quickAdvanced')?.open||false,
        fineOwnsInspector:!!document.querySelector('#quickFineTiming .quick-fine-body .right'),
        docWidth:document.documentElement.scrollWidth
      };
    });

    assert.deepEqual(state.workspace,{display:'flex',direction:'column'},`${browserName}/${vpName}: workspace is not vertical`);
    assert.equal(state.navCount,5,`${browserName}/${vpName}: five workflow tabs are not present`);
    assert.ok(state.left&&state.stage&&state.left.y<state.stage.y,`${browserName}/${vpName}: active workflow panel is not above Preview`);
    assert.ok(state.stage.width>=Math.min(400,viewport.width-24),`${browserName}/${vpName}: Preview is squeezed`);
    assert.ok(state.stageHead&&state.stageWrap&&state.transport&&state.tools&&state.quick,`${browserName}/${vpName}: Preview stack is incomplete`);
    assert.ok(state.stageHead.y<=state.stageWrap.y&&state.stageWrap.y<state.transport.y&&state.transport.y<state.tools.y&&state.tools.y<state.quick.y,`${browserName}/${vpName}: Preview/transport/control order regressed`);
    assert.equal(state.oldPreviewParent,'linaQuickSourceStash',`${browserName}/${vpName}: legacy preview controls escaped the hidden source stash`);
    assert.equal(state.oldExportParent,'linaQuickSourceStash',`${browserName}/${vpName}: legacy output controls escaped the hidden source stash`);
    assert.equal(state.editDisplay,'none',`${browserName}/${vpName}: obsolete Edit transport button returned`);
    assert.equal(state.quickGroups,5,`${browserName}/${vpName}: priority Quick Settings groups changed`);
    assert.equal(state.advancedOpen,false,`${browserName}/${vpName}: Advanced controls should start collapsed`);
    assert.equal(state.fineOwnsInspector,true,`${browserName}/${vpName}: detailed lyric inspector is not inside Fine timing`);
    assert.ok(state.docWidth<=viewport.width+2,`${browserName}/${vpName}: horizontal overflow ${state.docWidth}>${viewport.width}`);

    for(const b of state.toolBoxes)assert.ok(b&&b.width>=44&&b.height>=30,`${browserName}/${vpName}: transport tool collapsed`);
    assert.ok(Math.max(...state.toolBoxes.map(b=>b.y))-Math.min(...state.toolBoxes.map(b=>b.y))<=4,`${browserName}/${vpName}: Prev/Sync/Next are not on one row`);

    await page.click('#nav [data-tool="review"]');
    const review=await page.evaluate(()=>({active:document.querySelector('#nav .navbtn.active')?.dataset.tool,activePanels:document.querySelectorAll('.tool[data-panel].active').length,destination:document.documentElement.dataset.reviewDestination}));
    assert.deepEqual(review,{active:'review',activePanels:0,destination:'quick-controls'},`${browserName}/${vpName}: Review does not target production controls`);

    await page.close();
  }
  await browser.close();
  console.log(`${browserName}: CURRENT EDITOR SHELL PASS`);
}
