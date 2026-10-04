/**
 * Turns whatever the user typed or the tab URL into a bare domain:
 * "https://www.YouTube.com/watch?v=1" -> "youtube.com".
 * Returns null if it doesn't look like a web domain.
 */
export function normalizeDomain(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z]+:\/\//.test(s)) s = `https://${s}`;
  let host: string;
  try {
    const url = new URL(s);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    host = url.hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, '').replace(/\.$/, '');
  if (!host.includes('.') || !/^[a-z0-9.-]+$/.test(host)) return null;
  return host;
}

/** Finds which tracked site (if any) a hostname belongs to. */
export function matchSite(hostname: string, sites: string[]): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  for (const site of sites) {
    if (host === site || host.endsWith(`.${site}`)) return site;
  }
  return null;
}

/** Match patterns covering a domain and all its subdomains. */
export function originsFor(site: string): string[] {
  return [`*://${site}/*`, `*://*.${site}/*`];
}
