import { h, $, swatch, icon, blockDetail } from '../ui/dom.js';
import { fmt, sortedTypes, boxDims, boxText } from '../core/analysis.js';
import { SECTIONS, SECTION_INDEX } from '../data/guide.js';
import { BLOCKS } from '../data/blocks.js';
import { ST } from '../viewer/viewer.js';

let C, root, viewer, els = {};
const S = {
  selected: null,
  hidden: new Set(),
  phases: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]),
  stepMax: 0,       // Anzahl sichtbarer Schritte (1..N)
  focus: 'dim',     // dim | ghost | tint | isolate
  clipY: 99,
  playing: 0,
};
let stepIdx = {};
let raf = 0;

const VIEWS = [['iso', 'Vorlage'], ['front', 'Vorne'], ['back', 'Hinten'], ['left', 'Links'], ['right', 'Rechts'], ['top', 'Oben']];

export function init(el, ctx) {
  C = ctx; root = el;
  const N = C.STEP_ORDER.length;
  C.STEP_ORDER.forEach((id, i) => { stepIdx[id] = i; });
  S.stepMax = N; S.clipY = C.A.maxY;

  // ---------- Bühne ----------
  const stage = h('div.stage');
  const viewSeg = h('div.seg.views-seg', { role: 'group', 'aria-label': 'Kameraansicht' },
    VIEWS.map(([k, l]) => h('button', { dataset: { view: k }, 'aria-pressed': k === 'iso' ? 'true' : 'false', text: l })));
  const readout = h('div.readout', { hidden: true });
  els.readout = readout;
  stage.append(h('div.hud.tl', viewSeg), h('div.hud.tr', { style: { top: '58px' } }, readout));

  const play = h('button.btn.icon', { 'aria-label': 'Bauablauf abspielen', title: 'Bauablauf abspielen' }, icon('play'));
  const slider = h('input', { type: 'range', min: 1, max: N, value: N, id: 'bp-steps', 'aria-label': 'Bauablauf: sichtbare Bauschritte' });
  const lbl = h('div.tl-label');
  const ticks = h('div.ticks');
  for (const p of C.PHASES) {
    const i = stepIdx[p.steps[0].id];
    const t = h('span', { text: 'P' + p.id, title: p.title, style: { left: `calc(${(i) / (N - 1) * 100}% )` } });
    t.addEventListener('click', () => { stopPlay(); setStepMax(stepIdx[p.steps[p.steps.length - 1].id] + 1); });
    ticks.append(t);
  }
  const timeline = h('div.timeline', h('div', { style: { gridRow: 'span 3' } }, play), lbl, h('div', { style: { gridColumn: 'auto' } }, slider), ticks);
  timeline.children[2].style.gridColumn = '2';
  stage.append(timeline);
  els.slider = slider; els.tlLabel = lbl; els.play = play;

  // ---------- Seitenleiste ----------
  els.secList = h('ul.sec-list', { role: 'listbox', 'aria-label': 'Gebäudebereiche' });
  for (const s of SECTIONS) {
    const eye = h('button.eye', { type: 'button', 'aria-label': `${s.name} ein-/ausblenden`, html: '' });
    eye.append(icon('eye'));
    const li = h('li.sec-item', { role: 'option', 'aria-selected': 'false', dataset: { id: s.id } },
      h('span.tag', s.code), h('span.nm', s.name), h('span.ct', fmt(C.A.section[s.id].count)), eye);
    li.addEventListener('click', (e) => {
      if (e.target.closest('.eye')) {
        if (S.hidden.has(s.id)) S.hidden.delete(s.id); else S.hidden.add(s.id);
        if (S.selected === s.id && S.hidden.has(s.id)) S.selected = null;
        refreshSide(); update();
        return;
      }
      select(S.selected === s.id ? null : s.id, true);
    });
    els.secList.append(li);
  }
  els.detail = h('div.panel-body.sel-detail');

  els.phaseBtns = h('div.phase-toggles');
  for (const p of C.PHASES) {
    const b = h('button.btn', { type: 'button', 'aria-pressed': 'true', title: p.title, text: `${p.id} · ${shortPhase(p.title)}` });
    b.addEventListener('click', () => {
      if (S.phases.has(p.id)) S.phases.delete(p.id); else S.phases.add(p.id);
      b.setAttribute('aria-pressed', S.phases.has(p.id) ? 'true' : 'false');
      update();
    });
    els.phaseBtns.append(b);
  }
  const allBtn = h('button.btn.small.ghost', { type: 'button', text: 'Alle' });
  allBtn.addEventListener('click', () => { for (let i = 1; i <= 9; i++) S.phases.add(i); syncPhaseBtns(); update(); });
  const noneBtn = h('button.btn.small.ghost', { type: 'button', text: 'Keine' });
  noneBtn.addEventListener('click', () => { S.phases.clear(); syncPhaseBtns(); update(); });

  const focusSeg = seg([['dim', 'Abdunkeln'], ['ghost', 'Geist'], ['tint', 'Einfärben'], ['isolate', 'Isolieren']], S.focus, (v) => { S.focus = v; update(); });
  const envSeg = seg([['grid', 'Raster'], ['day', 'Tageslicht']], 'grid', (v) => viewer && viewer.setEnvironment(v));
  const shadowBtn = h('button.btn.small', { type: 'button', 'aria-pressed': 'true', text: 'Schatten' });
  shadowBtn.addEventListener('click', () => {
    const on = shadowBtn.getAttribute('aria-pressed') !== 'true';
    shadowBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    viewer && viewer.setShadows(on);
  });
  const clip = h('input', { type: 'range', min: 0, max: C.A.maxY, value: C.A.maxY, id: 'bp-clip', 'aria-label': 'Höhenschnitt' });
  const clipOut = h('output.mono', { for: 'bp-clip' });
  clip.addEventListener('input', () => { S.clipY = +clip.value; clipOut.textContent = 'bis Y ' + S.clipY; update(); });
  clipOut.textContent = 'bis Y ' + S.clipY;
  const reset = h('button.btn.small', { type: 'button', text: 'Alles zurücksetzen' });
  reset.addEventListener('click', () => {
    stopPlay();
    S.selected = null; S.hidden.clear(); for (let i = 1; i <= 9; i++) S.phases.add(i);
    S.clipY = C.A.maxY; clip.value = S.clipY; clipOut.textContent = 'bis Y ' + S.clipY;
    setStepMax(N, true); syncPhaseBtns(); refreshSide(); update();
    viewer && viewer.setView('iso'); markView('iso');
  });
  els.clip = clip; els.clipOut = clipOut;

  const side = h('aside.bp-side',
    h('section.panel', h('div.panel-head', h('span', 'Bereiche'), h('span.code', 'Klick = auswählen')), els.secList),
    h('section.panel', h('div.panel-head', h('span', 'Auswahl'), h('span.code', 'SEL')), els.detail),
    h('section.panel', h('div.panel-head', h('span', 'Bauphasen'), h('span.row', allBtn, noneBtn)), h('div.panel-body', els.phaseBtns)),
    h('section.panel', h('div.panel-head', h('span', 'Darstellung'), h('span.code', 'DSP')),
      h('div.panel-body',
        h('div.opt-row', h('span.lbl', 'Nicht gewählt'), focusSeg),
        h('div.opt-row', h('span.lbl', 'Umgebung'), envSeg),
        h('div.opt-row', h('span.lbl', 'Licht'), shadowBtn),
        h('div.opt-row', h('span.lbl', 'Höhenschnitt'), clipOut),
        h('div', { style: { marginTop: '6px' } }, clip),
        h('div.opt-row', { style: { marginTop: '14px' } }, h('span.hint', 'Ziehen: drehen · Rechtsklick/2 Finger: verschieben · Rad/Pinch: zoomen · Doppelklick: heranzoomen'), reset),
      )),
  );

  root.append(
    h('div.view-head',
      h('div', h('div.eyebrow', '3D Blueprint · Modell im Maßstab 1:1'), h('h1', 'Interaktives Modell'),
        h('p.lede', 'Jeder Würfel ist ein Block im Spiel. Wähle Bereiche aus, blende Bauphasen ein und aus oder spiele den Bauablauf Schritt für Schritt ab.'))),
    h('div.bp', stage, side),
  );

  viewer = C.makeViewer(stage, { hover: true });
  if (viewer) {
    viewSeg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      markView(b.dataset.view);
      viewer.setView(b.dataset.view);
    });
    viewer.on('hover', (hit) => showReadout(hit && hit.block));
    viewer.on('pick', (hit) => {
      if (hit && hit.block) select(hit.block.section === S.selected ? null : hit.block.section, false);
      else select(null, false);
    });
    viewer.on('dblpick', (hit) => { if (hit && hit.block) { select(hit.block.section, false); frameSelected(); } });
  }
  els.viewSeg = viewSeg;

  play.addEventListener('click', () => (S.playing ? stopPlay() : startPlay()));
  slider.addEventListener('input', () => { stopPlay(); setStepMax(+slider.value); });

  C.store.on(() => showReadout(null));
  refreshSide();
  setStepMax(N, true);
}

function shortPhase(t) {
  return { 1: 'Fundament', 2: 'Rohbau', 3: 'Eingang', 4: 'Obergesch.', 5: 'Fenster', 6: 'Dach', 7: 'Technik', 8: 'Landeplatz', 9: 'Deko' }[C.PHASES.find((p) => p.title === t).id];
}

function seg(items, value, onChange) {
  const el = h('div.seg', { role: 'group' }, items.map(([k, l]) => h('button', { type: 'button', dataset: { v: k }, 'aria-pressed': k === value ? 'true' : 'false', text: l })));
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    for (const x of el.children) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    onChange(b.dataset.v);
  });
  return el;
}
function markView(v) { for (const x of els.viewSeg.children) x.setAttribute('aria-pressed', x.dataset.view === v ? 'true' : 'false'); }
function syncPhaseBtns() { [...els.phaseBtns.children].forEach((b, i) => b.setAttribute('aria-pressed', S.phases.has(i + 1) ? 'true' : 'false')); }

function setStepMax(v, silent) {
  const N = C.STEP_ORDER.length;
  S.stepMax = Math.max(1, Math.min(N, v));
  els.slider.value = S.stepMax;
  if (S.stepMax >= N) {
    els.tlLabel.replaceChildren(h('span', h('b', 'Fertiges Gebäude'), ` · alle ${N} Bauschritte`), h('span', `${fmt(C.A.all.count)} Blöcke`));
  } else {
    const id = C.STEP_ORDER[S.stepMax - 1];
    const s = C.STEP_INDEX[id];
    let cum = 0; for (let i = 0; i < S.stepMax; i++) cum += C.A.step[C.STEP_ORDER[i]].count;
    els.tlLabel.replaceChildren(h('span', h('b', `${id} ${s.title}`), ` · Phase ${s.phase} · neu: ${fmt(C.A.step[id].count)}`), h('span', `${fmt(cum)} Blöcke`));
  }
  if (!silent) update();
}
function startPlay() {
  const N = C.STEP_ORDER.length;
  if (S.stepMax >= N) setStepMax(1);
  els.play.replaceChildren(icon('pause'));
  S.playing = setInterval(() => {
    if (S.stepMax >= N) { stopPlay(); return; }
    setStepMax(S.stepMax + 1);
  }, 650);
}
function stopPlay() {
  if (!S.playing) return;
  clearInterval(S.playing); S.playing = 0;
  els.play.replaceChildren(icon('play'));
}

function update() {
  if (!viewer || raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const N = C.STEP_ORDER.length;
    const latest = S.stepMax < N ? S.stepMax - 1 : -1;
    const sel = S.selected;
    viewer.setStates((b) => {
      const si = stepIdx[b.step];
      if (!S.phases.has(b.phase) || S.hidden.has(b.section) || si >= S.stepMax || b.y > S.clipY) return ST.HIDDEN;
      if (sel && b.section !== sel) {
        if (S.focus === 'dim') return ST.DIM;
        if (S.focus === 'ghost') return ST.GHOST;
        if (S.focus === 'isolate') return ST.HIDDEN;
        return ST.NORMAL;
      }
      if (sel && S.focus === 'tint') return ST.HIGHLIGHT;
      if (si === latest) return ST.HIGHLIGHT;
      return ST.NORMAL;
    });
  });
}

function select(id, frame) {
  S.selected = id;
  if (id && S.hidden.has(id)) S.hidden.delete(id);
  refreshSide(); update();
  if (frame && id) frameSelected();
}
function frameSelected() {
  if (!viewer || !S.selected) return;
  viewer.frameBox(C.A.section[S.selected].box, 'iso');
  markView('iso');
}

function refreshSide() {
  for (const li of els.secList.children) {
    const id = li.dataset.id;
    li.setAttribute('aria-selected', S.selected === id ? 'true' : 'false');
    li.classList.toggle('off', S.hidden.has(id));
    const eye = li.querySelector('.eye');
    eye.replaceChildren(icon(S.hidden.has(id) ? 'eyeOff' : 'eye'));
  }
  const d = els.detail;
  d.replaceChildren();
  if (!S.selected) {
    d.append(h('p.muted', { style: { fontSize: '13px' } }, 'Kein Bereich gewählt. Klicke im Modell auf ein Bauteil oder wähle einen Bereich aus der Liste.'));
    return;
  }
  const s = SECTION_INDEX[S.selected];
  const g = C.A.section[s.id];
  const dm = boxDims(g.box);
  const phases = [...new Set(C.model.blocks.filter((b) => b.section === s.id).map((b) => b.phase))].sort();
  const mats = sortedTypes(g).slice(0, 8);
  d.append(
    h('div.row', { style: { marginBottom: '6px' } }, h('span.tag', { style: { borderColor: 'var(--accent)', color: 'var(--accent)' } }, s.code), h('h3', s.name)),
    h('p.muted', { style: { fontSize: '13px', marginBottom: '12px' } }, s.text),
    h('dl.kv',
      h('dt', 'Blöcke'), h('dd', fmt(g.count)),
      h('dt', 'Maße B × T × H'), h('dd', `${dm.w} × ${dm.d} × ${dm.h}`),
      h('dt', 'Lage'), h('dd', { style: { fontSize: '11.5px' } }, boxText(g.box)),
      h('dt', 'Phasen'), h('dd', phases.join(' · ')),
    ),
    h('ul.mat-mini', mats.map((m) => h('li', swatch(m.id), h('span', m.def.name), h('span.mono', fmt(m.n))))),
    h('div.row', { style: { marginTop: '14px' } },
      h('button.btn.small', { type: 'button', onclick: frameSelected }, icon('focus'), 'Heranzoomen'),
      h('button.btn.small.ghost', { type: 'button', onclick: () => select(null) }, 'Aufheben')),
  );
}

function showReadout(b) {
  const r = els.readout;
  if (!b) { r.hidden = true; return; }
  const def = BLOCKS[b.type];
  const w = C.world(b);
  const st = C.STEP_INDEX[b.step];
  const sec = SECTION_INDEX[b.section];
  const det = blockDetail(b);
  r.replaceChildren(...[
    h('div.rname', swatch(b.type), def.name),
    h('div.rrow', h('span', 'ID'), h('span', 'minecraft:' + b.type)),
    det ? h('div.rrow', h('span', 'Zustand'), h('span', det)) : null,
    h('div.rrow', h('span', 'Modell'), h('span', `${b.x} | ${b.y} | ${b.z}`)),
    h('div.rrow', h('span', 'Welt'), h('span', `${w.x} | ${w.y} | ${w.z}`)),
    h('div.rrow', h('span', 'Bereich'), h('span', `${sec.code} · ${sec.name}`)),
    h('div.rrow', h('span', 'Schritt'), h('span', `${b.step} ${st.title}`)),
  ].filter(Boolean));
  r.hidden = false;
}

export function show(opts) {
  if (viewer) viewer.setActive(true);
  if (opts && opts.section) {
    select(opts.section, true);
  }
}
export function hide() { stopPlay(); if (viewer) viewer.setActive(false); }
