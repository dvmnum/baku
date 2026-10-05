import { browser } from 'wxt/browser';

export function t(key: string, subs?: (string | number)[]): string {
  const msg = browser.i18n.getMessage(key as never, subs?.map(String) as never);
  return msg || key;
}

/**
 * Plural-aware t(): picks `${base}_${rule}` for n by the UI language's plural
 * rules (one/few/many/other), falling back to `${base}_other`.
 * The count is passed as the message's first placeholder.
 */
export function tp(base: string, n: number): string {
  const rule = new Intl.PluralRules(browser.i18n.getUILanguage()).select(n);
  const msg = browser.i18n.getMessage(`${base}_${rule}` as never, [String(n)] as never);
  return msg || t(`${base}_other`, [n]);
}

/** Fills [data-i18n] text and [data-i18n-placeholder] attributes. */
export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder!);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria!));
  });
  document.documentElement.lang = browser.i18n.getUILanguage().split('-')[0] ?? 'en';
}
