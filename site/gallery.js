// Screenshot gallery: a [data-gallery] link opens fullscreen; arrows, ← → keys and swipes flip,
// Esc or a click on the backdrop closes. Without the script the links just open the image.
(() => {
  const links = [...document.querySelectorAll('a[data-gallery]')];
  if (!links.length) return;
  const en = document.documentElement.lang === 'en';
  const T = en ? { close: 'Close', prev: 'Previous', next: 'Next' } : { close: 'Закрыть', prev: 'Назад', next: 'Дальше' };
  const items = links.map((a) => ({
    src: a.getAttribute('href'),
    alt: a.querySelector('img')?.alt || '',
    cap: a.closest('figure')?.querySelector('figcaption')?.textContent.trim() || a.querySelector('img')?.alt || '',
  }));

  const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const box = document.createElement('div');
  box.className = 'lb';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.hidden = true;
  box.innerHTML = `
    <button class="lb-btn lb-close" type="button" aria-label="${T.close}">${icon('M6 6l12 12M18 6L6 18')}</button>
    <button class="lb-btn lb-prev" type="button" aria-label="${T.prev}">${icon('M15 5l-7 7 7 7')}</button>
    <figure class="lb-fig"><img class="lb-img" alt=""><figcaption class="lb-cap"></figcaption></figure>
    <button class="lb-btn lb-next" type="button" aria-label="${T.next}">${icon('M9 5l7 7-7 7')}</button>
    <span class="lb-count"></span>`;
  document.body.append(box);
  const img = box.querySelector('.lb-img');
  const cap = box.querySelector('.lb-cap');
  const count = box.querySelector('.lb-count');
  let cur = 0;
  let opener = null;

  const preload = (i) => {
    const im = new Image();
    im.src = items[(i + items.length) % items.length].src;
  };
  function show(i) {
    cur = (i + items.length) % items.length;
    const it = items[cur];
    img.classList.remove('on');
    img.onload = () => img.classList.add('on');
    img.src = it.src;
    img.alt = it.alt;
    if (img.complete) img.classList.add('on');
    cap.textContent = it.cap;
    count.textContent = `${cur + 1} / ${items.length}`;
    preload(cur + 1);
    preload(cur - 1);
  }
  function open(i) {
    opener = document.activeElement;
    show(i);
    box.hidden = false;
    document.documentElement.classList.add('lb-open');
    requestAnimationFrame(() => box.classList.add('show'));
    box.querySelector('.lb-close').focus({ preventScroll: true });
  }
  function close() {
    box.classList.remove('show');
    document.documentElement.classList.remove('lb-open');
    setTimeout(() => {
      box.hidden = true;
    }, 200);
    opener?.focus?.({ preventScroll: true });
  }

  links.forEach((a, i) =>
    a.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; // new tab: behave like a plain link
      e.preventDefault();
      open(i);
    }),
  );
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', () => show(cur - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(cur + 1));
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target.classList.contains('lb-fig')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });
  // phone swipe: a horizontal move over 50px flips
  let x0 = null;
  let y0 = null;
  box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
    x0 = y0 = null;
  });
})();
