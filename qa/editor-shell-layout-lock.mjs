import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const base='http://127.0.0.1:4173/';
const browsers=[['chromium',chromium],['firefox',firefox],['webkit',webkit]];
const viewports=[
  ['desktop',{width:1440,height:900}],
  ['compact',{width:1100,height:800}],
  ['tablet',{width:820,height:1000}],
  ['mobile',{width:430,height:850}],
];
const box=async(page,sel)=>{const b=await page.locator(sel).boundingBox();assert.ok(b,`${sel} has no box`);return b};

for(const [browserName,type] of browsers){
  const browser=await type.launch({headless:true});
  for(const [vpName,viewport] of viewports){
    const page=await browser.newPage({viewport});
    await page.goto(base,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:20000});
    await page.waitForFunction(()=>document.documentElement.dataset.editorShell==='v1',null,{timeout:10000});

    const overflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));
    assert.ok(overflow.doc<=overflow.view+2,`${browserName}/${vpName}: horizontal page overflow ${overflow.doc}>${overflow.view}`);

    await page.click('#nav [data-tool="setup"]');
    const left=await box(page,'.left'),stage=await box(page,'.stage');
    assert.ok(left.width>=Math.min(290,viewport.width-30),`${browserName}/${vpName}: source inspector too narrow (${left.width})`);
    const rightDisplaySetup=await page.locator('.right').evaluate(el=>getComputedStyle(el).display);
    assert.equal(rightDisplaySetup,'none',`${browserName}/${vpName}: lyric inspector wastes space during Setup`);
    assert.ok(stage.width>=Math.min(390,viewport.width-20),`${browserName}/${vpName}: preview area too narrow (${stage.width})`);

    const flowDisplay=await page.locator('.flow-controls').evaluate(el=>getComputedStyle(el).display);
    assert.equal(flowDisplay,'none',`${browserName}/${vpName}: redundant Back/Next workflow bar returned`);
    const bottomExport=await page.locator('#exportBottomBtn').evaluate(el=>getComputedStyle(el).display);
    assert.equal(bottomExport,'none',`${browserName}/${vpName}: duplicate bottom Export action returned`);

    const previewControls=await box(page,'.preview-controls');
    if(previewControls.height>220){
      const diagnostic=await page.evaluate(()=>{
        const p=document.querySelector('.preview-controls'),g=document.querySelector('.preview-control-grid');
        const gp=getComputedStyle(g),pp=getComputedStyle(p);
        return {
          preview:{height:p.getBoundingClientRect().height,padding:pp.padding,display:pp.display},
          grid:{height:g.getBoundingClientRect().height,display:gp.display,rows:gp.gridTemplateRows,columns:gp.gridTemplateColumns,gap:gp.gap},
          children:[...g.children].map((el,i)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{i:i+1,height:r.height,width:r.width,display:s.display,gridRow:s.gridRow,gridColumn:s.gridColumn,minHeight:s.minHeight}}),
          densitySheet:[...document.styleSheets].some(s=>String(s.href||'').includes('editor-shell-density-fix.css'))
        };
      });
      console.log(`${browserName}/${vpName} PREVIEW DENSITY DIAGNOSTIC`,JSON.stringify(diagnostic));
    }
    assert.ok(previewControls.height<=220,`${browserName}/${vpName}: preview controls became oversized (${previewControls.height}px)`);
    const output=await box(page,'.stage-export');
    assert.ok(output.height<=190,`${browserName}/${vpName}: output settings became oversized (${output.height}px)`);
    for(const id of ['#transportPrevLine','#transportEdit','#transportSync','#transportNextLine']){
      const b=await box(page,id);assert.ok(b.width<=150,`${browserName}/${vpName}: ${id} stretched to ${b.width}px`);
    }

    await page.click('#nav [data-tool="lyrics"]');
    const rightDisplayLyrics=await page.locator('.right').evaluate(el=>getComputedStyle(el).display);
    assert.notEqual(rightDisplayLyrics,'none',`${browserName}/${vpName}: lyric inspector missing in Lyrics`);
    if(viewport.width>1280){
      const right=await box(page,'.right');
      assert.ok(right.width>=300&&right.width<=390,`${browserName}/${vpName}: lyric inspector width out of lock (${right.width}px)`);
      const lyricStage=await box(page,'.stage');
      assert.ok(lyricStage.width>=500,`${browserName}/${vpName}: canvas starved by sidebars (${lyricStage.width}px)`);
    }

    if(viewport.width<=900){
      const shell=await page.locator('.workspace').evaluate(el=>({display:getComputedStyle(el).display,direction:getComputedStyle(el).flexDirection}));
      assert.deepEqual(shell,{display:'flex',direction:'column'},`${browserName}/${vpName}: mobile shell is not a single column`);
      const stageMobile=await box(page,'.stage'),leftMobile=await box(page,'.left');
      assert.ok(stageMobile.y<leftMobile.y,`${browserName}/${vpName}: mobile preview is not first`);
      const navStyle=await page.locator('#nav').evaluate(el=>({position:getComputedStyle(el).position,bottom:getComputedStyle(el).bottom}));
      assert.equal(navStyle.position,'fixed',`${browserName}/${vpName}: mobile tool tabs are not fixed bottom navigation`);
      const bodyPad=await page.evaluate(()=>parseFloat(getComputedStyle(document.body).paddingBottom)||0);
      assert.ok(bodyPad>=60,`${browserName}/${vpName}: mobile bottom tabs have no reserved content space`);
      const active=await page.locator('[data-panel="lyrics"]').boundingBox();
      assert.ok(active&&active.width>=viewport.width-30,`${browserName}/${vpName}: mobile active inspector is squeezed`);
    }

    const wordDetails=page.locator('.inspector-disclosure');
    assert.equal(await wordDetails.count(),1,`${browserName}/${vpName}: optional word emphasis disclosure missing`);
    assert.equal(await wordDetails.getAttribute('open'),null,`${browserName}/${vpName}: optional word emphasis should start collapsed`);

    await page.close();
  }
  await browser.close();
  console.log(`${browserName}: EDITOR SHELL LAYOUT LOCK PASS`);
}
