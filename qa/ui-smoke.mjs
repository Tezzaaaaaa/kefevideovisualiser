import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const targets=[['chromium',chromium],['firefox',firefox],['webkit',webkit]];
const base='http://127.0.0.1:4173/';
const tmp=mkdtempSync(join(tmpdir(),'lina-qa-'));

function wavBuffer(seconds=2,sampleRate=44100){
  const count=Math.floor(seconds*sampleRate),dataBytes=count*2,b=Buffer.alloc(44+dataBytes);
  b.write('RIFF',0);b.writeUInt32LE(36+dataBytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(dataBytes,40);
  for(let i=0;i<count;i++){const v=Math.sin(2*Math.PI*440*i/sampleRate)*0.18;b.writeInt16LE(Math.round(v*32767),44+i*2)}
  return b;
}
const audioBuf=wavBuffer(2.2);
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#224488"/><circle cx="160" cy="90" r="50" fill="white"/></svg>');
const videoPath=join(tmp,'background.webm');
execFileSync('ffmpeg',['-loglevel','error','-y','-f','lavfi','-i','color=c=0x224488:s=320x180:d=2:r=15','-c:v','libvpx-vp9','-pix_fmt','yuv420p','-an',videoPath]);
const videoBuf=readFileSync(videoPath);

const timed='[00:00.00] Hello world from LINA\n[00:00.80] Second lyric line here\n[00:01.55] Final lyric line';
const enhanced='[00:00.00]<00:00.00>Hello <00:00.18>world <00:00.38>from <00:00.55>LINA\n[00:00.80]<00:00.80>Second <00:01.00>lyric <00:01.18>line <00:01.36>here\n[00:01.55]<00:01.55>Final <00:01.74>lyric <00:01.93>line';

async function setRange(page,id,value){await page.locator(id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}))},value)}
async function status(page){return (await page.textContent('#topStatus'))?.trim()||''}
async function ensureLyrics(page){
  await page.click('#nav [data-tool="lyrics"]');
  await page.selectOption('#syncMethod','pasteTimed');
  await page.fill('#lyricsText',timed);
  await page.click('#applyPaste');
  await page.waitForSelector('#reviewBox:not(.hidden)');
  await page.click('#confirmReview');
  await page.waitForFunction(()=>document.querySelectorAll('#timeline .line').length===3);
}

for(const [name,type] of targets){
  const browser=await type.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('dialog',async d=>d.accept());
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>['true','false'].includes(document.documentElement.dataset.linaReady),null,{timeout:15000});

  const ready=await page.evaluate(()=>document.documentElement.dataset.linaReady);
  const audit=await page.evaluate(()=>window.linaControlAudit);
  assert.equal(ready,'true',`${name}: startup QA failed: ${JSON.stringify(audit)}`);
  assert.deepEqual([...audit.signatureEffects].sort(),['apple','charli','eternal'],`${name}: signature effects missing`);
  assert.equal(audit.missing.length,0,`${name}: unbound controls: ${audit.missing.join(', ')}`);

  // WORKFLOW + SETUP
  for(const step of ['setup','lyrics','style','background']){await page.click(`#nav [data-tool="${step}"]`);assert.equal(await page.getAttribute(`#nav [data-tool="${step}"]`,'aria-selected'),'true',`${name}: ${step} navigation failed`)}
  await page.click('#nav [data-tool="setup"]');
  assert.equal(await page.isDisabled('#prevStep'),true,`${name}: Back state failed`);
  await page.click('#nextStep');assert.equal(await page.getAttribute('#nav [data-tool="lyrics"]','aria-selected'),'true',`${name}: Next failed`);
  await page.click('#prevStep');assert.equal(await page.getAttribute('#nav [data-tool="setup"]','aria-selected'),'true',`${name}: Back failed`);

  await page.fill('#titleInput','Hello Test');
  await page.fill('#artistInput','LINA QA');
  await page.fill('#albumInput','Control Pass');
  await page.selectOption('#titleDuration','2');
  await page.setInputFiles('#audioFile',{name:'qa.wav',mimeType:'audio/wav',buffer:audioBuf});
  await page.waitForFunction(()=>Number(document.querySelector('#audio')?.duration)>1.5);
  assert.match(await page.textContent('#mediaStatus'),/qa\.wav/i,`${name}: audio upload failed`);
  await page.setInputFiles('#userArtworkFile',{name:'art.svg',mimeType:'image/svg+xml',buffer:svg});
  await page.waitForFunction(()=>document.querySelector('#userArtworkPreview')?.classList.contains('on'));
  assert.equal(await page.isChecked('#userArtworkIntro'),true,`${name}: artwork intro default failed`);
  await page.uncheck('#userArtworkIntro');assert.equal(await page.isChecked('#showArtworkIntro'),false,`${name}: intro artwork toggle failed`);
  await page.check('#userArtworkIntro');
  await page.uncheck('#showTitle');await page.check('#showTitle');

  // LYRICS: paste review actions
  await page.click('#nav [data-tool="lyrics"]');
  await page.selectOption('#syncMethod','pasteTimed');
  await page.fill('#lyricsText','[00:00.00] https://example.com\n'+timed);
  await page.click('#applyPaste');
  await page.waitForSelector('#reviewBox:not(.hidden)');
  assert.ok(await page.locator('#reviewList .flagged').count()>0,`${name}: suspicious review flag failed`);
  await page.click('#hideFlagged');assert.ok(await page.locator('#reviewList .hidden-line').count()>0,`${name}: Hide flagged failed`);
  await page.click('#restoreAll');assert.equal(await page.locator('#reviewList .hidden-line').count(),0,`${name}: Restore all failed`);
  await page.locator('#reviewList .review-row').first().locator('[data-act="hide"]').click();
  assert.ok(await page.locator('#reviewList .review-row').first().getAttribute('class').then(x=>x.includes('hidden-line')),`${name}: row Hide failed`);
  await page.locator('#reviewList .review-row').first().locator('[data-act="delete"]').click();
  assert.equal(await page.locator('#reviewList .review-row').count(),3,`${name}: row Delete failed`);
  await page.click('#confirmReview');await page.waitForFunction(()=>document.querySelectorAll('#timeline .line').length===3);

  // File import, including Enhanced LRC word timing.
  await page.click('#clearLyrics');
  await page.selectOption('#syncMethod','fileTimed');
  await page.setInputFiles('#lyricsFile',{name:'enhanced.lrc',mimeType:'text/plain',buffer:Buffer.from(enhanced)});
  await page.waitForSelector('#reviewBox:not(.hidden)');
  await page.click('#confirmReview');
  assert.ok(await page.evaluate(()=>Array.isArray(lines[0]?.words)&&lines[0].words.length>=4),`${name}: Enhanced LRC words lost`);
  assert.equal(await page.locator('#wordEditor .word-row button').count(),0,`${name}: dead word buttons remain`);
  assert.ok(await page.locator('#wordEditor .word-label').count()>0,`${name}: word labels missing`);

  // Word emphasis / hold inputs + Apply.
  await page.locator('#wordEditor .emph').first().fill('1.6');
  await page.locator('#wordEditor .hold').first().fill('1.5');
  await page.click('#applyWords');
  assert.equal(await page.evaluate(()=>lines[selected].words[0].emphasis),1.6,`${name}: word emphasis failed`);
  assert.equal(await page.evaluate(()=>lines[selected].words[0].hold),1.5,`${name}: word hold failed`);

  // Plain lyrics + manual stamping.
  await page.click('#clearLyrics');
  await page.selectOption('#syncMethod','manual');
  await page.fill('#manualLyricsText','Manual first line\nManual second line');
  await page.click('#prepareManual');await page.waitForSelector('#reviewBox:not(.hidden)');await page.click('#confirmReview');
  await page.waitForSelector('#manualTimingBox:not(.hidden)');
  await page.evaluate(()=>document.querySelector('#audio').currentTime=.25);await page.click('#stampLine');
  await page.evaluate(()=>document.querySelector('#audio').currentTime=1.05);await page.click('#stampLine');
  assert.ok(await page.evaluate(()=>sourceLines[1].start>sourceLines[0].start),`${name}: manual stamping failed`);

  // Restore timed lyrics for all remaining editor/effect/export checks.
  await page.click('#clearLyrics');await ensureLyrics(page);
  await page.selectOption('#grouping','2');await page.click('#applyGrouping');
  assert.ok(await page.locator('#timeline .line').count()>3,`${name}: grouping failed`);
  await page.selectOption('#grouping','original');await page.click('#applyGrouping');
  for(const mode of ['3','5','7','9','current']){await page.selectOption('#contextMode',mode);assert.equal(await page.inputValue('#contextMode'),mode,`${name}: visible-line mode ${mode} failed`)}
  await page.selectOption('#contextMode','3');
  await page.selectOption('#lyricsEntrance','custom');await page.fill('#customEntrance','0.2');
  assert.equal(await page.inputValue('#customEntrance'),'0.2',`${name}: custom entrance failed`);
  await page.selectOption('#lyricsEntrance','at');

  // TRANSPORT + TIMELINE/EDITOR
  await page.evaluate(()=>document.querySelector('#audio').currentTime=0);
  await page.click('#play');await page.waitForFunction(()=>document.querySelector('#audio').currentTime>.05);await page.click('#play');
  assert.ok((await page.textContent('#clock')).includes('/'),`${name}: clock failed`);
  await setRange(page,'#seek',.9);await page.waitForFunction(()=>Math.abs(document.querySelector('#audio').currentTime-.9)<.2);
  await page.click('#stop');assert.match(await status(page),/Stopped/i,`${name}: Stop failed`);assert.ok(await page.evaluate(()=>document.querySelector('#audio').currentTime<.05),`${name}: Stop did not rewind`);
  await page.click('#timeline .line:nth-child(2)');assert.equal(await page.textContent('#linePosition'),'Line 2 of 3',`${name}: timeline select failed`);
  const start0=Number(await page.inputValue('#currentStart'));await page.click('#earlier');assert.ok(Number(await page.inputValue('#currentStart'))<=start0,`${name}: -100ms failed`);await page.click('#later');
  await page.evaluate(()=>document.querySelector('#audio').currentTime=.65);await page.click('#setNow');assert.ok(Math.abs(Number(await page.inputValue('#currentStart'))-.65)<.15,`${name}: Set now failed`);
  await page.click('#transportPrevLine');assert.equal(await page.textContent('#linePosition'),'Line 1 of 3',`${name}: transport Previous failed`);
  await page.click('#transportNextLine');assert.equal(await page.textContent('#linePosition'),'Line 2 of 3',`${name}: transport Next failed`);
  await page.click('#transportEdit');assert.equal(await page.evaluate(()=>document.activeElement?.id),'currentText',`${name}: Edit line failed`);
  await page.fill('#currentText','Edited second lyric');await page.fill('#currentDuration','0.7');await page.click('#applyLine');assert.match(await page.textContent('#timeline'),/Edited second lyric/,`${name}: Apply line failed`);
  const beforeAdd=await page.locator('#timeline .line').count();await page.click('#addLineAfter');assert.equal(await page.locator('#timeline .line').count(),beforeAdd+1,`${name}: Add line failed`);await page.click('#duplicateLine');assert.equal(await page.locator('#timeline .line').count(),beforeAdd+2,`${name}: Duplicate failed`);await page.click('#deleteLine');assert.equal(await page.locator('#timeline .line').count(),beforeAdd+1,`${name}: Delete failed`);await page.click('#deleteLine');assert.equal(await page.locator('#timeline .line').count(),beforeAdd,`${name}: Delete cleanup failed`);
  await page.click('#transportSync');

  // STYLE + SIGNATURE EFFECTS
  await page.click('#nav [data-tool="style"]');
  await setRange(page,'#size',30);assert.equal(await page.textContent('#sizeVal'),'30',`${name}: size failed`);
  await setRange(page,'#yPos',56);assert.equal(await page.inputValue('#yPos'),'56',`${name}: vertical position failed`);
  await page.locator('#textColor').evaluate(el=>{el.value='#ff0000';el.dispatchEvent(new Event('change',{bubbles:true}))});assert.match(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()),/#ff0000|rgb/i,`${name}: colour failed`);
  await page.selectOption('#letterCase','lower');
  await setRange(page,'#glow',80);assert.equal(await page.textContent('#glowVal'),'80%',`${name}: glow failed`);
  await setRange(page,'#offset',100);assert.match(await page.textContent('#offsetVal'),/100 ms/,`${name}: offset failed`);
  await page.selectOption('#fontWeight','800');assert.equal(await page.evaluate(()=>document.querySelector('#lyrics').style.fontWeight),'800',`${name}: weight failed`);
  await page.selectOption('#textAlign','center');assert.equal(await page.evaluate(()=>document.querySelector('#lyrics').style.textAlign),'center',`${name}: align failed`);
  await setRange(page,'#lineHeight',1.1);await setRange(page,'#letterSpacing',0.01);
  await page.selectOption('#studioFont','condensed');assert.match(await page.evaluate(()=>document.querySelector('#lyrics').style.fontFamily),/Arial Narrow/i,`${name}: typeface failed`);
  await page.selectOption('#studioBackdrop','soft');assert.ok(await page.locator('#lyrics.lyric-backdrop-soft').count(),`${name}: soft backdrop failed`);await page.selectOption('#studioBackdrop','solid');assert.ok(await page.locator('#lyrics.lyric-backdrop-solid').count(),`${name}: solid backdrop failed`);await page.selectOption('#studioBackdrop','none');
  await setRange(page,'#studioScale',125);assert.equal(await page.evaluate(()=>document.querySelector('#lyrics').style.getPropertyValue('--lina-scale')),'1.25',`${name}: scale failed`);
  await setRange(page,'#studioRotation',5);assert.equal(await page.evaluate(()=>document.querySelector('#lyrics').style.getPropertyValue('--lina-rotation')),'5deg',`${name}: rotation failed`);
  await page.evaluate(()=>render(900));
  const box=await page.locator('#lyrics').boundingBox();if(box){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+25,box.y+box.height/2+15);await page.mouse.up();assert.notEqual(await page.evaluate(()=>document.querySelector('#lyrics').style.getPropertyValue('--lina-drag-x')),'0px',`${name}: direct drag failed`)}
  await page.click('#centreLyrics');assert.equal(await page.evaluate(()=>document.querySelector('#lyrics').style.getPropertyValue('--lina-drag-x')),'0px',`${name}: Centre lyrics failed`);
  await page.click('#resetLyricsTransform');assert.equal(await page.evaluate(()=>document.querySelector('#lyrics').style.getPropertyValue('--lina-scale')),'1',`${name}: Reset transform failed`);

  for(const effect of ['charli','eternal','apple']){await page.click(`.effect-option[data-effect="${effect}"]`);assert.equal(await page.getAttribute('#story','data-lyric-effect'),effect,`${name}: ${effect} button failed`);await page.evaluate(()=>render(900));if(effect==='charli'){await page.waitForSelector('.charli-card');assert.equal((await page.textContent('.charli-card')).trim(),(await page.textContent('.charli-card')).trim().toLowerCase(),`${name}: Charli case parity failed`)}if(effect==='eternal')await page.waitForSelector('.eternal-page');if(effect==='apple')await page.waitForSelector('.apple-flow')}

  // BACKGROUND: image, framing, user artwork backdrop, video, trim/loop, gradient, readability.
  await page.click('#nav [data-tool="background"]');
  await page.setInputFiles('#bgImageFile',{name:'bg.svg',mimeType:'image/svg+xml',buffer:svg});await page.waitForFunction(()=>document.querySelector('#bg img'));
  await setRange(page,'#cropX',30);await setRange(page,'#cropY',70);await setRange(page,'#cropZoom',1.4);assert.match(await page.evaluate(()=>document.querySelector('#bg img').style.transform),/1\.4/,`${name}: crop zoom failed`);
  await page.selectOption('#bgFit','contain');assert.equal(await page.evaluate(()=>document.querySelector('#bg img').style.objectFit),'contain',`${name}: contain failed`);await page.click('#resetCrop');assert.equal(await page.inputValue('#cropX'),'50',`${name}: reset crop X failed`);assert.equal(await page.inputValue('#cropY'),'50',`${name}: reset crop Y failed`);
  await setRange(page,'#dim',55);assert.equal(await page.textContent('#dimVal'),'55%',`${name}: dim failed`);await setRange(page,'#blur',6);assert.equal(await page.textContent('#blurVal'),'6',`${name}: blur failed`);
  await page.selectOption('#studioGradient','ocean');assert.match(await page.evaluate(()=>document.querySelector('#story').style.getPropertyValue('--lina-gradient')),/linear-gradient/,`${name}: gradient failed`);
  await page.click('#removeBg');await page.check('#useArtworkBg2');await page.waitForFunction(()=>document.querySelector('#bg img'));assert.ok(await page.isChecked('#useArtworkBg2'),`${name}: artwork backdrop failed`);
  await page.setInputFiles('#bgVideoFile',{name:'background.webm',mimeType:'video/webm',buffer:videoBuf});await page.waitForFunction(()=>document.querySelector('#bg video')&&Number(document.querySelector('#bg video').duration)>0);
  await page.selectOption('#videoMode','trimLoop');await page.fill('#videoStart','0.2');await page.fill('#videoEnd','1.2');await page.locator('#videoEnd').dispatchEvent('input');assert.match(await page.textContent('#trimStatus'),/Looping/i,`${name}: trim-loop failed`);await page.selectOption('#videoMode','auto');
  await page.click('#removeBg');assert.equal(await page.locator('#bg img,#bg video').count(),0,`${name}: remove background failed`);

  // OUTPUT SETTINGS + FINAL WORKFLOW
  for(const ratio of ['9:16','4:5','1:1','16:9']){await page.selectOption('#aspect',ratio);assert.match(await page.textContent('#stageMeta'),new RegExp(ratio.replace(':','\\:')),`${name}: aspect ${ratio} failed`)}
  for(const quality of ['720','1080']){await page.selectOption('#quality',quality);assert.match(await page.textContent('#stageMeta'),new RegExp(`${quality}p`),`${name}: quality ${quality} failed`)}
  await page.check('#safeToggle');assert.ok(await page.locator('#safe.on').count(),`${name}: safe guides failed`);await page.uncheck('#safeToggle');
  assert.equal(await page.textContent('#nextStep'),'Preview',`${name}: dead Review button remains`);await page.click('#nextStep');

  // EXPORT RIGHTS + CANCEL + actual render for every signature effect.
  await page.uncheck('#rightsConfirm');await page.click('#exportBtn');assert.match(await status(page),/Confirm media rights/i,`${name}: rights gate failed`);await page.check('#rightsConfirm');
  await page.click('.effect-option[data-effect="apple"]');
  await page.click('#exportBottomBtn');await page.waitForSelector('#dlg[open]',{timeout:7000});await page.click('#cancel');await page.waitForFunction(()=>/cancel/i.test(document.querySelector('#topStatus')?.textContent||''),null,{timeout:7000});

  for(const effect of ['apple','charli','eternal']){
    await page.click(`.effect-option[data-effect="${effect}"]`);
    const downloadPromise=page.waitForEvent('download',{timeout:15000});
    await page.click('#exportBottomBtn');
    const download=await downloadPromise;
    const path=await download.path();
    assert.ok(path,`${name}: ${effect} export produced no file`);
    assert.match(download.suggestedFilename(),/LINA-lyric-video-.*\.(mp4|webm)$/i,`${name}: ${effect} export filename invalid`);
    await page.waitForFunction(()=>/Export complete/i.test(document.querySelector('#topStatus')?.textContent||''),null,{timeout:5000});
  }

  // Save / autosave / reset persistence controls.
  await page.click('#saveProgressBtn');await page.waitForFunction(()=>document.querySelector('#saveProgressText')?.textContent==='Saved');
  await page.uncheck('#autosaveToggle');assert.equal(await page.isChecked('#autosaveToggle'),false,`${name}: autosave off failed`);await page.check('#autosaveToggle');
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.click('#resetBtn')]);
  await page.waitForFunction(()=>['true','false'].includes(document.documentElement.dataset.linaReady));
  assert.equal(await page.locator('#timeline .line').count(),0,`${name}: Reset project failed`);

  assert.deepEqual(pageErrors,[],`${name}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log(`${name}: FULL PASS`);
}

console.log('LINA full control matrix: PASS');
