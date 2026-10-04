import { browser } from 'wxt/browser';

export type FadeMode = 'soft' | 'hard';

export interface Settings {
  /** Bare domains, e.g. "youtube.com". Subdomains match automatically. */
  sites: string[];
  /** Shared daily limit across all sites, in minutes. */
  limitMinutes: number;
  /** How long the fade from color to full grayscale takes, in seconds. */
  fadeSeconds: number;
  /** soft = grayscale only; hard = grayscale, then blur and low contrast. */
  mode: FadeMode;
}

export interface Usage {
  /** Local date, YYYY-MM-DD. Usage resets when this no longer matches today. */
  date: string;
  /** Total counted seconds today across all sites. */
  seconds: number;
  /** Per-site seconds today, for stats. */
  perSite: Record<string, number>;
  /** Extra seconds granted today via "5 more minutes". */
  extraSeconds: number;
  /** How many times "5 more minutes" was used today. */
  extensionsUsed: number;
  /** Epoch ms when the limit was first crossed today, for stats. */
  limitHitAt: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  sites: [],
  limitMinutes: 30,
  fadeSeconds: 150,
  mode: 'soft',
};

export const EXTENSION_SECONDS = 5 * 60;
export const MAX_EXTENSIONS_PER_DAY = 2;
/** In hard mode, blur kicks in this long after full grayscale. */
export const HARD_STAGE_DELAY_SECONDS = 15 * 60;
export const HARD_STAGE_RAMP_SECONDS = 5 * 60;

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
    extensionsUsed: 0,
    limitHitAt: null,
  };
}

export async function getSettings(): Promise<Settings> {
  const { settings } = await browser.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings as Partial<Settings> | undefined) };
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

export function normalizeUsage(usage: Usage | undefined): Usage {
  if (!usage || usage.date !== today()) return emptyUsage();
  return usage;
}

export async function setUsage(usage: Usage): Promise<void> {
  await browser.storage.local.set({ usage });
}

export function limitSeconds(settings: Settings, usage: Usage): number {
  return settings.limitMinutes * 60 + usage.extraSeconds;
}

export interface FadeLevel {
  /** 0..1 */
  grayscale: number;
  /** 0..1, only used in hard mode */
  hard: number;
}

export function fadeLevel(settings: Settings, usage: Usage): FadeLevel {
  const over = usage.seconds - limitSeconds(settings, usage);
  if (over <= 0) return { grayscale: 0, hard: 0 };
  const grayscale = clamp01(over / Math.max(1, settings.fadeSeconds));
  let hard = 0;
  if (settings.mode === 'hard') {
    const hardOver = over - settings.fadeSeconds - HARD_STAGE_DELAY_SECONDS;
    hard = clamp01(hardOver / HARD_STAGE_RAMP_SECONDS);
  }
  return { grayscale, hard };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
