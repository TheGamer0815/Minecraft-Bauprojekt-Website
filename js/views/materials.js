import { h, swatch, icon, copyText, toast } from '../ui/dom.js';
import { fmt, stacks, shulker, sortedTypes } from '../core/analysis.js';
import { BLOCKS, CATEGORY_ORDER } from '../data/blocks.js';

let C, root, els = {};
const S = { phase: 0, q: '', sort: 'count' };

export function init(el, ctx) {
  C = ctx; root = el;
  els.tiles = h('div.tiles');
  els.cats = h('div.cat-rows');
  els.tbody = h('tbody');
  els.tfoot = h('tfoot');

  const phaseSel = h('select', { id: 'mat-phase', 'aria-label': 'Bauphase' },
    h('option', { value: 0 }, 'Gesamtes Gebäude'),
    C.PHASES.map((p) => h('option', { value: p.id }, `Phase ${p.id} · ${p.title}`)));
  phaseSel.addEventListener('change', () => { S.phase = +phaseSel.value; render(); });
  const search = h('input', { type: 'search', id: 'mat-search', placeholder: 'z. B. Beton, glass, quartz …', 'aria-label': 'Blöcke suchen' });
  search.addEventListener('input', () => { S.q = search.value.trim().toLowerCase(); renderTable(); });
  const sortSel = h('select', { id: 'mat-sort', 'aria-label': 'Sortierung' },
    h('option', { value: 'count' }, 'Menge'), h('option', { value: 'name' }, 'Name'), h('option', { value: 'cat' }, 'Kategorie'));
  sortSel.addEventListener('change', () => { S.sort = sortSel.value; renderTable(); });
  const copyBtn = h('button.btn', { type: 'button' }, icon('copy'), 'Liste kopieren');
  copyBtn.addEventListener('click', async () => {
    const ok = await copyText(listText());
    if (ok) toast('Materialliste in die Zwischenablage kopiert.');
    else { els.copyArea.hidden = false; els.copyArea.value = listText(); els.copyArea.select(); toast('Kopieren nicht erlaubt – Text ist markiert, bitte mit Strg+C kopieren.'); }
  });
  els.copyArea = h('textarea', { rows: 8, hidden: true, readonly: true, 'aria-label': 'Materialliste als Text' });

  root.append(
    h('div.view-head',
      h('div', h('div.eyebrow', 'Materials'), h('h1', 'Materialplanung'),
        h('p.lede', 'Alle Blöcke direkt aus dem 3D-Modell gezählt. Trage ein, was du schon gesammelt hast – die Fehlmengen rechnen sich in Stacks und Shulkerkisten um.'))),
    els.tiles,
    h('div.grid.cols-12', { style: { marginTop: '14px' } },
      h('section.panel.span-4',
        h('div.panel-head', h('span', 'Nach Kategorie'), h('span.code', 'Blöcke')),
        h('div.panel-body', els.cats),
        h('div.panel-body', { style: { borderTop: '1px solid var(--line)' } },
          h('p.hint', 'Verdeckt = Blöcke, die rundum von Vollblöcken umschlossen sind. Dort kannst du günstigeres Material verbauen, ohne dass es auffällt.'))),
      h('section.panel.span-8',
        h('div.panel-head', h('span', 'Materialliste'), h('span.code', 'minecraft: IDs')),
        h('div.panel-body', h('div.toolbar',
          h('label.field', 'Umfang', phaseSel),
          h('label.field.grow', 'Suche', search),
          h('label.field', 'Sortierung', sortSel),
          copyBtn), els.copyArea),
        h('div.table-wrap', h('table.mat-table',
          h('thead', h('tr', h('th', 'Block'), h('th', 'Kategorie'), h('th.r', 'Menge'), h('th.r', 'Stacks'), h('th.r', 'Shulker'), h('th.r', 'Verdeckt'), h('th.r', 'Gesammelt'), h('th', 'Stand'))),
          els.tbody, els.tfoot))),
    ),
  );
  C.store.on(() => { if (root.classList.contains('active')) render(); });
}

function group() {
  if (!S.phase) return C.A.all;
  return C.A.phase[S.phase];
}

function render() {
  const g = group();
  let need = 0, have = 0;
  for (const [id, n] of g.types) {
    need += n;
    have += Math.min(n, C.store.collected(id));
  }
  const totalStacks = [...g.types.values()].reduce((a, n) => a + Math.ceil(n / 64), 0);
  const tile = (l, v, s) => h('div.tile', h('div.tl', l), h('div.tv', v), h('div.ts', s));
  els.tiles.replaceChildren(
    tile('Blöcke', fmt(g.count), S.phase ? `Phase ${S.phase}` : 'gesamtes Gebäude'),
    tile('Blocktypen', String(g.types.size), 'verschiedene Blöcke'),
    tile('Stacks', fmt(totalStacks), 'zu je 64, je Blocktyp aufgerundet'),
    tile('Shulkerkisten', Math.ceil(totalStacks / 27).toString(), '27 Stacks pro Kiste'),
    tile('Gesammelt', (need ? (have / need * 100) : 0).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %', `${fmt(have)} von ${fmt(need)}`),
  );
  // Kategorien
  const cats = new Map(CATEGORY_ORDER.map((c) => [c, 0]));
  for (const [id, n] of g.types) cats.set(BLOCKS[id].cat, cats.get(BLOCKS[id].cat) + n);
  const max = Math.max(...cats.values());
  els.cats.replaceChildren(...[...cats.entries()].filter(([, n]) => n > 0).map(([c, n]) =>
    h('div.cat-row', { title: `${c}: ${fmt(n)} Blöcke` }, h('span', c), h('div.bar', h('i', { style: { width: (n / max * 100) + '%' } })), h('span.cv', fmt(n)))));
  renderTable();
}

function renderTable() {
  const g = group();
  let rows = sortedTypes(g, S.sort);
  if (S.q) rows = rows.filter((m) => m.def.name.toLowerCase().includes(S.q) || m.id.includes(S.q) || m.def.cat.toLowerCase().includes(S.q));
  els.tbody.replaceChildren(...rows.map((m) => {
    const got = C.store.collected(m.id);
    const done = got >= C.A.all.types.get(m.id);
    const inp = h('input', { type: 'number', min: 0, step: 1, value: got || '', placeholder: '0', id: 'col-' + m.id, 'aria-label': `${m.def.name} gesammelt` });
    inp.addEventListener('change', () => C.store.setCollected(m.id, +inp.value, m.def.name));
    const full = h('button.btn.small.icon', { type: 'button', title: 'Gesamtmenge als gesammelt eintragen', 'aria-label': `${m.def.name}: vollständig` }, icon('check'));
    full.addEventListener('click', () => C.store.setCollected(m.id, C.A.all.types.get(m.id), m.def.name));
    const totalAll = C.A.all.types.get(m.id);
    const pct = Math.min(1, got / totalAll);
    const hid = g === C.A.all ? (C.A.hiddenByType.get(m.id) || 0) : countHidden(m.id);
    return h('tr' + (done ? '.row-done' : ''),
      h('td', h('span.nmcell', swatch(m.id, true), h('span', m.def.name, h('span.id', 'minecraft:' + m.id)))),
      h('td.muted', m.def.cat),
      h('td.r.mono', fmt(m.n)),
      h('td.r.mono.muted', stacks(m.n)),
      h('td.r.mono.muted', shulker(m.n) >= 0.1 ? shulker(m.n).toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '–'),
      h('td.r.mono.muted', hid ? fmt(hid) : '–'),
      h('td', h('div.coll', inp, full)),
      h('td', h('div.bar' + (done ? '.ok' : ''), { title: `${fmt(got)} von ${fmt(totalAll)} (gesamtes Gebäude)` }, h('i', { style: { width: (pct * 100) + '%' } }))),
    );
  }));
  const sum = rows.reduce((a, m) => a + m.n, 0);
  els.tfoot.replaceChildren(h('tr', h('td', `${rows.length} Blocktypen`), h('td'), h('td.r.mono', fmt(sum)), h('td.r.mono.muted', stacks(sum)), h('td'), h('td'), h('td'), h('td')));
  if (!rows.length) els.tbody.append(h('tr', h('td', { colspan: 8 }, h('p.empty', 'Kein Block passt zur Suche.'))));
}

function countHidden(id) {
  let n = 0;
  for (const b of C.model.blocks) if (b.type === id && b.phase === S.phase && b.hidden) n++;
  return n;
}

function listText() {
  const g = group();
  const title = S.phase ? `Phase ${S.phase} · ${C.PHASES[S.phase - 1].title}` : 'Gesamtes Gebäude';
  const lines = [`ECHO-7 – Materialliste (${title})`, `${fmt(g.count)} Blöcke, ${g.types.size} Blocktypen`, ''];
  for (const m of sortedTypes(g, S.sort)) {
    const miss = Math.max(0, m.n - C.store.collected(m.id));
    lines.push(`${m.def.name} (minecraft:${m.id}): ${fmt(m.n)} = ${stacks(m.n)}${miss < m.n ? ` · fehlt noch ${fmt(miss)}` : ''}`);
  }
  return lines.join('\n');
}

export function show() { render(); }
export function hide() {}
