// End-to-end smoke test: loads the extension into Chromium, sets a tiny limit,
// and checks that a tracked site fades to grayscale while an untracked one doesn't.
//
//   npm run test:e2e
//
// Requires a build made with BAKU_E2E=1 (host permissions granted up front,
// because tests can't click permission prompts). The npm script does that.

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// `wxt build --mode e2e` writes here, separate from the shippable .output/chrome-mv3.
const EXT = resolve('.output/chrome-mv3-e2e');
const fixture = readFileSync(resolve('tests/fixture.html'));
const server = createServer((_, res) => res.end(fixture)).listen(0);
const port = server.address().port;

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`✓ ${msg}`);

const ctx = await chromium.launchPersistentContext('', {
  headless: true,
  channel: 'chromium',
  args: [
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
    '--host-resolver-rules=MAP fake.test 127.0.0.1',
  ],
});

try {
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));

  // Limit = 3 s, fade = 6 s.
  await sw.evaluate(() =>
    chrome.storage.local.set({
      settings: { sites: ['fake.test'], limitMinutes: 0.05, fadeSeconds: 6, mode: 'soft' },
    }),
  );
  await new Promise((r) => setTimeout(r, 1500));

  const page = await ctx.newPage();
  await page.goto(`http://fake.test:${port}/`);
  for (let i = 0; i < 20; i++) {
    await page.mouse.move(100 + (i % 5) * 10, 200);
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1600); // CSS transition

  const filter = await page.evaluate(() => getComputedStyle(document.documentElement).filter);
  filter.includes('grayscale(1)') && filter.includes('brightness(0.8)') ? ok(`tracked site faded: ${filter}`) : fail(`tracked site filter: ${filter}`);

  const other = await ctx.newPage();
  await other.goto(`http://127.0.0.1:${port}/`);
  await other.waitForTimeout(500);
  const otherFilter = await other.evaluate(() => getComputedStyle(document.documentElement).filter);
  otherFilter === 'none' ? ok('untracked site untouched') : fail(`untracked site filter: ${otherFilter}`);

  const { usage } = await sw.evaluate(() => chrome.storage.local.get('usage'));
  usage?.seconds > 10 ? ok(`time counted: ${usage.seconds.toFixed(1)} s`) : fail(`usage: ${JSON.stringify(usage)}`);

  const badge = await sw.evaluate(() => chrome.action.getBadgeText({}));
  badge === '0' ? ok('badge shows 0 min left') : fail(`badge: ${JSON.stringify(badge)}`);

  await sw.evaluate(() =>
    chrome.storage.local.set({
      settings: { sites: ['fake.test'], limitMinutes: 30, fadeSeconds: 6, mode: 'soft' },
    }),
  );
  await new Promise((r) => setTimeout(r, 300));
  const badge2 = await sw.evaluate(() => chrome.action.getBadgeText({}));
  badge2 === '30' ? ok('badge follows a raised limit') : fail(`badge after limit change: ${JSON.stringify(badge2)}`);

  // fadeSeconds = 6 isn't a preset, so options must show it as a custom choice.
  const opts = await ctx.newPage();
  await opts.goto(`chrome-extension://${new URL(sw.url()).host}/options.html`);
  await opts.waitForTimeout(500);
  const fade = await opts.evaluate(() => {
    const s = document.getElementById('fade');
    return { value: s.value, label: s.selectedOptions[0]?.textContent };
  });
  fade.value === '6' && /6/.test(fade.label ?? '')
    ? ok(`custom fade shown: ${fade.label}`)
    : fail(`fade select: ${JSON.stringify(fade)}`);

  // Onboarding: opens itself on first install; picking sites + limit saves them.
  const welcome = ctx.pages().find((p) => p.url().endsWith('/welcome.html'));
  welcome ? ok('welcome page opened on install') : fail('welcome page did not open on install');
  if (welcome) {
    await welcome.reload();
    await welcome.click('label.chip:has(input[value="youtube.com"])');
    await welcome.fill('#other-input', 'https://www.Example.org/path');
    await welcome.press('#other-input', 'Enter');
    await welcome.click('label.chip:has(input[name="limit"][value="60"])');
    await welcome.click('#start');
    await welcome.waitForSelector('#done:not(.hidden)', { timeout: 3000 }).catch(() => undefined);
    const { settings } = await sw.evaluate(() => chrome.storage.local.get('settings'));
    const want = ['fake.test', 'youtube.com', 'example.org'];
    want.every((s) => settings.sites.includes(s)) && settings.limitMinutes === 60
      ? ok(`welcome saved: ${settings.sites.join(', ')} @ ${settings.limitMinutes} min`)
      : fail(`welcome settings: ${JSON.stringify(settings)}`);
  }
} finally {
  await ctx.close();
  server.close();
}
