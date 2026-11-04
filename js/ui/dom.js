import { BLOCKS, DIR_LABEL } from '../data/blocks.js';

// Kleiner Element-Baukasten: h('div.cls#id', {attrs}, ...children)
export function h(spec, attrs, ...kids) {
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(spec);
  const el = document.createElement((m && m[1]) || 'div');
  if (m && m[2]) for (const part of m[2].match(/[.#][\w-]+/g)) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className += ' ' + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function swatch(type, big = false) {
  const b = BLOCKS[type];
  const s = h('span.swatch' + (b.glass ? '.glass' : '') + (b.light ? '.light' : '') + (big ? '.lg' : ''));
  s.style.backgroundColor = b.glass ? hexA(b.color, Math.max(0.55, b.alpha)) : b.color;
  s.title = b.name;
  return s;
}
export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export function blockDetail(b) {
  const p = b.props || {};
  const bits = [];
  if (b.shape === 'stairs') bits.push('Blick ' + DIR_LABEL[p.facing || 'n'] + (p.half === 'top' ? ', kopfüber' : ''));
  if (b.shape === 'slab') bits.push(p.half === 'top' ? 'obere Hälfte' : 'untere Hälfte');
  if (b.shape === 'trapdoor') bits.push(p.open ? 'offen, an ' + DIR_LABEL[p.open] + 'seite' : (p.half === 'top' ? 'oben' : 'unten'));
  if (b.shape === 'rod' && p.axis && p.axis !== 'y') bits.push('liegend ' + (p.axis === 'x' ? 'Ost-West' : 'Nord-Süd'));
  return bits.join(', ');
}

let toastTimer = 0;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) { return false; }
}

export const ICON = {
  eye: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.2"/></svg>',
  eyeOff: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 2l12 12M6.5 3.3C7 3.1 7.5 3 8 3c4.5 0 7 5 7 5s-.8 1.6-2.3 3M4.2 4.6C2.2 6 1 8 1 8s2.5 5 7 5c1.2 0 2.3-.4 3.2-.9"/></svg>',
  play: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>',
  pause: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="2.5" width="3" height="11"/><rect x="9.5" y="2.5" width="3" height="11"/></svg>',
  focus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1.5 5V1.5H5M11 1.5h3.5V5M14.5 11v3.5H11M5 14.5H1.5V11"/><rect x="5.5" y="5.5" width="5" height="5"/></svg>',
  minus: '<svg viewBox="0 0 16 16" stroke="currentColor" stroke-width="1.6"><path d="M3 8h10"/></svg>',
  plus: '<svg viewBox="0 0 16 16" stroke="currentColor" stroke-width="1.6"><path d="M3 8h10M8 3v10"/></svg>',
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 8.5l3.5 3.5 7.5-8"/></svg>',
  copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5" y="5" width="9" height="9"/><path d="M11 2H2v9"/></svg>',
  up: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 10l5-5 5 5"/></svg>',
  down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6l5 5 5-5"/></svg>',
};
export function icon(name) { const s = h('span', { html: ICON[name] }); return s.firstChild; }
