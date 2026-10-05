// Chrome Web Store images, built from the real extension UI.
//
//   npm run store
//
// Writes store/screenshots/{en,ru}/*.png (1280x800), store/promo-440x280-*.png
// and store/marquee-1400x560-*.png. Needs the e2e build (the npm script makes it),
// because tests and screenshots can't click permission prompts.

import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const EXT = resolve('.output/chrome-mv3-e2e');
const OUT = resolve('store');
const b64 = (buf) => buf.toString('base64');
const file64 = (p) => b64(readFileSync(resolve(p)));
const FONT_CYR = file64('public/fonts/geologica-cyrillic.woff2');
const FONT_LAT = file64('public/fonts/geologica-latin.woff2');
const ART = `data:image/webp;base64,${file64('public/img/baku-night.webp')}`;
/** Night-sky color sampled from the illustration, for panels next to it. */
const SKY = '#0b3651';
const ICON = `data:image/png;base64,${file64('public/icon/128.png')}`;

const COPY = {
  ru: {
    name: 'Baku',
    tagline: 'Хватит залипать',
    slides: [
      ['Сайты выцветают, когда лимит кончился', 'Ничего не блокируется. Лента просто становится серой и скучной.'],
      ['Сколько осталось — видно сразу', 'Таймер на сегодня, текущий сайт и время по каждому сайту.'],
      ['Свой лимит для любого сайта', 'YouTube — 20 минут, TikTok — 10, остальные делят общий лимит.'],
      ['Сообщения не считаются', 'Мессенджер VK, Direct и другие полезные разделы не тратят время и не сереют.'],
      ['Ещё 5 минут, если очень надо', 'Но сначала короткая пауза. И только дважды в день.'],
    ],
    marquee: ['Время вышло —', 'краски тоже'],
    feed: 'Лента',
  },
  en: {
    name: 'Baku',
    tagline: 'Fade Distractions',
    slides: [
      ['Sites fade to gray when time is up', "Nothing gets blocked. The feed just turns gray and dull."],
      ["See what's left at a glance", "Today's timer, the current site and time per site."],
      ['Own limit for any site', 'YouTube 20 minutes, TikTok 10, the rest share one limit.'],
      ["Messages don't count", 'VK messages, Instagram Direct and other useful pages never cost time or go gray.'],
      ['5 more minutes, if you really need it', 'After a short pause, and only twice a day.'],
    ],
    marquee: ["Time's up.", 'So is the color.'],
    feed: 'Feed',
  },
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const SITES = ['youtube.com', 'vk.com', 'reddit.com', 'tiktok.com', 'instagram.com', 'x.com'];
const PER = { 'youtube.com': 785, 'vk.com': 292, 'reddit.com': 63 };
const usage = (extra = {}) => ({ date: today(), seconds: 1140, perSite: PER, extraSeconds: 0, extraPerSite: {}, extensionsUsed: 0, limitHitAt: null, ...extra });
const settings = (extra = {}) => ({ sites: SITES, limitMinutes: 30, siteLimits: { 'youtube.com': 20, 'tiktok.com': 10 }, exclusions: {}, fadeSeconds: 150, fadeStrength: 1, mode: 'soft', ...extra });

// --- Capture real UI ---------------------------------------------------------

async function capture(lang, scheme) {
  const ctx = await chromium.launchPersistentContext('', {
    headless: true,
    channel: 'chromium',
    colorScheme: scheme,
    locale: lang,
    deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${lang}`],
  });
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  for (let i = 0; i < 50 && !(await sw.evaluate(() => !!globalThis.chrome?.storage)); i++) await sleep(100);
  const id = new URL(sw.url()).host;
  const seed = (s, u, beat = false) =>
    sw.evaluate(({ s, u, beat }) => Promise.all([
      chrome.storage.local.set({ settings: s, usage: u }),
      chrome.storage.session.set({ lastBeatAt: beat ? Date.now() : 0 }),
    ]), { s, u, beat });

  const popup = async (url, s, u, { beat = false, click = false } = {}) => {
    await seed(s, u, beat);
    const p = await ctx.newPage();
    await p.addInitScript((url) => {
      chrome.tabs.query = async () => [{ url }];
    }, url);
    await p.setViewportSize({ width: 320, height: 640 });
    await p.goto(`chrome-extension://${id}/popup.html`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(700);
    if (click) {
      await p.click('#extra-btn');
      await p.waitForTimeout(2600);
    }
    const h = await p.evaluate(() => document.body.scrollHeight);
    await p.setViewportSize({ width: 320, height: h });
    const png = await p.screenshot();
    await p.close();
    return png;
  };

  const shots = {};
  shots.tracked = await popup('https://www.youtube.com/watch', settings(), usage(), { beat: true });
  shots.shared = await popup('https://vk.com/feed', settings(), usage(), { beat: true });
  shots.excluded = await popup('https://vk.com/im', settings(), usage());
  shots.think = await popup('https://vk.com/feed', settings(), usage({ perSite: { ...PER, 'vk.com': 1900 } }), { click: true });

  // Settings: the sites card with an editor open.
  const opts = async (site, s) => {
    await seed(s, usage());
    const p = await ctx.newPage();
    await p.setViewportSize({ width: 640, height: 1400 });
    await p.goto(`chrome-extension://${id}/options.html`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    const rows = await p.$$('#site-list li');
    for (const li of rows) {
      if ((await li.$eval('.s', (e) => e.textContent)) === site) await (await li.$('button.lim')).click();
    }
    await p.waitForTimeout(450);
    const png = await p.locator('main > section:nth-of-type(2)').screenshot();
    await p.close();
    return png;
  };
  shots.ownLimit = await opts('youtube.com', settings());
  shots.exclusions = await opts('vk.com', settings({ exclusions: { 'vk.com': ['/groups'] } }));

  await ctx.close();
  return shots;
}

// --- Compose -------------------------------------------------------------------

const FONTS = `
@font-face{font-family:G;font-weight:400 700;src:url(data:font/woff2;base64,${FONT_CYR}) format('woff2');unicode-range:U+0400-045F,U+2116}
@font-face{font-family:G;font-weight:400 700;src:url(data:font/woff2;base64,${FONT_LAT}) format('woff2');unicode-range:U+0000-00FF,U+2000-206F}`;
const BASE = `${FONTS}
*{box-sizing:border-box}body{margin:0;font-family:G,system-ui;color:#fff}
.bg{position:absolute;inset:0;background:radial-gradient(70% 90% at 85% 10%,#1fa38f 0,transparent 60%),linear-gradient(150deg,#0e5c55,#0a3a40 60%,#082a2f)}
.shot{border-radius:14px;box-shadow:0 24px 60px rgb(0 0 0/.35),0 2px 6px rgb(0 0 0/.2);display:block}`;
const img = (buf, w, extra = '') => `<img class="shot" src="data:image/png;base64,${b64(buf)}" style="width:${w}px;${extra}">`;

/** A generic social feed (no real brand), for the fade demo. */
function feed(label) {
  const card = (bg, w1, w2) => `<div class="c"><div class="im" style="background:${bg}"></div><div class="t" style="width:${w1}%"></div><div class="t s" style="width:${w2}%"></div></div>`;
  const art = (pos) => `url(${ART}) ${pos}/360% no-repeat`;
  return `<div class="feed"><div class="bar"><b>${label}</b><i></i><i></i><i></i></div><div class="cols">
    ${card(art('20% 30%'), 80, 55)}${card('linear-gradient(135deg,#ff7a59,#ff4f8b 55%,#7b3ff2)', 70, 40)}${card(art('70% 70%'), 85, 50)}
    ${card('linear-gradient(135deg,#2fbf71,#1f6fff)', 65, 45)}${card(art('45% 90%'), 75, 60)}${card('linear-gradient(135deg,#ffd23f,#ff8a00)', 80, 35)}
  </div></div>`;
}
const FEED_CSS = `.feed{width:640px;height:520px;border-radius:14px;background:#fff;overflow:hidden;color:#111;box-shadow:0 24px 60px rgb(0 0 0/.35)}
.feed .bar{display:flex;align-items:center;gap:10px;height:52px;padding:0 18px;border-bottom:1px solid #eee;font-weight:700}.feed .bar i{width:60px;height:8px;border-radius:4px;background:#e6e8eb}.feed .bar b{flex:1}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:16px}.c .im{height:120px;border-radius:10px}.c .t{height:9px;border-radius:5px;background:#2d3036;margin-top:10px}.c .t.s{background:#c3c7cd;margin-top:6px}`;

function slide(i, [title, sub], visual) {
  return `<!doctype html><meta charset="utf-8"><style>${BASE}${FEED_CSS}
  .wrap{position:relative;width:1280px;height:800px;overflow:hidden}
  .txt{position:absolute;left:72px;top:96px;width:430px}
  .n{font-size:15px;font-weight:600;color:#7fe0c6;letter-spacing:.06em}
  h1{margin:14px 0 0;font-size:46px;line-height:1.08;font-weight:700;letter-spacing:-.02em}
  p{margin:20px 0 0;font-size:20px;line-height:1.45;color:#cfe7e1}
  .brand{position:absolute;left:72px;bottom:64px;display:flex;align-items:center;gap:12px;font-size:20px;font-weight:700}.brand img{width:40px;height:40px}
  .vis{position:absolute;right:64px;top:0;bottom:0;width:680px;display:flex;align-items:center;justify-content:center;gap:24px}
  </style><div class="wrap"><div class="bg"></div>
  <div class="txt"><div class="n">0${i + 1}</div><h1>${title}</h1><p>${sub}</p></div>
  <div class="brand"><img src="${ICON}">Baku</div>
  <div class="vis">${visual}</div></div>`;
}

function fadeDemo(label, popupPng) {
  // The same feed twice: color underneath, gray on top, revealed along a diagonal.
  return `<div style="position:relative;width:640px;height:520px">
    <div style="position:absolute;inset:0">${feed(label)}</div>
    <div style="position:absolute;inset:0;filter:grayscale(1) brightness(.8);clip-path:polygon(58% 0,100% 0,100% 100%,30% 100%)">${feed(label)}</div>
    <div style="position:absolute;right:-28px;bottom:-60px">${img(popupPng, 250)}</div></div>`;
}

async function render(browser, html, w, h, out) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  await p.screenshot({ path: out });
  await p.close();
}

const browser = await chromium.launch({ channel: 'chromium' });
for (const lang of ['ru', 'en']) {
  const c = COPY[lang];
  const light = await capture(lang, 'light');
  const dark = await capture(lang, 'dark');
  const dir = join(OUT, 'screenshots', lang);
  mkdirSync(dir, { recursive: true });

  const visuals = [
    fadeDemo(c.feed, dark.think),
    `${img(light.tracked, 300)}${img(dark.shared, 300)}`,
    img(light.ownLimit, 0, 'height:720px;width:auto'),
    `${img(dark.excluded, 280)}${img(light.exclusions, 0, 'height:600px;width:auto')}`,
    `${img(light.think, 300)}${img(dark.think, 300)}`,
  ];
  const names = ['1-fade', '2-timer', '3-own-limit', '4-messages', '5-extension'];
  for (const [i, v] of visuals.entries()) await render(browser, slide(i, c.slides[i], v), 1280, 800, join(dir, `${names[i]}.png`));

  // Small promo tile 440x280: a night-sky panel with the name, the illustration beside it.
  await render(browser, `<!doctype html><meta charset="utf-8"><style>${BASE}
    .w{display:grid;grid-template-columns:190px 1fr;width:440px;height:280px;overflow:hidden;background:${SKY}}
    .t{display:flex;flex-direction:column;justify-content:center;padding:0 0 0 24px}
    .t img{width:48px;height:48px}.t b{margin-top:14px;font-size:30px;letter-spacing:-.02em}
    .t span{margin-top:4px;font-size:15px;line-height:1.3;color:#bcd3dc}
    .a{background:url(${ART}) 72% 45%/cover}
    </style><div class="w"><div class="t"><img src="${ICON}"><b>${c.name}</b><span>${c.tagline}</span></div><div class="a"></div></div>`,
  440, 280, join(OUT, `promo-440x280-${lang}.png`));

  // Marquee 1400x560: the same, wider: headline on the panel, the illustration as is.
  await render(browser, `<!doctype html><meta charset="utf-8"><style>${BASE}
    .w{display:grid;grid-template-columns:560px 1fr;width:1400px;height:560px;overflow:hidden;background:${SKY}}
    .t{display:flex;flex-direction:column;justify-content:center;padding:0 0 0 76px}
    .b{display:flex;align-items:center;gap:12px;font-size:24px;font-weight:700}.b img{width:44px;height:44px}
    h1{margin:26px 0 0;font-size:54px;line-height:1.06;letter-spacing:-.02em;font-weight:700}
    .a{background:url(${ART}) 62% 50%/cover}
    </style><div class="w"><div class="t"><div class="b"><img src="${ICON}">${c.name}</div><h1>${c.marquee[0]}<br>${c.marquee[1]}</h1></div><div class="a"></div></div>`,
  1400, 560, join(OUT, `marquee-1400x560-${lang}.png`));
  console.log(`store images: ${lang}`);
}
await browser.close();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
