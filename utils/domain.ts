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

/**
 * Sites that live on more than one domain. Tracking one of them covers the
 * others: VK is moving from vk.com to vk.ru, X still answers on twitter.com.
 */
const ALIASES: Record<string, string[]> = {
  'vk.com': ['vk.ru'],
  'vk.ru': ['vk.com'],
  'x.com': ['twitter.com'],
  'twitter.com': ['x.com'],
};

/** The site's own domain plus its aliases. */
export function domainsFor(site: string): string[] {
  return [site, ...(ALIASES[site] ?? [])];
}

/** Finds which tracked site (if any) a hostname belongs to, aliases included. */
export function matchSite(hostname: string, sites: string[]): string | null {
  return matchDomain(hostname, sites)?.site ?? null;
}

/** Like matchSite, but also says which of the site's domains matched. */
export function matchDomain(hostname: string, sites: string[]): { site: string; domain: string } | null {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  for (const site of sites) {
    for (const domain of domainsFor(site)) {
      if (host === domain || host.endsWith(`.${domain}`)) return { site, domain };
    }
  }
  return null;
}

/** Match patterns covering a domain and all its subdomains. */
export function originsForDomain(domain: string): string[] {
  return [`*://${domain}/*`, `*://*.${domain}/*`];
}

/** Match patterns for a site and its aliases. */
export function originsFor(site: string): string[] {
  return domainsFor(site).flatMap(originsForDomain);
}
