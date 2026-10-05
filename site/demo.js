// The before/after demo on the first screen: a range input over the illustration moves the
// line between the color and the faded copy. Until someone touches it, the line drifts slowly
// so the effect is visible on its own.
(() => {
  const demo = document.querySelector('.demo');
  if (!demo) return;
  const input = demo.querySelector('input');
  const set = (v) => {
    demo.style.setProperty('--pos', `${v}%`);
    input.value = String(v);
  };

  let touched = false;
  const stop = () => { touched = true; };
  input.addEventListener('input', () => { stop(); set(Number(input.value)); });
  input.addEventListener('pointerdown', stop);

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const t0 = performance.now();
  const tick = (t) => {
    if (touched) return;
    // ease between 35% and 75% over ~7 s
    const phase = ((t - t0) / 7000) * Math.PI * 2;
    set(Math.round((55 + 20 * Math.sin(phase)) * 10) / 10);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
