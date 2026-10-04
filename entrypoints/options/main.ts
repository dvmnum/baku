import { browser } from 'wxt/browser';
import { normalizeDomain, originsFor } from '@/utils/domain';
import { applyI18n, t } from '@/utils/i18n';
import { getSettings, getUsage, setSettings, type FadeMode, type Settings, type Usage } from '@/utils/state';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let settings: Settings;
let usage: Usage;
let access: Record<string, boolean> = {};

async function init(): Promise<void> {
  applyI18n();
  [settings, usage] = await Promise.all([getSettings(), getUsage()]);
  await refreshAccess();
  renderAll();
  bind();

  browser.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    if (changes.settings) {
      settings = await getSettings();
      await refreshAccess();
      renderSites();
      renderForm();
    }
    if (changes.usage) {
      usage = await getUsage();
      renderToday();
    }
  });
  browser.permissions.onAdded.addListener(async () => {
    await refreshAccess();
    renderSites();
  });
}

async function refreshAccess(): Promise<void> {
  const entries = await Promise.all(
    settings.sites.map(
      async (s) => [s, await browser.permissions.contains({ origins: originsFor(s) })] as const,
    ),
  );
  access = Object.fromEntries(entries);
}

function renderAll(): void {
  renderToday();
  renderSites();
  renderForm();
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 1) return `<1 ${t('optMinutes')}`;
  if (m < 60) return `${m} ${t('optMinutes')}`;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

function renderToday(): void {
  const entries = Object.entries(usage.perSite)
    .filter(([, s]) => s >= 1)
    .sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] ?? 1;
  $('today-empty').classList.toggle('hidden', entries.length > 0);

  const list = $('today-list');
  list.replaceChildren(
    ...entries.map(([site, secs]) => {
      const li = document.createElement('li');
      const name = el('span', 'name', site);
      const bar = el('span', 'bar');
      const fill = document.createElement('span');
      fill.style.width = `${Math.max(2, (secs / max) * 100)}%`;
      bar.append(fill);
      li.append(name, bar, el('span', 'time', fmt(secs)));
      return li;
    }),
  );

  const hit = $('limit-hit');
  if (usage.limitHitAt) {
    const time = new Date(usage.limitHitAt).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    hit.textContent = t('optLimitHitAt', [time]);
    hit.classList.remove('hidden');
  } else {
    hit.classList.add('hidden');
  }
}

function renderSites(): void {
  $('sites-empty').classList.toggle('hidden', settings.sites.length > 0);
  $('site-list').replaceChildren(
    ...settings.sites.map((site) => {
      const li = document.createElement('li');
      const left = el('span');
      left.append(el('span', 'name', site));
      if (!access[site]) {
        const grant = el('button', 'warn', t('optNoAccess')) as HTMLButtonElement;
        grant.type = 'button';
        grant.style.marginLeft = '10px';
        grant.addEventListener('click', () => {
          void browser.permissions.request({ origins: originsFor(site) });
        });
        left.append(grant);
      }
      const remove = el('button', '', t('optRemove')) as HTMLButtonElement;
      remove.type = 'button';
      remove.addEventListener('click', () => {
        void setSettings({ sites: settings.sites.filter((s) => s !== site) });
        void browser.permissions.remove({ origins: originsFor(site) }).catch(() => undefined);
      });
      li.append(left, remove);
      return li;
    }),
  );
}

function renderForm(): void {
  const limit = $<HTMLInputElement>('limit');
  if (document.activeElement !== limit) limit.value = String(settings.limitMinutes);
  renderFadeSelect();
  document
    .querySelectorAll<HTMLInputElement>('input[name="mode"]')
    .forEach((r) => (r.checked = r.value === settings.mode));
}

/**
 * The select only offers presets, but storage may hold any value (older
 * builds, manual edits, future sync). Show it as an extra "custom" option
 * instead of silently displaying an empty select.
 */
function renderFadeSelect(): void {
  const select = $<HTMLSelectElement>('fade');
  const value = String(settings.fadeSeconds);
  select.querySelector('option[data-custom]')?.remove();
  const isPreset = [...select.options].some((o) => o.value === value);
  if (!isPreset) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.dataset.custom = '';
    opt.textContent = t('optFadeCustom', [fmtSeconds(settings.fadeSeconds)]);
    select.append(opt);
  }
  select.value = value;
}

function fmtSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} ${t('optSeconds')}`;
  const m = Math.round((seconds / 60) * 10) / 10;
  return `${m} ${t('optMinutes')}`;
}

function bind(): void {
  $('add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>('add-input');
    const err = $('add-error');
    const domain = normalizeDomain(input.value);
    if (!domain) {
      err.textContent = t('optInvalidDomain');
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');
    // Must be called synchronously in the user gesture.
    browser.permissions.request({ origins: originsFor(domain) }).then(async (granted) => {
      if (!granted) {
        err.textContent = t('popupPermissionDenied');
        err.classList.remove('hidden');
      }
      // Keep the site even without access; the list shows a "grant" button.
      const fresh = await getSettings();
      if (!fresh.sites.includes(domain)) await setSettings({ sites: [...fresh.sites, domain] });
      input.value = '';
    });
  });

  $<HTMLInputElement>('limit').addEventListener('change', (e) => {
    const v = Math.round(Number((e.target as HTMLInputElement).value));
    if (!Number.isFinite(v) || v < 1) {
      renderForm();
      return;
    }
    void save({ limitMinutes: Math.min(1440, v) });
  });

  $<HTMLSelectElement>('fade').addEventListener('change', (e) => {
    void save({ fadeSeconds: Number((e.target as HTMLSelectElement).value) });
  });

  document.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((r) =>
    r.addEventListener('change', () => {
      if (r.checked) void save({ mode: r.value as FadeMode });
    }),
  );
}

let savedTimer: ReturnType<typeof setTimeout> | undefined;
async function save(patch: Partial<Settings>): Promise<void> {
  await setSettings(patch);
  const s = $('saved');
  s.classList.add('show');
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => s.classList.remove('show'), 1200);
}

function el(tag: string, cls = '', text = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

void init();
