import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { parseLyrics } from "../docs/src/parser.js";

const rendererSource = readFileSync("docs/src/renderer.js", "utf8");
const mainSource = readFileSync("docs/src/main.js", "utf8");
const exporterSource = readFileSync("docs/src/exporter.js", "utf8");
const indexSource = readFileSync("docs/index.html", "utf8");
const stateSource = readFileSync("docs/src/state.js", "utf8");

// Apple: sequential word/glyph rendering, continuous line flow, Apple system face.
assert.match(rendererSource, /function appleWordsForLine/);
assert.match(rendererSource, /function drawAppleTimedWord/);
assert.match(rendererSource, /function glyphLayout/);
assert.match(rendererSource, /function appleFlowIndex/);
assert.match(rendererSource, /system-ui,-apple-system/);
assert.doesNotMatch(rendererSource, /lineReveal/);

// Brat: fixed deluxe-cover slots, not ordinary sentence layout, no forced haze.
assert.match(rendererSource, /const BRAT_SLOTS\s*=\s*\[/);
assert.match(rendererSource, /0\.075,\s*y:\s*0\.12/);
assert.match(rendererSource, /0\.50,\s*y:\s*0\.88/);
assert.match(rendererSource, /0\.925,\s*y:\s*0\.88/);
assert.match(rendererSource, /"Arial Narrow","PT Sans Narrow"/);
assert.doesNotMatch(rendererSource, /buildBratPages|layoutBratLine/);
assert.doesNotMatch(mainSource, /applyFirstBratHaze|bratHazeInitialized/);
assert.match(stateSource, /hazeEnabled:\s*false/);

// Eternal: correct font and full-height writing-direction clip (no ascender/descender crop).
assert.match(rendererSource, /"Homemade Apple"/);
assert.doesNotMatch(rendererSource, /Snell Roundhand|Segoe Script|Bradley Hand|Reenie Beanie/);
assert.match(rendererSource, /ctx\.rect\([\s\S]*?\n\s*0,\n[\s\S]*?\n\s*h,\n\s*\)/);
assert.match(indexSource, /family=Homemade\+Apple/);
assert.match(indexSource, /family=PT\+Sans\+Narrow/);
assert.match(indexSource, /id="homemadeAppleStylesheet"/);
assert.match(mainSource, /fps:\s*60/);
assert.doesNotMatch(exporterSource, /audioEl\.currentTime\s*=\s*time/);

const plain = parseLyrics("[00:00.00]one two three\n[00:01.00]four five six");
assert.equal(plain.lines[0].words, null, "parser must preserve the fact that plain LRC has line timing only");

const enhancedText =
  "[00:00.00]<00:00.00>one <00:00.20>two <00:00.40>three\n" +
  "[00:00.60]<00:00.60>four <00:00.80>five <00:01.00>six\n" +
  "[00:01.20]<00:01.20>seven <00:01.40>eight <00:01.60>nine\n" +
  "[00:01.80]<00:01.80>ten <00:02.00>eleven <00:02.20>twelve\n" +
  "[00:02.40]<00:02.40>thirteen <00:02.60>fourteen <00:02.80>fifteen";
const enhanced = parseLyrics(enhancedText);
assert.equal(enhanced.lines[0].words.length, 3);
assert.equal(enhanced.lines[0].words[1].time, 0.20);

function wav(seconds = 3.35, rate = 44100) {
  const count = Math.floor(seconds * rate);
  const bytes = count * 2;
  const b = Buffer.alloc(44 + bytes);
  b.write("RIFF"); b.writeUInt32LE(36 + bytes, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(bytes, 40);
  for (let i = 0; i < count; i++) b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * i / rate) * 6000), 44 + i * 2);
  return b;
}

const blackBackground = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="black"/></svg>',
);
const whiteBackground = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="white"/></svg>',
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => console.log("BROWSER", message.type(), message.text()));

await page.route("https://lrclib.net/api/search**", route => route.fulfill({
  contentType: "application/json",
  body: JSON.stringify([{ trackName: "Test Song", artistName: "Lady Gaga", syncedLyrics: enhancedText }]),
}));

await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.documentElement.dataset.linaReady === "true", null, { timeout: 5000 });
assert.equal(await page.locator("#exportBtn").isDisabled(), true);

const seek = async value => page.locator("#seek").evaluate((el, next) => {
  el.value = String(next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, value);

const sample = () => page.locator("#stageCanvas").evaluate(canvas => {
  const data = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data;
  let bright = 0;
  let dark = 0;
  let textYSum = 0;
  let textCount = 0;
  for (let y = 0; y < canvas.height; y += 3) {
    for (let x = 0; x < canvas.width; x += 3) {
      const i = (y * canvas.width + x) * 4;
      const sum = data[i] + data[i + 1] + data[i + 2];
      if (sum > 650) bright++;
      if (sum < 120) dark++;
      if (sum > 170 && sum < 730) {
        textYSum += y;
        textCount++;
      }
    }
  }
  return { bright, dark, centroidY: textCount ? textYSum / textCount : null, width: canvas.width, height: canvas.height };
});

const regionDark = (x0, y0, x1, y1) => page.locator("#stageCanvas").evaluate((canvas, box) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const sx = Math.floor(canvas.width * box.x0);
  const sy = Math.floor(canvas.height * box.y0);
  const sw = Math.max(1, Math.floor(canvas.width * (box.x1 - box.x0)));
  const sh = Math.max(1, Math.floor(canvas.height * (box.y1 - box.y0)));
  const data = ctx.getImageData(sx, sy, sw, sh).data;
  let count = 0;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i] + data[i + 1] + data[i + 2] < 260) count++;
  }
  return count;
}, { x0, y0, x1, y1 });

async function uploadBackground(name, mimeType, buffer) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.click('label[for="backgroundInput"]');
  const chooser = await chooserPromise;
  await chooser.setFiles({ name, mimeType, buffer });
  await page.waitForFunction(() => !document.querySelector("#exportBottom").disabled, null, { timeout: 10000 });
}

// Haze stays off when Brat is selected.
assert.equal(await page.locator("#hazeEnabled").isChecked(), false);
await page.click('[data-effect="brat"]');
assert.equal(await page.locator("#hazeEnabled").isChecked(), false, "Brat must not auto-enable green haze");

// Load audio and automatic enhanced lyrics.
let chooserPromise = page.waitForEvent("filechooser");
await page.click('label[for="audioInput"]');
let chooser = await chooserPromise;
await chooser.setFiles({ name: "Lady Gaga - Test Song.wav", mimeType: "audio/wav", buffer: wav() });
await page.waitForFunction(() => /word-synced lines found/i.test(document.querySelector("#lyricsStatus")?.textContent || ""), null, { timeout: 15000 });

await uploadBackground("black.svg", "image/svg+xml", blackBackground);

// Apple plain-LRC fallback must progress word/letter-wise instead of lighting a full line at once.
await page.evaluate(async () => {
  const { state } = await import("/src/state.js");
  const { parseLyrics } = await import("/src/parser.js");
  state.lyrics.lines = parseLyrics("[00:00.00]alpha beta gamma delta\n[00:01.20]epsilon zeta eta theta\n[00:02.40]iota kappa lambda mu").lines;
});
await page.click('[data-effect="apple"]');
await seek(0.08); await page.waitForTimeout(100); const appleEarly = await sample();
await seek(0.48); await page.waitForTimeout(100); const appleMid = await sample();
await seek(0.98); await page.waitForTimeout(100); const appleLate = await sample();
assert.ok(appleEarly.bright > 0, `Apple first word did not begin: ${JSON.stringify(appleEarly)}`);
assert.ok(appleMid.bright > appleEarly.bright, `Apple word/glyph highlight did not advance: ${JSON.stringify({ appleEarly, appleMid })}`);
assert.ok(appleLate.bright > appleMid.bright, `Apple completed words did not remain lit: ${JSON.stringify({ appleMid, appleLate })}`);

await seek(1.16); await page.waitForTimeout(80); const beforeBoundary = await sample();
await seek(1.24); await page.waitForTimeout(80); const afterBoundary = await sample();
if (beforeBoundary.centroidY != null && afterBoundary.centroidY != null) {
  assert.ok(
    Math.abs(afterBoundary.centroidY - beforeBoundary.centroidY) < 190,
    `Apple line flow jumped at boundary: ${JSON.stringify({ beforeBoundary, afterBoundary })}`,
  );
}

// Restore genuine word timings for Brat/Eternal/export QA.
await page.evaluate(async text => {
  const { state } = await import("/src/state.js");
  const { parseLyrics } = await import("/src/parser.js");
  state.lyrics.lines = parseLyrics(text).lines;
}, enhancedText);

// Brat uses the deluxe cover's fixed positional slots.
await uploadBackground("white.svg", "image/svg+xml", whiteBackground);
await page.click('[data-effect="brat"]');
assert.equal(await page.locator("#hazeEnabled").isChecked(), false);
await seek(0.45); await page.waitForTimeout(100);
const bratTopLeft = await regionDark(0.03, 0.05, 0.32, 0.20);
const bratTopMiddle = await regionDark(0.35, 0.05, 0.65, 0.20);
const bratTopRight = await regionDark(0.68, 0.05, 0.97, 0.20);
assert.ok(bratTopLeft > 20 && bratTopMiddle > 20 && bratTopRight > 20,
  `Brat first three words are not in the three cover slots: ${JSON.stringify({ bratTopLeft, bratTopMiddle, bratTopRight })}`);

await seek(2.45); await page.waitForTimeout(100);
const bratBottomLeft = await regionDark(0.03, 0.80, 0.30, 0.96);
assert.ok(bratBottomLeft > 20, `Brat page did not reach the bottom cover row: ${bratBottomLeft}`);

await seek(2.65); await page.waitForTimeout(100);
const oldBottomAfterPageTurn = await regionDark(0.03, 0.80, 0.97, 0.96);
const newTopAfterPageTurn = await regionDark(0.03, 0.05, 0.32, 0.20);
assert.ok(newTopAfterPageTurn > 20, "Brat next page did not restart at the first cover slot");
assert.ok(oldBottomAfterPageTurn < bratBottomLeft * 0.6,
  `Brat previous page remained behind after page turn: ${JSON.stringify({ bratBottomLeft, oldBottomAfterPageTurn })}`);

// Eternal: Homemade Apple loads and the writing reveal grows without row-height clipping.
await uploadBackground("black.svg", "image/svg+xml", blackBackground);
await page.click('[data-effect="eternal"]');
await page.evaluate(() => document.fonts.load('82px "Homemade Apple"'));
assert.equal(await page.evaluate(() => document.fonts.check('82px "Homemade Apple"')), true);
await seek(0.05); await page.waitForTimeout(100); const eternalEarly = await sample();
await seek(0.26); await page.waitForTimeout(100); const eternalMid = await sample();
await seek(0.52); await page.waitForTimeout(100); const eternalLate = await sample();
assert.ok(eternalEarly.bright > 0 && eternalMid.bright > eternalEarly.bright && eternalLate.bright > eternalMid.bright,
  `Eternal handwriting reveal failed: ${JSON.stringify({ eternalEarly, eternalMid, eternalLate })}`);

// All three effects must export audio+video at a non-choppy delivered cadence.
for (const effect of ["apple", "brat", "eternal"]) {
  if (effect === "brat") await uploadBackground("white.svg", "image/svg+xml", whiteBackground);
  else await uploadBackground("black.svg", "image/svg+xml", blackBackground);

  await page.click(`[data-effect="${effect}"]`);
  await seek(0.42);
  await page.waitForTimeout(80);
  const previewTime = await page.locator("#audioEl").evaluate(el => el.currentTime);
  const downloadPromise = page.waitForEvent("download", { timeout: 20000 });
  await page.click("#exportBottom");
  const download = await downloadPromise;
  const path = await download.path();
  assert.ok(path, `${effect}: no export file`);

  const streams = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", path],
    { encoding: "utf8" },
  ).trim().split(/\s+/);
  assert.ok(streams.includes("video") && streams.includes("audio"), `${effect}: exported audio/video stream missing`);

  const frameTimes = execFileSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "frame=best_effort_timestamp_time", "-of", "csv=p=0", path],
    { encoding: "utf8" },
  ).trim().split(/\s+/).map(Number).filter(Number.isFinite);
  const duration = Math.max(...frameTimes);
  const cadence = frameTimes.length / Math.max(duration, 0.001);
  assert.ok(duration > 3, `${effect}: invalid export duration`);
  assert.ok(cadence > 45, `${effect}: delivered cadence is visibly too low (${cadence.toFixed(1)}fps)`);
  console.log(`${effect}: ${cadence.toFixed(1)}fps delivered by headless browser (60fps requested)`);
  execFileSync("ffmpeg", ["-v", "error", "-i", path, "-f", "null", "-"]);

  await page.waitForFunction(() => document.querySelector("#exportOverlay").classList.contains("hidden"));
  assert.ok(
    Math.abs((await page.locator("#audioEl").evaluate(el => el.currentTime)) - previewTime) < 0.08,
    `${effect}: preview clock not restored`,
  );
}

assert.deepEqual(errors, []);
await browser.close();
console.log("LINA EFFECTS VISUAL + EXPORT QA: PASS");
