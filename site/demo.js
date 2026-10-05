// The before/after demo on the first screen: a range input over the illustration moves the
// line between the color and the faded copy. Until someone touches it, the line sways gently
// (about 20 px in total) so it reads as something you can drag.
(() => {
  const demo = document.querySelector('.demo');
  if (!demo) return;
  const input = demo.querySelector('input');
  const START = 55; // percent
  const SWAY_PX = 10; // each way
  const PERIOD_MS = 4000;
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
    const sway = (SWAY_PX / Math.max(1, demo.clientWidth)) * 100;
    set(START + sway * Math.sin(((t - t0) / PERIOD_MS) * Math.PI * 2));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
