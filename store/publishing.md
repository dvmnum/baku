# Как выложить Baku: Chrome Web Store и Firefox Add-ons

Тексты лежат рядом: `listing-ru.md`, `listing-en.md`. Здесь порядок действий и что вставлять в какое поле.

## 0. Перед загрузкой

```bash
npm run test:e2e
npm run zip
npm run zip:firefox
```

Получится:
- `.output/baku-1.0.0-chrome.zip` для Chrome;
- `.output/baku-1.0.0-firefox.zip` и `.output/baku-1.0.0-sources.zip` для Firefox.

---

## 1. Chrome Web Store

https://chrome.google.com/webstore/devconsole → **New item** → загрузить `baku-1.0.0-chrome.zip`.

### Вкладка Store listing

Сначала **English** (язык по умолчанию), потом в правом верхнем углу переключить язык на **Русский** и заполнить то же самое по-русски.

| Поле | EN | RU |
|---|---|---|
| Name, Summary | подтянутся из пакета | подтянутся из пакета |
| Description | раздел «Detailed description» из `listing-en.md` | раздел «Подробное описание» из `listing-ru.md` |
| Category | Productivity → Tools | (одна на все языки) |
| Language | English | |
| Store icon 128×128 | `public/icon/128.png` | (одна на все языки) |
| Screenshots | `store/screenshots/en/` 1→5 по порядку | `store/screenshots/ru/` 1→5 |
| Small promo tile | `store/promo-440x280-en.png` | `store/promo-440x280-ru.png` |
| Marquee | `store/marquee-1400x560-en.png` | `store/marquee-1400x560-ru.png` |
| Official URL | можно не трогать | |
| Homepage URL | https://dvmnum.github.io/baku | |
| Support URL | https://github.com/dvmnum/baku/issues | |
| Mature content | No | |

### Вкладка Privacy practices

Всё есть в `listing-en.md` → «"Privacy practices" tab» (поля заполняются по-английски):
- **Single purpose**: текст оттуда;
- **Permission justification**: отдельные поля для `storage`, `scripting`, `activeTab` и **Host permission** (это `optional_host_permissions`);
- **Remote code**: «No, I am not using remote code»;
- **Data usage**: отметить только **Web history** и **User activity**, все три галочки внизу подтвердить;
- **Privacy policy URL**: https://dvmnum.github.io/baku/privacy.html

### Вкладка Distribution

- Payments: Free.
- Visibility: **Public**.
- Regions: все.

### Вкладка Test instructions (необязательно, но помогает модерации)

```
No account or login needed.
1. Open the toolbar popup on any site (e.g. a news site) and click "Track"; allow access.
2. In Settings set the smallest daily limit and the fastest fade speed.
3. Browse that site (scroll, click). When the limit runs out, the page fades to grayscale.
The extension makes no network requests; all data stays in chrome.storage.local.
```

### Отправка

**Submit for review**. В диалоге можно снять галочку «Publish automatically after approval», тогда после одобрения опубликуешь сам кнопкой Publish. Проверка обычно занимает от пары дней до недели.

Когда карточка одобрена, пришли мне ссылку: проставлю её в кнопки сайта (сейчас там `href="#"` и «скоро»), в README и в карточку Edge/Яндекс/Opera.

---

## 2. Firefox Add-ons (AMO)

https://addons.mozilla.org/developers/ → **Submit a New Add-on**. Вход через аккаунт Mozilla.

1. **Distribution:** «On this site» (листинг на AMO).
2. **Upload:** `baku-1.0.0-firefox.zip`. Платформа: только **Firefox** (desktop), Android снять: там не проверяли.
3. **Source code:** «Yes» → загрузить `baku-1.0.0-sources.zip`. Это обязательно: код собран сборщиком.
4. **Describe add-on** (по-английски, язык по умолчанию):
   - **Name**: подтянется («Baku — Fade Distractions»);
   - **Add-on URL**: `baku` (если занято, то `baku-fade`);
   - **Summary**: подтянется из пакета;
   - **Description**: «Detailed description» из `listing-en.md`, но строку из блока PRIVATE замени на «Firefox asks for access to a site only when you add it.»;
   - **Categories**: Appearance + Other;
   - **Support email**: на твой выбор (можно оставить пустым);
   - **Support website**: https://github.com/dvmnum/baku/issues;
   - **License**: **GNU General Public License v3.0** (если есть вариант «or later», бери его);
   - **Privacy policy**: поставить галочку и вставить текст английской части из `store/privacy-policy.md` (AMO просит текст, а не ссылку);
   - **Notes to reviewer**: блок из конца `listing-en.md` (раздел «Firefox Add-ons (AMO)»).
5. **Submit Version**.

### После отправки: страница дополнения (Edit Product Page)

- **Images → Screenshots**: `store/screenshots/en/` 1→5 (иконка возьмётся из пакета).
- **Homepage**: https://dvmnum.github.io/baku
- **Русский язык**: вверху страницы редактирования переключить локаль на **Русский**, вставить «Подробное описание» из `listing-ru.md` и поменять строку про доступ на «Доступ к сайту Firefox спрашивает только тогда, когда ты его добавляешь.» Название и краткое описание подтянутся из пакета. Скриншоты на AMO общие, поэтому оставь английские.

Автоматическая проверка проходит за минуты. Ручная проверка исходников может занять от нескольких дней до пары недель, а пока её нет, дополнение уже доступно по ссылке.

---

## 3. Обновления

1. Поднять `version` в `package.json`, добавить запись в `CHANGELOG.md`.
2. `npm run zip` и `npm run zip:firefox`.
3. **Chrome:** Package → Upload new package → Submit for review.
4. **AMO:** Upload New Version → снова приложить `-sources.zip` и заметку для проверяющих.
