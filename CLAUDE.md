# Baku: context for Claude Code

## What this is

Browser extension (Chrome MV3, Firefox later). Distracting sites fade to grayscale once a shared daily time limit runs out. Nothing is ever blocked; the site just stops being fun. Part of the owner's side-project series named after Japanese mythology (baku = a spirit that eats bad dreams).

The owner talks in Russian, casually. Code, comments and commits are in English. The UI is bilingual (ru + en) from day one.

## Status

The MVP (v0.1) is done and verified in headless Chromium: the fade works, untracked sites stay untouched, "5 more minutes" restores color, and typecheck and build are clean.

## Decisions already made (don't relitigate without asking)

- **Stack:** WXT 0.21 + TypeScript, vanilla DOM for popup and options (no framework; keep the bundle tiny). If the UI grows, Preact or Svelte is the agreed next step.
- **No backend.** All data lives in `chrome.storage.local`. Privacy is a selling point.
- **Permissions:** only `storage`, `scripting` and `activeTab` at install. Sites are requested one by one through `optional_host_permissions` when the user adds them. Never add `<all_urls>` / `host_permissions` to the real build. The `--mode e2e` build (or the `BAKU_E2E` env flag) exists only for tests.
- **Time tracking:** content-script heartbeats every 5 s; the background credits `min(now - lastBeatAt, 5s)`. `lastBeatAt` lives in `storage.session`, so it survives service-worker sleep and doesn't double count across tabs. Activity means tab visible + window focused + input within the last 60 s, OR a video is playing.
- **One shared limit** for all sites (per-site limits are v1.0).
- **"5 more minutes":** a 10 s forced wait before confirming, max 2 per day. The extension counts from the current moment, so the fade clears immediately.
- **The filter goes on `<html>`**, which keeps `position: fixed` working.
- **UI style:** clean and simple, Geologica, neutral surfaces, jade only for what's live (ring, switch, current site); everything goes gray when time is out. No Japanese ornament in the UI (only the name). The popup header is a small tapir mark + "Baku".
- **Tone:** plain and clear for numbers, buttons and labels. A light "go take a break" voice only at emotional moments (almost out, out, waiting before an extension, no extensions left), never shaming. Those lines rotate daily (`popupAlmost_N`, `popupRest_N`, `popupThink_N`).
- **License:** the repo is private with "All rights reserved" for now. The plan is to switch to GPL-3.0 when it goes public at launch.
- **Distribution:** Chrome Web Store first (it also covers Yandex Browser, Edge, Opera and Brave), then Firefox AMO.

## Layout

```
entrypoints/background.ts   heartbeat accounting, dynamic content-script registration, toolbar badge
entrypoints/content.ts      activity detection, heartbeats, CSS filter (registration: 'runtime')
entrypoints/popup/          timer ring (m:ss), current-site card, today list, "5 more minutes"; 9 states, see main.ts
entrypoints/options/        today's stats, site list, limit / fade speed / mode
entrypoints/welcome/        onboarding on first install: pick sites + daily limit
utils/state.ts              Settings/Usage types, defaults, fade math
utils/domain.ts             normalizeDomain, matchSite, originsFor
utils/i18n.ts               t(), tp() for plurals (key_one/_few/_many/_other), applyI18n() for [data-i18n], [data-i18n-placeholder], [data-i18n-aria]
assets/shared.css           design tokens (light/dark, follows the system), bundled Geologica font; jade --accent only for live/progress, ink --primary-bg buttons, --warn for errors
public/fonts/               Geologica variable woff2 (latin + cyrillic), OFL license
public/_locales/{en,ru}/    all UI strings; placeholders like $USED$
public/icon/                PNG icons, generated from assets/icon.svg by `npm run icons`
assets/icon.svg             icon source: white tapir-baku on a deep jade tile (Torii's sibling style)
scripts/make-icons.mjs      renders the PNGs with Playwright
tests/e2e.mjs               Playwright smoke test
```

## Commands

```bash
npm install
npm run dev            # Chrome with HMR
npm run build          # .output/chrome-mv3
npm run typecheck
npm run icons          # rebuild public/icon/*.png after editing assets/icon.svg
npm run test:e2e       # builds with --mode e2e into .output/chrome-mv3-e2e, runs Playwright (first time: npx playwright install chromium)
```

## Roadmap

**MVP polish (next):**

- Redesign the options page and onboarding in the popup's style (light + dark).

- Store assets: screenshots, a promo GIF of a site fading out.
- Optional: the toolbar icon fades from jade to gray as the limit runs out (`action.setIcon` with ImageData).
- Test on real YouTube, VK and TikTok (SPA navigation, fullscreen video, iframes).

Done: icon (white tapir on deep jade; picked over kanji, detailed heads and illustrated versions, which didn't read at 16 px); toolbar badge with minutes left (vermilion, gray at 0, empty with no sites); a non-preset `fadeSeconds` shows as a "Custom" option in settings; onboarding page (`welcome.html`) opens on first install with popular-site chips (RU-centric order for Russian UI), a custom site field and limit presets, and asks for all chosen origins in one permission prompt.

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
