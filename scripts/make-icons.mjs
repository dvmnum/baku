// Renders public/icon/{16,32,48,128}.png from assets/icon.svg.
//
//   npm run icons

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const svg = readFileSync(resolve('assets/icon.svg'), 'utf8');
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage();
for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.locator('svg').screenshot({ path: resolve(`public/icon/${size}.png`), omitBackground: true });
  console.log(`public/icon/${size}.png`);
}
await browser.close();
