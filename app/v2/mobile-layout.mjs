// View-only adaptation. Capture, persistence, audio and consent retain their owners.
const root = document.documentElement;
const $ = id => document.getElementById(id);
const compact = matchMedia('(max-width: 1100px), (any-pointer: coarse)');
const touch = matchMedia('(max-width: 700px), (any-pointer: coarse)');
const host = $('takes');
const pager = document.createElement('nav');
pager.className = 'take-pages';
pager.setAttribute('aria-label', 'Saved melody pages');
pager.innerHTML = '<button id="previousTake" type="button" aria-label="Previous melody">‹</button><span id="takePage" aria-live="polite" data-no-translate></span><button id="nextTake" type="button" aria-label="Next melody">›</button>';
document.querySelector('.notebook-tools').prepend(pager);
let selected = null, known = [];

function cards() { return [...host.querySelectorAll('.take-card')]; }
function updatePages() {
  const items = cards(), ids = items.map(card => card.dataset.id);
  // New captures/imports are revealed; replay and rename rebuilds keep the page.
  if (ids[0] && !known.includes(ids[0])) selected = ids[0];
  if (!ids.includes(selected)) selected = ids[Math.min(Math.max(known.indexOf(selected), 0), ids.length - 1)];
  known = ids;
  const index = ids.indexOf(selected);
  items.forEach(card => { card.hidden = compact.matches && card.dataset.id !== selected; });
  pager.hidden = !compact.matches;
  $('previousTake').disabled = index <= 0;
  $('nextTake').disabled = index < 0 || index >= ids.length - 1;
  $('takePage').textContent = ids.length ? `${index + 1} / ${ids.length}` : '0 / 0';
  root.classList.toggle('notebook-open', $('trayToggle').getAttribute('aria-expanded') === 'true');
  // The existing renderer owns drawing, including DPR and live playheads.
  window.dispatchEvent(new Event('cmsd:layout'));
}
function changePage(delta) {
  const items = cards(), index = items.findIndex(card => card.dataset.id === selected);
  const next = items[index + delta];
  if (!next) return;
  const playing = items.find(card => card.classList.contains('playing'));
  if (playing) playing.querySelector('.take-play').click();
  selected = next.dataset.id;
  updatePages();
}
$('previousTake').onclick = () => changePage(-1);
$('nextTake').onclick = () => changePage(1);
new MutationObserver(updatePages).observe(host, {childList: true});
new MutationObserver(updatePages).observe($('trayToggle'), {attributes: true, attributeFilter: ['aria-expanded']});

function viewport() {
  // visualViewport follows iOS browser chrome and the on-screen keyboard.
  // Ignore pinch zoom, so zooming never shrinks the application underneath it.
  const visual = window.visualViewport;
  if (!visual || visual.scale === 1) root.style.setProperty('--app-height', `${visual?.height || innerHeight}px`);
}
function adapt() {
  root.classList.toggle('notebook-compact', compact.matches);
  root.classList.toggle('touch-layout', touch.matches);
  if (touch.matches && $('inputMode').getAttribute('aria-pressed') === 'true') $('inputMode').click();
  viewport();
  updatePages();
}
compact.addEventListener('change', adapt);
touch.addEventListener('change', adapt);
window.addEventListener('resize', viewport);
window.visualViewport?.addEventListener('resize', viewport);
adapt();
