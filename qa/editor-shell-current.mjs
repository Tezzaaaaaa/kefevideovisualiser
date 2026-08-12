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
    await page.waitForFunction(()=>document.querySelector('#previewQuickControls')&&document.documentElement.dataset.previewFinalise==='single-source',{timeout:20000});
    await page.click('#nav [data-tool="setup"]');

    const state=await page.evaluate(()=>{
      const b=s=>document.querySelector(s)?.getBoundingClientRect()||null;
      const css=(s,p)=>{const el=document.querySelector(s);return el?getComputedStyle(el)[p]:null};
      const tools=['#transportPrevLine','#transportSync','#transportNextLine'].map(b);
      return{
        workspace:{display:css('.workspace','display'),direction:css('.workspace','flexDirection')},
        navCount:document.querySelectorAll('#nav .navbtn[data-tool]').length,
        left:b('.left'),stage:b('.stage'),stageHead:b('.stage-head'),stageWrap:b('.stage-wrap'),transport:b('.transport'),tools:b('.transport-tools'),quick:b('#previewQuickControls'),
        oldPreviewParent:document.querySelector('.preview-controls')?.parentElement?.id||'',oldExportParent:document.querySelector('.stage-export')?.parentElement?.id||'',
        editDisplay:css('#transportEdit','display'),editExists:!!document.querySelector('#transportEdit'),toolBoxes:tools,
        quickGroups:document.querySelectorAll('#previewQuickControls > .quick-group').length,
        tweakOpen:document.querySelector('#tweakLyricsDetails')?.open||false,
        tweakOwnsInspector:!!document.querySelector('#tweakLyricsDetails .tweak-lyrics-body .right'),
        docWidth:document.documentElement.scrollWidth
      };
    });

    assert.deepEqual(state.workspace,{display:'flex',direction:'column'},`${browserName}/${vpName}: workspace is not vertical`);
    assert.equal(state.navCount,3,`${browserName}/${vpName}: Setup/Lyrics/Background tabs are not present`);
    assert.ok(state.left&&state.stage&&state.left.y<state.stage.y,`${browserName}/${vpName}: active workflow panel is not above Preview`);
    const minStageWidth=Math.min(400,viewport.width-56);
    assert.ok(state.stage.width>=minStageWidth,`${browserName}/${vpName}: Preview is squeezed (${state.stage?.width||0}px < ${minStageWidth}px)`);
    assert.ok(state.stageHead&&state.stageWrap&&state.transport&&state.tools&&state.quick,`${browserName}/${vpName}: Preview stack is incomplete`);
    assert.ok(state.stageHead.y<=state.stageWrap.y&&state.stageWrap.y<state.transport.y&&state.transport.y<state.tools.y&&state.tools.y<state.quick.y,`${browserName}/${vpName}: Preview/transport/control order regressed`);
    assert.equal(state.oldPreviewParent,'',`${browserName}/${vpName}: duplicate preview controls returned`);
    assert.equal(state.oldExportParent,'',`${browserName}/${vpName}: duplicate export controls returned`);
    assert.ok(!state.editExists||state.editDisplay==='none',`${browserName}/${vpName}: obsolete Edit transport button returned`);
    assert.equal(state.quickGroups,3,`${browserName}/${vpName}: Finalise groups changed`);
    assert.equal(state.tweakOpen,false,`${browserName}/${vpName}: Tweak lyrics should start collapsed`);
    assert.equal(state.tweakOwnsInspector,true,`${browserName}/${vpName}: lyric inspector is not inside collapsed Tweak lyrics`);
    assert.ok(state.docWidth<=viewport.width+2,`${browserName}/${vpName}: horizontal overflow ${state.docWidth}>${viewport.width}`);

    for(const b of state.toolBoxes)assert.ok(b&&b.width>=44&&b.height>=30,`${browserName}/${vpName}: transport tool collapsed`);
    assert.ok(Math.max(...state.toolBoxes.map(b=>b.y))-Math.min(...state.toolBoxes.map(b=>b.y))<=4,`${browserName}/${vpName}: Prev/Sync/Next are not on one row`);


    await page.close();
  }
  await browser.close();
  console.log(`${browserName}: CURRENT EDITOR SHELL PASS`);
}
