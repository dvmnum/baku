import type { Settings } from './state';

/**
 * Pages that aren't doomscrolling: messengers and creator tools. On these,
 * time doesn't count and the page never fades, even past the limit.
 *
 * A pattern is either a path prefix ("/im" covers /im and /im/convo/1) or a
 * hostname ("chat.reddit.com" covers it and its subdomains). Keys are tracked
 * sites; aliases (vk.com / vk.ru) get the same list. Add sites here as data,
 * not as per-site ifs.
 */
export const BUILTIN_EXCLUSIONS: Record<string, string[]> = {
  'vk.com': ['/im', '/calls'],
  'vk.ru': ['/im', '/calls'],
  'instagram.com': ['/direct'],
  'facebook.com': ['/messages'],
  'x.com': ['/messages', '/i/chat'],
  'twitter.com': ['/messages', '/i/chat'],
  'reddit.com': ['/message', '/chat', 'chat.reddit.com'],
  'tiktok.com': ['/messages'],
  'youtube.com': ['studio.youtube.com'],
  'linkedin.com': ['/messaging'],
};

export function builtinExclusions(site: string): string[] {
  return BUILTIN_EXCLUSIONS[site] ?? [];
}

export function exclusionsFor(site: string, settings: Settings): string[] {
  return [...builtinExclusions(site), ...(settings.exclusions[site] ?? [])];
}

/** True if this URL is one of the site's excluded pages. */
export function isExcluded(url: string | URL, site: string, settings: Settings): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const path = u.pathname.replace(/\/+$/, '') || '/';
  return exclusionsFor(site, settings).some((p) =>
    p.startsWith('/')
      ? path === p || path.startsWith(`${p}/`)
      : host === p || host.endsWith(`.${p}`),
  );
}

/**
 * Turns what the user typed into a pattern: "vk.com/im/", "https://vk.com/im?x"
 * and "/im" all become "/im"; "chat.reddit.com" stays a hostname.
 * Returns null for input that isn't a page of `site`.
 */
export function normalizeExclusion(input: string, site: string): string | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('/')) {
    const path = s.split(/[?#]/)[0]!.replace(/\/+$/, '');
    return path.length > 1 ? path : null;
  }
  let u: URL;
  try {
    u = new URL(/^[a-z]+:\/\//.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host !== site && !host.endsWith(`.${site}`)) return null;
  const path = u.pathname.replace(/\/+$/, '');
  if (path) return path;
  return host === site ? null : host;
}
