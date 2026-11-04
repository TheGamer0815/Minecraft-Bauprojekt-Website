// Baufortschritt, lokal im Browser gespeichert (localStorage).
// Fällt der Speicher aus (privater Modus, blockierte Website-Daten), läuft die Seite
// trotzdem – der Fortschritt hält dann nur bis zum Neuladen.

const KEY = 'echo7.bauplaner.v1';
const listeners = new Set();

function blank() {
  return { v: 1, layers: {}, steps: {}, collected: {}, origin: { x: 0, y: 0, z: 0 }, log: [], ui: {} };
}

let persistent = true;
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const s = JSON.parse(raw);
    return Object.assign(blank(), s);
  } catch (e) {
    persistent = false;
    return blank();
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); persistent = true; }
  catch (e) { persistent = false; }
  for (const fn of listeners) fn(state);
}

function log(msg) {
  state.log.unshift({ t: Date.now(), msg });
  if (state.log.length > 200) state.log.length = 200;
}

export const store = {
  get state() { return state; },
  get persistent() { return persistent; },
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  isLayerBuilt: (y) => !!state.layers[y],
  setLayer(y, on) {
    if (!!state.layers[y] === on) return;
    if (on) state.layers[y] = Date.now(); else delete state.layers[y];
    log(on ? `Ebene Y${y} als gebaut markiert` : `Ebene Y${y} wieder geöffnet`);
    save();
  },
  isStepDone: (id) => !!state.steps[id],
  setStep(id, on, title) {
    if (!!state.steps[id] === on) return;
    if (on) state.steps[id] = Date.now(); else delete state.steps[id];
    log(on ? `Schritt ${id} erledigt${title ? ' – ' + title : ''}` : `Schritt ${id} wieder geöffnet`);
    save();
  },
  collected: (type) => state.collected[type] || 0,
  setCollected(type, n, name) {
    n = Math.max(0, Math.floor(n) || 0);
    if ((state.collected[type] || 0) === n) return;
    if (n) state.collected[type] = n; else delete state.collected[type];
    if (name) log(`${name}: ${n.toLocaleString('de-DE')} gesammelt`);
    save();
  },
  get origin() { return state.origin; },
  setOrigin(o) {
    state.origin = { x: Math.round(o.x) || 0, y: Math.round(o.y) || 0, z: Math.round(o.z) || 0 };
    log(`Weltursprung gesetzt auf ${state.origin.x} | ${state.origin.y} | ${state.origin.z}`);
    save();
  },
  ui(key, val) {
    if (val === undefined) return state.ui[key];
    state.ui[key] = val;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* egal */ }
  },
  exportJSON() {
    return JSON.stringify({ app: 'ECHO-7 Bauplaner', exported: new Date().toISOString(), ...state }, null, 1);
  },
  importJSON(text) {
    const s = JSON.parse(text);
    if (!s || typeof s !== 'object' || !('layers' in s) || !('steps' in s)) throw new Error('Keine gültige ECHO-7-Sicherung.');
    state = Object.assign(blank(), { layers: s.layers || {}, steps: s.steps || {}, collected: s.collected || {}, origin: s.origin || blank().origin, log: s.log || [], ui: state.ui });
    log('Sicherung importiert');
    save();
  },
  reset() {
    const ui = state.ui;
    state = blank();
    state.ui = ui;
    log('Fortschritt zurückgesetzt');
    save();
  },
};
