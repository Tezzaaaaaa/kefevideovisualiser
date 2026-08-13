import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
const consoleErrors = [];
const requestFailures = [];
const badResponses = [];
page.on('pageerror', error => pageErrors.push(error.stack || error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('requestfailed', request => requestFailures.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`));
page.on('response', response => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const snapshot = await page.evaluate(() => ({
  ready: document.documentElement.dataset.linaReady || null,
  readyState: document.readyState,
  exportDisabled: document.querySelector('#exportBtn')?.disabled ?? null,
  hazeExists: !!document.querySelector('#hazeEnabled'),
  mainScript: [...document.scripts].map(script => ({ src: script.src, type: script.type })),
  homemadeLink: (() => { const link = document.querySelector('#homemadeAppleStylesheet'); return link ? { media: link.media, loaded: link.dataset.loaded || null, sheet: !!link.sheet } : null; })(),
}));

console.log('STARTUP SNAPSHOT', JSON.stringify(snapshot));
console.log('PAGE ERRORS', JSON.stringify(pageErrors));
console.log('CONSOLE ERRORS', JSON.stringify(consoleErrors));
console.log('REQUEST FAILURES', JSON.stringify(requestFailures));
console.log('BAD RESPONSES', JSON.stringify(badResponses));
await browser.close();

if (snapshot.ready !== 'true') {
  throw new Error(`LINA startup did not complete. pageErrors=${JSON.stringify(pageErrors)} requestFailures=${JSON.stringify(requestFailures)} badResponses=${JSON.stringify(badResponses)}`);
}
console.log('LINA STARTUP DIAGNOSTIC: PASS');