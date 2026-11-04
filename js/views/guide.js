import { h, swatch, icon, blockDetail, hexA, toast } from '../ui/dom.js';
import { fmt, stacks, sortedTypes, boxDims, boxText } from '../core/analysis.js';
import { BLOCKS, DIR_LABEL } from '../data/blocks.js';
import { SECTION_INDEX } from '../data/guide.js';
import { ST } from '../viewer/viewer.js';

let C, root, viewer, els = {};
const S = {
  mode: 'phases',
  phase: 1,
  step: null,
  ctxMode: 'dim',    // Darstellung früherer Phasen
  y: 0,
  below: 'dim',      // Darstellung der Ebenen unterhalb
  filter: 0,         // 0 = alle Phasen
  crop: true,
  zoom: 1,
};
const thumbs = {};
let thumbsStarted = false;
let layerIdx = null; // y -> Blöcke

export function init(el, ctx) {
  C = ctx; root = el;
  S.phase = C.store.ui('guidePhase') || 1;
  S.y = C.store.ui('layerY') ?? 0;
  layerIdx = {};
  for (const b of C.model.blocks) (layerIdx[b.y] ||= []).push(b);

  const subtabs = h('div.subtabs', { role: 'group', 'aria-label': 'Modus der Bauanleitung' },
    h('button', { type: 'button', dataset: { m: 'phases' }, text: 'Bauphasen' }),
    h('button', { type: 'button', dataset: { m: 'layers' }, text: 'Schicht-Modus · Block für Block' }));
  subtabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });
  els.subtabs = subtabs;

  root.append(h('div.view-head',
    h('div', h('div.eyebrow', 'Build Guide'), h('h1', 'Bauanleitung'),
      h('p.lede', 'Neun Bauphasen mit Schritt-für-Schritt-Anleitung, Materiallisten und Maßen – oder Ebene für Ebene als Draufsicht mit jedem einzelnen Block.')),
    subtabs));

  els.phasesWrap = buildPhasesUI();
  els.layersWrap = buildLayersUI();
  root.append(els.phasesWrap, els.layersWrap);

  viewer = C.makeViewer(els.phaseStage, { hover: true });
  if (viewer) {
    viewer.on('hover', (hit) => showHover(hit && hit.block));
    viewer.on('pick', (hit) => {
      if (S.mode === 'phases' && hit && hit.block && hit.block.phase === S.phase) focusStep(hit.block.step, false);
      if (S.mode === 'layers' && hit && hit.block) setY(hit.block.y);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (!root.classList.contains('active') || S.mode !== 'layers') return;
    if (e.target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { setY(S.y + 1); e.preventDefault(); }
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { setY(S.y - 1); e.preventDefault(); }
  });
  C.store.on(() => { if (root.classList.contains('active')) { renderPhaseList(); if (S.mode === 'phases') renderPhase(false); else renderLayer(false); } });
}

// =====================================================================
// Bauphasen
// =====================================================================
function buildPhasesUI() {
  els.phaseList = h('ol.gd-list');
  els.phaseHead = h('div.gd-head');
  els.stats = h('div.stats');
  els.phaseStage = h('div.stage.gd-stage');
  const ctxSeg = h('div.seg', { role: 'group', 'aria-label': 'Frühere Phasen' },
    [['dim', 'Abdunkeln'], ['ghost', 'Geist'], ['normal', 'Normal'], ['off', 'Aus']].map(([k, l]) =>
      h('button', { type: 'button', dataset: { v: k }, 'aria-pressed': k === S.ctxMode ? 'true' : 'false', text: l })));
  ctxSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    S.ctxMode = b.dataset.v;
    for (const x of ctxSeg.children) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    applyPhaseStates();
  });
  const allBtn = h('button.btn.small', { type: 'button', text: 'Ganze Phase' });
  allBtn.addEventListener('click', () => focusStep(null, true));
  els.stageLabel = h('span.hud-label');
  els.phaseStage.append(
    h('div.hud.tl', els.stageLabel),
    h('div.hud.tr', h('span.hud-label', 'Frühere Phasen'), ctxSeg),
    h('div.hud.bl', allBtn),
  );
  els.hoverLabel = h('div.hud.br');
  els.phaseStage.append(els.hoverLabel);
  els.tip = h('div.tip');
  els.steps = h('ol.steps');
  els.matPanel = h('section.panel');
  return h('div.gd',
    els.phaseList,
    h('div.gd-main', els.phaseHead, els.stats, els.phaseStage, els.tip,
      h('div.gd-body', h('div', els.steps), els.matPanel)),
  );
}

function renderPhaseList() {
  const L = els.phaseList;
  L.replaceChildren();
  for (const p of C.PHASES) {
    const done = p.steps.filter((s) => C.store.isStepDone(s.id)).length;
    const img = h('img.gd-thumb', { alt: '', src: thumbs[p.id] || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' });
    const btn = h('button.gd-item', { type: 'button', 'aria-current': p.id === S.phase ? 'true' : 'false', dataset: { p: p.id } },
      img,
      h('span',
        h('span.gn', `PHASE ${String(p.id).padStart(2, '0')} · ${done}/${p.steps.length}`),
        h('span.gt', { style: { display: 'block' } }, p.title),
        h('div.bar' + (done === p.steps.length ? '.ok' : ''), h('i', { style: { width: (done / p.steps.length * 100) + '%' } }))),
    );
    btn.addEventListener('click', () => setPhase(p.id));
    L.append(h('li', btn));
  }
}

function setPhase(id, stepId) {
  S.phase = id; S.step = stepId || null;
  C.store.ui('guidePhase', id);
  renderPhaseList();
  renderPhase(true);
}

function renderPhase(reframe) {
  const p = C.PHASES.find((x) => x.id === S.phase);
  const g = C.A.phase[p.id];
  const dm = boxDims(g.box);
  const done = p.steps.filter((s) => C.store.isStepDone(s.id)).length;
  const prev = h('button.btn', { type: 'button', disabled: p.id === 1 }, icon('up'), 'Vorherige');
  prev.firstChild.style.transform = 'rotate(-90deg)';
  prev.addEventListener('click', () => setPhase(p.id - 1));
  const next = h('button.btn.primary', { type: 'button', disabled: p.id === 9 }, 'Nächste Phase', icon('up'));
  next.lastChild.style.transform = 'rotate(90deg)';
  next.addEventListener('click', () => setPhase(p.id + 1));
  els.phaseHead.replaceChildren(
    h('div', h('div.eyebrow', `Phase ${String(p.id).padStart(2, '0')} / 09`), h('h2', p.title), h('p.lede', p.summary)),
    h('div.row', prev, next));
  const stat = (l, v, s) => h('div.stat', h('div.sl', l), h('div.sv', v, s ? h('small', s) : null));
  els.stats.replaceChildren(
    stat('Blöcke', fmt(g.count)),
    stat('Blocktypen', String(g.types.size)),
    stat('Ausdehnung', `${dm.w}×${dm.d}`, `B×T`),
    stat('Höhe', `Y ${g.box.y0}–${g.box.y1}`),
    stat('Schritte', `${done}/${p.steps.length}`, 'erledigt'),
  );
  els.tip.replaceChildren(h('b', 'Tipp'), h('span', p.tip));

  // Schritte
  els.steps.replaceChildren();
  const o = C.store.origin;
  for (const s of p.steps) {
    const sg = C.A.step[s.id];
    const sd = boxDims(sg.box);
    const doneS = C.store.isStepDone(s.id);
    const mats = sortedTypes(sg);
    const cb = h('input', { type: 'checkbox', id: 'step-' + s.id.replace('.', '-') });
    cb.checked = doneS;
    cb.addEventListener('change', () => C.store.setStep(s.id, cb.checked, s.title));
    const showBtn = h('button.btn.small', { type: 'button' }, icon('focus'), 'Im Modell zeigen');
    showBtn.addEventListener('click', (e) => { e.stopPropagation(); focusStep(s.id, true); });
    const li = h('li.step' + (doneS ? '.done' : ''), { 'aria-current': S.step === s.id ? 'true' : 'false', dataset: { s: s.id } },
      h('span.sn', s.id),
      h('div', h('h3', s.title), h('p', s.text)),
      h('div.meta',
        h('span.chip', h('b', fmt(sg.count)), 'Blöcke'),
        h('span.chip', `${sd.w} × ${sd.d} × ${sd.h}`),
        h('span.chip', boxText(sg.box, o)),
      ),
      h('div.meta', mats.slice(0, 7).map((m) => h('span.chip', swatch(m.id), m.def.name, h('b', fmt(m.n)))),
        mats.length > 7 ? h('span.chip', `+${mats.length - 7} weitere`) : null),
      h('div.acts', showBtn, h('label.check', { for: cb.id }, cb, 'Erledigt')),
    );
    li.addEventListener('click', (e) => { if (!e.target.closest('button, input, label')) focusStep(s.id, false); });
    els.steps.append(li);
  }

  // Materialliste der Phase
  const rows = sortedTypes(g).map((m) => h('tr',
    h('td', h('span.nmcell', swatch(m.id), h('span', m.def.name, h('span.id', m.id)))),
    h('td.r.mono', fmt(m.n)),
    h('td.r.mono.muted', stacks(m.n)),
  ));
  els.matPanel.replaceChildren(
    h('div.panel-head', h('span', `Material Phase ${p.id}`), h('span.code', `${g.types.size} Typen`)),
    h('div.table-wrap', h('table.mat-table',
      h('thead', h('tr', h('th', 'Block'), h('th.r', 'Menge'), h('th.r', 'Stacks'))),
      h('tbody', rows),
      h('tfoot', h('tr', h('td', 'Summe'), h('td.r.mono', fmt(g.count)), h('td.r.mono.muted', stacks(g.count)))),
    )),
  );

  applyPhaseStates();
  if (reframe && viewer) {
    if (S.step) viewer.frameBox(C.A.step[S.step].box, 'iso');
    else viewer.setView('iso');
  }
}

function focusStep(id, frame) {
  S.step = id;
  for (const li of els.steps.children) li.setAttribute('aria-current', li.dataset.s === id ? 'true' : 'false');
  applyPhaseStates();
  if (viewer && frame) {
    if (id) viewer.frameBox(C.A.step[id].box, 'iso');
    else viewer.setView('iso');
  }
  if (id && !frame) {
    const li = els.steps.querySelector(`[data-s="${id}"]`);
    if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function ctxState() {
  return { dim: ST.DIM, ghost: ST.GHOST, normal: ST.NORMAL, off: ST.HIDDEN }[S.ctxMode];
}
function applyPhaseStates() {
  if (!viewer || S.mode !== 'phases') return;
  const p = S.phase, cs = ctxState();
  const order = C.STEP_ORDER;
  const fi = S.step ? order.indexOf(S.step) : -1;
  viewer.setStates((b) => {
    if (b.phase > p) return ST.HIDDEN;
    if (b.phase < p) return cs;
    if (fi < 0) return ST.NORMAL;
    const si = order.indexOf(b.step);
    if (si === fi) return ST.NORMAL;
    if (si < fi) return cs === ST.NORMAL ? ST.DIM : cs;
    return ST.HIDDEN;
  });
  const s = S.step ? C.STEP_INDEX[S.step] : null;
  els.stageLabel.replaceChildren(s ? h('span', 'Schritt ', h('b', `${s.id} ${s.title}`)) : h('span', 'Phase ', h('b', `${p} komplett`)));
}

function showHover(b) {
  if (S.mode === 'layers') return;
  els.hoverLabel.replaceChildren();
  if (!b) return;
  const st = C.STEP_INDEX[b.step];
  els.hoverLabel.append(h('span.hud-label', h('b', BLOCKS[b.type].name), ` · ${b.x}|${b.y}|${b.z} · ${st.id}`));
}

function makeThumbs() {
  if (thumbsStarted || !viewer) return;
  thumbsStarted = true;
  let k = 1;
  const next = () => {
    if (k > 9) { viewer.setActive(root.classList.contains('active')); if (S.mode === 'phases') applyPhaseStates(); else applyLayerStates(); renderPhaseList(); return; }
    const p = k;
    viewer.setActive(false);
    viewer.setStates((b) => (b.phase > p ? ST.HIDDEN : b.phase === p ? ST.HIGHLIGHT : ST.NORMAL));
    try { thumbs[p] = viewer.snapshot(246, 168, 'iso'); } catch (e) { /* ohne Vorschaubild */ }
    const img = els.phaseList.querySelector(`[data-p="${p}"] img`);
    if (img && thumbs[p]) img.src = thumbs[p];
    k++;
    setTimeout(next, 30);
  };
  setTimeout(next, 250);
}

// =====================================================================
// Schicht-Modus
// =====================================================================
function buildLayersUI() {
  const maxY = C.A.maxY;
  const down = h('button.btn.icon', { type: 'button', 'aria-label': 'Ebene tiefer' }, icon('down'));
  const up = h('button.btn.icon', { type: 'button', 'aria-label': 'Ebene höher' }, icon('up'));
  els.yOut = h('output', { for: 'ly-range' });
  down.addEventListener('click', () => setY(S.y - 1));
  up.addEventListener('click', () => setY(S.y + 1));
  els.yRange = h('input', { type: 'range', min: 0, max: maxY, value: S.y, id: 'ly-range', 'aria-label': 'Y-Ebene wählen' });
  els.yRange.addEventListener('input', () => setY(+els.yRange.value));
  els.filter = h('select', { id: 'ly-filter', 'aria-label': 'Nach Bauphase filtern' },
    h('option', { value: 0 }, 'Alle Phasen'), C.PHASES.map((p) => h('option', { value: p.id }, `Phase ${p.id} · ${p.title}`)));
  els.filter.addEventListener('change', () => { S.filter = +els.filter.value; renderLayer(false); });
  els.builtBtn = h('button.btn', { type: 'button' });
  els.builtBtn.addEventListener('click', () => C.store.setLayer(S.y, !C.store.isLayerBuilt(S.y)));
  const nextOpen = h('button.btn.ghost', { type: 'button', text: 'Nächste offene Ebene' });
  nextOpen.addEventListener('click', () => {
    for (let y = 0; y <= maxY; y++) if (!C.store.isLayerBuilt(y) && layerIdx[y]) { setY(y); return; }
    toast('Alle Ebenen sind als gebaut markiert.');
  });
  const belowSeg = h('div.seg', { role: 'group', 'aria-label': 'Ebenen darunter' },
    [['dim', 'Abdunkeln'], ['normal', 'Normal'], ['ghost', 'Geist']].map(([k, l]) => h('button', { type: 'button', dataset: { v: k }, 'aria-pressed': k === S.below ? 'true' : 'false', text: l })));
  belowSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    S.below = b.dataset.v;
    for (const x of belowSeg.children) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    applyLayerStates();
  });

  const bar = h('section.panel.ly-bar',
    h('div.ly-y', down, els.yOut, up),
    h('div.ly-slider', els.yRange),
    h('label.field', 'Filter', els.filter),
    els.builtBtn, nextOpen);

  els.strip = h('ul.ly-strip', { 'aria-label': 'Alle Ebenen' });
  for (let y = maxY; y >= 0; y--) {
    const n = layerIdx[y] ? layerIdx[y].length : 0;
    const li = h('li', { dataset: { y } }, h('span', 'Y ' + y), h('span.cnt', fmt(n)), h('span.mk'));
    li.addEventListener('click', () => setY(y));
    els.strip.append(li);
  }

  els.mapCanvas = h('canvas', { 'aria-label': 'Draufsicht der gewählten Ebene' });
  els.mapWrap = h('div.ly-map-wrap', els.mapCanvas);
  els.mapHead = h('span');
  const zoomOut = h('button.btn.small.icon', { type: 'button', 'aria-label': 'Plan verkleinern' }, icon('minus'));
  const zoomIn = h('button.btn.small.icon', { type: 'button', 'aria-label': 'Plan vergrößern' }, icon('plus'));
  zoomOut.addEventListener('click', () => { S.zoom = Math.max(0.5, S.zoom / 1.35); drawMap(); });
  zoomIn.addEventListener('click', () => { S.zoom = Math.min(5, S.zoom * 1.35); drawMap(); });
  const cropBtn = h('button.btn.small', { type: 'button', 'aria-pressed': 'true', text: 'Zuschnitt' , title: 'Auf belegte Fläche der Ebene zuschneiden' });
  cropBtn.addEventListener('click', () => { S.crop = !S.crop; cropBtn.setAttribute('aria-pressed', S.crop ? 'true' : 'false'); drawMap(); });
  els.tipEl = h('div.map-tip', { hidden: true });
  document.body.append(els.tipEl);
  els.mapCanvas.addEventListener('mousemove', onMapHover);
  els.mapCanvas.addEventListener('mouseleave', () => { els.tipEl.hidden = true; viewer && viewer.mark(null); hoverCell = null; drawMap(); });

  const mapPanel = h('section.panel',
    h('div.panel-head', els.mapHead, h('span.row', cropBtn, zoomOut, zoomIn)),
    els.mapWrap,
    buildLegend());

  els.layerStage = h('div.stage.ly-stage');
  els.layerStage.append(h('div.hud.tl', h('span.hud-label', 'Darunter'), belowSeg));
  els.layerList = h('section.panel');

  window.addEventListener('resize', () => { if (S.mode === 'layers' && root.classList.contains('active')) drawMap(); });

  return h('div.layers-wrap', { hidden: true },
    bar,
    h('div.ly', { style: { marginTop: '14px' } },
      h('section.panel', h('div.panel-head', h('span', 'Ebenen'), h('span.code', 'Blöcke')), els.strip),
      mapPanel,
      h('div.ly-side', h('section.panel', h('div.panel-head', h('span', '3D-Vorschau'), h('span.code', 'Ebene hervorgehoben')), h('div.panel-body', { style: { padding: '8px' } }, els.layerStage)), els.layerList)),
  );
}

function buildLegend() {
  const items = [['cube', 'Vollblock'], ['slab', 'Stufe'], ['stairs', 'Treppe (Pfeil = Aufstieg)'], ['pane', 'Scheibe / Gitter'], ['fence', 'Zaun'], ['rod', 'Stab · Kette · Laterne'], ['trapdoor', 'Falltür'], ['glass', 'Glas'], ['light', 'Lichtquelle']];
  const L = h('div.legend');
  for (const [k, l] of items) {
    const cv = h('canvas', { width: 32, height: 32 });
    const g = cv.getContext('2d');
    const fake = { cube: 'white_concrete', slab: 'quartz_slab', stairs: 'quartz_stairs', pane: 'cyan_stained_glass_pane', fence: 'birch_fence', rod: 'end_rod', trapdoor: 'iron_trapdoor', glass: 'light_blue_stained_glass', light: 'sea_lantern' }[k];
    const b = { type: fake, shape: BLOCKS[fake].shape || 'cube', props: k === 'stairs' ? { facing: 'n' } : k === 'pane' ? { conn: { e: true, w: true } } : k === 'fence' ? { conn: { n: true, s: true } } : {} };
    g.fillStyle = '#0c0f12'; g.fillRect(0, 0, 32, 32);
    drawCell(g, b, 2, 2, 28, 1);
    L.append(h('span', cv, l));
  }
  return L;
}

function setMode(m) {
  S.mode = m;
  for (const b of els.subtabs.children) b.setAttribute('aria-pressed', b.dataset.m === m ? 'true' : 'false');
  els.phasesWrap.hidden = m !== 'phases';
  els.layersWrap.hidden = m !== 'layers';
  if (viewer) viewer.attach(m === 'phases' ? els.phaseStage : els.layerStage);
  if (m === 'phases') { renderPhaseList(); renderPhase(true); }
  else { renderLayer(true); }
}

function setY(y) {
  y = Math.max(0, Math.min(C.A.maxY, y));
  if (y === S.y && els.yRange.value == y) return;
  S.y = y;
  C.store.ui('layerY', y);
  renderLayer(false);
}

function renderLayer(reframe) {
  const y = S.y;
  const o = C.store.origin;
  const blocks = layerIdx[y] || [];
  const built = C.store.isLayerBuilt(y);
  els.yRange.value = y;
  els.yOut.replaceChildren(document.createTextNode('Y ' + y), h('small', `Welt Y ${y + o.y}`));
  els.builtBtn.replaceChildren(built ? icon('check') : document.createTextNode(''), built ? 'Gebaut · zurücksetzen' : `Ebene Y ${y} als gebaut markieren`);
  els.builtBtn.classList.toggle('primary', !built);
  for (const li of els.strip.children) {
    const ly = +li.dataset.y;
    li.setAttribute('aria-current', ly === y ? 'true' : 'false');
    li.classList.toggle('built', C.store.isLayerBuilt(ly));
  }
  const cur = els.strip.querySelector('[aria-current="true"]');
  if (cur) {
    const top = cur.offsetTop - els.strip.offsetTop;
    if (top < els.strip.scrollTop || top > els.strip.scrollTop + els.strip.clientHeight - 30) els.strip.scrollTop = top - 120;
  }
  els.mapHead.replaceChildren(...[h('span', `Ebene Y ${y} · Draufsicht · Norden oben`), built ? h('span.built-badge', { style: { marginLeft: '10px' } }, icon('check'), 'gebaut') : null].filter(Boolean));

  // Blockliste der Ebene, Treppen nach Blickrichtung getrennt
  const groups = new Map();
  let shown = 0;
  for (const b of blocks) {
    if (S.filter && b.phase !== S.filter) continue;
    shown++;
    const det = blockDetail(b);
    const k = b.type + '|' + det;
    const g = groups.get(k) || { type: b.type, det, n: 0 };
    g.n++; groups.set(k, g);
  }
  const arr = [...groups.values()].sort((a, b) => b.n - a.n);
  els.layerList.replaceChildren(
    h('div.panel-head', h('span', `Blöcke auf Y ${y}`), h('span.code', `${fmt(shown)} Stück${S.filter ? ' · Phase ' + S.filter : ''}`)),
    arr.length ? h('div.table-wrap', h('table.mat-table',
      h('thead', h('tr', h('th', 'Block'), h('th.r', 'Menge'), h('th.r', 'Stacks'))),
      h('tbody', arr.map((g) => h('tr',
        h('td', h('span.nmcell', swatch(g.type), h('span', BLOCKS[g.type].name, h('span.id', g.det || g.type)))),
        h('td.r.mono', fmt(g.n)), h('td.r.mono.muted', stacks(g.n))))),
    )) : h('p.empty', 'Auf dieser Ebene liegen keine Blöcke' + (S.filter ? ' dieser Phase.' : '.')),
  );
  drawMap();
  applyLayerStates();
  if (reframe && viewer) viewer.setView('iso');
}

function applyLayerStates() {
  if (!viewer || S.mode !== 'layers') return;
  const y = S.y;
  const below = { dim: ST.DIM, normal: ST.NORMAL, ghost: ST.GHOST }[S.below];
  const curSt = S.below === 'normal' ? ST.HIGHLIGHT : ST.NORMAL;
  viewer.setStates((b) => {
    if (b.y > y) return ST.HIDDEN;
    if (b.y < y) return below;
    if (S.filter && b.phase !== S.filter) return ST.DIM;
    return curSt;
  });
}

// ---------- 2D-Plan ----------
let mapGeo = null, hoverCell = null;

function drawMap() {
  const cv = els.mapCanvas;
  const y = S.y;
  const blocks = layerIdx[y] || [];
  const dims = C.model.dims;
  let x0 = 0, x1 = dims.w - 1, z0 = 0, z1 = dims.d - 1;
  if (S.crop && blocks.length) {
    x0 = Infinity; x1 = -Infinity; z0 = Infinity; z1 = -Infinity;
    for (const b of blocks) { x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x); z0 = Math.min(z0, b.z); z1 = Math.max(z1, b.z); }
    const pad = 2;
    x0 = Math.max(0, x0 - pad); z0 = Math.max(0, z0 - pad); x1 = Math.min(dims.w - 1, x1 + pad); z1 = Math.min(dims.d - 1, z1 + pad);
    const minSpan = 14;
    if (x1 - x0 + 1 < minSpan) { const c = (x0 + x1) / 2; x0 = Math.max(0, Math.floor(c - minSpan / 2)); x1 = Math.min(dims.w - 1, x0 + minSpan - 1); }
    if (z1 - z0 + 1 < minSpan) { const c = (z0 + z1) / 2; z0 = Math.max(0, Math.floor(c - minSpan / 2)); z1 = Math.min(dims.d - 1, z0 + minSpan - 1); }
  }
  const cols = x1 - x0 + 1, rows = z1 - z0 + 1;
  const ML = 34, MT = 22;
  const avail = Math.max(200, els.mapWrap.clientWidth - ML - 8);
  const base = Math.max(5, Math.min(30, Math.floor(avail / cols)));
  const cs = Math.max(4, Math.round(base * S.zoom));
  const W = ML + cols * cs + 8, H = MT + rows * cs + 8;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#0c0f12'; g.fillRect(0, 0, W, H);
  mapGeo = { x0, z0, cols, rows, cs, ML, MT };
  const o = C.store.origin;

  // Ebene darunter als Grundriss
  const lower = layerIdx[y - 1] || [];
  g.fillStyle = 'rgba(120,140,150,.10)';
  for (const b of lower) {
    if (b.x < x0 || b.x > x1 || b.z < z0 || b.z > z1) continue;
    g.fillRect(ML + (b.x - x0) * cs, MT + (b.z - z0) * cs, cs, cs);
  }
  // Raster
  for (let i = 0; i <= cols; i++) {
    const X = ML + i * cs + 0.5, wx = x0 + i;
    g.strokeStyle = wx % 10 === 0 ? '#34424b' : wx % 5 === 0 ? '#27323a' : '#182025';
    if (cs < 7 && wx % 5 !== 0) continue;
    g.beginPath(); g.moveTo(X, MT); g.lineTo(X, MT + rows * cs); g.stroke();
  }
  for (let j = 0; j <= rows; j++) {
    const Y = MT + j * cs + 0.5, wz = z0 + j;
    g.strokeStyle = wz % 10 === 0 ? '#34424b' : wz % 5 === 0 ? '#27323a' : '#182025';
    if (cs < 7 && wz % 5 !== 0) continue;
    g.beginPath(); g.moveTo(ML, Y); g.lineTo(ML + cols * cs, Y); g.stroke();
  }
  // Achsbeschriftung (Weltkoordinaten)
  g.fillStyle = '#7b8891'; g.font = '500 10px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  const stepL = cs >= 14 ? 5 : 10;
  g.textAlign = 'center';
  for (let wx = x0; wx <= x1; wx++) if (wx % stepL === 0) g.fillText(String(wx + o.x), ML + (wx - x0 + 0.5) * cs, MT / 2);
  g.textAlign = 'right';
  for (let wz = z0; wz <= z1; wz++) if (wz % stepL === 0) g.fillText(String(wz + o.z), ML - 5, MT + (wz - z0 + 0.5) * cs);

  // Blöcke
  for (const b of blocks) {
    if (b.x < x0 || b.x > x1 || b.z < z0 || b.z > z1) continue;
    const a = S.filter && b.phase !== S.filter ? 0.18 : 1;
    drawCell(g, b, ML + (b.x - x0) * cs, MT + (b.z - z0) * cs, cs, a);
  }
  if (hoverCell) {
    g.strokeStyle = '#ffd34d'; g.lineWidth = 2;
    g.strokeRect(ML + (hoverCell.x - x0) * cs + 1, MT + (hoverCell.z - z0) * cs + 1, cs - 2, cs - 2);
    g.lineWidth = 1;
  }
}

function drawCell(g, b, X, Y, s, a) {
  const def = BLOCKS[b.type];
  const p = b.props || {};
  const col = def.color;
  g.globalAlpha = a;
  const fillFull = () => {
    g.fillStyle = def.glass ? hexA(col, 0.62) : col;
    g.fillRect(X + 0.5, Y + 0.5, s - 1, s - 1);
    if (s >= 6) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeRect(X + 1, Y + 1, s - 2, s - 2); }
  };
  const c = s / 2;
  switch (b.shape) {
    case 'pane':
    case 'bars': {
      const conn = p.conn || {};
      const t = Math.max(2, s * 0.26);
      g.fillStyle = def.glass ? hexA(col, 0.9) : col;
      const any = conn.n || conn.s || conn.e || conn.w;
      g.fillRect(X + c - t / 2, Y + c - t / 2, t, t);
      if (!any || conn.e || conn.w) {
        if (!any || conn.w) g.fillRect(X, Y + c - t / 2, c, t);
        if (!any || conn.e) g.fillRect(X + c, Y + c - t / 2, c, t);
      }
      if (conn.n) g.fillRect(X + c - t / 2, Y, t, c);
      if (conn.s) g.fillRect(X + c - t / 2, Y + c, t, c);
      break;
    }
    case 'fence': {
      const conn = p.conn || {};
      const t = Math.max(1.5, s * 0.16), q = Math.max(3, s * 0.38);
      g.fillStyle = col;
      if (conn.n) g.fillRect(X + c - t / 2, Y, t, c);
      if (conn.s) g.fillRect(X + c - t / 2, Y + c, t, c);
      if (conn.e) g.fillRect(X + c, Y + c - t / 2, c, t);
      if (conn.w) g.fillRect(X, Y + c - t / 2, c, t);
      g.fillRect(X + c - q / 2, Y + c - q / 2, q, q);
      break;
    }
    case 'rod': case 'chain': case 'lantern': {
      const q = Math.max(3, s * (b.shape === 'lantern' ? 0.46 : 0.3));
      g.fillStyle = col;
      if (p.axis === 'x') g.fillRect(X, Y + c - q / 3, s, q * 0.66);
      else if (p.axis === 'z') g.fillRect(X + c - q / 3, Y, q * 0.66, s);
      else { g.beginPath(); g.arc(X + c, Y + c, q / 2, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case 'trapdoor': {
      g.fillStyle = col;
      const t = Math.max(2, s * 0.2);
      if (p.open === 'e') g.fillRect(X + s - t, Y, t, s);
      else if (p.open === 'w') g.fillRect(X, Y, t, s);
      else if (p.open === 'n') g.fillRect(X, Y, s, t);
      else if (p.open === 's') g.fillRect(X, Y + s - t, s, t);
      else {
        fillFull();
        g.strokeStyle = 'rgba(0,0,0,.5)'; g.beginPath();
        g.moveTo(X + s * 0.25, Y + s * 0.35); g.lineTo(X + s * 0.75, Y + s * 0.35);
        g.moveTo(X + s * 0.25, Y + s * 0.65); g.lineTo(X + s * 0.75, Y + s * 0.65); g.stroke();
      }
      break;
    }
    default: {
      fillFull();
      if (b.shape === 'slab' && s >= 7) {
        g.fillStyle = 'rgba(0,0,0,.28)';
        if (p.half === 'top') g.fillRect(X + 1, Y + 1, s - 2, s * 0.22);
        else g.fillRect(X + 1, Y + s - 1 - s * 0.22, s - 2, s * 0.22);
      }
      if (b.shape === 'stairs' && s >= 6) {
        g.fillStyle = 'rgba(0,0,0,.5)';
        const f = p.facing || 'n';
        g.beginPath();
        const m = s * 0.22;
        if (f === 'n') { g.moveTo(X + c, Y + m); g.lineTo(X + s - m, Y + s - m); g.lineTo(X + m, Y + s - m); }
        if (f === 's') { g.moveTo(X + c, Y + s - m); g.lineTo(X + s - m, Y + m); g.lineTo(X + m, Y + m); }
        if (f === 'e') { g.moveTo(X + s - m, Y + c); g.lineTo(X + m, Y + m); g.lineTo(X + m, Y + s - m); }
        if (f === 'w') { g.moveTo(X + m, Y + c); g.lineTo(X + s - m, Y + m); g.lineTo(X + s - m, Y + s - m); }
        g.closePath(); g.fill();
      }
      if (def.glass && s >= 8) {
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.beginPath();
        g.moveTo(X + s * 0.25, Y + s * 0.6); g.lineTo(X + s * 0.6, Y + s * 0.25); g.stroke();
      }
      if (def.light && s >= 6) {
        g.fillStyle = 'rgba(255,255,255,.9)';
        const q = s * 0.3; g.fillRect(X + c - q / 2, Y + c - q / 2, q, q);
      }
    }
  }
  g.globalAlpha = 1;
}

function onMapHover(e) {
  if (!mapGeo) return;
  const r = els.mapCanvas.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  const { x0, z0, cols, rows, cs, ML, MT } = mapGeo;
  const cx = Math.floor((px - ML) / cs), cz = Math.floor((py - MT) / cs);
  const tip = els.tipEl;
  if (cx < 0 || cz < 0 || cx >= cols || cz >= rows) { tip.hidden = true; hoverCell = null; viewer && viewer.mark(null); drawMap(); return; }
  const x = x0 + cx, z = z0 + cz;
  const b = C.model.at(x, S.y, z);
  hoverCell = { x, z };
  drawMap();
  const o = C.store.origin;
  const w = { x: x + o.x, y: S.y + o.y, z: z + o.z };
  if (b) {
    const det = blockDetail(b);
    const sec = SECTION_INDEX[b.section];
    tip.replaceChildren(...[
      h('b', swatch(b.type), BLOCKS[b.type].name),
      h('div', `Welt ${w.x} | ${w.y} | ${w.z}`),
      h('div', `Modell ${x} | ${S.y} | ${z}`),
      det ? h('div', det) : null,
      h('div', `${sec.code} · ${sec.name} · Schritt ${b.step}`),
    ].filter(Boolean));
  } else {
    tip.replaceChildren(h('div', `Luft · Welt ${w.x} | ${w.y} | ${w.z}`));
  }
  tip.hidden = false;
  const tx = Math.min(window.innerWidth - 240, e.clientX + 16);
  tip.style.left = tx + 'px'; tip.style.top = (e.clientY + 16) + 'px';
  if (viewer) viewer.mark(b);
}

export function show(opts) {
  if (opts && opts.mode === 'layers') { setMode('layers'); if (opts.y != null) setY(opts.y); }
  else if (opts && opts.phase) { S.phase = opts.phase; S.step = opts.step || null; setMode('phases'); }
  else setMode(S.mode);
  if (viewer) { viewer.setActive(true); makeThumbs(); }
  if (opts && opts.step) setTimeout(() => {
    const li = els.steps.querySelector(`[data-s="${opts.step}"]`);
    if (li) li.scrollIntoView({ block: 'center' });
    focusStep(opts.step, true);
  }, 60);
}
export function hide() { if (viewer) viewer.setActive(false); els.tipEl.hidden = true; }
