# Как выложить Baku: Chrome Web Store и Firefox Add-ons

Пошагово, в том порядке, в каком идут экраны. Всё, что нужно вставлять, лежит прямо здесь в серых блоках: копируй целиком.

Тексты для Chrome — копия из `listing-en.md` / `listing-ru.md`. Если меняешь описание, правь в обоих местах.

Порядок: сначала Chrome (дольше проверяют), потом Firefox, в тот же день.

---

## 0. Подготовка (5 минут)

В папке проекта:

```bash
npm run test:e2e
```

Должно быть 18 галочек ✓. Потом:

```bash
npm run zip
```

```bash
npm run zip:firefox
```

В папке `.output/` появятся три файла:

| Файл | Куда |
|---|---|
| `baku-1.0.0-chrome.zip` | Chrome Web Store |
| `baku-1.0.0-firefox.zip` | Firefox, сам пакет |
| `baku-1.0.0-sources.zip` | Firefox, исходники для проверки |

Картинки уже готовы (пересобирать не надо, только если менял интерфейс):

| Что | Английская | Русская |
|---|---|---|
| Скриншоты 1280×800, по порядку 1→5 | `store/screenshots/en/` | `store/screenshots/ru/` |
| Малая промо-плитка 440×280 | `store/promo-440x280-en.png` | `store/promo-440x280-ru.png` |
| Большой баннер 1400×560 | `store/marquee-1400x560-en.png` | `store/marquee-1400x560-ru.png` |
| Иконка 128×128 | `public/icon/128.png` | та же |

---

## 1. Chrome Web Store

### 1.1. Создать карточку

1. Открой https://chrome.google.com/webstore/devconsole под тем же аккаунтом, что и Torii. Регистрационный взнос и подтверждение почты уже сделаны тогда, повторять не надо.
2. Вверху справа **+ New item**.
3. Перетащи `.output/baku-1.0.0-chrome.zip` → откроется черновик карточки «Baku — Fade Distractions».

Слева будут вкладки: **Package**, **Store listing**, **Privacy**, **Distribution**, **Test instructions**. Проходим по порядку. Черновик сохраняется кнопкой **Save draft** вверху, жми её после каждой вкладки.

### 1.2. Вкладка Store listing — английская версия

Вверху вкладки выбор языка, по умолчанию **English**. Название и краткое описание (Summary) подставятся сами из пакета, их не трогай.

**Description** — вставить:

```
Baku doesn't block anything. When your daily limit runs out, the feed slowly fades to gray, and doomscrolling just stops being fun.

HOW IT WORKS
• Add the sites you lose time on: video, social, feeds, anything.
• Set a shared daily limit, say 30 minutes.
• When time is up, those sites slowly turn gray. Nothing closes or hides; you just lose the urge to keep scrolling.
• At midnight everything is in color again.

TIME IS COUNTED HONESTLY
Only while you're actually there: the tab is open and you scroll, click or watch a video. A tab in the background, or you away from the computer, doesn't count.

OWN LIMIT FOR ANY SITE
Give the most addictive site a smaller limit of its own; the rest share one. A site with its own limit is counted separately.

MESSAGES DON'T COUNT
Direct messages and other useful parts of social sites never cost time and never go gray. You can add your own pages too.

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
```

Ниже на той же вкладке:

| Поле | Что выбрать / вставить |
|---|---|
| **Category** | Productivity → **Tools** |
| **Language** | English |
| **Store icon** | `public/icon/128.png` |
| **Global promo video** | пусто |
| **Screenshots** | 5 файлов из `store/screenshots/en/`, строго по номерам: 1-fade, 2-timer, 3-own-limit, 4-messages, 5-extension. Порядок можно поправить перетаскиванием |
| **Small promo tile** | `store/promo-440x280-en.png` |
| **Marquee promo tile** | `store/marquee-1400x560-en.png` |
| **Official URL** | оставить «None» (для него нужно подтверждать домен в Search Console, не стоит того) |
| **Homepage URL** | `https://dvmnum.github.io/baku` |
| **Support URL** | `https://github.com/dvmnum/baku/issues` |
| **Mature content** | No |

**Save draft.**

### 1.3. Вкладка Store listing — русская версия

1. Вверху вкладки в выборе языка нажми **Add language** (или выпадающий список) → **Русский**.
2. Название и краткое описание снова подставятся сами, по-русски.
3. **Description** — вставить:

```
Baku не блокирует сайты. Когда дневной лимит кончился, лента просто плавно выцветает в серый — и залипать становится скучно.

КАК ЭТО РАБОТАЕТ
• Добавь сайты, на которых теряешь время: видео, соцсети, ленты — любые.
• Задай общий лимит на день, например 30 минут.
• Когда время вышло, сайты медленно становятся серыми. Ничего не закрывается и не прячется — просто пропадает желание листать дальше.
• В полночь всё снова цветное.

ВРЕМЯ СЧИТАЕТСЯ ЧЕСТНО
Только пока ты правда на сайте: вкладка открыта и ты листаешь, кликаешь или смотришь видео. Вкладка в фоне или ты отошёл от компьютера — время стоит.

СВОЙ ЛИМИТ ДЛЯ ЛЮБОГО САЙТА
Самому затягивающему сайту — отдельный лимит поменьше, остальные делят общий. Сайт со своим лимитом считается отдельно.

СООБЩЕНИЯ НЕ СЧИТАЮТСЯ
Личные сообщения и другие полезные разделы соцсетей не тратят время и никогда не сереют. Можно добавить и свои страницы.

ЕЩЁ 5 МИНУТ — ЕСЛИ ОЧЕНЬ НАДО
Продлить можно, но после короткой паузы, чтобы рука не тянулась на автомате. И только дважды в день.

НАСТРОЙ ПОД СЕБЯ
• Насколько серым: слегка, заметно или полностью
• Как быстро выцветать: за 30 секунд, 2,5 или 10 минут
• Жёсткий режим: через 15 минут после лимита добавляется лёгкое размытие
• Таймер в окошке расширения и оставшиеся минуты прямо на иконке
• Светлая и тёмная тема, русский и английский интерфейс

ПРИВАТНО
Никакого сервера, аккаунтов, рекламы и аналитики. Всё хранится только в твоём браузере. Доступ к сайту Chrome спрашивает только тогда, когда ты его добавляешь.

Баку — дух из японских легенд, который съедает плохие сны. Этот съедает думскроллинг.
```

4. Картинки для русского языка свои:
   - **Screenshots**: 5 файлов из `store/screenshots/ru/`, по номерам 1→5;
   - **Small promo tile**: `store/promo-440x280-ru.png`;
   - **Marquee promo tile**: `store/marquee-1400x560-ru.png`.
5. Категория, иконка и ссылки общие на все языки, их не трогаешь.

**Save draft.**

### 1.4. Вкладка Privacy

Все поля здесь только по-английски.

**Single purpose description:**

```
Baku limits time on distracting sites the user chooses: once the daily limit runs out, those sites gradually turn grayscale.
```

**Permission justification** — у каждого разрешения своё поле:

`storage`:
```
Keeps the list of sites, limits, settings and today's time per site in the browser.
```

`scripting`:
```
Attaches the fade script only to sites the user added and granted access to (dynamic registration instead of access to all sites at install).
```

`activeTab`:
```
When the user opens the popup, it reads the current tab's address to show its time and offer to track that site.
```

**Host permission justification** (поле называется так, хотя у нас это `optional_host_permissions`):
```
Site access is optional and requested one site at a time, only when the user adds that site. It is needed to count time on that site and turn it gray. The extension has no access to any other site.
```

**Are you using remote code?** → **No, I am not using remote code.**

**Data usage** — что собирает расширение. Отметить **только две** галочки:
- ☑ **Web history**
- ☑ **User activity**

Остальные (Personally identifiable info, Health, Financial, Authentication, Personal communications, Location, Website content) — **не отмечать**.

Зачем отмечать, если данные никуда не уходят: Chrome требует указывать и то, что обрабатывается только локально, а за неотмеченные пункты отклоняют чаще, чем за лишние.

Ниже три утверждения — поставить **все три** галочки:
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:**
```
https://dvmnum.github.io/baku/privacy.html
```

**Save draft.**

### 1.5. Вкладка Distribution

| Поле | Значение |
|---|---|
| **Payments** | Free of charge |
| **Visibility** | Public |
| **Distribution** (регионы) | All regions |

**Save draft.**

### 1.6. Вкладка Test instructions

Необязательная, но модератору так быстрее, а значит меньше шанс отказа «не смогли проверить функциональность».

**Username / Password** — пусто.

**Additional instructions:**
```
No account or login needed.
1. Open the toolbar popup on any site (e.g. a news site) and click "Track"; allow access.
2. In Settings set the smallest daily limit (5 minutes) and the fastest fade speed (30 seconds).
3. Browse that site (scroll, click). When the limit runs out, the page fades to grayscale.
The extension makes no network requests; all data stays in chrome.storage.local.
```

**Save draft.**

### 1.7. Отправить

1. Вверху справа **Submit for review**. Если кнопка серая, слева у какой-то вкладки будет красный значок: там незаполненное обязательное поле.
2. В диалоге есть галочка **Publish … automatically after it has passed review**:
   - оставить — расширение появится в магазине сразу после одобрения;
   - снять — после одобрения придёт письмо, и у тебя будет 30 дней, чтобы нажать **Publish** самому.
   Советую оставить, если не хочешь подгадать запуск под пост.
3. **Submit**. Статус станет **Pending review**.

**Сколько ждать:** обычно 1–3 дня, иногда до недели.

**Если откажут:** придёт письмо с кодом нарушения (как «Yellow Argon» у Torii). Перешли его мне, разберём. Самые вероятные:
- **Purple Potassium** — «лишние разрешения»: ответ — доступ к сайтам опциональный и запрашивается по одному, это видно в пакете;
- **Yellow Argon** — «спам ключевыми словами»: бренды из описаний уже убраны, но если зацепятся за скриншоты, переснимем.

**Когда одобрят:** пришли мне ссылку на карточку. Подставлю её в кнопки на сайте (сейчас там «скоро»), в README и в карточку Edge/Яндекс/Opera на сайте.

---

## 2. Firefox Add-ons (AMO)

### 2.1. Аккаунт

https://addons.mozilla.org/developers/ → **Log in** (или **Register**) — это аккаунт Mozilla, создаётся бесплатно по почте. При первом входе в Developer Hub попросят принять **Firefox Add-on Distribution Agreement** и выбрать **Display name** (например, dvmnum) — его увидят пользователи как автора.

### 2.2. Загрузка — экран за экраном

1. **Submit a New Add-on** (кнопка на главной Developer Hub).

2. **How to Distribute this Version** → выбрать **On this site** → **Continue**.

3. **Upload Version:**
   - **Select a file…** → `.output/baku-1.0.0-firefox.zip`;
   - **Compatible platforms**: ☑ **Firefox**, ☐ **Firefox for Android** (снять: на телефоне не проверяли);
   - подождать автоматическую проверку: должно быть «Your add-on was validated with no errors and no warnings»;
   - **Continue**.

4. **Source code** — «Do you need to submit source code?» → **Yes** → **Select a file…** → `.output/baku-1.0.0-sources.zip` → **Continue**.
   Почему «Yes»: код в пакете собран сборщиком (Vite), и Mozilla требует исходники, чтобы проверяющий мог пересобрать и сравнить.

5. **Describe Add-on** — по-английски:

| Поле | Значение |
|---|---|
| **Name** | подставится: Baku — Fade Distractions |
| **Add-on URL** | `baku`; если занято — `baku-fade` |
| **Summary** | подставится из пакета, не трогать |
| **This add-on is experimental** | ☐ |
| **This add-on requires payment…** | ☐ |
| **Categories** | ☑ **Appearance**, ☑ **Other** (больше двух не дадут) |
| **Support email** | по желанию, можно пусто |
| **Support website** | `https://github.com/dvmnum/baku/issues` |
| **License** | **GNU General Public License v3.0** |
| **This add-on has a privacy policy** | ☑, текст ниже |
| **Notes to reviewer** | текст ниже |

**Description** (отличается от Chrome одной строкой в блоке PRIVATE):

```
Baku doesn't block anything. When your daily limit runs out, the feed slowly fades to gray, and doomscrolling just stops being fun.

HOW IT WORKS
• Add the sites you lose time on: video, social, feeds, anything.
• Set a shared daily limit, say 30 minutes.
• When time is up, those sites slowly turn gray. Nothing closes or hides; you just lose the urge to keep scrolling.
• At midnight everything is in color again.

TIME IS COUNTED HONESTLY
Only while you're actually there: the tab is open and you scroll, click or watch a video. A tab in the background, or you away from the computer, doesn't count.

OWN LIMIT FOR ANY SITE
Give the most addictive site a smaller limit of its own; the rest share one. A site with its own limit is counted separately.

MESSAGES DON'T COUNT
Direct messages and other useful parts of social sites never cost time and never go gray. You can add your own pages too.

5 MORE MINUTES, IF YOU REALLY NEED IT
You can extend, but only after a short pause, so your hand doesn't do it on autopilot. And only twice a day.

MAKE IT YOURS
• How gray: a little, noticeably or fully
• How fast: 30 seconds, 2.5 or 10 minutes
• Hard mode: 15 minutes after the limit, a light blur kicks in too
• A timer in the extension popup and minutes left right on the icon
• Light and dark themes, English and Russian

PRIVATE
No server, no accounts, no ads, no analytics. Everything stays in your browser. Firefox asks for access to a site only when you add it.

Baku is a spirit from Japanese folklore that eats bad dreams. This one eats doomscrolling.
```

**Privacy policy** (Mozilla просит сам текст, не ссылку; это английская часть `privacy-policy.md`, где «Chrome» заменён на «the browser»):

```
Baku is a browser extension that turns distracting sites grayscale once your daily time limit runs out.

The extension has no server, accounts, analytics or ads, and makes no network requests at all. We don't collect, sell or share your data. Everything is stored only in your browser (storage.local); removing the extension removes all of it.

What data is handled
- The sites you add and your settings: limits, excluded pages, fade speed and strength. Stored only in your browser.
- Time spent on each added site today. Stored only in your browser and reset every day at midnight.
- Activity on added sites. The extension's script runs only on sites you added and granted access to. It notices scrolling, mouse movement, clicks and key presses, and checks whether a video is playing, only to tell that you're on the site and time should count. The actions themselves, page content and anything you type are not recorded or stored.
- The current tab's address is read when you open the extension popup, to show that site's time and offer to track it. It isn't stored unless you add the site.

Site access
At install, the extension has access to no sites. The browser asks for permission separately for each site you add. You can revoke it by removing the site in Baku's settings or in the browser's add-on settings.

Third-party services
None. The font and images ship inside the extension.

Full policy: https://dvmnum.github.io/baku/privacy.html
```

**Notes to reviewer:**

```
Built with WXT (Vite) and TypeScript. To reproduce the package from the sources zip:
  Node.js 22+, npm 10+
  npm ci
  npm run zip:firefox
The output is .output/baku-1.0.0-firefox.zip.

The extension asks for no host permissions at install. Each site the user adds is requested
through optional_host_permissions, and the content script is registered at runtime only for
granted sites (scripting.registerContentScripts). No network requests, no remote code;
all data stays in storage.local.

To test: open the toolbar popup on any site and click "Track", allow access, set the daily
limit to 5 minutes and the fade speed to 30 seconds in Settings, then browse that site.
```

6. **Submit Version**. Откроется экран «Version submitted» со ссылкой на страницу дополнения.

### 2.3. Доделать страницу дополнения

На экране после отправки или в **My Add-ons** → Baku → **Edit Product Page**.

1. **Images → Screenshots → Add a screenshot**: 5 файлов из `store/screenshots/en/` по порядку 1→5. Подписи (caption) — по желанию, без названий сайтов. Иконка подтянется из пакета.
2. **Additional Details → Homepage**: `https://dvmnum.github.io/baku` → **Save Changes**.
3. **Русская версия.** Вверху страницы редактирования есть выбор языка, в котором ты редактируешь (по умолчанию English). Переключи на **Русский** и заполни **Description**:

```
Baku не блокирует сайты. Когда дневной лимит кончился, лента просто плавно выцветает в серый — и залипать становится скучно.

КАК ЭТО РАБОТАЕТ
• Добавь сайты, на которых теряешь время: видео, соцсети, ленты — любые.
• Задай общий лимит на день, например 30 минут.
• Когда время вышло, сайты медленно становятся серыми. Ничего не закрывается и не прячется — просто пропадает желание листать дальше.
• В полночь всё снова цветное.

ВРЕМЯ СЧИТАЕТСЯ ЧЕСТНО
Только пока ты правда на сайте: вкладка открыта и ты листаешь, кликаешь или смотришь видео. Вкладка в фоне или ты отошёл от компьютера — время стоит.

СВОЙ ЛИМИТ ДЛЯ ЛЮБОГО САЙТА
Самому затягивающему сайту — отдельный лимит поменьше, остальные делят общий. Сайт со своим лимитом считается отдельно.

СООБЩЕНИЯ НЕ СЧИТАЮТСЯ
Личные сообщения и другие полезные разделы соцсетей не тратят время и никогда не сереют. Можно добавить и свои страницы.

ЕЩЁ 5 МИНУТ — ЕСЛИ ОЧЕНЬ НАДО
Продлить можно, но после короткой паузы, чтобы рука не тянулась на автомате. И только дважды в день.

НАСТРОЙ ПОД СЕБЯ
• Насколько серым: слегка, заметно или полностью
• Как быстро выцветать: за 30 секунд, 2,5 или 10 минут
• Жёсткий режим: через 15 минут после лимита добавляется лёгкое размытие
• Таймер в окошке расширения и оставшиеся минуты прямо на иконке
• Светлая и тёмная тема, русский и английский интерфейс

ПРИВАТНО
Никакого сервера, аккаунтов, рекламы и аналитики. Всё хранится только в твоём браузере. Доступ к сайту Firefox спрашивает только тогда, когда ты его добавляешь.

Баку — дух из японских легенд, который съедает плохие сны. Этот съедает думскроллинг.
```

   Название и краткое описание на русском подтянутся из пакета. Скриншоты на AMO одни на все языки, поэтому остаются английские.

**Сколько ждать:**
- автоматическая проверка — минуты; после неё дополнение уже доступно по ссылке и в поиске AMO;
- ручная проверка исходников — от нескольких дней до пары недель; если у проверяющего будут вопросы, придёт письмо, перешли его мне.

**Когда будет ссылка:** пришли её мне, проставлю в кнопку Firefox на сайте и в README.

---

## 3. Перед кнопкой Submit: короткий чек-лист

- [ ] e2e: 18 ✓
- [ ] Chrome: zip загружен, описание EN + RU, 5+5 скриншотов, плитки EN + RU, иконка
- [ ] Chrome: Privacy — single purpose, 4 обоснования, remote code No, Web history + User activity, 3 галочки, ссылка на политику
- [ ] Chrome: Distribution — Free, Public, All regions
- [ ] Firefox: только desktop, исходники приложены, лицензия GPL v3, политика текстом, заметка для проверяющих
- [ ] Firefox: после отправки — скриншоты, Homepage, русское описание

---

## 4. Обновления (потом)

1. Поднять `version` в `package.json`, добавить запись в `CHANGELOG.md`.
2. `npm run zip` и `npm run zip:firefox`.
3. **Chrome:** вкладка **Package** → **Upload new package** → **Submit for review**. Описание и картинки сохраняются, их трогать не надо.
4. **Firefox:** страница дополнения → **Upload New Version** → снова пакет + `-sources.zip` + заметка для проверяющих (в ней поменять номер версии).
