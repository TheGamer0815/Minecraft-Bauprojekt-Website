import { h, $, toast } from '../ui/dom.js';
import { fmt } from '../core/analysis.js';
import { SECTIONS } from '../data/guide.js';
import { BLOCKS } from '../data/blocks.js';

let C, root, viewer, els = {}, compareDone = false;

export function init(el, ctx) {
  C = ctx; root = el;
  const { A, model } = C;
  const dims = model.dims;

  const stage = h('div.stage');
  const title = h('div.ov-title',
    h('div.eyebrow', 'Minecraft-Soloprojekt · Vanilla-Blöcke'),
    h('h1', 'ECHO-7'),
    h('p', 'Forschungs- und Versorgungsstation mit Bogendach-Halle, Hangar-Portal, Ringmodul und seitlicher Landebahn – Block für Block geplant.'),
    h('div.cta',
      h('a.btn.primary', { href: '#guide' }, 'Bauanleitung öffnen'),
      h('a.btn', { href: '#blueprint' }, '3D Blueprint'),
    ),
  );
  const envSeg = h('div.seg', { role: 'group', 'aria-label': 'Umgebung' },
    h('button', { 'aria-pressed': 'true', dataset: { env: 'grid' }, text: 'Raster' }),
    h('button', { 'aria-pressed': 'false', dataset: { env: 'day' }, text: 'Tageslicht' }),
  );
  const rotBtn = h('button.btn.small', { 'aria-pressed': 'true', text: 'Rotation' });
  stage.append(h('div.ov-shade'), h('div.hud.tr', envSeg, rotBtn), title);
  els.stage = stage; els.envSeg = envSeg; els.rotBtn = rotBtn;

  // Projektdatenblatt
  const topY = A.maxY;
  const top = model.blocks.filter((b) => b.y === topY)[0];
  els.sheet = h('dl.kv');
  const rows = [
    ['Projekt', 'ECHO-7 Research Outpost'],
    ['Gebäudetyp', 'Forschungs-/Versorgungsstation'],
    ['Gesamtmaß B × T × H', `${dims.w} × ${dims.d} × ${dims.h}`],
    ['Plattform', '74 × 49 Blöcke'],
    ['Höchster Punkt', `Y ${topY} · ${top ? BLOCKS[top.type].name : ''}`],
    ['Blöcke gesamt', fmt(A.all.count)],
    ['davon verdeckt', fmt(A.all.hidden)],
    ['Blocktypen', String(A.all.types.size)],
    ['Bauphasen · Schritte', `9 · ${C.STEP_ORDER.length}`],
    ['Schichten', `Y 0 – Y ${topY} (${topY + 1})`],
  ];
  for (const [k, v] of rows) els.sheet.append(h('dt', k), h('dd', v));
  els.originDd = h('dd'); els.builtDd = h('dd');
  els.sheet.append(h('dt', 'Weltursprung (0|0|0)'), els.originDd, h('dt', 'Gebaut'), els.builtDd);
  els.next = h('div.ov-next');

  const sheet = h('section.panel.ov-sheet.span-4',
    h('div.panel-head', h('span', 'Projektdatenblatt'), h('span.code', 'DB-01')),
    h('div.panel-body', els.sheet),
    els.next,
  );

  // Vergleich Vorlage / Modell
  els.cmp = h('div.compare', { style: { '--split': '50%' } },
    h('img', { src: 'assets/reference.jpg', alt: 'Referenzbild der Vorlage' }),
    h('div.cmp-wait', 'Modellansicht wird gerendert …'),
    h('span.cmp-tag.l', 'Vorlage'), h('span.cmp-tag.r', 'Modell ECHO-7'),
  );
  const range = h('input', { type: 'range', min: 0, max: 100, value: 50, 'aria-label': 'Trennlinie Vorlage/Modell verschieben', id: 'cmp-range' });
  range.addEventListener('input', () => els.cmp.style.setProperty('--split', range.value + '%'));
  els.cmp.append(range);
  const compare = h('section.panel.span-7',
    h('div.panel-head', h('span', 'Abgleich mit der Vorlage'), h('span.code', 'REF-01')),
    h('div.panel-body', els.cmp,
      h('p.hint', { style: { marginTop: '10px' } }, 'Regler ziehen: links das Referenzbild, rechts das Modell aus derselben Südost-Perspektive (Ansicht „Vorlage“ im 3D Blueprint).')),
  );

  // Bauphasen
  els.phases = h('ol.phase-list');
  const phases = h('section.panel.span-5',
    h('div.panel-head', h('span', 'Bauphasen'), h('span.code', 'Schritte erledigt')),
    h('div.panel-body.tight', els.phases),
  );

  // Bereiche
  const grid = h('div.sec-grid');
  for (const s of SECTIONS) {
    const g = A.section[s.id];
    const ph = [...new Set(model.blocks.filter((b) => b.section === s.id).map((b) => b.phase))].sort();
    grid.append(h('button.sec-card', { type: 'button', onclick: () => C.go('blueprint', { section: s.id }) },
      h('span.tag', s.code),
      h('span.sn', s.name),
      h('span.sm', `${fmt(g.count)} Blöcke · Phase ${ph.join(', ')}`),
      h('span.st', s.text),
    ));
  }
  const secs = h('section.panel.span-12',
    h('div.panel-head', h('span', 'Gebäudebereiche'), h('span.code', '15 Bereiche · im 3D Blueprint anwählbar')),
    grid,
  );

  root.append(h('div.grid.cols-12',
    h('section.panel.ov-hero.span-8', stage),
    sheet, compare, phases, secs,
  ));

  // Viewer
  viewer = C.makeViewer(stage, { autoRotate: true, hover: false, shiftX: 0.17 });
  if (viewer) {
    envSeg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      for (const x of envSeg.children) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      viewer.setEnvironment(b.dataset.env);
    });
    rotBtn.addEventListener('click', () => {
      const on = rotBtn.getAttribute('aria-pressed') !== 'true';
      rotBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      viewer.setAutoRotate(on);
    });
    viewer.controls.addEventListener('start', () => { viewer.setAutoRotate(false); rotBtn.setAttribute('aria-pressed', 'false'); });
  }
  C.store.on(() => { if (root.classList.contains('active')) refresh(); });
}

function refresh() {
  const { store, PHASES, A } = C;
  const o = store.origin;
  els.originDd.textContent = `${o.x} | ${o.y} | ${o.z}`;
  const p = C.placed();
  els.builtDd.textContent = `${(p.count / p.total * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} % · ${fmt(p.count)}`;

  els.phases.replaceChildren();
  for (const ph of PHASES) {
    const done = ph.steps.filter((s) => store.isStepDone(s.id)).length;
    const all = ph.steps.length;
    els.phases.append(h('li.phase-row' + (done === all ? '.done' : ''), { onclick: () => C.go('guide', { phase: ph.id }) },
      h('span.pn', String(ph.id).padStart(2, '0')),
      h('span', h('span.pt', ph.title), h('span.dim.mono', { style: { display: 'block', fontSize: '11.5px' } }, `${fmt(A.phase[ph.id].count)} Blöcke`)),
      h('div.bar' + (done === all ? '.ok' : ''), h('i', { style: { width: (done / all * 100) + '%' } })),
      h('span.pc', `${done} / ${all}`),
    ));
  }

  const nid = C.nextOpenStep();
  els.next.replaceChildren();
  if (nid) {
    const s = C.STEP_INDEX[nid];
    els.next.append(
      h('span.lbl', 'Nächster offener Schritt'),
      h('span.nm', `${s.id}  ${s.title}`),
      h('span.muted', { style: { fontSize: '13px' } }, `Phase ${s.phase} · ${fmt(A.step[nid].count)} Blöcke`),
      h('div.row', h('button.btn.primary.small', { onclick: () => C.go('guide', { phase: s.phase, step: nid }) }, 'Schritt öffnen'),
        h('button.btn.small', { onclick: () => C.go('guide', { mode: 'layers' }) }, 'Schicht-Modus')),
    );
  } else {
    els.next.append(h('span.lbl', 'Status'), h('span.nm', 'Alle Bauschritte erledigt.'));
  }
}

function renderCompare() {
  if (compareDone || !viewer) return;
  compareDone = true;
  setTimeout(() => {
    try {
      const prev = viewer.env;
      viewer.setEnvironment('day');
      const url = viewer.snapshot(1000, 750, 'iso', null, 0.76, { fov: 40, el: 33, az: 36, dy: 5, dx: 6 });
      viewer.setEnvironment(prev);
      const img = h('img.cmp-top', { src: url, alt: 'ECHO-7 Modell in der Perspektive der Vorlage' });
      els.cmp.insertBefore(img, els.cmp.querySelector('.cmp-wait'));
      els.cmp.querySelector('.cmp-wait').remove();
    } catch (e) {
      console.error(e);
      toast('Vergleichsbild konnte nicht erzeugt werden.');
    }
  }, 120);
}

export function show() {
  refresh();
  if (viewer) { viewer.setActive(true); renderCompare(); }
}
export function hide() { if (viewer) viewer.setActive(false); }
