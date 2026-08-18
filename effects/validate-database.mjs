import fs from 'node:fs';

const readJson = file => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
const catalog = readJson('./effect-app-public-catalog.json');
const presets = readJson('./presets.json');
const database = readJson('./effect-database.json');

const slug = value => String(value)
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const aliases = new Map([
  ['Polar to rectangular', 'polar-distortion'],
  ['Rectangular to polar', 'polar-distortion-rectangular'],
  ['VHS', 'vhs'],
  ['CRT screen', 'crt'],
  ['RGB Shift', 'rgb-shift'],
  ['LED screen', 'led-screen'],
  ['Halftone screen', 'halftone'],
  ['Film Grain', 'film-grain'],
  ['Black & White', 'black-white'],
  ['Classic Film', 'classic-film'],
  ['Depth of field', 'depth-of-field'],
  ['Motion trails', 'motion-trails'],
  ['Star glow', 'star-glow'],
  ['Reeded glass', 'reeded-glass'],
  ['Elastic grid', 'elastic-grid'],
  ['Color grading', 'color-grading'],
  ['Hue/saturation', 'hue-saturation'],
  ['Color balance', 'color-balance'],
  ['Color matrix', 'color-matrix'],
  ['RGB Gain', 'rgb-gain'],
  ['Color temperature', 'color-temperature'],
  ['Camera shake', 'camera-shake'],
  ['Motion blur', 'motion-blur'],
  ['Radial blur', 'radial-blur'],
  ['Zoom blur', 'zoom-blur'],
  ['Blur/sharp', 'blur-sharp'],
  ['Gaussian blur', 'gaussian-blur'],
  ['Hue curves', 'hue-curves'],
  ['Gradient map', 'gradient-map'],
  ['Dither', 'dither'],
  ['Ink bleed', 'ink-bleed'],
  ['Paper scan', 'paper-scan']
]);

const expected = [];
for (const [category, names] of Object.entries(catalog.effects || {})) {
  for (const name of names) expected.push({ id: aliases.get(name) || slug(name), name, category });
}

const errors = [];
const dbEffects = Array.isArray(database.effects) ? database.effects : [];
const byId = new Map();
const byName = new Map();

for (const effect of dbEffects) {
  if (!effect?.id) errors.push('Database effect is missing an id.');
  if (byId.has(effect.id)) errors.push(`Duplicate database id: ${effect.id}`);
  byId.set(effect.id, effect);
  byName.set(`${effect.category}:${effect.name}`, effect);
  if (!Array.isArray(effect.presets)) errors.push(`Presets must be an array: ${effect.id}`);
  if (effect.status === 'implemented' && typeof effect.renderer !== 'string') errors.push(`Implemented effect has no renderer: ${effect.id}`);
  if (effect.status === 'catalogued' && effect.renderer !== null) errors.push(`Catalogued effect unexpectedly has a renderer: ${effect.id}`);
}

if (dbEffects.length !== expected.length) {
  errors.push(`Effect count mismatch: catalogue=${expected.length}, database=${dbEffects.length}`);
}

for (const effect of expected) {
  if (!byName.has(`${effect.category}:${effect.name}`)) {
    errors.push(`Missing catalogue effect: ${effect.category} / ${effect.name}`);
  }
}

const presetFamilies = presets.effectPresets || {};
const presetOnlyFamilies = [];
for (const family of Object.keys(presetFamilies)) {
  if (!byId.has(family)) presetOnlyFamilies.push(family);
}

if (errors.length) {
  console.error('KEFE effect database validation failed.');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

const implemented = dbEffects.filter(effect => effect.status === 'implemented').length;
const catalogued = dbEffects.filter(effect => effect.status === 'catalogued').length;
const presetCount = dbEffects.reduce((total, effect) => total + effect.presets.length, 0);

console.log(`KEFE effect database valid: ${dbEffects.length} effects (${implemented} implemented, ${catalogued} catalogued).`);
console.log(`Attached effect-specific preset names: ${presetCount}.`);
if (presetOnlyFamilies.length) {
  console.log(`Preset-only/reference families retained: ${presetOnlyFamilies.length}.`);
}
