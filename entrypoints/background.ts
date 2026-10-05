import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { matchSite, originsFor } from '@/utils/domain';
import { HEARTBEAT_MS, type Message } from '@/utils/messages';
import { getSettings, getUsage, limitSeconds, secondsLeft, setUsage, usedSeconds } from '@/utils/state';

const SCRIPT_ID = 'baku-fade';
const CONTENT_SCRIPT_FILE = '/content-scripts/content.js';
// Badge colors mirror --accent and --gray from assets/shared.css (light theme).
const BADGE_ACTIVE = '#0d7d68';
const BADGE_OUT = '#8c8a87';

export default defineBackground(() => {
  // --- Time tracking -------------------------------------------------------
  //
  // Content scripts on tracked sites send a heartbeat every HEARTBEAT_MS while
  // the user is actually there (tab visible, window focused, not idle — or a
  // video is playing). We credit wall-clock time since the last counted beat,
  // capped at one interval, so two visible tabs never double-count and a
  // sleeping service worker loses nothing (the timestamp lives in session
  // storage).

  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  };

  async function onHeartbeat(hostname: string): Promise<void> {
    const settings = await getSettings();
    const site = matchSite(hostname, settings.sites);
    if (!site) return;

    const now = Date.now();
    const { lastBeatAt } = (await browser.storage.session.get('lastBeatAt')) as {
      lastBeatAt?: number;
    };
    const gap = lastBeatAt ? now - lastBeatAt : Infinity;
    const creditMs = Math.max(0, Math.min(gap, HEARTBEAT_MS));
    await browser.storage.session.set({ lastBeatAt: now });
    if (creditMs === 0) return;

    const usage = await getUsage();
    const credit = creditMs / 1000;
    // The site counts against its own limit if it has one, else the shared one.
    const wasUnder = usedSeconds(settings, usage, site) < limitSeconds(settings, usage, site);
    usage.seconds += credit;
    usage.perSite[site] = (usage.perSite[site] ?? 0) + credit;
    if (wasUnder && usedSeconds(settings, usage, site) >= limitSeconds(settings, usage, site) && !usage.limitHitAt) {
      usage.limitHitAt = now;
    }
    await setUsage(usage);
  }

  browser.runtime.onMessage.addListener((raw: unknown) => {
    const msg = raw as Message;
    if (msg?.type === 'heartbeat') {
      return serial(() => onHeartbeat(msg.hostname)).then(() => undefined);
    }
    return undefined;
  });

  // --- Content script registration -----------------------------------------
  //
  // The fade script only runs on sites the user added AND granted access to.
  // We keep one dynamic registration in sync with that list.

  /**
   * Match patterns we may run on: every origin of every tracked site that has
   * been granted. Checked per origin, so a site added before an alias existed
   * (say vk.com before vk.ru) keeps working on the domain it was granted for.
   */
  async function grantedOrigins(): Promise<string[]> {
    const { sites } = await getSettings();
    const origins = [...new Set(sites.flatMap(originsFor))];
    const checks = await Promise.all(origins.map((o) => browser.permissions.contains({ origins: [o] })));
    return origins.filter((_, i) => checks[i]);
  }

  async function syncRegistration(): Promise<void> {
    const origins = await grantedOrigins();
    const existing = await browser.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
    if (existing.length) {
      await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
    }
    if (!origins.length) return;
    await browser.scripting.registerContentScripts([
      {
        id: SCRIPT_ID,
        matches: origins,
        js: [CONTENT_SCRIPT_FILE],
        runAt: 'document_start',
        allFrames: false,
        persistAcrossSessions: true,
      },
    ]);
  }

  /** Inject into tabs that were already open when a site got added. */
  async function injectIntoOpenTabs(origins: string[]): Promise<void> {
    if (!origins.length) return;
    const tabs = await browser.tabs.query({ url: origins });
    await Promise.all(
      tabs.map((tab) =>
        tab.id == null
          ? undefined
          : browser.scripting
              .executeScript({ target: { tabId: tab.id }, files: [CONTENT_SCRIPT_FILE] })
              .catch(() => undefined),
      ),
    );
  }

  const resync = () =>
    serial(async () => {
      await syncRegistration();
      await injectIntoOpenTabs(await grantedOrigins());
    }).catch((e) => console.error('[baku] sync failed', e));

  // --- Toolbar badge ---------------------------------------------------------
  //
  // Minutes left today for the active tab's limit: its own if the site has one,
  // otherwise the shared one. Jade while there's time, gray once it's gone,
  // empty when no sites are tracked. Usage rolls over at midnight only when
  // read, so we also refresh on tab/window switches to catch the new day.

  /** Tracked site of the active tab; tab.url is only visible for sites we have access to. */
  async function activeSite(sites: string[]): Promise<string | null> {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.url) return null;
    try {
      return matchSite(new URL(tab.url).hostname, sites);
    } catch {
      return null;
    }
  }

  async function updateBadge(): Promise<void> {
    const [settings, usage] = await Promise.all([getSettings(), getUsage()]);
    if (!settings.sites.length) {
      await browser.action.setBadgeText({ text: '' });
      return;
    }
    const left = secondsLeft(settings, usage, await activeSite(settings.sites));
    const minutes = Math.ceil(left / 60);
    await browser.action.setBadgeText({ text: minutes > 999 ? '999+' : String(minutes) });
    await browser.action.setBadgeBackgroundColor({ color: minutes > 0 ? BADGE_ACTIVE : BADGE_OUT });
    await browser.action.setBadgeTextColor?.({ color: '#ffffff' });
  }

  const refreshBadge = () => void updateBadge().catch((e) => console.error('[baku] badge failed', e));

  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') void browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') });
  });
  browser.runtime.onInstalled.addListener(resync);
  browser.runtime.onStartup.addListener(resync);
  browser.runtime.onInstalled.addListener(refreshBadge);
  browser.runtime.onStartup.addListener(refreshBadge);
  browser.tabs.onActivated.addListener(refreshBadge);
  browser.tabs.onUpdated.addListener((_id, info) => {
    if (info.url) refreshBadge();
  });
  browser.windows.onFocusChanged.addListener(refreshBadge);
  browser.permissions.onAdded.addListener(resync);
  browser.permissions.onRemoved.addListener(resync);
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.settings || changes.usage) refreshBadge();
    if (!changes.settings) return;
    const before = (changes.settings.oldValue as { sites?: string[] } | undefined)?.sites ?? [];
    const after = (changes.settings.newValue as { sites?: string[] } | undefined)?.sites ?? [];
    if (before.join() !== after.join()) resync();
  });
});
