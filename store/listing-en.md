# Baku — Chrome Web Store listing (English)

The store takes the name and short description from the extension (`public/_locales/en/messages.json`):
- **Name:** Baku — Fade Distractions
- **Short description:** Distracting sites slowly fade to gray when your daily limit runs out. Nothing is blocked, they just stop being fun.

Screenshots: `store/screenshots/en/` (1280×800, in this order). Small promo tile: `store/promo-440x280-en.png`. Marquee (1400×560): `store/marquee-1400x560-en.png`.
Rebuild: `npm run store`.

---

## Detailed description
(the "Description" field on the "Store listing" tab, English)

Baku doesn't block anything. When your daily limit runs out, the feed slowly fades to gray, and doomscrolling just stops being fun.

HOW IT WORKS
• Add the sites you lose time on: YouTube, Reddit, TikTok, X, anything.
• Set a shared daily limit, say 30 minutes.
• When time is up, those sites slowly turn gray. Nothing closes or hides; you just lose the urge to keep scrolling.
• At midnight everything is in color again.

TIME IS COUNTED HONESTLY
Only while you're actually there: the tab is open and you scroll, click or watch a video. A tab in the background, or you away from the computer, doesn't count.

OWN LIMIT FOR ANY SITE
YouTube 20 minutes, TikTok 10, and the rest share one limit. A site with its own limit is counted separately.

MESSAGES DON'T COUNT
Instagram Direct, X messages, Reddit chat and other useful pages never cost time and never go gray. You can add your own pages too.

5 MORE MINUTES, IF YOU REALLY NEED IT
You can extend, but only after a short pause, so your hand doesn't do it on autopilot. And only twice a day.

MAKE IT YOURS
• How gray: a little, noticeably or fully
• How fast: 30 seconds, 2.5 or 10 minutes
• Hard mode: 15 minutes after the limit, a light blur kicks in too
• A timer in the extension popup and minutes left right on the icon
• Light and dark themes, English and Russian

PRIVATE
No server, no accounts, no ads, no analytics. Everything stays in your browser. Chrome asks for access to a site only when you add it.

Baku is a spirit from Japanese folklore that eats bad dreams. This one eats doomscrolling.

---

## "Privacy practices" tab

**Single purpose:**
Baku limits time on distracting sites the user chooses: once the daily limit runs out, those sites gradually turn grayscale.

**Permission justifications:**
- `storage` — keeps the list of sites, limits, settings and today's time per site in the browser.
- `scripting` — attaches the fade script only to sites the user added and granted access to (dynamic registration instead of access to all sites at install).
- `activeTab` — when the user opens the popup, it reads the current tab's address to show its time and offer to track that site.
- Site access (`optional_host_permissions`) — requested one site at a time, only when the user adds it. Needed to count time and turn that site gray. The extension has no access to any other site.

**Remote code:** No. All scripts, the font and images ship inside the package; the extension makes no network requests.

**Data usage:** the Chrome Web Store wants local-only processing disclosed too. Check:
- **Web history** — the addresses of added sites and today's time on them. Stored only in the browser, never sent anywhere.
- **User activity** — on added sites, the script notices scrolling, clicks and key presses only to tell that the site is in use. The actions themselves are not recorded or stored.

Leave the rest unchecked. Confirm all three certifications: data is not sold or transferred and isn't used for anything other than the extension's own function.

**Privacy policy:** https://dvmnum.github.io/baku/privacy.html (source text in `store/privacy-policy.md`, rendered with `npm run privacy`).

---

## Other fields
- **Category:** Productivity → Tools (or Workflow & Planning)
- **Default language:** English (`default_locale: en`), Russian as an extra
- **Visibility:** Public
- **Package:** `npm run zip` → `.output/baku-1.0.0-chrome.zip`
