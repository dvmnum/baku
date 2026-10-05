import { browser } from 'wxt/browser';
import { normalizeDomain, originsFor } from '@/utils/domain';
import { builtinExclusions, normalizeExclusion } from '@/utils/exclusions';
import { applyI18n, t } from '@/utils/i18n';
import { getSettings, getUsage, setSettings, type FadeMode, type Settings, type Usage } from '@/utils/state';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const LIMIT_STEP = 5;
const LIMIT_MIN = 5;
const LIMIT_MAX = 600;
const PRESETS = [15, 30, 45, 60, 90];
const STRENGTHS: [number, string][] = [
  [0.6, 'optStrengthLight'],
  [0.8, 'optStrengthMid'],
  [1, 'optStrengthFull'],
];
const SPEEDS: [number, string, string][] = [
  [30, 'optFadeFast', 'optFadeFastSub'],
  [150, 'optFadeNormal', 'optFadeNormalSub'],
  [600, 'optFadeSlow', 'optFadeSlowSub'],
];
const MODES: [FadeMode, string, string][] = [
  ['soft', 'optModeSoft', 'optModeSoftSub'],
  ['hard', 'optModeHard', 'optModeHardSub'],
];
/** Default for a site's own limit when switching it from shared. */
const OWN_LIMIT_DEFAULT = 15;

let settings: Settings;
let usage: Usage;
let access: Record<string, boolean> = {};
/** Site whose limit editor is open. */
let editing: string | null = null;

interface Row {
  li: HTMLLIElement;
  update: () => void;
}
const rows = new Map<string, Row>();

async function init(): Promise<void> {
  applyI18n();
  $('version').textContent = t('optVersion', [browser.runtime.getManifest().version]);
  [settings, usage] = await Promise.all([getSettings(), getUsage()]);
  await refreshAccess();
  renderAll();
  bind();

  browser.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    if (changes.settings) {
      settings = await getSettings();
      await refreshAccess();
    }
    if (changes.usage) usage = await getUsage();
    renderAll();
  });
  browser.permissions.onAdded.addListener(async () => {
    await refreshAccess();
    renderSites();
  });
  browser.permissions.onRemoved.addListener(async () => {
    await refreshAccess();
    renderSites();
  });
}

async function refreshAccess(): Promise<void> {
  const entries = await Promise.all(
    settings.sites.map(async (s) => [s, await browser.permissions.contains({ origins: originsFor(s) })] as const),
  );
  access = Object.fromEntries(entries);
}

function renderAll(): void {
  renderLimit();
  renderSites();
  renderFade();
}

// --- Daily limit -------------------------------------------------------------

function renderLimit(): void {
  $('limit').textContent = String(settings.limitMinutes);
  const anyOwn = settings.sites.some((s) => settings.siteLimits[s] != null);
  $('limit-sub').textContent = t(anyOwn ? 'optLimitRest' : 'optLimitShared');
  $('presets').replaceChildren(
    ...PRESETS.map((m) => {
      const b = button(String(m), m === settings.limitMinutes ? 'on' : '');
      b.addEventListener('click', () => void save({ limitMinutes: m }));
      return b;
    }),
  );
}

function setLimit(minutes: number): void {
  void save({ limitMinutes: Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, minutes)) });
}

// --- Sites -------------------------------------------------------------------

function sortedSites(): string[] {
  return [...settings.sites].sort(
    (a, b) => (usage.perSite[b] ?? 0) - (usage.perSite[a] ?? 0) || a.localeCompare(b),
  );
}

/**
 * Rebuilds the list only when the set or order of sites changes; otherwise
 * updates rows in place, so an open editor doesn't flicker or lose focus.
 */
function renderSites(): void {
  const order = sortedSites();
  const list = $('site-list');
  $('sites-empty').classList.toggle('hidden', order.length > 0);
  $('list-head').classList.toggle('hidden', order.length === 0);

  const same = order.length === rows.size && order.every((s, i) => list.children[i] === rows.get(s)?.li);
  if (!same) {
    for (const site of [...rows.keys()]) if (!order.includes(site)) rows.delete(site);
    for (const site of order) if (!rows.has(site)) rows.set(site, createRow(site));
    list.replaceChildren(...order.map((s) => rows.get(s)!.li));
  }
  if (editing && !order.includes(editing)) editing = null;
  for (const row of rows.values()) row.update();
}

function createRow(site: string): Row {
  const li = document.createElement('li');
  const name = span('s', site);
  const time = span('t');
  const grant = button(t('optGrantAccess'), 'grant');
  grant.type = 'button';
  grant.addEventListener('click', () => {
    // Must be called synchronously in the user gesture.
    void browser.permissions.request({ origins: originsFor(site) });
  });
  const chip = button('', 'lim');
  chip.title = t('optOwnLimitTitle');
  chip.addEventListener('click', () => {
    editing = editing === site ? null : site;
    for (const row of rows.values()) row.update();
  });
  const remove = button('×', 'x');
  remove.setAttribute('aria-label', t('optRemoveSite', [site]));
  remove.addEventListener('click', () => {
    const siteLimits = { ...settings.siteLimits };
    delete siteLimits[site];
    const exclusions = { ...settings.exclusions };
    delete exclusions[site];
    void save({ sites: settings.sites.filter((s) => s !== site), siteLimits, exclusions });
    void browser.permissions.remove({ origins: originsFor(site) }).catch(() => undefined);
  });

  // Inline editor: shared or own limit for this site.
  const wrap = el('div', 'ed-wrap');
  const inner = el('div');
  const box = el('div', 'editor');
  const edRow = el('div', 'ed-row');
  const seg = el('div', 'seg');
  const shared = button(t('optSharedTab'));
  const own = button(t('optOwnTab'));
  seg.append(shared, own);
  const stepper = el('div', 'stepper');
  const minus = button('−');
  minus.setAttribute('aria-label', t('optLess'));
  const val = el('b');
  const plus = button('+');
  plus.setAttribute('aria-label', t('optMore'));
  stepper.append(minus, val, plus);
  edRow.append(seg, stepper);
  const hint = el('p', 'ed-hint');

  // Pages of this site that don't count: built-in (a messenger) plus the user's own.
  const ex = el('div', 'ex');
  const exLabel = span('fl', t('optExcl'));
  const exChips = el('div', 'ex-chips');
  const exForm = document.createElement('form');
  exForm.className = 'ex-add';
  const exInput = document.createElement('input');
  exInput.type = 'text';
  exInput.placeholder = t('optExclPlaceholder', [site]);
  exInput.autocomplete = 'off';
  exInput.spellcheck = false;
  const exBtn = button(t('optAdd'));
  exBtn.type = 'submit';
  exForm.append(exInput, exBtn);
  const exErr = el('p', 'err hidden');
  const exHint = el('p', 'ed-hint');
  exHint.textContent = t('optExclHint');
  ex.append(exLabel, exChips, exForm, exErr, exHint);
  exForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pattern = normalizeExclusion(exInput.value, site);
    if (!pattern) {
      exErr.textContent = t('optExclInvalid', [site]);
      exErr.classList.remove('hidden');
      return;
    }
    exErr.classList.add('hidden');
    exInput.value = '';
    const mine = settings.exclusions[site] ?? [];
    if (mine.includes(pattern) || builtinExclusions(site).includes(pattern)) return;
    void save({ exclusions: { ...settings.exclusions, [site]: [...mine, pattern] } });
  });
  const pageLabel = (p: string) => (p.startsWith('/') ? `${site}${p}` : p);
  const renderExclusions = () => {
    const mine = settings.exclusions[site] ?? [];
    exChips.replaceChildren(
      ...builtinExclusions(site).map((p) => {
        const c = span('ex-chip builtin', pageLabel(p));
        c.title = t('optExclBuiltin');
        return c;
      }),
      ...mine.map((p) => {
        const c = span('ex-chip', pageLabel(p));
        const x = button('×');
        x.setAttribute('aria-label', t('optExclRemove', [pageLabel(p)]));
        x.addEventListener('click', () => {
          const rest = mine.filter((v) => v !== p);
          const exclusions = { ...settings.exclusions };
          if (rest.length) exclusions[site] = rest;
          else delete exclusions[site];
          void save({ exclusions });
        });
        c.append(x);
        return c;
      }),
    );
  };

  box.append(edRow, hint, ex);
  inner.append(box);
  wrap.append(inner);

  let draft = OWN_LIMIT_DEFAULT;
  const setOwn = (minutes: number | null) => {
    const siteLimits = { ...settings.siteLimits };
    if (minutes == null) delete siteLimits[site];
    else siteLimits[site] = Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, minutes));
    void save({ siteLimits });
  };
  shared.addEventListener('click', () => {
    const cur = settings.siteLimits[site];
    if (cur == null) return;
    draft = cur;
    setOwn(null);
  });
  own.addEventListener('click', () => {
    if (settings.siteLimits[site] == null) setOwn(draft);
  });
  minus.addEventListener('click', () => setOwn((settings.siteLimits[site] ?? draft) - LIMIT_STEP));
  plus.addEventListener('click', () => setOwn((settings.siteLimits[site] ?? draft) + LIMIT_STEP));

  li.append(name, time, grant, chip, remove, wrap);

  const update = () => {
    const secs = usage.perSite[site] ?? 0;
    const hasAccess = access[site] !== false;
    time.textContent = clock(secs);
    time.className = secs < 1 ? 't zero' : 't';
    time.hidden = !hasAccess;
    grant.hidden = hasAccess;

    const cur = settings.siteLimits[site];
    const isOwn = cur != null;
    chip.className = isOwn ? 'lim own' : 'lim';
    chip.textContent = isOwn ? minutes(cur) : t('optShared');
    chip.setAttribute('aria-expanded', String(editing === site));
    li.classList.toggle('open', editing === site);

    shared.className = isOwn ? '' : 'on';
    own.className = isOwn ? 'on' : '';
    stepper.classList.toggle('off', !isOwn);
    val.textContent = minutes(isOwn ? cur : draft);
    hint.textContent = isOwn ? t('optHintOwn') : t('optHintShared', [settings.limitMinutes]);
    renderExclusions();
  };
  return { li, update };
}

// --- Fading ------------------------------------------------------------------

function renderFade(): void {
  const strength = settings.fadeStrength;
  $('preview-after').style.filter = `grayscale(${strength}) brightness(${1 - strength * 0.2})`;
  $('preview-after-cap').textContent = t('optAfter', [Math.round(strength * 100)]);

  $('strength').replaceChildren(
    ...STRENGTHS.map(([v, key]) =>
      seg(t(key), `${Math.round(v * 100)}%`, Math.abs(v - strength) < 0.01, () => save({ fadeStrength: v })),
    ),
  );

  // Storage may hold a non-preset speed (older builds, manual edits); show it instead of hiding it.
  const speeds = SPEEDS.map(([v, k, sub]) => [v, t(k), t(sub)] as const);
  const custom = !SPEEDS.some(([v]) => v === settings.fadeSeconds)
    ? [[settings.fadeSeconds, t('optFadeCustom'), fmtSeconds(settings.fadeSeconds)] as const]
    : [];
  $('speed').replaceChildren(
    ...[...speeds, ...custom].map(([v, title, sub]) =>
      seg(title, sub, v === settings.fadeSeconds, () => save({ fadeSeconds: v })),
    ),
  );

  $('mode').replaceChildren(
    ...MODES.map(([v, k, sub]) => seg(t(k), t(sub), v === settings.mode, () => save({ mode: v }))),
  );
}

// --- Events ------------------------------------------------------------------

function bind(): void {
  $('limit-minus').addEventListener('click', () => setLimit(settings.limitMinutes - LIMIT_STEP));
  $('limit-plus').addEventListener('click', () => setLimit(settings.limitMinutes + LIMIT_STEP));

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
      if (!fresh.sites.includes(domain)) await save({ sites: [...fresh.sites, domain] });
      input.value = '';
    });
  });
}

let savedTimer: ReturnType<typeof setTimeout> | undefined;
async function save(patch: Partial<Settings>): Promise<void> {
  await setSettings(patch);
  const s = $('saved');
  s.classList.add('show');
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => s.classList.remove('show'), 1100);
}

// --- Helpers -----------------------------------------------------------------

function clock(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

function minutes(n: number): string {
  return `${n} ${t('optMinutes')}`;
}

function fmtSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} ${t('optSeconds')}`;
  return minutes(Math.round((seconds / 60) * 10) / 10);
}

function seg(title: string, sub: string, on: boolean, onClick: () => void): HTMLButtonElement {
  const b = button(title, on ? 'on' : '');
  const small = document.createElement('small');
  small.textContent = sub;
  b.append(small);
  b.setAttribute('aria-pressed', String(on));
  b.addEventListener('click', onClick);
  return b;
}

function button(text: string, cls = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  if (cls) b.className = cls;
  b.textContent = text;
  return b;
}

function span(cls: string, text = ''): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}

function el(tag: string, cls = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

void init();
