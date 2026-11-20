// Renders the still pictures that show before the live 3D cups start (public/posters/*.webp).
// They are screenshots of the real 3D views, so they match exactly. Re-run after `npm run bake`.
//   1. npm run build && npm start      (in another terminal)
//   2. npm run posters                 (uses your installed Chrome; set CHROME_PATH if it isn't found)
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.SITE || 'http://localhost:3000';
const OUT = new URL('../public/posters/', import.meta.url);
const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(existsSync);
if (!CHROME) throw new Error('Chrome not found: set CHROME_PATH.');

// [file name, page, which 3D view on it, keep motion?]
const SHOTS = [
  ['split-efe6da-s', '/', '[aria-label^="3D model of the Duvo split cup"]'],
  ['how', '/#how', '#how .stage', true],
  ...['split', 'heart', 'round'].flatMap(d => [
    [`${d}-efe6da`, '/shop', `.card .stage[aria-label="3D model of the ${d[0].toUpperCase() + d.slice(1)} cup"]`],
    [`${d}-f7f2ea`, `/shop/${d}-cup`, '.stagebox .stage'],
  ]),
];

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  for (const [name, path, sel, motion] of SHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
    // Reduced motion: the cups hold still at their starting angle, the same angle the live view starts at.
    if (!motion) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(BASE + path, { waitUntil: 'networkidle0' });
    const el = await page.waitForSelector(sel);
    await el.scrollIntoView();
    await page.$$eval('header', hs => hs.forEach(h => { h.style.visibility = 'hidden'; })); // sticky header must not cover the shot
    await page.mouse.move(5, 5); // wakes the 3D engine, like a visitor would
    await page.waitForFunction(s => document.querySelector(s)?.dataset.ready === 'true', { timeout: 60000 }, sel);
    await new Promise(r => setTimeout(r, motion ? 2500 : 900)); // let the fade and easing finish
    await page.$eval(sel, n => n.querySelectorAll('.stage-hint, .stage-poster').forEach(h => h.remove()));
    const b = await el.boundingBox(); // trim 2px so a neighbouring border never shows in the picture
    await el.screenshot({ path: new URL(`${name}.webp`, OUT), type: 'webp', quality: 90, clip: { x: 2, y: 2, width: b.width - 4, height: b.height - 4 } });
    console.log('saved', `${name}.webp`);
    await page.close();
  }
} finally { await browser.close(); }
