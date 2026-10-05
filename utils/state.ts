import { browser } from 'wxt/browser';

export type FadeMode = 'soft' | 'hard';

export interface Settings {
  /** Bare domains, e.g. "youtube.com". Subdomains match automatically. */
  sites: string[];
  /** Shared daily limit for sites without their own, in minutes. */
  limitMinutes: number;
  /** Per-site daily limits in minutes. A site listed here doesn't use the shared limit. */
  siteLimits: Record<string, number>;
  /** How long the fade from color to full strength takes, in seconds. */
  fadeSeconds: number;
  /** How gray a site gets once faded: 0.6, 0.8 or 1. */
  fadeStrength: number;
  /** soft = grayscale only; hard = grayscale, then blur and low contrast. */
  mode: FadeMode;
}

export interface Usage {
  /** Local date, YYYY-MM-DD. Usage resets when this no longer matches today. */
  date: string;
  /** Total counted seconds today across all sites. */
  seconds: number;
  /** Per-site seconds today. */
  perSite: Record<string, number>;
  /** Extra seconds granted today to the shared limit via "5 more minutes". */
  extraSeconds: number;
  /** Extra seconds granted today to sites with their own limit. */
  extraPerSite: Record<string, number>;
  /** How many times "5 more minutes" was used today, across all limits. */
  extensionsUsed: number;
  /** Epoch ms when a limit was first crossed today. */
  limitHitAt: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  sites: [],
  limitMinutes: 30,
  siteLimits: {},
  fadeSeconds: 150,
  fadeStrength: 1,
  mode: 'soft',
};

export const EXTENSION_SECONDS = 5 * 60;
export const MAX_EXTENSIONS_PER_DAY = 2;
/** In hard mode, blur kicks in this long after full grayscale. */
export const HARD_STAGE_DELAY_SECONDS = 15 * 60;
export const HARD_STAGE_RAMP_SECONDS = 5 * 60;
/**
 * How much brightness drops at full grayscale. Saturated yellows and cyans
 * turn near-white in grayscale, so bright pages get glaring without this.
 */
export const DIM_AT_FULL_FADE = 0.2;

export function today(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function emptyUsage(): Usage {
  return {
    date: today(),
    seconds: 0,
    perSite: {},
    extraSeconds: 0,
    extraPerSite: {},
    extensionsUsed: 0,
    limitHitAt: null,
  };
}

export function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...raw, siteLimits: { ...raw?.siteLimits } };
}

export async function getSettings(): Promise<Settings> {
  const { settings } = await browser.storage.local.get('settings');
  return normalizeSettings(settings as Partial<Settings> | undefined);
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await browser.storage.local.set({ settings: next });
  return next;
}

/** Returns today's usage; stale usage from a previous day reads as empty. */
export async function getUsage(): Promise<Usage> {
  const { usage } = await browser.storage.local.get('usage');
  return normalizeUsage(usage as Usage | undefined);
}

/** Today's usage with any fields added after 0.1 filled in. */
export function normalizeUsage(usage: Partial<Usage> | undefined): Usage {
  if (!usage || usage.date !== today()) return emptyUsage();
  return { ...emptyUsage(), ...usage, perSite: { ...usage.perSite }, extraPerSite: { ...usage.extraPerSite } };
}

export async function setUsage(usage: Usage): Promise<void> {
  await browser.storage.local.set({ usage });
}

// --- Limits ------------------------------------------------------------------
//
// Every tracked site counts against exactly one limit: its own, if it has one,
// otherwise the shared one. A site with its own limit doesn't spend shared time.

/** Which limit a site counts against: the site itself, or null for the shared one. */
export function ownLimitSite(site: string | null, settings: Settings): string | null {
  return site && settings.siteLimits[site] != null ? site : null;
}

/** Seconds allowed today for the limit `site` belongs to (null = shared). */
export function limitSeconds(settings: Settings, usage: Usage, site: string | null = null): number {
  const own = ownLimitSite(site, settings);
  if (own) return (settings.siteLimits[own] ?? 0) * 60 + (usage.extraPerSite[own] ?? 0);
  return settings.limitMinutes * 60 + usage.extraSeconds;
}

/** Seconds used today against the limit `site` belongs to (null = shared). */
export function usedSeconds(settings: Settings, usage: Usage, site: string | null = null): number {
  const own = ownLimitSite(site, settings);
  if (own) return usage.perSite[own] ?? 0;
  let sum = 0;
  for (const [s, secs] of Object.entries(usage.perSite)) {
    if (settings.siteLimits[s] == null) sum += secs;
  }
  return sum;
}

export function secondsLeft(settings: Settings, usage: Usage, site: string | null = null): number {
  return Math.max(0, limitSeconds(settings, usage, site) - usedSeconds(settings, usage, site));
}

/**
 * Grants "5 more minutes" to the limit `site` belongs to, counted from now so
 * the fade clears right away. Returns false when today's extensions are spent.
 */
export function grantExtension(settings: Settings, usage: Usage, site: string | null): boolean {
  if (usage.extensionsUsed >= MAX_EXTENSIONS_PER_DAY) return false;
  const over = Math.max(0, usedSeconds(settings, usage, site) - limitSeconds(settings, usage, site));
  const own = ownLimitSite(site, settings);
  if (own) usage.extraPerSite[own] = (usage.extraPerSite[own] ?? 0) + over + EXTENSION_SECONDS;
  else usage.extraSeconds += over + EXTENSION_SECONDS;
  usage.extensionsUsed += 1;
  return true;
}

// --- Fade --------------------------------------------------------------------

export interface FadeLevel {
  /** 0..fadeStrength */
  grayscale: number;
  /** CSS brightness() factor, 1 = untouched; ramps down together with grayscale. */
  brightness: number;
  /** 0..1, only used in hard mode */
  hard: number;
}

export function fadeLevel(settings: Settings, usage: Usage, site: string | null = null): FadeLevel {
  const over = usedSeconds(settings, usage, site) - limitSeconds(settings, usage, site);
  if (over <= 0) return { grayscale: 0, brightness: 1, hard: 0 };
  const progress = clamp01(over / Math.max(1, settings.fadeSeconds));
  const grayscale = progress * clamp01(settings.fadeStrength);
  const brightness = 1 - grayscale * DIM_AT_FULL_FADE;
  let hard = 0;
  if (settings.mode === 'hard') {
    const hardOver = over - settings.fadeSeconds - HARD_STAGE_DELAY_SECONDS;
    hard = clamp01(hardOver / HARD_STAGE_RAMP_SECONDS);
  }
  return { grayscale, brightness, hard };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
