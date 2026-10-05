import { browser } from 'wxt/browser';
import { matchSite, normalizeDomain, originsFor } from '@/utils/domain';
import { HEARTBEAT_MS } from '@/utils/messages';
import { applyI18n, t, tp } from '@/utils/i18n';
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
const RING_LEN = 2 * Math.PI * 74;
/** Show "almost done" below this many seconds left. */
const ALMOST_SECONDS = 5 * 60;
/** How many variants each rotating phrase has in messages.json. */
const PHRASES = { popupAlmost: 3, popupRest: 4, popupThink: 3 } as const;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let settings: Settings;
let usage: Usage;
/** Domain of the active tab, or null if the page can't be tracked. */
let currentDomain: string | null = null;
/** Whether we hold host permission for the tracked site of the active tab. */
let hasAccess = true;
/** Set after the user declined the permission prompt in this popup. */
let accessDenied = false;
/** When the background last credited time (epoch ms), to tick the timer between heartbeats. */
let lastBeatAt = 0;
/** "5 more minutes" flow: null = idle, >0 = seconds left to think, 0 = ready to confirm. */
let think: number | null = null;

async function init(): Promise<void> {
  applyI18n();
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  currentDomain = tab?.url ? normalizeDomain(tab.url) : null;
  const session = (await browser.storage.session.get('lastBeatAt')) as { lastBeatAt?: number };
  lastBeatAt = session.lastBeatAt ?? 0;
  [settings, usage] = await Promise.all([getSettings(), getUsage()]);
  await refreshAccess();
  render();

  browser.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'session' && changes.lastBeatAt) {
      lastBeatAt = (changes.lastBeatAt.newValue as number | undefined) ?? 0;
    }
    if (area !== 'local') return;
    if (changes.settings) {
      settings = await getSettings();
      await refreshAccess();
    }
    if (changes.usage) usage = await getUsage();
    render();
  });
  browser.permissions.onAdded.addListener(async () => {
    await refreshAccess();
    render();
  });
  // Tick once a second so the timer runs smoothly between 5 s heartbeats.
  setInterval(renderTimer, 1000);

  $('open-settings').addEventListener('click', () => void browser.runtime.openOptionsPage());
  $('cur-action').addEventListener('click', onCurrentAction);
  $('cur-switch').addEventListener('click', untrackCurrent);
  $('extra-btn').addEventListener('click', onExtra);
  $('pick-popular').addEventListener('click', () => {
    void browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') });
    window.close();
  });
}

async function refreshAccess(): Promise<void> {
  const site = currentDomain ? matchSite(currentDomain, settings.sites) : null;
  hasAccess = site ? await browser.permissions.contains({ origins: originsFor(site) }) : true;
  if (hasAccess) accessDenied = false;
}

// --- Rendering -------------------------------------------------------------

function trackedCurrent(): string | null {
  return currentDomain ? matchSite(currentDomain, settings.sites) : null;
}

/** True while heartbeats from the active tab keep arriving. */
function isCounting(): boolean {
  return trackedCurrent() !== null && hasAccess && Date.now() - lastBeatAt < HEARTBEAT_MS + 1500;
}

/** Seconds left today, interpolated between heartbeats while time is being counted. */
function secondsLeft(): number {
  const pending = isCounting() ? Math.min(Date.now() - lastBeatAt, HEARTBEAT_MS) / 1000 : 0;
  return Math.max(0, limitSeconds(settings, usage) - usage.seconds - pending);
}

function isOver(): boolean {
  return usage.seconds >= limitSeconds(settings, usage);
}

function render(): void {
  const hasSites = settings.sites.length > 0;
  const over = hasSites && isOver();
  document.body.classList.toggle('over', over);

  $('empty').classList.toggle('hidden', hasSites);
  $('timer').classList.toggle('hidden', !hasSites);
  $('today').classList.toggle('hidden', !hasSites);
  $('pick-popular').classList.toggle('hidden', hasSites);

  renderTimer();
  renderExtra(over);
  renderCurrent(hasSites, over);
  renderList();
}

function renderTimer(): void {
  if (!settings.sites.length) return;
  const limit = limitSeconds(settings, usage);
  const left = secondsLeft();
  const over = isOver();

  const value = $('ring-value');
  const len = left > 0 ? RING_LEN * (left / Math.max(1, limit)) : 0;
  value.style.strokeDasharray = `${len} ${RING_LEN}`;
  value.style.visibility = len > 0 ? 'visible' : 'hidden';
  $('time-left').textContent = clock(over ? 0 : left);
  $('time-sub').textContent = over ? t('popupDoneToday') : t('popupOf', [clock(limit)]);

  // One gentle line under the ring, only where it helps.
  const hint = $('hint');
  let text = '';
  if (!over && left < ALMOST_SECONDS) text = phrase('popupAlmost');
  else if (over && think !== null) text = phrase('popupThink');
  else if (over && extensionsLeft() > 0) text = phrase('popupRest');
  hint.textContent = text;
  hint.classList.toggle('hidden', !text);

  $('cur-live').classList.toggle('hidden', !isCounting());
  if (trackedCurrent() && hasAccess) {
    $('cur-state-text').textContent = t(isCounting() ? 'popupCounting' : 'popupTracked');
  }
}

function renderExtra(over: boolean): void {
  $('extra').classList.toggle('hidden', !over);
  if (!over) return;
  const left = extensionsLeft();
  const btn = $<HTMLButtonElement>('extra-btn');
  btn.classList.toggle('hidden', left <= 0);
  $('extra-note').classList.toggle('hidden', left <= 0 || think !== null);
  $('extra-none').classList.toggle('hidden', left > 0);
  if (left <= 0) return;

  if (think === null) {
    btn.textContent = t('extraButton');
    btn.disabled = false;
  } else if (think > 0) {
    btn.textContent = t('extraWait', [think]);
    btn.disabled = true;
  } else {
    btn.textContent = t('extraConfirm');
    btn.disabled = false;
  }
  $('extra-note').textContent = tp('extraLeft', left);
}

function renderCurrent(hasSites: boolean, over: boolean): void {
  const card = $('current');
  const action = $<HTMLButtonElement>('cur-action');
  const sw = $('cur-switch');
  const tracked = trackedCurrent();
  card.classList.remove('warn', 'muted');
  action.classList.add('hidden');
  sw.classList.add('hidden');

  if (!currentDomain) {
    // chrome://, the new tab page, the Web Store: content scripts can't run there.
    card.classList.toggle('hidden', !hasSites);
    card.classList.add('muted');
    $('cur-name').textContent = t('popupUnsupportedTitle');
    $('cur-state-text').textContent = t('popupUnsupported');
    return;
  }

  // Once the limit is out, a tracked site is already gray; the card adds nothing.
  card.classList.toggle('hidden', over && tracked !== null && hasAccess);
  $('cur-name').textContent = tracked ?? currentDomain;

  if (tracked && !hasAccess) {
    card.classList.add('warn');
    $('cur-state-text').textContent = t('popupNoAccess');
    action.textContent = t('popupAllow');
    action.classList.remove('hidden');
  } else if (tracked) {
    sw.classList.remove('hidden');
    $('cur-state-text').textContent = t(isCounting() ? 'popupCounting' : 'popupTracked');
  } else {
    if (accessDenied) card.classList.add('warn');
    $('cur-state-text').textContent = t(
      accessDenied ? 'popupNoAccess' : hasSites ? 'popupNotTracked' : 'popupThisSite',
    );
    action.textContent = t('popupTrack');
    action.classList.remove('hidden');
  }
}

function renderList(): void {
  const tracked = trackedCurrent();
  const rows = [...settings.sites].sort(
    (a, b) => (usage.perSite[b] ?? 0) - (usage.perSite[a] ?? 0) || a.localeCompare(b),
  );
  $('today-count').textContent = tp('popupSites', rows.length);
  $('list').replaceChildren(
    ...rows.map((site) => {
      const secs = usage.perSite[site] ?? 0;
      const li = document.createElement('li');
      if (site === tracked) li.className = 'cur';
      const name = document.createElement('span');
      name.className = 's';
      name.textContent = site;
      const time = document.createElement('span');
      time.className = secs < 1 ? 't zero' : 't';
      time.textContent = clock(secs);
      li.append(name, time);
      return li;
    }),
  );
}

// --- Actions ---------------------------------------------------------------

function onCurrentAction(): void {
  if (!currentDomain) return;
  const site = trackedCurrent() ?? currentDomain;
  // permissions.request must run synchronously inside the click handler.
  browser.permissions.request({ origins: originsFor(site) }).then(async (granted) => {
    accessDenied = !granted;
    // Keep the site even without access, like the settings page does.
    const fresh = await getSettings();
    if (!fresh.sites.includes(site)) await setSettings({ sites: [...fresh.sites, site] });
    await refreshAccess();
    render();
  });
}

function untrackCurrent(): void {
  const site = trackedCurrent();
  if (!site) return;
  void setSettings({ sites: settings.sites.filter((s) => s !== site) });
  void browser.permissions.remove({ origins: originsFor(site) }).catch(() => undefined);
}

function onExtra(): void {
  if (think === 0) {
    void grantExtra();
    return;
  }
  if (think !== null) return;
  // Friction: make them sit with the decision for a few seconds.
  think = THINK_SECONDS;
  render();
  const iv = setInterval(() => {
    think = Math.max(0, (think ?? 0) - 1);
    if (think === 0) clearInterval(iv);
    render();
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
  think = null;
  await setUsage(fresh);
}

// --- Helpers ---------------------------------------------------------------

function extensionsLeft(): number {
  return MAX_EXTENSIONS_PER_DAY - usage.extensionsUsed;
}

/** 683 -> "11:23", 4500 -> "1:15:00". */
function clock(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** One of a few variants of a phrase, rotating daily so it doesn't get stale. */
function phrase(base: keyof typeof PHRASES): string {
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / 86_400_000);
  return t(`${base}_${(day % PHRASES[base]) + 1}`);
}

void init();
