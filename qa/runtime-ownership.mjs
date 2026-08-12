import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';

const targets=[['chromium',chromium],['firefox',firefox],['webkit',webkit]];
const base='http://127.0.0.1:4173/';

for(const [name,type] of targets){
  const browser=await type.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.linaRuntime&&document.querySelector('#resetProjectVisible')?.dataset.linaOwner==='project-hard-v3',{timeout:15000});

  const ownership=await page.evaluate(()=>({
    renderOwner:document.documentElement.dataset.renderOwner,
    effectOwner:document.documentElement.dataset.effectOwner,
    layoutOwner:document.documentElement.dataset.layoutOwner,
    transportOwner:document.documentElement.dataset.transportOwner,
    sameRender:window.render===window.linaRuntime.render,
    previewRuntime:!!window.linaPreviewRuntime,
    previewRecovery:!!window.linaPreviewRecovery,
    quickEffectOwner:document.querySelector('#lyricEffect')?.dataset.linaOwner,
    projectResetOwner:document.querySelector('#resetProjectVisible')?.dataset.linaOwner,
    projectResetHref:document.querySelector('#resetProjectVisible')?.getAttribute('href'),
    oldResetCount:document.querySelectorAll('#quickResetLayout,#linaFreshReset,#resetLyricsBtn,#resetBtn').length,
    self:window.linaRuntime.selfTest()
  }));
  assert.equal(ownership.renderOwner,'canonical-v1',`${name}: canonical render owner missing`);
  assert.equal(ownership.effectOwner,'canonical-v1',`${name}: canonical effect owner missing`);
  assert.equal(ownership.layoutOwner,'canonical-v2-hard-reset',`${name}: canonical layout owner missing`);
  assert.match(ownership.transportOwner||'',/^canonical/,`${name}: canonical transport owner missing`);
  assert.equal(ownership.sameRender,true,`${name}: render() was wrapped after canonical runtime`);
  assert.equal(ownership.previewRuntime,false,`${name}: retired preview-runtime still loaded`);
  assert.equal(ownership.previewRecovery,false,`${name}: retired preview-recovery still loaded`);
  assert.equal(ownership.quickEffectOwner,'canonical',`${name}: visible effect control is not canonically owned`);
  assert.equal(ownership.projectResetOwner,'project-hard-v3',`${name}: project Reset is not the standalone hard reset`);
  assert.match(ownership.projectResetHref||'',/^reset\.html\?v=/,`${name}: project Reset does not route to standalone reset page`);
  assert.equal(ownership.oldResetCount,0,`${name}: a retired reset control is still present`);
  assert.deepEqual(ownership.self.contextModes,[1,3,5,7,9],`${name}: context parser regression`);

  await page.evaluate(()=>{
    lines=Array.from({length:9},(_,i)=>({text:`Line ${i+1}`,start:i*1000,duration:900,words:[{text:`Line${i+1}`,start:i*1000,duration:900,emphasis:1,hold:1}]}));
    sourceLines=lines.map(x=>({...x,words:x.words.map(w=>({...w}))}));
    sourceBase=sourceLines.map(x=>({...x,words:x.words.map(w=>({...w}))}));
    window.linaRuntime.setEffect('apple',{dirty:false,redraw:false});
    window.invalidateLinaMotion?.(true);window.render(4000);
  });

  for(const [mode,count] of [['current',1],['3',3],['5',5],['7',7],['9',9]]){
    await page.selectOption('#contextMode',mode);await page.evaluate(()=>window.render(4000));
    assert.equal(await page.inputValue('#contextMode'),mode,`${name}: Quick Lyrics View ${mode} did not update canonical source`);
    const visible=await page.locator('#lyrics .apple-line').evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).visibility!=='hidden').length);
    assert.equal(visible,count,`${name}: Lyrics View ${mode} rendered ${visible}, expected ${count}`);
  }

  await page.selectOption('#lyricEffect','eternal');await page.waitForTimeout(30);
  assert.equal(await page.inputValue('#lyricEffect'),'eternal',`${name}: Quick effect did not reach canonical state`);
  assert.equal(await page.evaluate(()=>window.render===window.linaRuntime.render),true,`${name}: Quick effect replaced canonical render()`);

  const effectState=await page.evaluate(()=>{
    window.linaRuntime.setEffect('eternal',{dirty:false,redraw:false});
    return{selected:document.querySelector('#lyricEffect').value,story:document.querySelector('#story').dataset.lyricEffect,studio:window.linaConsolidatedState.effect,sameRender:window.render===window.linaRuntime.render};
  });
  assert.deepEqual([effectState.selected,effectState.story,effectState.studio],Array(3).fill('eternal'),`${name}: effect state diverged`);
  assert.equal(effectState.sameRender,true,`${name}: effect state change replaced renderer`);
  assert.deepEqual(pageErrors,[],`${name}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
}

console.log('LINA canonical runtime ownership gate passed.');
