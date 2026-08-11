import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';

const targets=[['chromium',chromium],['firefox',firefox],['webkit',webkit]];
const base='http://127.0.0.1:4173/';

for(const [name,type] of targets){
  const browser=await type.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.linaRuntime&&document.querySelector('#quickResetLayout')?.dataset.linaOwner==='canonical',{timeout:15000});

  const ownership=await page.evaluate(()=>({
    renderOwner:document.documentElement.dataset.renderOwner,
    effectOwner:document.documentElement.dataset.effectOwner,
    layoutOwner:document.documentElement.dataset.layoutOwner,
    transportOwner:document.documentElement.dataset.transportOwner,
    sameRender:window.render===window.linaRuntime.render,
    previewRuntime:!!window.linaPreviewRuntime,
    previewRecovery:!!window.linaPreviewRecovery,
    self:window.linaRuntime.selfTest()
  }));
  assert.equal(ownership.renderOwner,'canonical-v1',`${name}: canonical render owner missing`);
  assert.equal(ownership.effectOwner,'canonical-v1',`${name}: canonical effect owner missing`);
  assert.equal(ownership.layoutOwner,'canonical-v1',`${name}: canonical layout owner missing`);
  assert.match(ownership.transportOwner||'',/^canonical/,`${name}: canonical transport owner missing`);
  assert.equal(ownership.sameRender,true,`${name}: render() was wrapped after canonical runtime`);
  assert.equal(ownership.previewRuntime,false,`${name}: retired preview-runtime still loaded`);
  assert.equal(ownership.previewRecovery,false,`${name}: retired preview-recovery still loaded`);
  assert.deepEqual(ownership.self.contextModes,[1,3,5,7,9],`${name}: context parser regression`);

  await page.evaluate(()=>{
    lines=Array.from({length:9},(_,i)=>({text:`Line ${i+1}`,start:i*1000,duration:900,words:[{text:`Line${i+1}`,start:i*1000,duration:900,emphasis:1,hold:1}]}));
    sourceLines=lines.map(x=>({...x,words:x.words.map(w=>({...w}))}));
    sourceBase=sourceLines.map(x=>({...x,words:x.words.map(w=>({...w}))}));
    window.linaRuntime.setEffect('apple',{dirty:false,redraw:false});
    window.invalidateLinaMotion?.(true);
  });

  for(const [mode,count] of [['current',1],['3',3],['5',5],['7',7],['9',9]]){
    await page.evaluate(([m])=>{document.querySelector('#contextMode').value=m;window.invalidateLinaMotion?.(true);window.render(4000)},[mode]);
    const visible=await page.locator('#lyrics .apple-line').evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).visibility!=='hidden').length);
    assert.equal(visible,count,`${name}: Lyrics View ${mode} rendered ${visible}, expected ${count}`);
  }

  const renderStable=await page.evaluate(async()=>{
    const ref=window.render;
    for(const effect of ['eternal','charli','apple']){
      window.linaRuntime.setEffect(effect,{dirty:false,redraw:false});
      window.render(4000);
      await new Promise(r=>requestAnimationFrame(r));
      if(window.render!==ref)return false;
    }
    return true;
  });
  assert.equal(renderStable,true,`${name}: effect switching replaced canonical render()`);

  await page.evaluate(()=>{
    window.linaRuntime.setEffect('apple',{dirty:false,redraw:false});
    const s=window.linaConsolidatedState;s.x=120;s.y=-40;s.scale=1.4;s.rot=8;
    document.querySelector('#size').value='68';
    document.querySelector('#yPos').value='70';
    document.querySelector('#contextMode').value='9';
    document.querySelector('#textAlign').value='right';
    document.querySelector('#lineHeight').value='1.25';
    document.querySelector('#letterSpacing').value='0.05';
    window.linaRuntime.resetLayout();
  });
  await page.waitForTimeout(140);
  const reset=await page.evaluate(()=>({
    x:window.linaConsolidatedState.x,y:window.linaConsolidatedState.y,scale:window.linaConsolidatedState.scale,rot:window.linaConsolidatedState.rot,
    size:document.querySelector('#size').value,yPos:document.querySelector('#yPos').value,view:document.querySelector('#contextMode').value,
    align:document.querySelector('#textAlign').value,lineHeight:document.querySelector('#lineHeight').value,spacing:document.querySelector('#letterSpacing').value,
    fontSize:document.querySelector('#lyrics').style.fontSize,quickY:document.querySelector('#quickY')?.value,
    resetOwner:document.querySelector('#quickResetLayout')?.dataset.linaOwner
  }));
  assert.deepEqual([reset.x,reset.y,reset.scale,reset.rot],[0,0,1,0],`${name}: transform reset failed`);
  assert.equal(reset.yPos,'50',`${name}: vertical reset failed`);
  assert.equal(reset.view,'5',`${name}: Lyrics View reset failed`);
  assert.equal(reset.align,'left',`${name}: alignment reset failed`);
  assert.equal(reset.lineHeight,'1.02',`${name}: line-height reset failed`);
  assert.equal(reset.spacing,'-0.02',`${name}: letter-spacing reset failed`);
  assert.equal(reset.fontSize,`${reset.size}px`,`${name}: preview font size did not follow reset value`);
  assert.equal(reset.quickY,'50',`${name}: Quick Settings mirror did not follow reset`);
  assert.equal(reset.resetOwner,'canonical',`${name}: reset button lost canonical ownership`);

  const effectState=await page.evaluate(()=>{
    window.linaRuntime.setEffect('eternal',{dirty:false,redraw:false});
    return{
      hidden:document.querySelector('#lyricEffect').value,
      story:document.querySelector('#story').dataset.lyricEffect,
      studio:window.linaConsolidatedState.effect,
      quick:document.querySelector('#quickEffect')?.value,
      style:document.querySelector('#styleEffectSelect')?.value,
      sameRender:window.render===window.linaRuntime.render
    };
  });
  assert.deepEqual([effectState.hidden,effectState.story,effectState.studio,effectState.quick,effectState.style],Array(5).fill('eternal'),`${name}: effect state diverged`);
  assert.equal(effectState.sameRender,true,`${name}: effect state change replaced renderer`);

  assert.deepEqual(pageErrors,[],`${name}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
}

console.log('LINA canonical runtime ownership gate passed.');
