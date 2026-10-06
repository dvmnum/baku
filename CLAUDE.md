# Baku: context for Claude Code

## What this is

Browser extension (Chrome MV3, Firefox later). Distracting sites fade to grayscale once their daily time limit runs out (a shared one, or a site's own). Nothing is ever blocked; the site just stops being fun. Part of the owner's side-project series named after Japanese mythology (baku = a spirit that eats bad dreams).

The owner talks in Russian, casually. Code, comments and commits are in English. The UI is bilingual (ru + en) from day one.

## Status

Version **1.0.0** is feature-complete for the first Chrome Web Store release: new popup, settings and onboarding (light + dark), per-site limits, fade strength. Verified by the Playwright e2e suite (18 checks); typecheck and build are clean. Submitted to the Chrome Web Store by the owner; the listing copy was later cleaned of brand names (see Store listing copy below).

Versions: 0.1 = the MVP mechanics (fade, time tracking, "5 more minutes"). 1.0 = the first public release (everything above).

## Decisions already made (don't relitigate without asking)

- **Stack:** WXT 0.21 + TypeScript, vanilla DOM for popup and options (no framework; keep the bundle tiny). If the UI grows, Preact or Svelte is the agreed next step.
- **No backend.** All data lives in `chrome.storage.local`. Privacy is a selling point.
- **Permissions:** only `storage`, `scripting` and `activeTab` at install. Sites are requested one by one through `optional_host_permissions` when the user adds them. Never add `<all_urls>` / `host_permissions` to the real build. The `--mode e2e` build (or the `BAKU_E2E` env flag) exists only for tests.
- **Time tracking:** content-script heartbeats every 5 s; the background credits `min(now - lastBeatAt, 5s)`. `lastBeatAt` lives in `storage.session`, so it survives service-worker sleep and doesn't double count across tabs. Activity means tab visible + input (mouse, wheel, keys, touch, scroll) within the last 60 s, OR a video is playing. Window focus is NOT required: the popup, overlays and devtools steal focus while the user keeps scrolling underneath (requiring focus made VK count at ~1/3 speed with the popup open). The popup timer interpolates between beats but never goes back up.
- **Limits:** one shared daily limit, plus an optional own limit per site (`settings.siteLimits`, minutes). A site with its own limit fades by its own time and does NOT spend the shared limit; the shared pool is the sum of `perSite` over sites without an own limit (`usedSeconds()` in utils/state.ts). The popup timer, the badge and "5 more minutes" all follow the active site's limit.
- **Fade strength:** `fadeStrength` 0.6 / 0.8 / 1 (default 1) caps the grayscale; brightness dims with it (`1 - g * 0.2`).
- **"5 more minutes":** a 5 s pause (a bar fills the button) before confirming, max 2 per day across all limits. It extends the limit the active site counts against (`grantExtension()`), from the current moment, so the fade clears immediately.
- **Excluded pages:** messengers and creator tools don't count and never fade (`utils/exclusions.ts`: built-in `BUILTIN_EXCLUSIONS` per site + the user's own in `settings.exclusions`). A pattern is a path prefix (`/im`) or a hostname (`chat.reddit.com`). The content script polls `location.href` every second, so SPA navigation in and out of excluded pages is picked up. Add sites to the table, not as ifs.
- **Domain aliases:** some sites live on several domains (`ALIASES` in utils/domain.ts: vk.com ↔ vk.ru, x.com ↔ twitter.com). A tracked site covers its aliases for matching, permissions and content-script registration. Registration is per granted origin, so a site granted before an alias existed keeps working on its original domain. Add new pairs there, not as per-site ifs.
- **The filter goes on `<html>`**, which keeps `position: fixed` working.
- **UI style:** clean and simple, Geologica, neutral surfaces, jade only for what's live (ring, switch, current site); everything goes gray when time is out. No Japanese ornament in the UI (only the name). The popup header is a small tapir mark + "Baku".
- **Tone:** plain and clear for numbers, buttons and labels. A light "go take a break" voice only at emotional moments (almost out, out, waiting before an extension, no extensions left), never shaming. Those lines rotate daily (`popupAlmost_N`, `popupRest_N`, `popupThink_N`).
- **License:** GPL-3.0-or-later for the code (chosen over MIT to keep forks and store clones open). The name, icon and illustration are excluded and stay © dvmnum (see README). The repo goes public at launch; `site/` is published to GitHub Pages (https://dvmnum.github.io/baku) by `.github/workflows/pages.yml`.
- **Store listing copy:** no lists of brands or site names in the description or screenshot captions (Torii was rejected for keyword spam over exactly that). Say "video, social, feeds", not YouTube/VK/TikTok. Domains shown inside UI screenshots are fine.
- **Distribution:** Chrome Web Store first (it also covers Yandex Browser, Edge, Opera and Brave), then Firefox AMO.

## Layout

```
entrypoints/background.ts   heartbeat accounting, dynamic content-script registration, toolbar badge
entrypoints/content.ts      activity detection, heartbeats, CSS filter (registration: 'runtime')
entrypoints/popup/          timer ring (m:ss), current-site card, "All sites" list folded behind a toggle (state in localStorage), "5 more minutes"; 9 states, see main.ts
entrypoints/options/        daily limit (stepper + presets), sites with today's time and own-limit editor, fade strength / speed / mode with a before/after preview, About (Boosty, site, issues, source, privacy, version)
entrypoints/welcome/        onboarding on first install: illustration, pick sites + daily limit
utils/state.ts              Settings/Usage types, defaults, limit math (limitSeconds/usedSeconds/grantExtension), fade math
utils/exclusions.ts         built-in excluded pages (messengers), isExcluded(), normalizeExclusion()
utils/domain.ts             normalizeDomain, matchSite/matchDomain, originsFor (with aliases), ALIASES
utils/i18n.ts               t(), tp() for plurals (key_one/_few/_many/_other), applyI18n() for [data-i18n], [data-i18n-placeholder], [data-i18n-aria]
assets/shared.css           design tokens (light/dark, follows the system), bundled Geologica font; jade --accent only for live/progress, ink --primary-bg buttons, --warn for errors
public/fonts/               Geologica variable woff2 (latin + cyrillic), OFL license
public/img/baku-night.webp   onboarding + settings preview illustration (generated with ChatGPT for the owner)
public/_locales/{en,ru}/    all UI strings; placeholders like $USED$
public/icon/                PNG icons, generated from assets/icon.svg by `npm run icons`
assets/icon.svg             icon source: white tapir-baku on a deep jade tile (Torii's sibling style)
scripts/make-icons.mjs      renders the PNGs with Playwright
scripts/store.mjs           store screenshots/promo/marquee from the real UI (`npm run store`)
store/                      listing-{ru,en}.md, privacy-policy.md (source of the policy), screenshots/, promo, marquee
site/                       GitHub Pages, Torii-style: index.html (ru) + en/index.html, style.css, demo.js (drag-to-fade before/after), privacy.html (generated), img/ (og images, store screenshots and bare UI pieces `ui-*.webp` for the feature rows, all from `npm run store`). Feature rows pair a big headline with a real piece of the UI; no icon-card grids (the owner found them generic). Store buttons are href="#" + data-soon until the listing URL exists.
tests/e2e.mjs               Playwright smoke test
```

## Commands

```bash
npm install
npm run dev            # Chrome with HMR
npm run build          # .output/chrome-mv3
npm run typecheck
npm run icons          # rebuild public/icon/*.png after editing assets/icon.svg
npm run store          # rebuild store/ images from the real UI (e2e build)
npm run zip            # .output/baku-<version>-chrome.zip for upload
npm run test:e2e       # builds with --mode e2e into .output/chrome-mv3-e2e, runs Playwright (first time: npx playwright install chromium)
```

## Roadmap

**Before publishing 1.0:**

- Store material is ready in `store/` (listing ru/en with permission justifications and data-usage answers, privacy policy md + html, screenshots, promo and marquee). Rebuild images with `npm run store`, package with `npm run zip`. Privacy policy URL: https://dvmnum.github.io/baku/privacy.html (`npm run privacy` regenerates `site/privacy.html` from `store/privacy-policy.md`). The repo is public and Pages is live (first deploys hit a GitHub Actions outage; run #4 succeeded). Left: upload the zip and fill the listing.
- Test on real YouTube, VK and TikTok (SPA navigation, fullscreen video, iframes). YouTube and VK were checked by the owner. VK revealed the vk.com → vk.ru move, fixed with domain aliases.

**Done in 1.0:** icon (white tapir on deep jade); toolbar badge (minutes left for the active site's limit); onboarding with popular-site chips (RU-centric order for Russian UI) and one permission prompt; popup redesign (9 states, live m:ss timer, rotating "go rest" lines); settings redesign with per-site limits and fade strength; Geologica bundled; light + dark everywhere.

**Next (after the first release):**

- The toolbar icon fades from jade to gray as the limit runs out (`action.setIcon` with ImageData).
- Schedules (weekday vs weekend, time windows).
- Stats history by day, streaks of days within the limit.
- More modes: sepia, slowed scrolling.
- Import and export settings, `storage.sync`.
- Optional widget for Torii (the owner's new-tab extension).

**Later:** premium features (advanced stats, schedules). Payments are tricky from Russia, since Stripe and Paddle aren't directly available.
## Conventions

- Every new UI string goes into BOTH `public/_locales/en/messages.json` and `ru/messages.json`. Use named placeholders (`$NAME$` + a `placeholders` block).
- Call `permissions.request` synchronously inside the click handler, with no `await` before it.
- Keep CSS on design tokens from `assets/shared.css`; support both light and dark.
- Commit messages are in English and use the imperative mood.
