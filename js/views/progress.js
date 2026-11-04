import { h, icon, copyText, toast } from '../ui/dom.js';
import { fmt } from '../core/analysis.js';

let C, root, els = {};

export function init(el, ctx) {
  C = ctx; root = el;
  els.kpis = h('div.tiles.kpis');
  els.phases = h('div');
  els.chart = h('div');
  els.log = h('ol.log');
  els.origin = buildOrigin();
  els.data = buildData();

  root.append(
    h('div.view-head',
      h('div', h('div.eyebrow', 'Progress'), h('h1', 'Baufortschritt'),
        h('p.lede', 'Markiere Bauschritte in der Bauanleitung oder ganze Ebenen im Schicht-Modus. Ein Block zählt als gebaut, sobald sein Schritt erledigt oder seine Ebene markiert ist.'))),
    els.kpis,
    h('div.grid.cols-12', { style: { marginTop: '14px' } },
      h('section.panel.span-7', h('div.panel-head', h('span', 'Bauphasen'), h('span.code', 'Schritte · nächster offener Schritt')), els.phases),
      h('section.panel.span-5', h('div.panel-head', h('span', 'Protokoll'), h('span.code', 'letzte Einträge')), els.log),
      h('section.panel.span-12', h('div.panel-head', h('span', 'Ebenen Y0 bis Y' + C.A.maxY), h('span.code', 'Balken = Blöcke je Ebene · Klick öffnet die Ebene')), h('div.panel-body', els.chart)),
      h('section.panel.span-6', h('div.panel-head', h('span', 'Baustelle in deiner Welt'), h('span.code', 'Ursprung')), els.origin),
      h('section.panel.span-6', h('div.panel-head', h('span', 'Daten'), h('span.code', 'Sicherung · Import · Zurücksetzen')), els.data),
    ),
  );
  C.store.on(() => { if (root.classList.contains('active')) render(); });
}

function buildOrigin() {
  const inputs = ['x', 'y', 'z'].map((k) => h('input', { type: 'number', step: 1, id: 'origin-' + k, 'aria-label': 'Ursprung ' + k.toUpperCase() }));
  els.originInputs = inputs;
  const save = h('button.btn.primary', { type: 'button', text: 'Übernehmen' });
  save.addEventListener('click', () => {
    C.store.setOrigin({ x: +inputs[0].value, y: +inputs[1].value, z: +inputs[2].value });
    toast('Weltursprung gespeichert. Alle Pläne zeigen jetzt Spielkoordinaten.');
  });
  return h('div.panel-body.stack',
    h('p.muted', { style: { fontSize: '13px' } }, 'Stell dich auf den Block, an dem die Nordwest-Ecke der Fundamentschicht liegen soll (Modell 0 | 0 | 0), und lies die Koordinaten mit F3 ab. Danach zeigen Hover-Infos, Schichtpläne und Schrittbereiche echte Weltkoordinaten.'),
    h('div.origin-form', ...inputs.map((inp, i) => h('label.field', { for: inp.id }, ['X (Osten +)', 'Y (Höhe)', 'Z (Süden +)'][i], inp))),
    h('div.row', save, h('span.hint', 'Modell-Ausdehnung: ' + `${C.model.dims.w} × ${C.model.dims.h} × ${C.model.dims.d} (X × Y × Z)`)),
  );
}

function buildData() {
  const exportBtn = h('button.btn', { type: 'button' }, icon('copy'), 'Sicherung kopieren');
  const area = h('textarea', { rows: 5, id: 'data-io', placeholder: 'Hier eine Sicherung einfügen, um sie zu importieren …', 'aria-label': 'Sicherung als Text' });
  exportBtn.addEventListener('click', async () => {
    const txt = C.store.exportJSON();
    area.value = txt;
    const ok = await copyText(txt);
    if (ok) toast('Sicherung in die Zwischenablage kopiert.');
    else { area.select(); toast('Text ist markiert – bitte mit Strg+C kopieren.'); }
  });
  const importBtn = h('button.btn', { type: 'button', text: 'Aus Textfeld importieren' });
  importBtn.addEventListener('click', () => doImport(area.value));
  const file = h('input', { type: 'file', accept: 'application/json,.json,.txt', id: 'data-file', hidden: true });
  file.addEventListener('change', async () => { if (file.files[0]) doImport(await file.files[0].text()); file.value = ''; });
  const fileBtn = h('button.btn', { type: 'button', text: 'Datei wählen' });
  fileBtn.addEventListener('click', () => file.click());
  const resetBtn = h('button.btn.danger', { type: 'button', text: 'Fortschritt zurücksetzen' });
  const confirm = h('div.confirm', { hidden: true },
    h('span', 'Alle Markierungen, Mengen und das Protokoll werden gelöscht.'),
    h('button.btn.small.danger', { type: 'button', text: 'Ja, löschen', onclick: () => { C.store.reset(); confirm.hidden = true; toast('Fortschritt zurückgesetzt.'); } }),
    h('button.btn.small.ghost', { type: 'button', text: 'Abbrechen', onclick: () => { confirm.hidden = true; } }));
  resetBtn.addEventListener('click', () => { confirm.hidden = false; });
  return h('div.panel-body.stack',
    h('p.muted', { style: { fontSize: '13px' } }, 'Der Fortschritt liegt nur in diesem Browser. Mit einer Sicherung nimmst du ihn auf ein anderes Gerät mit.'),
    h('div.row', exportBtn, importBtn, fileBtn, file),
    area,
    h('div.row', resetBtn), confirm,
  );
}

function doImport(text) {
  try { C.store.importJSON(text); toast('Sicherung importiert.'); }
  catch (e) { toast('Import fehlgeschlagen: ' + (e.message || 'ungültiger Text') + ' Füge den kompletten Text einer Sicherung ein.'); }
}

function render() {
  const { store, A, PHASES, model } = C;
  const p = C.placed();
  const st = store.state;
  const layersAll = Object.keys(A.layer).length;
  const layersBuilt = Object.keys(st.layers).filter((y) => A.layer[y]).length;
  const stepsAll = C.STEP_ORDER.length;
  const stepsDone = C.STEP_ORDER.filter((id) => st.steps[id]).length;
  let need = 0, have = 0;
  for (const [id, n] of A.all.types) { need += n; have += Math.min(n, store.collected(id)); }
  const pct = (a, b) => (b ? a / b * 100 : 0);
  const f1 = (v) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  const kpi = (l, v, sub, frac) => h('div.tile.kpi', h('div.tl', l), h('div.tv', v), h('div.ts', sub), h('div.bar', h('i', { style: { width: (frac * 100) + '%' } })));
  els.kpis.replaceChildren(
    kpi('Gesamt gebaut', f1(pct(p.count, p.total)) + ' %', `${fmt(p.count)} von ${fmt(p.total)} Blöcken`, p.count / p.total),
    kpi('Ebenen markiert', `${layersBuilt} / ${layersAll}`, 'im Schicht-Modus', layersBuilt / layersAll),
    kpi('Schritte erledigt', `${stepsDone} / ${stepsAll}`, 'in der Bauanleitung', stepsDone / stepsAll),
    kpi('Material gesammelt', f1(pct(have, need)) + ' %', `${fmt(have)} von ${fmt(need)} Blöcken`, need ? have / need : 0),
  );

  els.phases.replaceChildren(...PHASES.map((ph) => {
    const done = ph.steps.filter((s) => st.steps[s.id]).length;
    const next = ph.steps.find((s) => !st.steps[s.id]);
    const blocksPlaced = p.perPhase[ph.id] || 0;
    const row = h('div.pg-phase',
      h('span.pn', String(ph.id).padStart(2, '0')),
      h('span', h('span', ph.title), h('span.nx', next ? `als Nächstes: ${next.id} ${next.title}` : 'abgeschlossen')),
      h('div.bar' + (done === ph.steps.length ? '.ok' : ''), { title: `${fmt(blocksPlaced)} von ${fmt(A.phase[ph.id].count)} Blöcken gebaut` }, h('i', { style: { width: pct(blocksPlaced, A.phase[ph.id].count) + '%' } })),
      h('span.pc', `${done}/${ph.steps.length}`),
    );
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => C.go('guide', { phase: ph.id, step: next ? next.id : null }));
    return row;
  }));

  els.log.replaceChildren(...(st.log.length ? st.log.slice(0, 40).map((e) => h('li',
    h('time', { datetime: new Date(e.t).toISOString() }, new Date(e.t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })),
    h('span', e.msg))) : [h('li', h('span.dim', 'Noch keine Einträge.'), h('span.dim', 'Markiere einen Schritt oder eine Ebene, dann erscheint er hier.'))]));

  const o = store.origin;
  els.originInputs[0].value = o.x; els.originInputs[1].value = o.y; els.originInputs[2].value = o.z;
  renderChart();
}

// Balkendiagramm: Blöcke je Ebene, gebaut vs. offen
function renderChart() {
  const { A, store } = C;
  const n = A.maxY + 1;
  const W = Math.max(560, Math.round(els.chart.clientWidth || 1000)), H = 220, L = 44, B = 26, T = 14, R = 8;
  const max = Math.max(...Object.values(A.layer).map((g) => g.count));
  const niceMax = Math.ceil(max / 1000) * 1000;
  const bw = (W - L - R) / n;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'layer-chart');
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Blöcke je Ebene, gebaute Ebenen hervorgehoben');
  const el = (tag, attrs, text) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; svg.appendChild(e); return e; };
  // Raster (log-artig wäre irreführend – lineare Skala, Y0/Y1 sind die großen Flächen)
  for (let i = 0; i <= 4; i++) {
    const v = niceMax * i / 4;
    const y = T + (H - T - B) * (1 - i / 4);
    el('line', { x1: L, x2: W - R, y1: y, y2: y, stroke: '#222a30', 'stroke-width': 1 });
    el('text', { x: L - 6, y: y + 3.5, 'text-anchor': 'end', fill: '#66737c', 'font-size': 10.5, 'font-family': 'IBM Plex Mono, monospace' }, fmt(v));
  }
  const tip = el('title', {}, '');
  for (let y = 0; y < n; y++) {
    const g = A.layer[y];
    const c = g ? g.count : 0;
    const hgt = (H - T - B) * (c / niceMax);
    const x = L + y * bw + 1;
    const built = store.isLayerBuilt(y);
    const r = el('rect', { x, y: H - B - hgt, width: Math.max(1, bw - 2), height: Math.max(c ? 1.5 : 0, hgt), rx: Math.min(2, (bw - 2) / 2), fill: built ? '#7ccf8e' : '#3ccfe0', 'fill-opacity': built ? 1 : 0.55, class: 'lbar' });
    const t = document.createElementNS(ns, 'title'); t.textContent = `Y ${y}: ${fmt(c)} Blöcke${built ? ' · gebaut' : ''}`; r.appendChild(t);
    // breitere Trefferfläche
    const hit = el('rect', { x: L + y * bw, y: T, width: bw, height: H - T - B, fill: 'transparent', class: 'lbar' });
    hit.appendChild(t.cloneNode(true));
    hit.addEventListener('click', () => C.go('guide', { mode: 'layers', y }));
    r.addEventListener('click', () => C.go('guide', { mode: 'layers', y }));
    if (y % 5 === 0) el('text', { x: L + (y + 0.5) * bw, y: H - 8, 'text-anchor': 'middle', fill: '#66737c', 'font-size': 10.5, 'font-family': 'IBM Plex Mono, monospace' }, 'Y' + y);
  }
  tip.remove();
  const legend = h('div.row', { style: { marginTop: '8px', gap: '16px' } },
    h('span.chip', h('span.swatch', { style: { background: '#3ccfe0', opacity: .55 } }), 'offen'),
    h('span.chip', h('span.swatch', { style: { background: '#7ccf8e' } }), 'gebaut'),
    h('span.hint', 'Y0 und Y1 sind Fundament und Grundplatte und daher die größten Ebenen.'));
  els.chart.replaceChildren(h('div.table-wrap', svg), legend);
}

export function show() { render(); }
export function hide() {}
