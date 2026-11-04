// Einstieg: Modell erzeugen, Auswertung, Navigation und Ansichten verdrahten.
import { buildModel } from './data/model.js';
import { analyze } from './core/analysis.js';
import { store } from './core/store.js';
import { PHASES, STEP_ORDER, STEP_INDEX } from './data/guide.js';
import { BlockViewer } from './viewer/viewer.js';
import { $, $$, h } from './ui/dom.js';
import * as overview from './views/overview.js';
import * as blueprint from './views/blueprint.js';
import * as guide from './views/guide.js';
import * as materials from './views/materials.js';
import * as progress from './views/progress.js';

const model = buildModel();
const A = analyze(model);
const VIEWS = { overview, blueprint, guide, materials, progress };
const inited = new Set();
let current = null;

// Platzierte Blöcke: Ebene als gebaut markiert ODER Bauschritt erledigt
function computePlaced() {
  const st = store.state;
  const perPhase = {}, perSection = {};
  let count = 0;
  for (const b of model.blocks) {
    if (st.layers[b.y] || st.steps[b.step]) {
      count++;
      perPhase[b.phase] = (perPhase[b.phase] || 0) + 1;
      perSection[b.section] = (perSection[b.section] || 0) + 1;
    }
  }
  return { count, total: model.blocks.length, perPhase, perSection };
}
let placedCache = null;
store.on(() => { placedCache = null; updateHeader(); });

const ctx = {
  model, A, store, PHASES, STEP_ORDER, STEP_INDEX,
  placed() { return (placedCache ||= computePlaced()); },
  nextOpenStep() { return STEP_ORDER.find((id) => !store.isStepDone(id)) || null; },
  // Ansicht wechseln; opts werden an show() der Zielansicht übergeben
  go(view, opts) {
    pendingOpts = opts || null;
    if (location.hash === '#' + view) route(); else location.hash = view;
  },
  makeViewer(container, opts) {
    try { return new BlockViewer(container, model, opts); }
    catch (e) {
      console.error(e);
      container.appendChild(h('div.stage-fallback', 'Die 3D-Ansicht konnte nicht gestartet werden. Dein Browser oder Gerät stellt kein WebGL bereit.'));
      return null;
    }
  },
  world(b) {
    const o = store.origin;
    return { x: b.x + o.x, y: b.y + o.y, z: b.z + o.z };
  },
};
let pendingOpts = null;

function route() {
  const name = (location.hash || '#overview').slice(1);
  const view = VIEWS[name] ? name : 'overview';
  for (const a of $$('.tabs a')) a.setAttribute('aria-current', a.dataset.view === view ? 'page' : 'false');
  for (const sec of $$('.view')) sec.classList.toggle('active', sec.dataset.view === view);
  if (current && current !== view && VIEWS[current].hide) VIEWS[current].hide();
  const root = document.getElementById('view-' + view);
  if (!inited.has(view)) { VIEWS[view].init(root, ctx); inited.add(view); }
  current = view;
  const opts = pendingOpts; pendingOpts = null;
  VIEWS[view].show(opts);
  store.ui('lastView', view);
  if (!opts || !opts.keepScroll) window.scrollTo({ top: 0 });
}

function updateHeader() {
  const p = ctx.placed();
  $('#sys-progress').textContent = (p.count / p.total * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
  const s = $('#sys-store');
  s.classList.toggle('warn', !store.persistent);
  s.lastElementChild.textContent = store.persistent ? 'Lokal gespeichert' : 'Nicht gespeichert';
  s.title = store.persistent ? 'Fortschritt wird in diesem Browser gespeichert.' : 'Der Browser erlaubt keinen lokalen Speicher. Fortschritt gilt nur bis zum Neuladen.';
}
function tick() {
  const d = new Date();
  $('#sys-clock').textContent = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

window.addEventListener('hashchange', route);
updateHeader();
tick(); setInterval(tick, 15000);
route();
window.__echo7 = ctx; // zum Debuggen in der Konsole
