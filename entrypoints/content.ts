import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { matchSite } from '@/utils/domain';
import { HEARTBEAT_MS, IDLE_MS, type HeartbeatMessage } from '@/utils/messages';
import {
  DEFAULT_SETTINGS,
  fadeLevel,
  normalizeUsage,
  type Settings,
  type Usage,
} from '@/utils/state';

declare global {
  interface Window {
    __bakuLoaded?: boolean;
  }
}

export default defineContentScript({
  // Registered at runtime by the background, only for sites the user added.
  registration: 'runtime',
  matches: [],
  runAt: 'document_start',

  main() {
    // Background may inject into an already-open tab that also got the
    // registered script on a later navigation; run only once per document.
    if (window.__bakuLoaded) return;
    window.__bakuLoaded = true;

    let settings: Settings = DEFAULT_SETTINGS;
    let rawUsage: Usage | undefined;
    let lastInputAt = Date.now();
    let timer: ReturnType<typeof setInterval> | undefined;

    // --- Visual fade ---------------------------------------------------------

    const style = document.createElement('style');
    style.id = 'baku-fade';
    let applied = '';

    function render(): void {
      const tracked = matchSite(location.hostname, settings.sites) !== null;
      const level = tracked
        ? fadeLevel(settings, normalizeUsage(rawUsage))
        : { grayscale: 0, hard: 0 };

      const parts: string[] = [];
      if (level.grayscale > 0) parts.push(`grayscale(${level.grayscale.toFixed(3)})`);
      if (level.hard > 0) {
        parts.push(`blur(${(level.hard * 1.5).toFixed(2)}px)`);
        parts.push(`contrast(${(1 - level.hard * 0.25).toFixed(3)})`);
      }
      const filter = parts.join(' ');
      if (filter === applied) return;
      applied = filter;

      if (!filter) {
        style.remove();
        return;
      }
      // Filter on the root element keeps position:fixed children working.
      style.textContent = `html { filter: ${filter} !important; transition: filter 1.5s linear !important; }`;
      if (!style.isConnected) (document.head ?? document.documentElement).append(style);
    }

    // --- Activity detection --------------------------------------------------

    const markActive = () => {
      lastInputAt = Date.now();
    };
    for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart']) {
      window.addEventListener(ev, markActive, { capture: true, passive: true });
    }

    function videoPlaying(): boolean {
      for (const v of document.querySelectorAll('video')) {
        if (!v.paused && !v.ended && v.readyState > 2) return true;
      }
      return false;
    }

    function isBeingUsed(): boolean {
      if (document.visibilityState !== 'visible') return false;
      if (videoPlaying()) return true;
      return document.hasFocus() && Date.now() - lastInputAt < IDLE_MS;
    }

    // --- Loop ----------------------------------------------------------------

    function tick(): void {
      render(); // also catches the midnight reset
      if (!isBeingUsed()) return;
      if (matchSite(location.hostname, settings.sites) === null) return;
      const msg: HeartbeatMessage = { type: 'heartbeat', hostname: location.hostname };
      browser.runtime.sendMessage(msg).catch(() => {
        // Extension was reloaded/removed: this script is orphaned, stop.
        if (!browser.runtime?.id) stop();
      });
    }

    function stop(): void {
      if (timer) clearInterval(timer);
      style.remove();
    }

    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.settings) {
        settings = { ...DEFAULT_SETTINGS, ...(changes.settings.newValue as Partial<Settings>) };
      }
      if (changes.usage) rawUsage = changes.usage.newValue as Usage | undefined;
      render();
    });

    browser.storage.local.get(['settings', 'usage']).then((data) => {
      settings = { ...DEFAULT_SETTINGS, ...(data.settings as Partial<Settings> | undefined) };
      rawUsage = data.usage as Usage | undefined;
      render();
      timer = setInterval(tick, HEARTBEAT_MS);
    });
  },
});
