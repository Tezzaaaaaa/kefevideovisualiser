import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1100,height:800}});

await page.goto(base,{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:20000});
await page.waitForSelector('#resetProjectVisible',{state:'visible',timeout:10000});

assert.equal(await page.locator('#resetProjectVisible').textContent(),'Reset project','visible reset label is wrong');
assert.equal(await page.locator('#resetProjectVisible').getAttribute('href'),'?reset=1','visible reset does not use native reset route');

await page.locator('#titleInput').fill('Reset Test Song');
await page.locator('#artistInput').fill('Reset Test Artist');
await page.locator('#albumInput').fill('Reset Test Album');
for(const id of ['titleInput','artistInput','albumInput'])await page.locator(`#${id}`).dispatchEvent('input');
await page.waitForTimeout(1300);

const savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('lina.project.v2')||'null'));
assert.ok(savedBefore,'autosave did not create a saved project before reset');
assert.equal(savedBefore.controls?.titleInput,'Reset Test Song','title was not autosaved before reset');
assert.equal(savedBefore.controls?.artistInput,'Reset Test Artist','artist was not autosaved before reset');
assert.equal(savedBefore.controls?.albumInput,'Reset Test Album','album was not autosaved before reset');

await page.evaluate(async()=>{
  await new Promise((resolve,reject)=>{
    const request=indexedDB.open('lina-project-media',1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files')};
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      const tx=db.transaction('files','readwrite');
      tx.objectStore('files').put(new Blob(['probe'],{type:'text/plain'}),'reset-probe');
      tx.oncomplete=()=>{db.close();resolve()};
      tx.onerror=()=>reject(tx.error);
    };
  });
});

await Promise.all([
  page.waitForNavigation({waitUntil:'domcontentloaded',timeout:15000}),
  page.locator('#resetProjectVisible').click(),
]);
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:20000});
await page.waitForSelector('#resetProjectVisible',{state:'visible',timeout:10000});

assert.equal(new URL(page.url()).search,'','reset route did not clean the URL after reset');
assert.equal(await page.locator('#titleInput').inputValue(),'','Reset restored the old song title');
assert.equal(await page.locator('#artistInput').inputValue(),'','Reset restored the old artist');
assert.equal(await page.locator('#albumInput').inputValue(),'','Reset restored the old album / release');
assert.equal(await page.evaluate(()=>localStorage.getItem('lina.project.v2')),null,'Reset left a saved project in localStorage');
assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('lina.'))),[],'Reset left LINA localStorage keys behind');

const mediaProbe=await page.evaluate(async()=>{
  return await new Promise((resolve,reject)=>{
    const request=indexedDB.open('lina-project-media',1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files')};
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      const tx=db.transaction('files','readonly');
      const get=tx.objectStore('files').get('reset-probe');
      get.onsuccess=()=>{const found=!!get.result;db.close();resolve(found)};
      get.onerror=()=>reject(get.error);
    };
  });
});
assert.equal(mediaProbe,false,'Reset left IndexedDB media behind');

await browser.close();
console.log('VISIBLE FULL PROJECT RESET PASS');
