// The before/after demo on the first screen: a range input over the illustration moves the
// line between the color and the faded copy. No idle animation: it moves only when dragged.
(() => {
  const demo = document.querySelector('.demo');
  if (!demo) return;
  const input = demo.querySelector('input');
  input.addEventListener('input', () => demo.style.setProperty('--pos', `${input.value}%`));
})();