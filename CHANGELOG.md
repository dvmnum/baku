# Baku changelog

Versions follow semver. The version lives in `package.json` (WXT writes it into the manifest) and shows at the bottom of the settings page.

## Unreleased
- The donation link follows the UI language: Boosty in Russian, Tribute (Telegram) in English.

## 1.0.0
First public release (Chrome Web Store, then Firefox Add-ons).
- New popup: time left as a ring with a live m:ss timer, the current site, all sites folded behind a toggle, nine states for every situation.
- Settings: daily limit with presets, per-site limits, excluded pages, fade strength (60/80/100%), speed and mode with a before/after preview.
- Onboarding on first install: pick sites and a daily limit, one permission prompt.
- Messages and creator tools never count or fade (built-in list plus your own pages).
- Domain aliases: vk.com ↔ vk.ru, x.com ↔ twitter.com.
- Toolbar badge with minutes left; light and dark themes; English and Russian UI; Geologica font bundled.
- Firefox build (Manifest V3, Firefox 128+).

## 0.1.0
The core mechanics: time tracking by activity, a gradual grayscale fade, "5 more minutes".