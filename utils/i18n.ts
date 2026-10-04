import { browser } from 'wxt/browser';

export function t(key: string, subs?: (string | number)[]): string {
  const msg = browser.i18n.getMessage(key as never, subs?.map(String) as never);
  return msg || key;
}

/** Fills [data-i18n] text and [data-i18n-placeholder] attributes. */
export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder!);
  });
  document.documentElement.lang = browser.i18n.getUILanguage().split('-')[0] ?? 'en';
}
