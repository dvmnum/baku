import { browser } from 'wxt/browser';
import { matchSite, normalizeDomain, originsFor } from '@/utils/domain';
import { applyI18n, t } from '@/utils/i18n';
import {
  EXTENSION_SECONDS,
  MAX_EXTENSIONS_PER_DAY,
  getSettings,
  getUsage,
  limitSeconds,
  setSettings,
  setUsage,
  type Settings,
  type Usage,
} from '@/utils/state';

const THINK_SECONDS = 10;
const RING_LEN = 2 * Math.PI * 52;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let settings: Settings;
let usage: Usage;
/** Domain of the active tab, or null if the page can't be tracked. */
let currentDomain: string | null = null;
let thinking = false;

async function init(): Promise<void> {
  applyI18n();
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  currentDomain = tab?.url ? normalizeDomain(tab.url) : null;
  [settings, usage] = await Promise.all([getSettings(), getUsage()]);
  render();

  browser.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    if (changes.settings) settings = await getSettings();
    if (changes.usage) usage = await getUsage();
    render();
  });

  $('toggle-site').addEventListener('click', toggleSite);
  $('extra-btn').addEventListener('click', onExtra);
  $('open-settings').addEventListener('click', () => browser.runtime.openOptionsPage());
}

function render(): void {
  const limit = limitSeconds(settings, usage);
  const usedMin = Math.floor(usage.seconds / 60);
  const limitMin = Math.round(limit / 60);
  const over = usage.seconds >= limit;
  const ratio = Math.min(1, usage.seconds / Math.max(1, limit));

  document.body.classList.toggle('over', over);
  const fill = $('ring-fill');
  fill.style.strokeDasharray = `${RING_LEN}`;
  fill.style.strokeDashoffset = `${RING_LEN * (1 - ratio)}`;
  $('used').textContent = t('popupUsed', [usedMin, limitMin]);

  if (!settings.sites.length) {
    $('status').textContent = t('popupNoSites');
  } else if (over) {
    $('status').textContent = t('popupOver');
  } else {
    $('status').textContent = t('popupLeft', [Math.ceil((limit - usage.seconds) / 60)]);
  }

  // Current site
  const toggle = $<HTMLButtonElement>('toggle-site');
  $('site-block').classList.toggle('unsupported', !currentDomain);
  if (!currentDomain) {
    $('domain').textContent = t('popupUnsupported');
    $('site-state').textContent = '';
    toggle.classList.add('hidden');
  } else {
    const tracked = matchSite(currentDomain, settings.sites);
    $('domain').textContent = tracked ?? currentDomain;
    $('site-state').textContent = t(tracked ? 'popupTracked' : 'popupNotTracked');
    toggle.textContent = t(tracked ? 'popupUntrack' : 'popupTrack');
    toggle.classList.toggle('primary', !tracked);
    toggle.classList.remove('hidden');
  }

  // "5 more minutes"
  $('extra-block').classList.toggle('hidden', !over || !settings.sites.length);
  const left = MAX_EXTENSIONS_PER_DAY - usage.extensionsUsed;
  const extraBtn = $<HTMLButtonElement>('extra-btn');
  if (!thinking) {
    extraBtn.textContent = t('extraButton');
    extraBtn.disabled = left <= 0;
    delete extraBtn.dataset.confirm;
  }
  $('extra-left').textContent =
    left > 0 ? t('extraLeft', [left, MAX_EXTENSIONS_PER_DAY]) : t('extraNone');
}

function toggleSite(): void {
  if (!currentDomain) return;
  const tracked = matchSite(currentDomain, settings.sites);
  $('site-error').classList.add('hidden');

  if (tracked) {
    const sites = settings.sites.filter((s) => s !== tracked);
    void setSettings({ sites });
    void browser.permissions.remove({ origins: originsFor(tracked) }).catch(() => undefined);
    return;
  }

  // permissions.request must run synchronously inside the click handler.
  const domain = currentDomain;
  browser.permissions.request({ origins: originsFor(domain) }).then(async (granted) => {
    if (!granted) {
      $('site-error').textContent = t('popupPermissionDenied');
      $('site-error').classList.remove('hidden');
      return;
    }
    const fresh = await getSettings();
    if (!fresh.sites.includes(domain)) await setSettings({ sites: [...fresh.sites, domain] });
  });
}

function onExtra(): void {
  const btn = $<HTMLButtonElement>('extra-btn');
  if (btn.dataset.confirm) {
    void grantExtra();
    return;
  }
  // Friction: make them sit with the decision for a few seconds.
  thinking = true;
  btn.disabled = true;
  let left = THINK_SECONDS;
  btn.textContent = t('extraWait', [left]);
  const iv = setInterval(() => {
    left -= 1;
    if (left > 0) {
      btn.textContent = t('extraWait', [left]);
      return;
    }
    clearInterval(iv);
    btn.disabled = false;
    btn.dataset.confirm = '1';
    btn.textContent = t('extraConfirm');
  }, 1000);
}

async function grantExtra(): Promise<void> {
  const fresh = await getUsage();
  if (fresh.extensionsUsed >= MAX_EXTENSIONS_PER_DAY) return;
  // Extend from the current moment, so the fade clears right away.
  const s = await getSettings();
  const base = Math.max(fresh.seconds, limitSeconds(s, fresh));
  fresh.extraSeconds += base - limitSeconds(s, fresh) + EXTENSION_SECONDS;
  fresh.extensionsUsed += 1;
  thinking = false;
  await setUsage(fresh);
}

void init();
