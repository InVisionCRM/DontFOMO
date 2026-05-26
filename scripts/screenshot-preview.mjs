import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = path.join(root, 'docs/ui-preview-production-polish-2026-05-26.html');
const out = path.join(root, 'docs/ui-preview-production-polish-2026-05-26.png');

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 950, deviceScaleFactor: 2 });
await page.goto(`file://${html}`, { waitUntil: 'networkidle0' });
const el = await page.$('#capture');
if (!el) {
  throw new Error('capture element not found');
}
await el.screenshot({ path: out });
await browser.close();
console.log('wrote', out);
