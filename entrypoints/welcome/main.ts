import { browser } from 'wxt/browser';
import { normalizeDomain, originsFor } from '@/utils/domain';
import { applyI18n, t } from '@/utils/i18n';
import { getSettings, setSettings } from '@/utils/state';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// Popular time sinks. Russian-speaking users see the RU-centric ones first.
const SITES_RU = ['youtube.com', 'vk.com', 'tiktok.com', 'dzen.ru', 'pikabu.ru', 'instagram.com', 'reddit.com', 'x.com', 'twitch.tv'];
const SITES_EN = ['youtube.com', 'tiktok.com', 'instagram.com', 'reddit.com', 'x.com', 'facebook.com', 'twitch.tv', 'netflix.com', 'vk.com'];
const LIMITS = [15, 30, 60, 90];

async function init(): Promise<void> {
  applyI18n();
  const settings = await getSettings();
  const lang = browser.i18n.getUILanguage().toLowerCase();
  const popular = lang.startsWith('ru') ? SITES_RU : SITES_EN;
  // Reopening the page later shows what's already tracked.
  const sites = [...popular, ...settings.sites.filter((s) => !popular.includes(s))];

  $('site-chips').replaceChildren(
    ...sites.map((s) => chip('checkbox', 'site', s, s, settings.sites.includes(s))),
  );
  const limit = LIMITS.includes(settings.limitMinutes) ? settings.limitMinutes : 30;
  $('limit-chips').replaceChildren(
    ...LIMITS.map((m) => chip('radio', 'limit', String(m), `${m} ${t('optMinutes')}`, m === limit)),
  );
  bind();
}

function chip(type: 'checkbox' | 'radio', name: string, value: string, text: string, checked: boolean): HTMLElement {
  const label = document.createElement('label');
  label.className = 'chip';
  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.value = value;
  input.checked = checked;
  const span = document.createElement('span');
  span.textContent = text;
  label.append(input, span);
  return label;
}

function selectedSites(): string[] {
  return [...document.querySelectorAll<HTMLInputElement>('input[name="site"]:checked')].map((i) => i.value);
}

function bind(): void {
  const input = $<HTMLInputElement>('other-input');
  const addOther = () => {
    const err = $('other-error');
    const domain = normalizeDomain(input.value);
    if (!domain) {
      err.textContent = t('optInvalidDomain');
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');
    const existing = document.querySelector<HTMLInputElement>(`input[name="site"][value="${CSS.escape(domain)}"]`);
    if (existing) existing.checked = true;
    else $('site-chips').append(chip('checkbox', 'site', domain, domain, true));
    input.value = '';
  };
  $('other-add').addEventListener('click', addOther);
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    addOther();
  });

  $('setup').addEventListener('submit', (e) => {
    e.preventDefault();
    const sites = selectedSites();
    const err = $('start-error');
    if (!sites.length) {
      err.textContent = t('welcomeNeedSite');
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');
    const limitMinutes = Number(
      document.querySelector<HTMLInputElement>('input[name="limit"]:checked')?.value ?? 30,
    );
    // One prompt for all sites. Must be called synchronously in the user gesture.
    browser.permissions.request({ origins: sites.flatMap(originsFor) }).then(async (granted) => {
      // Keep the sites even without access; settings show a "grant" button.
      const fresh = await getSettings();
      await setSettings({
        sites: [...fresh.sites, ...sites.filter((s) => !fresh.sites.includes(s))],
        limitMinutes,
      });
      $('done-denied').classList.toggle('hidden', granted);
      $('setup').classList.add('hidden');
      $('done').classList.remove('hidden');
    });
  });

  $('open-settings').addEventListener('click', () => void browser.runtime.openOptionsPage());
}

void init();
