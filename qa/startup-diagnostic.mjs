import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Debugger.enable');
await cdp.send('Runtime.enable');

const pageErrors = [];
const consoleErrors = [];
const requestFailures = [];
const badResponses = [];
const parseFailures = [];
const runtimeExceptions = [];

page.on('pageerror', error => pageErrors.push(error.stack || error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('requestfailed', request => requestFailures.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`));
page.on('response', response => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
cdp.on('Debugger.scriptFailedToParse', event => parseFailures.push({
  url: event.url,
  line: (event.startLine ?? -1) + 1,
  column: (event.startColumn ?? -1) + 1,
  errorMessage: event.errorMessage || null,
}));
cdp.on('Runtime.exceptionThrown', event => {
  const details = event.exceptionDetails || {};
  runtimeExceptions.push({
    text: details.text || null,
    url: details.url || null,
    line: Number.isFinite(details.lineNumber) ? details.lineNumber + 1 : null,
    column: Number.isFinite(details.columnNumber) ? details.columnNumber + 1 : null,
    description: details.exception?.description || null,
  });
});

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);

const importResults = await page.evaluate(async () => {
  const modules = ['state.js','parser.js','sync.js','renderer.js','exporter.js','main.js'];
  const results = [];
  for (const module of modules) {
    try {
      await import(`/src/${module}?diagnostic=1`);
      results.push({ module, ok: true });
    } catch (error) {
      results.push({ module, ok: false, name: error?.name || null, message: error?.message || String(error), stack: error?.stack || null });
    }
  }
  return results;
});

const snapshot = await page.evaluate(() => ({
  ready: document.documentElement.dataset.linaReady || null,
  readyState: document.readyState,
  exportDisabled: document.querySelector('#exportBtn')?.disabled ?? null,
  hazeExists: !!document.querySelector('#hazeEnabled'),
  mainScript: [...document.scripts].map(script => ({ src: script.src, type: script.type })),
  homemadeLink: (() => { const link = document.querySelector('#homemadeAppleStylesheet'); return link ? { media: link.media, loaded: link.dataset.loaded || null, sheet: !!link.sheet } : null; })(),
}));

console.log('STARTUP SNAPSHOT', JSON.stringify(snapshot));
console.log('MODULE IMPORTS', JSON.stringify(importResults));
console.log('PARSE FAILURES', JSON.stringify(parseFailures));
console.log('RUNTIME EXCEPTIONS', JSON.stringify(runtimeExceptions));
console.log('PAGE ERRORS', JSON.stringify(pageErrors));
console.log('CONSOLE ERRORS', JSON.stringify(consoleErrors));
console.log('REQUEST FAILURES', JSON.stringify(requestFailures));
console.log('BAD RESPONSES', JSON.stringify(badResponses));
await browser.close();

if (snapshot.ready !== 'true') {
  throw new Error(`LINA startup did not complete. parseFailures=${JSON.stringify(parseFailures)} imports=${JSON.stringify(importResults)}`);
}
console.log('LINA STARTUP DIAGNOSTIC: PASS');