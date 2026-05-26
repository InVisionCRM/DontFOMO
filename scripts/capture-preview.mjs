/**
 * Renders docs/previews/*.html to PNG via headless Chrome.
 * Usage: node scripts/capture-preview.mjs [htmlPath] [pngPath]
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = process.argv[2] ?? path.join(root, 'docs/previews/production-polish-home.html');
const pngPath = process.argv[3] ?? htmlPath.replace(/\.html$/i, '.png');
const fileUrl = `file://${htmlPath}`;

const chrome = process.env.CHROME_PATH ?? '/usr/local/bin/google-chrome';

const args = [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--window-size=920,940',
  `--screenshot=${pngPath}`,
  fileUrl,
];

const child = spawn(chrome, args, { stdio: 'inherit' });
child.on('close', (code) => {
  if (code !== 0) {
    console.error(`Chrome exited with code ${code}`);
    process.exit(code ?? 1);
  }
  console.log(`Wrote ${pngPath}`);
});
