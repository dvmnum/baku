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
    '--host-resolver-rules=MAP fake.test 127.0.0.1, MAP vk.ru 127.0.0.1',
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

  // VK moved to vk.ru: tracking vk.com must cover it too.
  await sw.evaluate(() =>
    chrome.storage.local.set({ settings: { sites: ['vk.com'], limitMinutes: 30 }, usage: null }),
  );
  await new Promise((r) => setTimeout(r, 1500));
  const vk = await ctx.newPage();
  await vk.goto(`http://vk.ru:${port}/`);
  for (let i = 0; i < 12; i++) {
    await vk.mouse.move(100 + (i % 5) * 10, 200);
    await vk.waitForTimeout(1000);
  }
  const vkUsage = await sw.evaluate(() => chrome.storage.local.get('usage').then(({ usage }) => usage));
  vkUsage?.perSite?.['vk.com'] >= 5
    ? ok(`vk.ru counts toward vk.com: ${vkUsage.perSite['vk.com'].toFixed(1)} s`)
    : fail(`vk.ru not counted for vk.com: ${JSON.stringify(vkUsage)}`);
  await vk.close();

  // Own limit: the shared limit is huge, but the site's own 3 s run out; fade capped at 80%.
  await sw.evaluate(() =>
    chrome.storage.local.set({
      settings: { sites: ['fake.test'], limitMinutes: 30, siteLimits: { 'fake.test': 0.05 }, fadeSeconds: 6, fadeStrength: 0.8, mode: 'soft' },
      usage: null,
    }),
  );
  await page.reload();
  for (let i = 0; i < 16; i++) {
    await page.mouse.move(100 + (i % 5) * 10, 200);
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1600);
  const ownFilter = await page.evaluate(() => getComputedStyle(document.documentElement).filter);
  ownFilter.includes('grayscale(0.8)') && ownFilter.includes('brightness(0.84)')
    ? ok(`own site limit fades it, capped at 80%: ${ownFilter}`)
    : fail(`own limit filter: ${ownFilter}`);

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
  const fade = await opts.evaluate(() => document.querySelector('#speed button.on')?.textContent ?? '');
  /6/.test(fade) ? ok(`custom fade shown: ${fade}`) : fail(`speed: ${JSON.stringify(fade)}`);

  // Options: give the site its own limit through the inline editor.
  await opts.click('#site-list li button.lim');
  await opts.click('#site-list li.open .seg button:last-child');
  await opts.waitForTimeout(300);
  await opts.click('#site-list li.open .stepper button:last-child');
  await opts.waitForTimeout(300);
  const own = await sw.evaluate(() => chrome.storage.local.get('settings').then(({ settings }) => settings.siteLimits));
  own['fake.test'] === 20 ? ok('options: own limit set to 20 min') : fail(`options own limit: ${JSON.stringify(own)}`);
  await opts.click('#site-list li.open .seg button:first-child');
  await opts.waitForTimeout(300);
  const back = await sw.evaluate(() => chrome.storage.local.get('settings').then(({ settings }) => settings.siteLimits));
  back['fake.test'] === undefined ? ok('options: back to the shared limit') : fail(`options shared: ${JSON.stringify(back)}`);

  // Popup, opened as a tab. tabs.query is stubbed so the "active tab" is the tracked site.
  const id = new URL(sw.url()).host;
  const popup = await ctx.newPage();
  await popup.addInitScript((port) => {
    chrome.tabs.query = async () => [{ url: `http://fake.test:${port}/` }];
  }, port);
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForTimeout(500);
  const pop = await popup.evaluate(() => ({
    time: document.getElementById('time-left').textContent,
    rows: document.querySelectorAll('#list li').length,
    current: document.querySelector('#list li.cur .s')?.textContent,
    switchShown: !document.getElementById('cur-switch').classList.contains('hidden'),
  }));
  /^\d+:\d\d$/.test(pop.time) && pop.rows === 1 && pop.current === 'fake.test' && pop.switchShown
    ? ok(`popup: ${pop.time} left, current site highlighted`)
    : fail(`popup: ${JSON.stringify(pop)}`);

  // When heartbeats stop, the popup timer must stop too, never jump back up.
  await page.goto('about:blank');
  await sw.evaluate(() => chrome.storage.session.set({ lastBeatAt: Date.now() - 1000 }));
  await popup.reload();
  await popup.waitForTimeout(3000);
  const toSec = (s) => s.split(':').reduce((a, b) => a * 60 + Number(b), 0);
  const tA = toSec(await popup.evaluate(() => document.getElementById('time-left').textContent));
  await popup.waitForTimeout(5000);
  const tB = toSec(await popup.evaluate(() => document.getElementById('time-left').textContent));
  tB <= tA ? ok(`popup timer never jumps back (${tA} s -> ${tB} s)`) : fail(`popup timer jumped back: ${tA} s -> ${tB} s`);
  // Over the limit: "5 more minutes" with the forced wait, then confirm.
  await sw.evaluate(() =>
    chrome.storage.local.get('usage').then(({ usage }) =>
      chrome.storage.local.set({
        usage: { ...usage, seconds: 1900, perSite: { 'fake.test': 1900 }, extraSeconds: 0, extensionsUsed: 0 },
      }),
    ),
  );
  await popup.waitForTimeout(300);
  await popup.click('#extra-btn');
  const waiting = await popup.evaluate(() => document.getElementById('extra-btn').disabled);
  await popup.waitForTimeout(5_500);
  await popup.click('#extra-btn');
  await popup.waitForTimeout(300);
  const after = await sw.evaluate(() => chrome.storage.local.get('usage').then(({ usage }) => usage));
  waiting && after.extensionsUsed === 1 && after.perSite['fake.test'] < 1800 + after.extraSeconds
    ? ok('popup: "5 more minutes" waits, then extends the limit')
    : fail(`popup extension: waiting=${waiting} usage=${JSON.stringify(after)}`);
  await popup.close();

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
