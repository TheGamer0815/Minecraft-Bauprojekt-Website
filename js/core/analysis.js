// Auswertungen über die Blockliste: Mengen, Ausdehnungen, Schichten.
import { BLOCKS, CATEGORY_ORDER } from '../data/blocks.js';
import { STEP_ORDER } from '../data/guide.js';

function emptyGroup() {
  return { count: 0, types: new Map(), box: null, hidden: 0 };
}
function add(g, b) {
  g.count++;
  g.types.set(b.type, (g.types.get(b.type) || 0) + 1);
  if (b.hidden) g.hidden++;
  if (!g.box) g.box = { x0: b.x, x1: b.x, y0: b.y, y1: b.y, z0: b.z, z1: b.z };
  else {
    const q = g.box;
    if (b.x < q.x0) q.x0 = b.x; if (b.x > q.x1) q.x1 = b.x;
    if (b.y < q.y0) q.y0 = b.y; if (b.y > q.y1) q.y1 = b.y;
    if (b.z < q.z0) q.z0 = b.z; if (b.z > q.z1) q.z1 = b.z;
  }
}

export function analyze(model) {
  const all = emptyGroup();
  const phase = {}, step = {}, section = {}, layer = {};
  const hiddenByType = new Map();
  for (const b of model.blocks) {
    add(all, b);
    (phase[b.phase] ||= emptyGroup()); add(phase[b.phase], b);
    (step[b.step] ||= emptyGroup()); add(step[b.step], b);
    (section[b.section] ||= emptyGroup()); add(section[b.section], b);
    (layer[b.y] ||= emptyGroup()); add(layer[b.y], b);
    if (b.hidden) hiddenByType.set(b.type, (hiddenByType.get(b.type) || 0) + 1);
  }
  const maxY = model.dims.h - 1;
  return { all, phase, step, section, layer, hiddenByType, maxY, stepOrder: STEP_ORDER };
}

// Materialliste sortiert (Menge absteigend)
export function sortedTypes(group, mode = 'count') {
  const arr = [...group.types.entries()].map(([id, n]) => ({ id, n, def: BLOCKS[id] }));
  if (mode === 'name') arr.sort((a, b) => a.def.name.localeCompare(b.def.name, 'de'));
  else if (mode === 'cat') arr.sort((a, b) => CATEGORY_ORDER.indexOf(a.def.cat) - CATEGORY_ORDER.indexOf(b.def.cat) || b.n - a.n);
  else arr.sort((a, b) => b.n - a.n);
  return arr;
}

export const fmt = (n) => n.toLocaleString('de-DE');
export function stacks(n) {
  const s = Math.floor(n / 64), r = n % 64;
  if (!s) return `${r}`;
  return r ? `${s} × 64 + ${r}` : `${s} × 64`;
}
export const shulker = (n) => n / 1728;
export function boxDims(q) {
  if (!q) return { w: 0, h: 0, d: 0 };
  return { w: q.x1 - q.x0 + 1, h: q.y1 - q.y0 + 1, d: q.z1 - q.z0 + 1 };
}
export function boxText(q, o = { x: 0, y: 0, z: 0 }) {
  if (!q) return '–';
  const r = (a, b) => (a === b ? `${a}` : `${a}…${b}`);
  return `X ${r(q.x0 + o.x, q.x1 + o.x)} · Y ${r(q.y0 + o.y, q.y1 + o.y)} · Z ${r(q.z0 + o.z, q.z1 + o.z)}`;
}
