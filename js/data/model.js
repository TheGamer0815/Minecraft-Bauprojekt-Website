// ECHO-7 – blockgenaues Modell der Forschungsstation.
//
// Koordinatensystem (identisch mit Minecraft):
//   +X = Osten, -X = Westen, +Z = Süden, -Z = Norden, +Y = oben.
//   Ursprung (0|0|0) = Nordwest-Ecke der untersten Fundamentschicht.
//
// Jeder Block trägt: Bauschritt (step), Bauphase (phase) und Gebäudebereich (section).
// Das Modell wird deterministisch erzeugt; Website, Bauanleitung, Materialliste und
// Schichtpläne lesen alle aus derselben Blockliste.

import { BLOCKS, shapeOf, isOpaqueCube } from './blocks.js';

const KX = 128, KZ = 64; // max. Ausdehnung X/Z
const key = (x, y, z) => (y * KZ + z) * KX + x;

class Builder {
  constructor() {
    this.cells = new Map();
    this.step = '1.1';
    this.section = 'plattform';
  }
  at(step, section) {
    this.step = step;
    if (section) this.section = section;
    return this;
  }
  sec(section) { this.section = section; return this; }
  set(x, y, z, type, props) {
    if (!BLOCKS[type]) throw new Error('Unbekannter Block ' + type);
    if (x < 0 || z < 0 || y < 0 || x >= KX || z >= KZ) throw new Error(`Außerhalb: ${x},${y},${z}`);
    this.cells.set(key(x, y, z), { x, y, z, type, props: props || null, step: this.step, section: this.section });
  }
  get(x, y, z) { return this.cells.get(key(x, y, z)); }
  has(x, y, z) { return this.cells.has(key(x, y, z)); }
  del(x, y, z) { this.cells.delete(key(x, y, z)); }
  fill(x0, y0, z0, x1, y1, z1, type, props) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, z, type, props);
  }
  clear(x0, y0, z0, x1, y1, z1) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.del(x, y, z);
  }
  setIfEmpty(x, y, z, type, props) { if (!this.has(x, y, z)) this.set(x, y, z, type, props); }
}

// ---------- Geometrie-Helfer ----------
const inCircle = (x, z, cx, cz, r) => (x - cx) ** 2 + (z - cz) ** 2 <= r * r;
function circleCells(cx, cz, r) {
  const out = [];
  const R = Math.ceil(r) + 1;
  for (let z = Math.floor(cz) - R; z <= Math.ceil(cz) + R; z++)
    for (let x = Math.floor(cx) - R; x <= Math.ceil(cx) + R; x++)
      if (inCircle(x, z, cx, cz, r)) out.push([x, z]);
  return out;
}
function shellCells(cx, cz, r) {
  return circleCells(cx, cz, r).filter(([x, z]) =>
    !inCircle(x - 1, z, cx, cz, r) || !inCircle(x + 1, z, cx, cz, r) ||
    !inCircle(x, z - 1, cx, cz, r) || !inCircle(x, z + 1, cx, cz, r));
}
function annulusCells(cx, cz, r0, r1) {
  return circleCells(cx, cz, r1).filter(([x, z]) => !inCircle(x, z, cx, cz, r0));
}
function rectShell(x0, z0, x1, z1) {
  const out = [];
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++)
    if (x === x0 || x === x1 || z === z0 || z === z1) out.push([x, z]);
  return out;
}
const isCorner = (x, z, x0, z0, x1, z1) => (x === x0 || x === x1) && (z === z0 || z === z1);

// ---------- Hauptmaße ----------
export const LAYOUT = {
  platform: { x0: 0, x1: 73, z0: 0, z1: 48 },
  deckY: 7,
  deck: { x0: 2, x1: 68, z0: 4, z1: 33 },
  hall: { x0: 2, x1: 34, z0: 11, z1: 26 },
  main: { x0: 35, x1: 53, z0: 6, z1: 25 },
  drum: { cx: 60, cz: 10, r: 6.5 },
  tower: { x0: 27, x1: 33, z0: 4, z1: 10 },
  silo: { cx: 6, cz: 30, r: 3.5 },
  runway: { x0: 54, x1: 95, z0: 17, z1: 28, y: 11 },
  portalX: 44,
};

// Dachprofil der Glashalle: Y des obersten Dachblocks je Spalte.
// In X steigt das Dach als Viertel-Sinusbogen von West nach Ost an,
// in Z fällt es zusätzlich zur Südfront hin um bis zu 4 Blöcke ab.
export function hallRoofY(x, z) {
  const H = LAYOUT.hall;
  const tz = Math.min(4, Math.round((H.z1 + 1 - z) * 0.25));
  if (x <= 1) return 15 + tz;
  return Math.round(16 + 9 * Math.sin(((x - 2) / 32) * Math.PI / 2)) + tz;
}

export function buildModel() {
  const B = new Builder();
  const P = LAYOUT.platform;
  const DY = LAYOUT.deckY;
  const SZ = P.z1;      // Südkante
  const EX = P.x1 - 2;  // äußerste begehbare X-Spalte (Gehweg)

  // =====================================================================
  // PHASE 1 – Fundament und Grundplatte
  // =====================================================================
  B.at('1.1', 'plattform');
  for (let z = P.z0; z <= P.z1; z++)
    for (let x = P.x0; x <= P.x1; x++) {
      const edge = x === P.x0 || x === P.x1 || z === P.z0 || z === P.z1;
      if (edge) {
        let t = 'quartz_block';
        if (z === SZ && x >= 22 && Math.floor((x - 22) / 3) % 2 === 0) t = 'yellow_concrete';
        B.set(x, 0, z, t);
      } else B.set(x, 0, z, 'smooth_stone');
    }

  B.at('1.2', 'plattform');
  for (const [x, z] of rectShell(1, 1, P.x1 - 1, SZ - 1)) B.set(x, 1, z, 'quartz_slab', { half: 'bottom' });

  B.at('1.3', 'plattform');
  for (let z = 2; z <= SZ - 2; z++)
    for (let x = 2; x <= EX; x++) {
      const line = x === 2 || x === EX || z === 2 || z === SZ - 2;
      B.set(x, 1, z, line ? 'white_concrete' : 'polished_diorite');
    }

  B.at('1.4', 'plattform');
  for (let x = 22; x <= EX; x++) {
    B.set(x, 1, 40, 'white_concrete');
    for (let z = 41; z <= 45; z++) B.set(x, 1, z, 'gray_concrete');
    if ((x - 22) % 4 < 2) B.set(x, 1, 43, 'yellow_concrete');
  }

  // =====================================================================
  // PHASE 2 – Untere Gebäudestruktur
  // =====================================================================
  const DK = LAYOUT.deck;
  const inDeck = (x, z) => x >= DK.x0 && x <= DK.x1 && z >= DK.z0 && z <= DK.z1;
  const deckEdge = (x, z) => inDeck(x, z) &&
    (!inDeck(x - 1, z) || !inDeck(x + 1, z) || !inDeck(x, z - 1) || !inDeck(x, z + 1));
  const deckCells = [];
  for (let z = DK.z0; z <= DK.z1; z++) for (let x = DK.x0; x <= DK.x1; x++) deckCells.push([x, z]);
  const edgeCells = deckCells.filter(([x, z]) => deckEdge(x, z));
  const nsFace = (x, z) => z === DK.z0 || z === DK.z1;
  const isPilaster = (x, z) => {
    if (isCorner(x, z, DK.x0, DK.z0, DK.x1, DK.z1)) return true;
    return nsFace(x, z) ? x % 5 === 1 : z % 5 === 3;
  };

  // 2.1 Außenwände des Sockelgeschosses
  B.at('2.1', 'sockel');
  for (const [x, z] of edgeCells)
    for (let y = 2; y <= 6; y++) {
      let t = 'white_concrete';
      if (y === 2) t = 'polished_andesite';
      else if (isPilaster(x, z)) t = 'light_gray_concrete';
      B.set(x, y, z, t);
    }

  // 2.2 Innenstützen
  B.at('2.2', 'sockel');
  for (const x of [10, 18, 26, 34, 42, 50, 58, 66])
    for (const z of [12, 20, 28]) B.fill(x, 2, z, x, 6, z, 'polished_andesite');

  // 2.3 Terrassendecke
  B.at('2.3', 'sockel');
  for (const [x, z] of deckCells) B.set(x, DY, z, deckEdge(x, z) ? 'white_concrete' : 'polished_diorite');

  // 2.4 Wände der Glashalle (Giebelwände folgen dem Dachbogen)
  const H = LAYOUT.hall;
  const R = hallRoofY;
  const roofLow = (x, z) => {
    let lo = R(x, z);
    if (x > 1) lo = Math.min(lo, R(x - 1, z) + 1);
    if (z <= H.z1) lo = Math.min(lo, R(x, z + 1) + 1);
    return lo;
  };
  B.at('2.4', 'halle');
  for (let x = H.x0; x <= H.x1; x++)
    for (const z of [H.z0, H.z1])
      for (let y = DY + 1; y <= roofLow(x, z) - 1; y++) B.set(x, y, z, y === DY + 1 ? 'light_gray_concrete' : 'white_concrete');
  for (let z = H.z0; z <= H.z1; z++)
    for (let y = DY + 1; y <= roofLow(H.x0, z) - 1; y++) B.set(H.x0, y, z, y === DY + 1 ? 'light_gray_concrete' : 'white_concrete');

  // 2.5 Forschungsmodul – Sockelkörper
  const M = LAYOUT.main;
  B.at('2.5', 'hauptblock');
  for (let y = 8; y <= 21; y++)
    for (const [x, z] of rectShell(M.x0, M.z0, M.x1, M.z1)) {
      let t = 'white_concrete';
      if (isCorner(x, z, M.x0, M.z0, M.x1, M.z1) || y === 8 || y === 21) t = 'light_gray_concrete';
      B.set(x, y, z, t);
    }

  // 2.6 Ringmodul – Trommel (unterer Teil)
  const D = LAYOUT.drum;
  const stripe = (x, z) => {
    const a = Math.atan2(z - D.cz, x - D.cx);
    return Math.floor(((a + Math.PI) / (2 * Math.PI)) * 16 + 0.5) % 4 === 0;
  };
  const drumShell = shellCells(D.cx, D.cz, D.r);
  B.at('2.6', 'ring');
  for (let y = 8; y <= 16; y++)
    for (const [x, z] of drumShell) {
      let t = 'white_concrete';
      if (y === 8 || (y >= 12 && stripe(x, z))) t = 'light_gray_concrete';
      B.set(x, y, z, t);
    }
  B.clear(D.cx - 1, 8, D.cz + 6, D.cx + 1, 10, D.cz + 6); // Durchgang zum Servicegeschoss

  // 2.7 Kommunikationsturm – Schaft
  const T = LAYOUT.tower;
  const TX = (T.x0 + T.x1) / 2, TZ = (T.z0 + T.z1) / 2; // Turmachse
  B.at('2.7', 'turm');
  for (let y = 8; y <= 30; y++)
    for (const [x, z] of rectShell(T.x0, T.z0, T.x1, T.z1)) {
      let t = 'white_concrete';
      if (isCorner(x, z, T.x0, T.z0, T.x1, T.z1) || y % 6 === 2) t = 'light_gray_concrete';
      B.set(x, y, z, t);
    }

  // 2.8 Silo-Zylinder mit Farbringen
  const S = LAYOUT.silo;
  const siloShell = shellCells(S.cx, S.cz, S.r);
  const siloBand = { 8: 'black_concrete', 11: 'yellow_terracotta', 12: 'black_concrete', 13: 'yellow_terracotta', 18: 'black_concrete' };
  B.at('2.8', 'silo');
  for (let y = 8; y <= 20; y++)
    for (const [x, z] of siloShell) B.set(x, y, z, siloBand[y] || 'white_concrete');

  // =====================================================================
  // PHASE 6.1 (vorgezogen, damit Turm und Fassaden das Dach überschreiben) – Bogendach
  // =====================================================================
  B.at('6.1', 'halle');
  const skyA = [13, 14, 15], skyB = [20, 21, 22];
  for (let x = 1; x <= H.x1; x++) {
    for (let z = H.z0 - 1; z <= H.z1 + 1; z++) {
      if (z === H.z1 + 1 && x <= 10) continue;               // Silo: kein Südüberstand
      if (z === H.z0 - 1 && x >= T.x0 && x <= T.x1) continue; // hier steht der Turm
      const lo = roofLow(x, z), top = R(x, z);
      for (let y = lo; y <= top; y++) {
        let t = 'quartz_block';
        const inner = x >= 4 && x <= H.x1 - 2 && y === top;
        if (inner && (skyA.includes(z) || skyB.includes(z))) t = 'light_blue_stained_glass';
        else if (inner && (z === 16 || z === 23)) t = 'gray_concrete';
        B.set(x, y, z, t);
      }
      if (x < H.x1 && R(x + 1, z) > top) B.set(x, top + 1, z, 'quartz_stairs', { facing: 'e', half: 'bottom' });
      else if (z > H.z0 - 1 && R(x, z - 1) > top) B.set(x, top + 1, z, 'quartz_stairs', { facing: 'n', half: 'bottom' });
      if ((z === H.z0 - 1 || z === H.z1 + 1) && x >= 2) B.set(x, lo - 1, z, 'white_concrete'); // Traufkante
    }
  }

  // =====================================================================
  // PHASE 3 – Haupteingang und Hauptfassade
  // =====================================================================
  const PX = LAYOUT.portalX;
  const O = [
    { w: 6, yt: 21, c: 4 },
    { w: 5, yt: 20, c: 4 },
    { w: 4, yt: 19, c: 3 },
    { w: 3, yt: 18, c: 3 },
    { w: 2, yt: 16, c: 2 },
  ];
  const inO = (k, x, y) => {
    const o = O[k];
    const dx = Math.abs(x - PX);
    return dx <= o.w && y >= 8 && y <= o.yt && dx + y <= o.w + o.yt - o.c;
  };
  const nearO = (k, x, y, d) => {
    for (let yy = y - d; yy <= y + d; yy++) for (let xx = x - d; xx <= x + d; xx++) if (inO(k, xx, yy)) return true;
    return false;
  };
  const PXa = PX - 8, PXb = PX + 8;
  // 3.1 Hangar-Portal mit gestuftem Trichter
  B.at('3.1', 'portal');
  for (let y = 8; y <= 22; y++)
    for (let x = PXa; x <= PXb; x++) {
      if (inO(0, x, y)) { B.del(x, y, 25); B.del(x, y, 26); }
      else if (nearO(0, x, y, 1)) {
        const side = Math.abs(x - PX) === O[0].w + 1 && y <= 11;
        B.set(x, y, 26, side ? (y % 2 === 0 ? 'yellow_concrete' : 'black_concrete') : 'light_gray_concrete');
      }
    }
  const ringMat = ['deepslate_tiles', 'polished_deepslate', 'deepslate_tiles', 'polished_deepslate'];
  for (let k = 1; k <= 4; k++) {
    const z = 26 - k;
    for (let y = 8; y <= 21; y++)
      for (let x = PXa; x <= PXb; x++) {
        const ring = k === 1 ? inO(0, x, y) && !inO(1, x, y) : nearO(k - 1, x, y, 2) && !inO(k, x, y);
        if (ring) B.set(x, y, z, ringMat[k - 1]);
        else if (inO(k, x, y)) B.del(x, y, z);
      }
  }
  for (let y = 8; y <= 21; y++)
    for (let x = PXa; x <= PXb; x++)
      if (nearO(4, x, y, 2)) B.set(x, y, 21, inO(4, x, y) ? 'tinted_glass' : 'black_concrete');
  for (let z = 21; z <= 26; z++) for (let x = PX - O[0].w; x <= PX + O[0].w; x++) B.set(x, DY, z, 'polished_deepslate');

  // 3.2 Vorplatz und Datenkern
  B.at('3.2', 'portal');
  for (let z = 27; z <= 32; z++)
    for (let x = PXa; x <= PXb; x++) {
      const border = x === PXa || x === PXb || z === 32;
      if (border) B.set(x, DY, z, 'light_gray_concrete');
      else if (Math.abs(x - PX) <= 1) B.set(x, DY, z, 'white_concrete');
    }
  const CX = PX - 4, CZ = 29; // Datenkern
  B.fill(CX - 1, 8, CZ - 1, CX + 1, 8, CZ + 1, 'polished_deepslate');
  B.set(CX, 9, CZ, 'blue_concrete');
  const plus = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dz] of plus) B.set(CX + dx, 9, CZ + dz, 'deepslate_tiles');
  for (let y = 10; y <= 13; y++) {
    B.set(CX, y, CZ, 'blue_concrete');
    if (y <= 12) for (const [dx, dz] of plus) B.set(CX + dx, y, CZ + dz, 'light_blue_stained_glass');
  }
  B.set(CX, 14, CZ, 'sea_lantern');
  B.set(CX, 15, CZ, 'end_rod', { axis: 'y' });

  // 3.3 Hangartor zur Landebahn (Ostfassade des Hauptblocks)
  const RW = LAYOUT.runway;
  B.at('3.3', 'hauptblock');
  B.clear(M.x1, RW.y + 1, 19, M.x1, RW.y + 6, 24);
  B.fill(M.x1 - 1, RW.y + 1, 19, M.x1 - 1, RW.y + 6, 24, 'tinted_glass');
  for (let y = RW.y + 1; y <= RW.y + 7; y++) { B.set(M.x1 + 1, y, 18, 'light_gray_concrete'); B.set(M.x1 + 1, y, 25, 'light_gray_concrete'); }
  for (let z = 18; z <= 25; z++) B.set(M.x1 + 1, RW.y + 7, z, 'light_gray_concrete');

  // 3.4 Fassadengliederung (Hallenfront, Vordach, Lisenen)
  const ENT = 27; // Achse Halleneingang
  B.at('3.4', 'halle');
  for (let y = 9; y <= roofLow(2, H.z1) - 1; y++) B.set(2, y, H.z1, 'quartz_pillar');
  for (let y = 9; y <= roofLow(2, H.z0) - 1; y++) B.set(2, y, H.z0, 'quartz_pillar');
  for (let x = 3; x <= 20; x++) B.set(x, 13, H.z1, 'light_gray_concrete');
  for (let x = ENT - 3; x <= ENT + 4; x++) for (let z = 27; z <= 28; z++) B.set(x, 13, z, 'quartz_slab', { half: 'top' });
  for (let x = ENT - 3; x <= ENT + 4; x++) B.set(x, 13, 29, 'yellow_terracotta');
  for (const x of [ENT - 3, ENT + 4]) for (let y = 8; y <= 12; y++) B.set(x, y, 29, 'quartz_pillar');
  B.sec('hauptblock');
  for (const x of [M.x0 + 1, M.x1 - 1]) for (let y = 9; y <= 20; y++) B.set(x, y, M.z1, 'quartz_pillar');

  // 3.5 Freitreppe
  B.at('3.5', 'treppe');
  const STAIR = [[34, 'land', 7], [35, 'stair', 6], [36, 'stair', 5], [37, 'stair', 4], [38, 'land', 3], [39, 'land', 3], [40, 'stair', 2], [41, 'stair', 1]];
  for (const [z, kind, y] of STAIR)
    for (let x = 3; x <= 19; x++) {
      for (let yy = 2; yy < y; yy++) B.set(x, yy, z, 'polished_andesite');
      if (kind === 'land') B.set(x, y, z, 'polished_andesite');
      else B.set(x, y, z, 'polished_andesite_stairs', { facing: 'n', half: 'bottom' });
    }

  // 3.6 Treppenwangen und Glasbrüstung
  B.at('3.6', 'treppe');
  for (const [z, kind, y] of STAIR) {
    for (const x of [2, 20]) {
      for (let yy = 2; yy <= y; yy++) B.set(x, yy, z, 'white_concrete');
      if (z > 34) B.set(x, y + 1, z, 'cyan_stained_glass_pane');
    }
    if (kind === 'stair') B.set(11, y + 1, z, 'cyan_stained_glass_pane');
  }

  // 3.7 Lagertore Ostseite
  B.at('3.7', 'sockel');
  const GATES = [[19, 22], [27, 30]];
  for (const [z0, z1] of GATES) {
    for (let z = z0; z <= z1; z++) {
      for (let y = 2; y <= 4; y++) B.set(DK.x1, y, z, 'iron_trapdoor', { open: 'e' });
      B.set(DK.x1, 5, z, 'black_concrete');
    }
    for (let y = 2; y <= 5; y++) { B.set(DK.x1, y, z0 - 1, 'black_concrete'); B.set(DK.x1, y, z1 + 1, 'black_concrete'); }
  }

  // =====================================================================
  // PHASE 4 – Obere Forschungsbereiche
  // =====================================================================
  const MT = 34; // Oberkante Wände Forschungsmodul
  const LIS = [M.x0 + 5, M.x1 - 5]; // Lisenen
  B.at('4.1', 'hauptblock');
  for (let z = M.z0 - 1; z <= M.z1 + 1; z++) for (let x = M.x0; x <= M.x1; x++) B.set(x, 22, z, 'light_gray_concrete');
  for (let y = 23; y <= 25; y++)
    for (const [x, z] of rectShell(M.x0, M.z0 - 1, M.x1, M.z1 + 1))
      B.set(x, y, z, y === 25 && isCorner(x, z, M.x0, M.z0 - 1, M.x1, M.z1 + 1) ? 'light_gray_concrete' : 'white_concrete');

  B.at('4.2', 'hauptblock');
  for (let y = 26; y <= MT; y++)
    for (const [x, z] of rectShell(M.x0, M.z0, M.x1, M.z1)) {
      let t = 'white_concrete';
      if (isCorner(x, z, M.x0, M.z0, M.x1, M.z1) || y === 26) t = 'light_gray_concrete';
      else if ((z === M.z1 || z === M.z0) && LIS.includes(x)) t = 'light_gray_concrete';
      B.set(x, y, z, t);
    }

  const DT = 36; // Oberkante Trommel
  B.at('4.3', 'ring');
  for (let y = 17; y <= DT; y++)
    for (const [x, z] of drumShell) {
      let t = 'white_concrete';
      if (y === 17 || y === DT || (y <= 32 && stripe(x, z))) t = 'light_gray_concrete';
      B.set(x, y, z, t);
    }

  const HD = { x0: T.x0 - 1, x1: T.x1 + 1, z0: T.z0 - 1, z1: T.z1 + 1 }; // Turmkopf
  const TH = 31; // Boden Turmkopf
  B.at('4.4', 'turm');
  for (let z = HD.z0; z <= HD.z1; z++) for (let x = HD.x0; x <= HD.x1; x++) { B.set(x, TH, z, 'light_gray_concrete'); B.set(x, TH + 3, z, 'white_concrete'); }
  for (let y = TH + 1; y <= TH + 2; y++)
    for (const [x, z] of rectShell(HD.x0, HD.z0, HD.x1, HD.z1)) B.set(x, y, z, 'white_concrete');
  for (const [x, z] of rectShell(HD.x0, HD.z0, HD.x1, HD.z1)) B.set(x, TH + 4, z, 'quartz_slab', { half: 'bottom' });

  // =====================================================================
  // PHASE 5 – Fenster und Beleuchtung
  // =====================================================================
  // 5.1 Atrium-Glasfassade
  const ATR = [21, H.x1 - 1];
  B.at('5.1', 'halle');
  for (let x = ATR[0]; x <= ATR[1]; x++) {
    const top = roofLow(x, H.z1) - 1;
    for (let y = 9; y <= top; y++) {
      const mull = (x - ATR[0]) % 4 === 0 || y === 17 || y === 22;
      let t;
      if (y <= 11) t = Math.abs(x - ENT) <= 1 ? 'tinted_glass' : 'white_concrete';
      else if (y === 12) t = 'white_concrete';
      else if (y === 13) t = 'cyan_stained_glass';
      else t = mull ? 'white_concrete' : 'light_blue_stained_glass';
      B.set(x, y, H.z1, t);
    }
  }
  // 5.2 Hallenfenster
  B.at('5.2', 'halle');
  for (const [a, b] of [[4, 5], [8, 9], [12, 13], [16, 17]]) {
    const top = roofLow(a, H.z1) - 3;
    for (let x = a; x <= b; x++) {
      B.set(x, 9, H.z1, 'black_concrete');
      for (let y = 10; y <= top; y++) if (y !== 13) B.set(x, y, H.z1, 'tinted_glass');
      B.set(x, top + 1, H.z1, 'black_concrete');
    }
  }
  for (const x of [5, 9, 13, 17, 21]) for (let y = 10; y <= 14; y++) B.set(x, y, H.z0, 'tinted_glass');
  for (let z = 17; z <= 20; z++) for (let y = 12; y <= 15; y++) {
    const corner = (z === 17 || z === 20) && (y === 12 || y === 15);
    const inner = z >= 18 && z <= 19 && y >= 13 && y <= 14;
    if (inner) B.set(2, y, z, 'tinted_glass');
    else if (!corner) B.set(2, y, z, 'yellow_terracotta');
  }
  for (const z of [13, 24]) for (let y = 10; y <= 14; y++) B.set(2, y, z, 'tinted_glass');

  // 5.3 Fenster Forschungsmodul
  B.at('5.3', 'hauptblock');
  for (let y = 23; y <= 24; y++)
    for (const [x, z] of rectShell(M.x0, M.z0 - 1, M.x1, M.z1 + 1)) {
      if (isCorner(x, z, M.x0, M.z0 - 1, M.x1, M.z1 + 1)) continue;
      const post = (z === M.z0 - 1 || z === M.z1 + 1) ? x % 5 === 2 : z % 5 === 0;
      if (!post) B.set(x, y, z, 'tinted_glass');
    }
  const bigWin = []; for (let x = M.x0 + 1; x <= LIS[0] + 3; x++) if (x !== LIS[0]) bigWin.push(x);
  const smallS = [LIS[1] - 3, LIS[1] - 2, LIS[1] - 1, LIS[1] + 1, LIS[1] + 2, LIS[1] + 3];
  const smallN = []; for (let x = M.x0 + 2; x <= M.x1 - 2; x++) if ((x - M.x0) % 4 !== 1) smallN.push(x);
  for (let y = 28; y <= 32; y++) {
    for (const x of bigWin) B.set(x, y, M.z1, 'light_blue_stained_glass');
    if (y >= 29 && y <= 31) {
      for (const x of smallS) B.set(x, y, M.z1, 'cyan_stained_glass_pane');
      for (const x of smallN) B.set(x, y, M.z0, 'cyan_stained_glass_pane');
      for (const z of [8, 9, 10, 12, 13, 14, 16, 17, 18, 20, 21, 22]) B.set(M.x1, y, z, 'cyan_stained_glass_pane');
    }
  }
  for (const a of [M.x0 + 2, M.x0 + 8, M.x0 + 14])
    for (let x = a; x <= a + 2; x++) for (const y of [11, 12, 16, 17]) B.set(x, y, M.z0, 'cyan_stained_glass_pane');

  // 5.4 Fenster Sockelgeschoss
  const KIOSK = { x0: 50, x1: 55, z0: 35, z1: 39 };
  const DOOR = [37, 38];
  B.at('5.4', 'sockel');
  for (const [x, z] of edgeCells) {
    if (isPilaster(x, z)) continue;
    if (z === DK.z1 && x <= 20) continue;                                     // hinter der Treppe
    if (z === DK.z1 && x >= KIOSK.x0 - 1 && x <= KIOSK.x1 + 1) continue;      // hinter dem Wachhaus
    if (x === DK.x1 && GATES.some(([a, b]) => z >= a - 1 && z <= b + 1)) continue; // Tore
    const south = z === DK.z1;
    const bay = nsFace(x, z) ? (x % 5 === 3 || x % 5 === 4) : (z % 5 === 0 || z % 5 === 1);
    if (!(south || bay)) continue;
    for (let y = 3; y <= 5; y++) B.set(x, y, z, 'cyan_stained_glass_pane');
  }
  for (let y = 2; y <= 3; y++) for (const x of DOOR) B.set(x, y, DK.z1, 'tinted_glass');

  // 5.5 Fensterband Ringmodul, Turmschaft und Turmkopf
  B.at('5.5', 'ring');
  for (let y = 26; y <= 28; y++) for (const [x, z] of drumShell) if (!stripe(x, z)) B.set(x, y, z, 'light_blue_stained_glass');
  B.sec('turm');
  for (let y = TH + 1; y <= TH + 2; y++)
    for (const [x, z] of rectShell(HD.x0, HD.z0, HD.x1, HD.z1)) {
      const post = isCorner(x, z, HD.x0, HD.z0, HD.x1, HD.z1) || x === TX || z === TZ;
      if (!post) B.set(x, y, z, 'light_blue_stained_glass');
    }
  for (const y0 of [12, 18, 24]) for (let y = y0; y <= y0 + 1; y++) for (let i = -1; i <= 1; i++) {
    B.set(TX + i, y, T.z0, 'light_blue_stained_glass');
    B.set(T.x0, y, TZ + i, 'light_blue_stained_glass');
  }

  // 5.6 Beleuchtung
  B.at('5.6', 'sockel');
  for (const x of [24, 28, 33]) B.set(x, DY, DK.z1, 'sea_lantern');
  B.set(2, 3, 38, 'sea_lantern'); B.set(20, 3, 38, 'sea_lantern');
  B.sec('portal');
  for (let k = 1; k <= 4; k++) B.set(PX, O[k - 1].yt, 26 - k, 'sea_lantern');
  for (let z = 22; z <= 31; z++) B.set(PX, DY, z, 'sea_lantern');
  B.sec('hauptblock');
  for (const [x, z] of [[M.x0, 26], [M.x1, 26], [M.x0 + 4, 5], [PX, 5], [M.x1 - 4, 5]]) { B.set(x, 21, z, 'chain'); B.set(x, 20, z, 'sea_lantern'); }
  B.sec('halle');
  for (const [x, z] of [[24, 15], [30, 15], [24, 22], [30, 22]]) {
    const top = R(x, z) - 1;
    for (let y = top; y >= top - 3; y--) B.set(x, y, z, 'chain');
    B.set(x, top - 4, z, 'sea_lantern');
  }
  B.sec('ring');
  for (const [x, z] of drumShell) if (stripe(x, z)) B.set(x, DT - 1, z, 'sea_lantern');

  // =====================================================================
  // PHASE 6 – Dach und Antennen (6.1 Bogendach siehe oben)
  // =====================================================================
  const RF = MT + 1; // Dachplatte Forschungsmodul
  const PH = { x0: M.x0 + 1, x1: M.x0 + 11, z0: 7, z1: 15 }; // Technikgeschoss
  B.at('6.2', 'hauptblock');
  for (let z = M.z0 - 1; z <= M.z1 + 1; z++)
    for (let x = M.x0; x <= M.x1; x++) B.set(x, RF, z, 'white_concrete');
  for (const [x, z] of rectShell(M.x0, M.z0 - 1, M.x1, M.z1 + 1)) B.set(x, RF + 1, z, 'quartz_slab', { half: 'bottom' });
  for (let y = RF + 1; y <= RF + 2; y++)
    for (const [x, z] of rectShell(PH.x0, PH.z0, PH.x1, PH.z1)) B.set(x, y, z, y === RF + 1 ? 'light_gray_concrete' : 'white_concrete');
  for (let z = PH.z0; z <= PH.z1; z++) for (let x = PH.x0; x <= PH.x1; x++) B.set(x, RF + 3, z, 'white_concrete');
  for (let z = 10; z <= 11; z++) for (let x = PH.x0 + 2; x <= PH.x1 - 2; x++) B.set(x, RF + 3, z, 'black_concrete');
  for (let z = 19; z <= 21; z++) for (let x = M.x1 - 6; x <= M.x1 - 2; x++) B.set(x, RF, z, 'black_concrete');

  B.at('6.3', 'ring');
  const HY = DT + 1; // Ebene Ringdach / Halo
  for (const [x, z] of circleCells(D.cx, D.cz, D.r)) B.set(x, HY, z, 'white_concrete');
  for (const [x, z] of annulusCells(D.cx, D.cz, D.r, 8.5)) B.set(x, HY, z, 'yellow_concrete');
  for (const [x, z] of annulusCells(D.cx, D.cz, 7.5, 8.5)) { B.set(x, HY + 1, z, 'yellow_stained_glass'); B.set(x, HY + 2, z, 'yellow_concrete'); }
  for (const [dx, dz] of [[7, 0], [-7, 0], [0, 7], [0, -7], [5, 5], [-5, 5], [5, -5], [-5, -5]]) B.set(D.cx + dx, HY - 1, D.cz + dz, 'iron_bars');
  B.set(D.cx, HY + 1, D.cz, 'iron_bars'); B.set(D.cx, HY + 2, D.cz, 'iron_bars'); B.set(D.cx, HY + 3, D.cz, 'end_rod', { axis: 'y' });

  B.at('6.4', 'turm');
  for (let y = 35; y <= 43; y++)
    for (let z = TZ - 1; z <= TZ + 1; z++) for (let x = TX - 1; x <= TX + 1; x++)
      B.set(x, y, z, y === 37 || y === 40 || y === 43 ? 'light_gray_concrete' : 'white_concrete');
  B.set(TX - 1, 38, TZ + 1, 'tinted_glass'); B.set(TX + 1, 38, TZ + 1, 'tinted_glass');
  for (let y = 44; y <= 47; y++) B.set(TX, y, TZ, 'iron_block');
  for (let y = 48; y <= 53; y++) B.set(TX, y, TZ, 'iron_bars');
  B.set(TX, 54, TZ, 'end_rod', { axis: 'y' }); B.set(TX, 55, TZ, 'end_rod', { axis: 'y' });
  B.set(TX, 56, TZ, 'lightning_rod', { axis: 'y' }); B.set(TX, 57, TZ, 'lightning_rod', { axis: 'y' });
  for (const dx of [-2, -1, 1, 2]) B.set(TX + dx, 46, TZ, 'iron_bars');
  B.set(TX - 3, 46, TZ, 'end_rod', { axis: 'x' }); B.set(TX + 3, 46, TZ, 'end_rod', { axis: 'x' });
  for (const dz of [-2, -1, 1, 2]) B.set(TX, 50, TZ + dz, 'iron_bars');
  B.set(TX, 49, TZ - 2, 'chain'); B.set(TX, 49, TZ + 2, 'chain');
  B.set(TX + 2, 41, TZ, 'yellow_terracotta'); B.set(TX + 3, 41, TZ, 'end_rod', { axis: 'x' });

  B.at('6.5', 'turm');
  for (let i = 0; i <= 9; i++) {
    const y = 36 + i;
    const xs = TX - 5 - Math.floor(i / 4);
    for (let j = 0; j <= 3; j++) {
      const border = i === 0 || i === 9 || j === 0 || j === 3;
      B.set(xs + j, y, TZ, border ? 'yellow_terracotta' : 'lime_stained_glass');
    }
    if (i === 2 || i === 7) for (let x = xs + 4; x <= TX - 2; x++) B.set(x, y, TZ, 'iron_bars');
  }

  B.at('6.6', 'silo');
  for (const [x, z] of circleCells(S.cx, S.cz, S.r)) B.set(x, 21, z, 'light_blue_stained_glass');
  for (const [x, z] of siloShell) B.set(x, 21, z, 'yellow_terracotta');
  for (const [x, z] of circleCells(S.cx, S.cz, 1.5)) B.set(x, 22, z, 'yellow_terracotta');
  B.set(S.cx, 22, S.cz, 'sea_lantern');

  B.at('6.7', 'hauptblock');
  const AX = M.x1 - 2;
  for (let y = RF + 1; y <= RF + 3; y++) B.set(AX, y, 10, 'iron_bars');
  B.set(AX, RF + 4, 10, 'end_rod', { axis: 'y' });
  B.set(AX, RF + 5, 10, 'lightning_rod', { axis: 'y' }); B.set(AX, RF + 6, 10, 'lightning_rod', { axis: 'y' });
  for (const [x, z] of [[M.x0, M.z0 - 1], [M.x1, M.z0 - 1], [M.x0, M.z1 + 1], [M.x1, M.z1 + 1]]) B.set(x, RF + 2, z, 'end_rod', { axis: 'y' });

  // =====================================================================
  // PHASE 7 – Maschinen und technische Details
  // =====================================================================
  const KX0 = D.cx + 7; // Kranschulter
  B.at('7.1', 'kran');
  for (let y = 29; y <= 33; y++)
    for (let z = 8; z <= 12; z++) for (let x = KX0; x <= KX0 + 3; x++)
      B.set(x, y, z, y === 30 ? 'yellow_concrete' : 'white_concrete');
  B.set(KX0 + 3, 31, 10, 'iron_block'); B.set(KX0 + 3, 32, 10, 'iron_block');
  const UP = [[4, 32], [5, 32], [6, 32], [7, 31], [8, 31], [9, 30], [10, 30], [11, 29]];
  for (const [dx, yt] of UP)
    for (const z of [10, 11]) {
      const x = KX0 + dx;
      B.set(x, yt, z, 'white_concrete');
      B.set(x, yt - 1, z, dx % 3 === 0 ? 'yellow_concrete' : 'light_gray_concrete');
    }
  const EL = KX0 + 12; // Ellbogen
  B.fill(EL, 26, 9, EL + 1, 29, 12, 'yellow_concrete');
  B.fill(EL, 27, 10, EL + 1, 28, 11, 'iron_block');
  for (const [y, z] of [[25, 13], [24, 14], [23, 15], [22, 16], [21, 17]])
    for (const x of [EL, EL + 1]) {
      B.set(x, y, z, 'white_concrete');
      B.set(x, y + 1, z, 'light_gray_concrete');
    }
  B.set(EL, 20, 18, 'iron_block'); B.set(EL + 1, 20, 18, 'iron_block');
  for (let z = 17; z <= 19; z++) for (let x = EL - 1; x <= EL + 2; x++) B.set(x, 19, z, (x === EL - 1 || x === EL + 2) ? 'yellow_concrete' : 'white_concrete');
  for (const [x, z] of [[EL - 1, 17], [EL + 2, 17], [EL - 1, 19], [EL + 2, 19]]) { B.set(x, 18, z, 'iron_bars'); B.set(x, 17, z, 'iron_bars'); }
  B.set(EL, 18, 18, 'chain'); B.set(EL + 1, 18, 18, 'chain');
  B.set(EL, 17, 18, 'iron_trapdoor', { half: 'top' }); B.set(EL + 1, 17, 18, 'iron_trapdoor', { half: 'top' });
  for (let x = EL + 2; x <= EL + 6; x++) B.set(x, 28, 10, 'iron_bars');
  B.set(EL + 7, 28, 10, 'iron_block'); B.set(EL + 7, 27, 10, 'lime_stained_glass'); B.set(EL + 7, 26, 10, 'end_rod', { axis: 'y' });

  B.at('7.2', 'technik');
  for (let x = T.x1 + 1; x <= D.cx - 5; x++) B.set(x, 15, 5, x % 6 === 1 ? 'iron_block' : 'light_gray_concrete');
  for (const x of [M.x0 + 1, M.x0 + 13]) for (let y = 8; y <= 14; y++) B.set(x, y, 5, 'iron_bars');
  for (let x = 3; x <= T.x0 - 1; x++) B.set(x, 10, 10, x % 5 === 2 ? 'iron_block' : 'light_gray_concrete');
  const AC = [4, 9, 14, 19];
  for (const x of AC) B.set(x + 1, 10, 9, 'light_gray_concrete');

  B.at('7.3', 'technik');
  for (const [x0, z0] of [[M.x1 - 5, 7], [M.x1 - 5, 13], [M.x0 + 2, 19], [M.x0 + 7, 19]])
    for (let z = z0; z <= z0 + 1; z++) for (let x = x0; x <= x0 + 1; x++) {
      B.set(x, RF + 1, z, 'light_gray_concrete');
      B.set(x, RF + 2, z, 'iron_trapdoor', { half: 'bottom' });
    }

  B.at('7.4', 'technik');
  for (const x0 of AC)
    for (let z = 6; z <= 8; z++) for (let x = x0; x <= x0 + 2; x++) {
      B.set(x, 8, z, 'light_gray_concrete');
      B.set(x, 9, z, z === 6 ? 'iron_bars' : 'light_gray_concrete');
      B.set(x, 10, z, 'iron_trapdoor', { half: 'bottom' });
    }

  const KB = { x0: ENT - 3, x1: ENT + 3, z0: 30, z1: 32 };
  B.at('7.5', 'kabine');
  for (let z = KB.z0; z <= KB.z1; z++) for (let x = KB.x0; x <= KB.x1; x++) B.set(x, 8, z, 'light_gray_concrete');
  for (const [x, z] of rectShell(KB.x0, KB.z0, KB.x1, KB.z1)) {
    const c = isCorner(x, z, KB.x0, KB.z0, KB.x1, KB.z1);
    B.set(x, 9, z, c ? 'light_gray_concrete' : 'white_concrete');
    for (let y = 10; y <= 11; y++) B.set(x, y, z, c ? 'white_concrete' : 'cyan_stained_glass');
    B.set(x, 12, z, 'yellow_terracotta');
  }
  for (let x = KB.x0 + 1; x <= KB.x1 - 1; x++) { B.set(x, 12, 31, 'quartz_slab', { half: 'bottom' }); B.set(x, 9, 31, 'black_concrete'); }
  B.set(ENT, 10, 31, 'sea_lantern');

  // =====================================================================
  // PHASE 8 – Seitlicher Landeplatz
  // =====================================================================
  const RY = RW.y;
  B.at('8.1', 'landebahn');
  for (const px of [70, 78, 86, 94])
    for (const pz of [17, 27])
      for (let x = px; x <= px + 1; x++) for (let z = pz; z <= pz + 1; z++) {
        const y0 = x <= P.x1 - 1 ? 2 : 0;
        for (let y = y0; y <= RY - 3; y++) B.set(x, y, z, y <= y0 ? 'polished_andesite' : 'light_gray_concrete');
      }

  B.at('8.2', 'landebahn');
  for (let x = RW.x0; x <= DK.x1; x++) {
    for (let y = 8; y <= RY - 2; y++) {
      if ((x - RW.x0) % 4 === 0) B.set(x, y, 28, 'light_gray_concrete');
      if (Math.abs(x - D.cx) > 1) B.set(x, y, 17, 'white_concrete');
    }
    B.set(x, RY - 1, 28, 'black_concrete'); B.set(x, RY - 1, 17, 'black_concrete');
  }
  for (let z = 18; z <= 27; z++) for (let y = 8; y <= RY - 1; y++) B.set(DK.x1, y, z, y === RY - 1 ? 'black_concrete' : 'white_concrete');
  for (let z = 26; z <= 27; z++) for (let y = 8; y <= RY - 1; y++) B.set(RW.x0, y, z, 'white_concrete');

  B.at('8.3', 'landebahn');
  for (let z = RW.z0; z <= RW.z1; z++)
    for (let x = RW.x0; x <= RW.x1; x++) {
      const border = z === RW.z0 || z === RW.z1 || x === RW.x1;
      B.set(x, RY, z, border ? 'light_gray_concrete' : 'gray_concrete');
    }

  B.at('8.4', 'landebahn');
  for (let x = RW.x0 + 4; x <= RW.x1 - 4; x++) if ((x - RW.x0 - 4) % 6 < 3) { B.set(x, RY, 22, 'white_concrete'); B.set(x, RY, 23, 'white_concrete'); }
  for (const x of [RW.x0 + 2, RW.x0 + 3, RW.x1 - 3, RW.x1 - 2]) for (const z of [19, 20, 25, 26]) B.set(x, RY, z, 'white_concrete');
  for (let z = RW.z0; z <= RW.z1; z++) B.set(RW.x0, RY, z, z % 2 === 0 ? 'yellow_concrete' : 'black_concrete');

  B.at('8.5', 'landebahn');
  for (let x = RW.x0 + 4; x <= RW.x1 - 3; x += 4) { B.set(x, RY, RW.z0, 'sea_lantern'); B.set(x, RY, RW.z1, 'sea_lantern'); }
  for (let z = RW.z0 + 1; z <= RW.z1 - 1; z++) B.set(RW.x1, RY, z, z % 3 === 0 ? 'sea_lantern' : 'red_concrete');
  for (let x = DK.x1 + 1; x <= RW.x1; x++)
    for (const z of [RW.z0, RW.z1]) { B.set(x, RY - 1, z, 'black_concrete'); B.set(x, RY - 2, z, 'gray_concrete'); }
  for (let z = RW.z0; z <= RW.z1; z++) { B.set(RW.x1, RY - 1, z, 'black_concrete'); B.set(RW.x1, RY - 2, z, 'gray_concrete'); }
  for (const z of [18, 21, 24, 27]) B.set(RW.x1, RY + 1, z, 'end_rod', { axis: 'y' });

  // =====================================================================
  // PHASE 9 – Dekoration und finale Details
  // =====================================================================
  const K = KIOSK;
  B.at('9.3', 'wache');
  for (const [x, z] of rectShell(K.x0, K.z0, K.x1, K.z1)) {
    B.set(x, 2, z, 'yellow_terracotta');
    for (let y = 3; y <= 7; y++) B.set(x, y, z, isCorner(x, z, K.x0, K.z0, K.x1, K.z1) ? 'quartz_pillar' : 'white_concrete');
  }
  for (let y = 4; y <= 6; y++) {
    for (let x = K.x0 + 1; x <= K.x1 - 1; x++) B.set(x, y, K.z1, 'tinted_glass');
    for (let z = K.z0 + 1; z <= K.z1 - 1; z++) B.set(K.x1, y, z, 'tinted_glass');
  }
  B.clear(K.x0, 3, 37, K.x0, 4, 38);
  for (let z = K.z0; z <= K.z1; z++) for (let x = K.x0; x <= K.x1; x++) B.set(x, 8, z, 'white_concrete');
  for (const [x, z] of rectShell(K.x0, K.z0, K.x1, K.z1)) {
    const c = isCorner(x, z, K.x0, K.z0, K.x1, K.z1);
    B.set(x, 9, z, c ? 'yellow_concrete' : 'quartz_slab', c ? null : { half: 'bottom' });
  }
  B.set(K.x0 + 2, 9, K.z0 + 2, 'end_rod', { axis: 'y' });

  B.at('9.4', 'fracht');
  for (const x0 of [53, 58, 63]) {
    for (const [x, z] of rectShell(x0, 30, x0 + 3, 32)) B.set(x, 10, z, 'yellow_concrete');
    for (const [x, z] of [[x0, 30], [x0 + 3, 30], [x0, 32], [x0 + 3, 32]]) { B.set(x, 8, z, 'chain'); B.set(x, 9, z, 'chain'); }
    B.set(x0 + 1, 10, 31, 'black_concrete'); B.set(x0 + 2, 10, 31, 'black_concrete');
  }
  B.set(50, 8, 31, 'black_concrete'); B.set(51, 8, 31, 'black_concrete');
  B.set(50, 9, 31, 'yellow_concrete'); B.set(51, 9, 31, 'yellow_concrete');
  B.set(51, 10, 31, 'iron_trapdoor', { half: 'bottom' });
  for (let x = 47; x <= 49; x++) for (let z = 29; z <= 30; z++) { B.set(x, 8, z, 'cyan_stained_glass'); B.set(x, 9, z, 'quartz_slab', { half: 'bottom' }); }

  B.at('9.5', 'sockel');
  for (const [x, y, z] of [[43, 2, 35], [44, 2, 35], [45, 2, 35], [44, 3, 35], [45, 2, 36], [46, 2, 35], [41, 2, 36], [33, 2, 35], [34, 2, 35], [34, 3, 35], [25, 2, 35], [26, 2, 35]])
    B.set(x, y, z, 'barrel');

  B.at('9.7', 'fracht');
  for (let x = 46; x <= DK.x1; x++) B.set(x, DY, DK.z1, Math.floor(x / 2) % 2 === 0 ? 'yellow_concrete' : 'black_concrete');
  for (let x = 52; x <= DK.x1 - 1; x++) B.set(x, DY, 29, x % 3 === 0 ? 'black_concrete' : 'yellow_concrete');

  // 9.2 Laternenmasten (vor 9.1, damit das Geländer sie umläuft)
  B.at('9.2', 'sockel');
  const lamp = (x, y, z, h) => {
    for (let i = 0; i < h; i++) B.set(x, y + i, z, 'dark_oak_fence');
    B.set(x, y + h, z, 'lantern');
  };
  for (const x of [22, 30, 38]) lamp(x, 8, DK.z1, 3);
  lamp(2, 8, 34, 2); lamp(20, 8, 34, 2); lamp(2, 8, 29, 3);
  B.sec('fracht');
  for (const x of [47, 57, 67]) lamp(x, 8, DK.z1, 3);
  B.sec('plattform');
  for (const x of [24, 36, 60, EX - 1]) lamp(x, 2, 40, 3);

  // 9.1 Terrassengeländer – automatisch entlang aller freien Deckkanten
  B.at('9.1', 'sockel');
  for (const [x, z] of edgeCells) {
    if (z === DK.z1 && x >= 3 && x <= 19) continue; // Treppenaustritt
    if (B.has(x, DY + 1, z)) continue;
    B.sec(x >= 46 && z >= 29 ? 'fracht' : 'sockel');
    B.set(x, DY + 1, z, 'birch_fence');
  }

  // 9.6 Ostgeländer am Gehweg
  B.at('9.6', 'plattform');
  for (let z = 6; z <= 39; z++) B.setIfEmpty(EX, 2, z, 'dark_oak_fence');

  return finalize(B);
}

// ---------- Abschluss: Liste, Verbindungen, Statistik ----------
function finalize(B) {
  const blocks = [...B.cells.values()];
  blocks.sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
  let maxX = 0, maxY = 0, maxZ = 0;
  for (const b of blocks) { maxX = Math.max(maxX, b.x); maxY = Math.max(maxY, b.y); maxZ = Math.max(maxZ, b.z); }
  const dims = { w: maxX + 1, h: maxY + 1, d: maxZ + 1 };
  const index = new Int32Array(dims.w * dims.h * dims.d).fill(-1);
  const idx = (x, y, z) => (y * dims.d + z) * dims.w + x;
  blocks.forEach((b, i) => {
    b.i = i;
    b.phase = parseInt(b.step, 10);
    b.shape = shapeOf(b.type);
    index[idx(b.x, b.y, b.z)] = i;
  });
  const at = (x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= dims.w || y >= dims.h || z >= dims.d) return null;
    const i = index[idx(x, y, z)];
    return i < 0 ? null : blocks[i];
  };
  // Verbindungen von Scheiben, Gittern und Zäunen (wie im Spiel)
  const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
  for (const b of blocks) {
    if (b.shape !== 'pane' && b.shape !== 'bars' && b.shape !== 'fence') continue;
    const conn = {};
    for (const [d, [dx, dz]] of Object.entries(DIRS)) {
      const n = at(b.x + dx, b.y, b.z + dz);
      if (!n) continue;
      if (b.shape === 'fence') conn[d] = n.shape === 'fence' || isOpaqueCube(n.type);
      else conn[d] = n.shape === 'pane' || n.shape === 'bars' || isOpaqueCube(n.type) || (BLOCKS[n.type].glass && n.shape === 'cube');
    }
    b.props = Object.assign({}, b.props, { conn });
  }
  // vollständig verdeckte Blöcke (alle 6 Nachbarn sind deckende Vollblöcke)
  for (const b of blocks) {
    b.hidden = isOpaqueCube(b.type) &&
      [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].every(([dx, dy, dz]) => {
        if (b.y + dy < 0) return true; // Boden
        const n = at(b.x + dx, b.y + dy, b.z + dz);
        return n && isOpaqueCube(n.type);
      });
  }
  return { blocks, dims, index, at, idx };
}
