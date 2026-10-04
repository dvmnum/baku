# Baku: context for Claude Code

## What this is

Browser extension (Chrome MV3, Firefox later). Distracting sites fade to grayscale once a shared daily time limit runs out. Nothing is ever blocked; the site just stops being fun. Part of the owner's side-project series named after Japanese mythology (baku = a spirit that eats bad dreams).

The owner talks in Russian, casually. Code, comments and commits are in English. The UI is bilingual (ru + en) from day one.

## Status

The MVP (v0.1) is done and verified in headless Chromium: the fade works, untracked sites stay untouched, "5 more minutes" restores color, and typecheck and build are clean.

## Decisions already made (don't relitigate without asking)

- **Stack:** WXT 0.21 + TypeScript, vanilla DOM for popup and options (no framework; keep the bundle tiny). If the UI grows, Preact or Svelte is the agreed next step.
- **No backend.** All data lives in `chrome.storage.local`. Privacy is a selling point.
- **Permissions:** only `storage`, `scripting` and `activeTab` at install. Sites are requested one by one through `optional_host_permissions` when the user adds them. Never add `<all_urls>` / `host_permissions` to the real build. The `BAKU_E2E` env flag exists only for tests.
- **Time tracking:** content-script heartbeats every 5 s; the background credits `min(now - lastBeatAt, 5s)`. `lastBeatAt` lives in `storage.session`, so it survives service-worker sleep and doesn't double count across tabs. Activity means tab visible + window focused + input within the last 60 s, OR a video is playing.
- **One shared limit** for all sites (per-site limits are v1.0).
- **"5 more minutes":** a 10 s forced wait before confirming, max 2 per day. The extension counts from the current moment, so the fade clears immediately.
- **The filter goes on `<html>`**, which keeps `position: fixed` working.
- **License:** the repo is private with "All rights reserved" for now. The plan is to switch to GPL-3.0 when it goes public at launch.
- **Distribution:** Chrome Web Store first (it also covers Yandex Browser, Edge, Opera and Brave), then Firefox AMO.

## Layout

```
entrypoints/background.ts   heartbeat accounting, dynamic content-script registration
entrypoints/content.ts      activity detection, heartbeats, CSS filter (registration: 'runtime')
entrypoints/popup/          progress ring, track/untrack current site, "5 more minutes"
entrypoints/options/        today's stats, site list, limit / fade speed / mode
utils/state.ts              Settings/Usage types, defaults, fade math
utils/domain.ts             normalizeDomain, matchSite, originsFor
utils/i18n.ts               t(), applyI18n() for [data-i18n]
assets/shared.css           design tokens (light/dark), vermilion accent
public/_locales/{en,ru}/    all UI strings; placeholders like $USED$
public/icon/                placeholder icons (half red, half gray circle)
tests/e2e.mjs               Playwright smoke test
```

## Commands

```bash
npm install
npm run dev            # Chrome with HMR
npm run build          # .output/chrome-mv3
npm run typecheck
npm run test:e2e       # builds with BAKU_E2E=1, runs Playwright (first time: npx playwright install chromium); run `npm run build` again before shipping
```

## Roadmap

**MVP polish (next):**

- Real icon and store assets: screenshots, a promo GIF of a site fading out.
- Badge on the toolbar icon with minutes left.
- An onboarding page on first install that suggests popular sites.
- Test on real YouTube, VK and TikTok (SPA navigation, fullscreen video, iframes).
- Handle a custom `fadeSeconds` value that isn't one of the select options.

**v1.0:**

- Per-site limits and schedules (weekday vs weekend, time windows).
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
