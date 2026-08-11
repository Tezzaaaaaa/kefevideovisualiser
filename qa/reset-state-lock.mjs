import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1100,height:800}});

await page.goto(base,{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:20000});
await page.waitForFunction(()=>document.querySelector('#albumInput')&&!document.querySelector('.consolidated-track #userArtworkFile'),null,{timeout:10000});

await page.locator('#titleInput').fill('Reset Test Song');
await page.locator('#artistInput').fill('Reset Test Artist');
await page.locator('#albumInput').fill('Reset Test Album');
await page.locator('#titleInput').dispatchEvent('input');
await page.locator('#artistInput').dispatchEvent('input');
await page.locator('#albumInput').dispatchEvent('input');
await page.waitForTimeout(1300);

const savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('lina.project.v2')||'null'));
assert.ok(savedBefore,'autosave did not create a saved project before reset');
assert.equal(savedBefore.controls?.titleInput,'Reset Test Song','title was not autosaved before reset');
assert.equal(savedBefore.controls?.artistInput,'Reset Test Artist','artist was not autosaved before reset');
assert.equal(savedBefore.controls?.albumInput,'Reset Test Album','album was not autosaved before reset');

await Promise.all([
  page.waitForNavigation({waitUntil:'networkidle',timeout:20000}),
  page.locator('#resetBtn').click(),
]);
await page.waitForFunction(()=>document.documentElement.dataset.linaReady==='true',null,{timeout:20000});
await page.waitForFunction(()=>document.querySelector('#albumInput')&&!document.querySelector('.consolidated-track #userArtworkFile'),null,{timeout:10000});

assert.equal(await page.locator('#titleInput').inputValue(),'','Reset restored the old song title');
assert.equal(await page.locator('#artistInput').inputValue(),'','Reset restored the old artist');
assert.equal(await page.locator('#albumInput').inputValue(),'','Reset restored the old album / release');
assert.equal(await page.evaluate(()=>localStorage.getItem('lina.project.v2')),null,'Reset left a saved project in localStorage');
assert.equal(await page.locator('.consolidated-track .track-art,#userArtworkFile,#userArtworkIntro,label[for="userArtworkFile"]').count(),0,'Track Identity still exposes artwork controls');

await browser.close();
console.log('PROJECT RESET STATE LOCK PASS');
