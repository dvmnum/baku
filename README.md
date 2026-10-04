# Baku 獏

Browser extension that slowly fades time-wasting sites to grayscale once your daily limit runs out. Nothing gets blocked; the sites just stop being fun.

> Baku is a Japanese spirit that devours bad dreams. This one devours doomscrolling.

## How it works

- Add sites (YouTube, VK, TikTok…) and set a shared daily limit (30 min by default).
- Time only counts while you are actually there: the tab is visible, the window is focused and you have touched the mouse or keyboard in the last minute, or a video is playing.
- When the limit runs out, the site fades to grayscale and dims a little, so bright pages don't turn glaring white (30 s, 2.5 min or 10 min). In hard mode, after 15 more minutes it also blurs and loses contrast.
- "5 more minutes" is there, but you have to wait 10 seconds before confirming, and you only get it twice a day.
- Everything resets at local midnight. All data stays in `chrome.storage.local`, with no server and no analytics.

## Development

```bash
npm install
npm run dev          # Chrome with hot reload
npm run dev:firefox
npm run build        # → .output/chrome-mv3
npm run zip          # store-ready zip
npm run typecheck
```

To load manually: `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`.

`npx wxt build --mode e2e` (or `BAKU_E2E=1 npm run build`) produces a build with host permissions granted up front, for automated tests that can't click permission prompts. Don't ship it. `npm run test:e2e` builds it into `.output/chrome-mv3-e2e` and runs the Playwright smoke test.

## Structure

```
entrypoints/
  background.ts   time accounting (heartbeats → storage), content script registration
  content.ts      activity detection, heartbeats, applies the CSS filter
  popup/          progress ring, track/untrack current site, "5 more minutes"
  options/        today's stats, site list, limit / fade speed / mode
  welcome/        onboarding on first install: pick sites + daily limit
utils/
  state.ts        settings & usage types, defaults, fade math
  domain.ts       domain normalization and matching
  i18n.ts         chrome.i18n helpers
public/_locales/  en, ru
```

### Design notes

- **No host permissions at install.** Each site is requested via `optional_host_permissions` when added, and the fade script is registered dynamically with `scripting.registerContentScripts` only for granted sites.
- **MV3 service worker sleeps.** There are no timers in the background. Content scripts send a heartbeat every 5 s, and the background credits `min(now - lastBeat, 5s)`. `lastBeat` lives in `storage.session`, so parallel tabs never double count and nothing breaks when the worker restarts.
- **The filter goes on `<html>`**, which keeps `position: fixed` elements working.

## License

Proprietary, all rights reserved. See [LICENSE](LICENSE).
