import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {parseLyrics} from '../docs/src/parser.js';

const rendererSource=readFileSync('docs/src/renderer.js','utf8');
const mainSource=readFileSync('docs/src/main.js','utf8');
const exporterSource=readFileSync('docs/src/exporter.js','utf8');
const indexSource=readFileSync('docs/index.html','utf8');

assert.match(rendererSource,/drawAppleTimedWord/,'Apple timed-word renderer missing');
assert.match(rendererSource,/glyphLayout/,'Apple glyph progression missing');
assert.match(rendererSource,/holdFraction/,'Apple sustained-word hold missing');
assert.match(rendererSource,/buildBratPages/,'Brat top-to-bottom page layout missing');
assert.match(rendererSource,/impact=age<\.055/,'Brat abrupt word impact missing');
assert.match(rendererSource,/"Arial Narrow"/,'Brat Arial Narrow base missing');
assert.doesNotMatch(rendererSource,/insetX|fillRect\(rectX/,'old Brat green-box logic must stay deleted');
assert.match(rendererSource,/"Homemade Apple"/,'Eternal Homemade Apple renderer missing');
assert.doesNotMatch(rendererSource,/Snell Roundhand|Segoe Script|Bradley Hand|Reenie Beanie/,'unapproved Eternal font names must be absent');
assert.match(indexSource,/family=Homemade\+Apple/,'Homemade Apple web font load missing');
assert.match(mainSource,/ensureActiveEffectFont/,'Eternal font preflight missing');
assert.match(mainSource,/fps\s*:\s*60/,'export must request 60fps');
assert.doesNotMatch(exporterSource,/audioEl\.currentTime\s*=\s*time/,'export must not force a second audio clock');

const plain=parseLyrics('[00:00.00]one two three\n[00:01.00]four five six');
assert.equal(plain.format,'lrc');
assert.equal(plain.lines[0].words,null,'plain LRC must never invent word timing');
const enhanced=parseLyrics('[00:00.00]<00:00.00>one <00:00.28>two <00:00.58>three\n[00:00.82]<00:00.82>four <00:01.08>five <00:01.38>six\n[00:01.62]<00:01.62>seven <00:01.90>eight <00:02.16>nine');
assert.equal(enhanced.format,'enhanced');
assert.equal(enhanced.lines[0].words.length,3);
assert.equal(enhanced.lines[0].words[1].time,.28);

function wav(seconds=2.45,rate=44100){
  const count=Math.floor(seconds*rate),bytes=count*2,b=Buffer.alloc(44+bytes);
  b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
  for(let i=0;i<count;i++)b.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*6000),44+i*2);
  return b;
}
const whiteBackground=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="white"/></svg>');
const syncedLyrics='[00:00.00]<00:00.00>one <00:00.28>two <00:00.58>three\n[00:00.82]<00:00.82>four <00:01.08>five <00:01.38>six\n[00:01.62]<00:01.62>seven <00:01.90>eight <00:02.16>nine';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>console.log('BROWSER',m.type(),m.text()));
await page.route('https://lrclib.net/api/search**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{trackName:'Test Song',artistName:'Lady Gaga',syncedLyrics}])}));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});

const sample=()=>page.locator('#stageCanvas').evaluate(canvas=>{
  const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
  let bright=0,dark=0,minDarkY=canvas.height,maxDarkY=-1;
  for(let y=0;y<canvas.height;y+=3)for(let x=0;x<canvas.width;x+=3){const i=(y*canvas.width+x)*4,sum=data[i]+data[i+1]+data[i+2];if(sum>610)bright++;if(sum<210){dark++;minDarkY=Math.min(minDarkY,y);maxDarkY=Math.max(maxDarkY,y)}}
  return{bright,dark,minDarkY,maxDarkY,height:canvas.height};
});

assert.equal(await page.locator('#hazeEnabled').isChecked(),false,'Haze should start off');
await page.click('[data-align="left"]');await page.locator('#lyricSize').fill('90');
await page.click('[data-effect="brat"]');assert.equal(await page.locator('#hazeEnabled').isChecked(),true,'Brat must auto-enable Haze');assert.equal((await page.locator('#hazeColor').inputValue()).toLowerCase(),'#8ace00');
await page.click('[data-align="right"]');await page.locator('#lyricSize').fill('110');
await page.click('[data-effect="eternal"]');assert.equal(await page.locator('#hazeEnabled').isChecked(),true,'Haze must persist into Eternal');await page.click('[data-align="left"]');await page.locator('#lyricSize').fill('65');
await page.click('[data-effect="apple"]');assert.equal(await page.locator('#lyricSize').inputValue(),'90');assert.match(await page.locator('[data-align="left"]').getAttribute('class'),/active/);
await page.click('[data-effect="brat"]');assert.equal(await page.locator('#lyricSize').inputValue(),'110');assert.match(await page.locator('[data-align="right"]').getAttribute('class'),/active/);
await page.click('[data-effect="eternal"]');assert.equal(await page.locator('#lyricSize').inputValue(),'65');assert.match(await page.locator('[data-align="left"]').getAttribute('class'),/active/);
await page.evaluate(()=>document.fonts.load('65px "Homemade Apple"'));
assert.equal(await page.evaluate(()=>document.fonts.check('65px "Homemade Apple"')),true,'Homemade Apple failed to load');

let chooserPromise=page.waitForEvent('filechooser');await page.click('label[for="audioInput"]');let chooser=await chooserPromise;await chooser.setFiles({name:'Lady Gaga - Test Song.wav',mimeType:'audio/wav',buffer:wav()});
await page.waitForFunction(()=>/synced lines found/i.test(document.querySelector('#lyricsStatus')?.textContent||''),null,{timeout:15000});
chooserPromise=page.waitForEvent('filechooser');await page.click('label[for="backgroundInput"]');chooser=await chooserPromise;await chooser.setFiles({name:'white.svg',mimeType:'image/svg+xml',buffer:whiteBackground});
await page.waitForFunction(()=>!document.querySelector('#exportBottom').disabled,null,{timeout:10000});

// Apple: smooth progressive glyph illumination and completed letters remain lit.
await page.click('[data-effect="apple"]');
if(await page.locator('#hazeEnabled').isChecked())await page.click('#hazeEnabled');
await page.locator('#seek').fill('0.05');await page.waitForTimeout(100);const appleEarly=await sample();
await page.locator('#seek').fill('0.22');await page.waitForTimeout(100);const appleMid=await sample();
await page.locator('#seek').fill('0.62');await page.waitForTimeout(100);const appleLate=await sample();
assert.ok(appleMid.bright>appleEarly.bright,`Apple glyph lighting did not advance: ${JSON.stringify({appleEarly,appleMid})}`);
assert.ok(appleLate.bright>=appleMid.bright,`Apple completed glyphs did not stay lit: ${JSON.stringify({appleMid,appleLate})}`);

// Brat: Green Haze returns automatically on first entry; words accumulate from top to bottom without smooth interpolation.
await page.click('[data-effect="brat"]');assert.equal(await page.locator('#hazeEnabled').isChecked(),true);assert.equal((await page.locator('#hazeColor').inputValue()).toLowerCase(),'#8ace00');
await page.locator('#seek').fill('0.10');await page.waitForTimeout(100);const bratFirst=await sample();
await page.locator('#seek').fill('0.40');await page.waitForTimeout(100);const bratSecond=await sample();
assert.ok(bratFirst.dark>0&&bratSecond.dark>bratFirst.dark,`Brat timed words did not accumulate: ${JSON.stringify({bratFirst,bratSecond})}`);
await page.locator('#seek').fill('2.22');await page.waitForTimeout(100);const bratFull=await sample();
assert.ok(bratFull.minDarkY<bratFull.height*.2&&bratFull.maxDarkY>bratFull.height*.75,`Brat page did not fill top-to-bottom: ${JSON.stringify(bratFull)}`);
await page.click('[data-haze-preset="white"]');assert.equal((await page.locator('#hazeColor').inputValue()).toLowerCase(),'#ffffff');await page.click('[data-haze-preset="green"]');

// Eternal: Homemade Apple writes continuously rather than popping glyphs.
await page.click('[data-effect="eternal"]');await page.evaluate(()=>document.fonts.load('65px "Homemade Apple"'));
await page.locator('#seek').fill('0.05');await page.waitForTimeout(100);const eternalEarly=await sample();
await page.locator('#seek').fill('0.26');await page.waitForTimeout(100);const eternalMid=await sample();
await page.locator('#seek').fill('0.66');await page.waitForTimeout(100);const eternalLate=await sample();
assert.ok(eternalEarly.bright>0&&eternalMid.bright>eternalEarly.bright&&eternalLate.bright>eternalMid.bright,`Eternal handwriting reveal failed: ${JSON.stringify({eternalEarly,eternalMid,eternalLate})}`);

for(const effect of ['apple','brat','eternal']){
  await page.click(`[data-effect="${effect}"]`);await page.locator('#seek').fill('0.42');await page.waitForTimeout(80);
  const previewTime=await page.locator('#audioEl').evaluate(el=>el.currentTime),downloadPromise=page.waitForEvent('download',{timeout:15000});await page.click('#exportBottom');const download=await downloadPromise,path=await download.path();assert.ok(path,`${effect}: no export file`);
  const streams=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/);assert.ok(streams.includes('video')&&streams.includes('audio'),`${effect}: exported audio/video stream missing`);
  const frameTimes=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',path],{encoding:'utf8'}).trim().split(/\s+/).map(Number).filter(Number.isFinite),duration=Math.max(...frameTimes),cadence=frameTimes.length/Math.max(duration,.001);
  assert.ok(duration>2,`${effect}: invalid export duration`);assert.ok(cadence>20,`${effect}: delivered cadence too low (${cadence.toFixed(1)}fps)`);console.log(`${effect}: ${cadence.toFixed(1)}fps delivered by headless browser (60fps requested)`);execFileSync('ffmpeg',['-v','error','-i',path,'-f','null','-']);
  await page.waitForFunction(()=>document.querySelector('#exportOverlay').classList.contains('hidden'));assert.ok(Math.abs((await page.locator('#audioEl').evaluate(el=>el.currentTime))-previewTime)<.08,`${effect}: preview clock not restored`);
}

assert.deepEqual(errors,[]);await browser.close();console.log('LINA EFFECTS INTEGRATION QA: PASS');