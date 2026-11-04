// Voxel-Viewer für ECHO-7 auf Basis von Three.js.
// Statt tausender Einzelobjekte erzeugt ein Mesher aus der Blockliste sichtbare
// Flächen (verdeckte Flächen entfallen) inklusive Umgebungsverdeckung (AO) pro Ecke.
// Jeder Block bleibt adressierbar: Zustände (ausgeblendet, Geist, gedimmt, normal,
// hervorgehoben) werden pro Block gesetzt, Picking erfolgt exakt per Voxel-Raycast.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BLOCKS, isOpaqueCube } from '../data/blocks.js';

export const ST = { HIDDEN: 0, GHOST: 1, DIM: 2, NORMAL: 3, HIGHLIGHT: 4 };

const S16 = (v) => v / 16;
const FACES = [
  // dir, axis, sign, tangent axes
  { n: [1, 0, 0], a: 0, s: 1 },
  { n: [-1, 0, 0], a: 0, s: -1 },
  { n: [0, 1, 0], a: 1, s: 1 },
  { n: [0, -1, 0], a: 1, s: -1 },
  { n: [0, 0, 1], a: 2, s: 1 },
  { n: [0, 0, -1], a: 2, s: -1 },
];

function faceCorners(f, b) {
  const [x0, y0, z0, x1, y1, z1] = b;
  switch (f) {
    case 0: return [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]];
    case 1: return [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]];
    case 2: return [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]];
    case 3: return [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
    case 4: return [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    default: return [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]];
  }
}

// Teilquader (Zellkoordinaten 0..1) je Blockform
export function shapeBoxes(b) {
  const p = b.props || {};
  switch (b.shape) {
    case 'slab':
      return p.half === 'top' ? [[0, 0.5, 0, 1, 1, 1]] : [[0, 0, 0, 1, 0.5, 1]];
    case 'stairs': {
      const top = p.half === 'top';
      const base = top ? [0, 0.5, 0, 1, 1, 1] : [0, 0, 0, 1, 0.5, 1];
      const ya = top ? 0 : 0.5, yb = top ? 0.5 : 1;
      const back = {
        n: [0, ya, 0, 1, yb, 0.5], s: [0, ya, 0.5, 1, yb, 1],
        e: [0.5, ya, 0, 1, yb, 1], w: [0, ya, 0, 0.5, yb, 1],
      }[p.facing || 'n'];
      return [base, back];
    }
    case 'pane':
    case 'bars': {
      const c = (p.conn) || {};
      const a = S16(7), z = S16(9);
      const out = [];
      const any = c.n || c.s || c.e || c.w;
      if (!any) return [[0, 0, a, 1, 1, z]];
      out.push([a, 0, a, z, 1, z]);
      if (c.n) out.push([a, 0, 0, z, 1, a]);
      if (c.s) out.push([a, 0, z, z, 1, 1]);
      if (c.e) out.push([z, 0, a, 1, 1, z]);
      if (c.w) out.push([0, 0, a, a, 1, z]);
      return out;
    }
    case 'fence': {
      const c = p.conn || {};
      const out = [[S16(6), 0, S16(6), S16(10), 1, S16(10)]];
      const a = S16(7), z = S16(9);
      for (const [y0, y1] of [[S16(6), S16(9)], [S16(12), S16(15)]]) {
        if (c.n) out.push([a, y0, 0, z, y1, S16(6)]);
        if (c.s) out.push([a, y0, S16(10), z, y1, 1]);
        if (c.e) out.push([S16(10), y0, a, 1, y1, z]);
        if (c.w) out.push([0, y0, a, S16(6), y1, z]);
      }
      return out;
    }
    case 'rod': {
      const thin = b.type === 'lightning_rod' ? [S16(7.5), S16(8.5)] : [S16(7), S16(9)];
      if (p.axis === 'x') return [[0, thin[0], thin[0], 1, thin[1], thin[1]]];
      if (p.axis === 'z') return [[thin[0], thin[0], 0, thin[1], thin[1], 1]];
      const out = [[thin[0], 0, thin[0], thin[1], 1, thin[1]]];
      if (b.type === 'end_rod') out.push([S16(6), 0, S16(6), S16(10), S16(1), S16(10)]);
      else out.push([S16(6.5), S16(12), S16(6.5), S16(9.5), S16(16), S16(9.5)]);
      return out;
    }
    case 'chain':
      return [[S16(6.5), 0, S16(6.5), S16(9.5), 1, S16(9.5)]];
    case 'trapdoor': {
      const t = S16(3);
      if (p.open === 'e') return [[1 - t, 0, 0, 1, 1, 1]];
      if (p.open === 'w') return [[0, 0, 0, t, 1, 1]];
      if (p.open === 'n') return [[0, 0, 0, 1, 1, t]];
      if (p.open === 's') return [[0, 0, 1 - t, 1, 1, 1]];
      return p.half === 'top' ? [[0, 1 - t, 0, 1, 1, 1]] : [[0, 0, 0, 1, t, 1]];
    }
    case 'lantern':
      return [[S16(5), 0, S16(5), S16(11), S16(7), S16(11)], [S16(6), S16(7), S16(6), S16(10), S16(9), S16(10)]];
    default:
      return [[0, 0, 0, 1, 1, 1]];
  }
}

class Writer {
  constructor() { this.cap = 0; this.n = 0; this.ni = 0; this.grow(16384); }
  grow(c) {
    const np = new Float32Array(c * 3), nn = new Float32Array(c * 3), nu = new Float32Array(c * 2), nc = new Float32Array(c * 4);
    const ni = new Uint32Array(c * 1.5);
    if (this.cap) { np.set(this.p); nn.set(this.no); nu.set(this.uv); nc.set(this.c); ni.set(this.i); }
    this.p = np; this.no = nn; this.uv = nu; this.c = nc; this.i = ni; this.cap = c;
  }
  reset() { this.n = 0; this.ni = 0; }
  quad(ox, oy, oz, corners, normal, du, dv, cols, flip) {
    if (this.n + 4 > this.cap) this.grow(this.cap * 2);
    const b = this.n;
    const uvs = [0, 0, du, 0, du, dv, 0, dv];
    for (let k = 0; k < 4; k++) {
      const v = corners[k];
      const j = (b + k);
      this.p[j * 3] = ox + v[0]; this.p[j * 3 + 1] = oy + v[1]; this.p[j * 3 + 2] = oz + v[2];
      this.no[j * 3] = normal[0]; this.no[j * 3 + 1] = normal[1]; this.no[j * 3 + 2] = normal[2];
      this.uv[j * 2] = uvs[k * 2]; this.uv[j * 2 + 1] = uvs[k * 2 + 1];
      const c = cols[k];
      this.c[j * 4] = c[0]; this.c[j * 4 + 1] = c[1]; this.c[j * 4 + 2] = c[2]; this.c[j * 4 + 3] = c[3];
    }
    const I = this.i;
    if (flip) { I[this.ni++] = b + 1; I[this.ni++] = b + 2; I[this.ni++] = b + 3; I[this.ni++] = b + 1; I[this.ni++] = b + 3; I[this.ni++] = b; }
    else { I[this.ni++] = b; I[this.ni++] = b + 1; I[this.ni++] = b + 2; I[this.ni++] = b; I[this.ni++] = b + 2; I[this.ni++] = b + 3; }
    this.n += 4;
  }
  apply(geo) {
    const set = (name, arr, size) => {
      const attr = new THREE.BufferAttribute(arr.slice(0, this.n * size), size);
      geo.setAttribute(name, attr);
    };
    set('position', this.p, 3); set('normal', this.no, 3); set('uv', this.uv, 2); set('color', this.c, 4);
    geo.setIndex(new THREE.BufferAttribute(this.i.slice(0, this.ni), 1));
    geo.computeBoundingSphere();
  }
}

function makeTexture(kind) {
  const N = 32;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d');
  const img = g.createImageData(N, N);
  let seed = kind === 'glass' ? 7 : 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const edge = x === 0 || y === 0 || x === N - 1 || y === N - 1;
      const edge2 = x === 1 || y === 1 || x === N - 2 || y === N - 2;
      let v = 255, a = 255;
      if (kind === 'block') { v = 246 + rnd() * 9; if (edge) v = 196; else if (edge2) v = 232; }
      else if (kind === 'glass') {
        v = 255; a = 150;
        if (edge) a = 255; else if (edge2) a = 210;
        const d = x - y; if ((d > 6 && d < 9) || (d > 12 && d < 14)) a = 190;
      } else if (kind === 'wire') {
        v = 255; a = edge ? 255 : edge2 ? 70 : 10;
      }
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = a;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function skyTexture() {
  const cv = document.createElement('canvas');
  cv.width = 4; cv.height = 256;
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#8fb8ec'); gr.addColorStop(0.55, '#b9d4f2'); gr.addColorStop(1, '#e3eef8');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function grassTexture() {
  const N = 64, cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d');
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = 0.86 + rnd() * 0.14;
    g.fillStyle = `rgb(${Math.round(98 * v)},${Math.round(146 * v)},${Math.round(58 * v)})`;
    g.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class BlockViewer {
  constructor(container, model, opts = {}) {
    this.el = container;
    this.model = model;
    this.opts = Object.assign({ hover: true, autoRotate: false, shadows: true, env: 'grid', pickGhost: false }, opts);
    this.states = new Uint8Array(model.blocks.length).fill(ST.NORMAL);
    this.listeners = { hover: [], pick: [], dblpick: [] };
    this.needsRender = true;
    this.active = false;

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = this.opts.shadows;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(r.domElement);
    r.domElement.classList.add('viewer-canvas');

    const scene = this.scene = new THREE.Scene();
    const cam = this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 3000);
    const { w, h, d } = model.dims;
    this.center = new THREE.Vector3(w / 2, h * 0.32, d / 2);
    this.radius = Math.sqrt(w * w + h * h + d * d) / 2;

    const controls = this.controls = new OrbitControls(cam, r.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.target.copy(this.center);
    controls.minDistance = 6;
    controls.maxDistance = this.radius * 6;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.autoRotate = this.opts.autoRotate;
    controls.autoRotateSpeed = 0.6;
    controls.screenSpacePanning = true;
    controls.addEventListener('change', () => { this.needsRender = true; });
    controls.addEventListener('start', () => { this.tween = null; });

    // Licht
    this.hemi = new THREE.HemisphereLight(0xeef4ff, 0x4a525a, 1.9);
    scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xffffff, 2.3);
    sun.position.set(this.center.x - 55, 95, this.center.z + 70);
    sun.target.position.copy(this.center);
    scene.add(sun, sun.target);
    sun.castShadow = this.opts.shadows;
    const sc = sun.shadow.camera;
    const ext = this.radius * 1.05;
    sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 400;
    const mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
    sun.shadow.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;

    // Materialien
    this.tex = { block: makeTexture('block'), glass: makeTexture('glass'), wire: makeTexture('wire') };
    this.mats = {
      opaque: new THREE.MeshLambertMaterial({ vertexColors: true, map: this.tex.block }),
      light: new THREE.MeshBasicMaterial({ vertexColors: true, map: this.tex.block }),
      glass: new THREE.MeshLambertMaterial({ vertexColors: true, map: this.tex.glass, transparent: true, depthWrite: false }),
      ghost: new THREE.MeshBasicMaterial({ color: 0x4fd0e0, map: this.tex.wire, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
    };
    this.meshes = {};
    this.writers = {};
    for (const k of ['opaque', 'light', 'glass', 'ghost']) {
      const geo = new THREE.BufferGeometry();
      const mesh = new THREE.Mesh(geo, this.mats[k]);
      mesh.frustumCulled = false;
      if (k === 'opaque' || k === 'light') { mesh.castShadow = true; mesh.receiveShadow = k === 'opaque'; }
      if (k === 'glass') { mesh.renderOrder = 2; mesh.receiveShadow = true; }
      if (k === 'ghost') mesh.renderOrder = 3;
      scene.add(mesh);
      this.meshes[k] = mesh;
      this.writers[k] = new Writer();
    }

    // Umgebung
    this.envGroup = new THREE.Group();
    scene.add(this.envGroup);
    this.setEnvironment(this.opts.env);

    // Hover-Rahmen
    const hb = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)),
      new THREE.LineBasicMaterial({ color: 0xffd34d, depthTest: false, transparent: true }));
    hb.renderOrder = 10; hb.visible = false;
    scene.add(hb);
    this.hoverBox = hb;

    // Farben vorbereiten (linear)
    this.baseColor = {};
    for (const [id, b] of Object.entries(BLOCKS)) {
      const c = new THREE.Color(b.color);
      this.baseColor[id] = [c.r, c.g, c.b];
    }
    this.accent = new THREE.Color('#38d6ea');

    this._bindPointer();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.setView('iso', { animate: false });
    this.rebuild();
    this._loop = this._loop.bind(this);
  }

  // ---------------- Öffentliche API ----------------
  on(evt, fn) { this.listeners[evt].push(fn); return this; }
  emit(evt, arg) { for (const fn of this.listeners[evt]) fn(arg); }

  setActive(on) {
    if (on === this.active) return;
    this.active = on;
    if (on) { this.resize(); this.needsRender = true; requestAnimationFrame(this._loop); }
  }

  setStates(fn) {
    const bl = this.model.blocks;
    for (let i = 0; i < bl.length; i++) this.states[i] = fn(bl[i], i);
    this.rebuild();
  }

  setEnvironment(env) {
    this.env = env;
    const g = this.envGroup;
    while (g.children.length) {
      const c = g.children.pop();
      c.geometry && c.geometry.dispose();
    }
    const { w, d } = this.model.dims;
    const size = 900;
    if (env === 'day') {
      this.scene.background = skyTexture();
      this.scene.fog = new THREE.Fog(0xdce9f6, 220, 900);
      const gt = grassTexture(); gt.repeat.set(size / 4, size / 4);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: gt }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(w / 2, -0.01, d / 2); ground.receiveShadow = true;
      g.add(ground);
      this.hemi.intensity = 2.1; this.sun.intensity = 2.4;
    } else {
      const bg = new THREE.Color('#0c0f12');
      this.scene.background = bg;
      this.scene.fog = new THREE.Fog(bg, 260, 700);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ color: '#171b20' }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(w / 2, -0.02, d / 2); ground.receiveShadow = true;
      g.add(ground);
      const fine = new THREE.GridHelper(160, 160, 0x1f272e, 0x1f272e);
      fine.position.set(Math.round(w / 2), 0.005, Math.round(d / 2));
      fine.material.transparent = true; fine.material.opacity = 0.9;
      const major = new THREE.GridHelper(160, 20, 0x2a3a44, 0x2a3a44);
      major.position.copy(fine.position); major.position.y = 0.01;
      g.add(fine, major);
      // Nordpfeil-Markierung
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 3), new THREE.MeshBasicMaterial({ color: 0x38d6ea }));
      arrow.rotation.x = -Math.PI / 2; arrow.position.set(-6, 0.05, 4);
      g.add(arrow);
      this.hemi.intensity = 1.9; this.sun.intensity = 2.3;
    }
    this.needsRender = true;
  }

  setShadows(on) {
    this.sun.castShadow = on;
    this.renderer.shadowMap.enabled = on;
    for (const m of Object.values(this.mats)) m.needsUpdate = true;
    this.needsRender = true;
  }

  viewDir(name) {
    const e = 0.2;
    switch (name) {
      case 'front': return new THREE.Vector3(0, e, 1);
      case 'back': return new THREE.Vector3(0, e, -1);
      case 'left': return new THREE.Vector3(-1, e, 0);
      case 'right': return new THREE.Vector3(1, e, 0);
      case 'top': return new THREE.Vector3(0, 1, 0.002);
      default: { // Referenzperspektive aus Südost (wie Vorlage)
        const az = THREE.MathUtils.degToRad(30), el = THREE.MathUtils.degToRad(27);
        return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      }
    }
  }

  setView(name, { animate = true, target = null, radius = null } = {}) {
    const dir = this.viewDir(name).normalize();
    const tgt = target ? target.clone() : this.center.clone();
    const rad = radius || this.radius;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect = Math.max(0.5, this.camera.aspect);
    const fit = rad / Math.sin(fov / 2) / Math.min(1, aspect * 0.95);
    const k = { top: 0.8, front: 0.66, back: 0.66, left: 0.6, right: 0.6 }[name] || 0.86;
    const dist = fit * (target ? 0.86 : k);
    const pos = tgt.clone().addScaledVector(dir, dist);
    this.flyTo(pos, tgt, animate);
  }

  frameBox(box, viewName = 'iso') {
    const c = new THREE.Vector3((box.x0 + box.x1 + 1) / 2, (box.y0 + box.y1 + 1) / 2, (box.z0 + box.z1 + 1) / 2);
    const r = Math.max(9, Math.hypot(box.x1 - box.x0 + 1, box.y1 - box.y0 + 1, box.z1 - box.z0 + 1) / 2);
    this.setView(viewName, { target: c, radius: r * 1.45 });
  }

  flyTo(pos, tgt, animate = true) {
    if (!animate) {
      this.camera.position.copy(pos); this.controls.target.copy(tgt); this.controls.update();
      this.tween = null; this.needsRender = true; return;
    }
    this.tween = {
      t0: performance.now(), dur: 650,
      p0: this.camera.position.clone(), p1: pos.clone(),
      q0: this.controls.target.clone(), q1: tgt.clone(),
    };
    this.needsRender = true;
    if (this.active) requestAnimationFrame(this._loop);
  }

  setAutoRotate(on) { this.controls.autoRotate = on; this.needsRender = true; }

  // Canvas in einen anderen Container umhängen (ein WebGL-Kontext für mehrere Bühnen)
  attach(container) {
    if (this.el === container) return;
    this.ro.unobserve(this.el);
    this.el = container;
    container.appendChild(this.renderer.domElement);
    this.ro.observe(container);
    this.resize();
  }

  // Rahmen um einen Block zeigen (z. B. beim Überfahren des 2D-Plans)
  mark(b) {
    if (b) { this.hoverBox.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5); this.hoverBox.visible = true; }
    else this.hoverBox.visible = false;
    this.needsRender = true;
  }

  dispose() {
    this.active = false; this.ro.disconnect();
    this.renderer.dispose();
  }

  // ---------------- Mesh-Aufbau ----------------
  rebuild() {
    const { blocks, dims, index } = this.model;
    const W = dims.w, Hh = dims.h, Dd = dims.d;
    const st = this.states;
    const at = (x, y, z) => {
      if (x < 0 || y < 0 || z < 0 || x >= W || y >= Hh || z >= Dd) return -1;
      return index[(y * Dd + z) * W + x];
    };
    const opaqueVis = (i) => i >= 0 && st[i] >= ST.DIM && isOpaqueCube(blocks[i].type);
    const solidAt = (x, y, z) => (y < 0 ? true : opaqueVis(at(x, y, z)));
    for (const w of Object.values(this.writers)) w.reset();
    const AO = [0.52, 0.7, 0.85, 1];
    const acc = this.accent;
    const col = [[0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 0, 1]];

    for (let i = 0; i < blocks.length; i++) {
      const s = st[i];
      if (s === ST.HIDDEN) continue;
      const b = blocks[i];
      const def = BLOCKS[b.type];
      const cube = b.shape === 'cube';
      let wr;
      if (s === ST.GHOST) wr = this.writers.ghost;
      else if (def.glass) wr = this.writers.glass;
      else if (def.light) wr = this.writers.light;
      else wr = this.writers.opaque;

      let [r0, g0, b0] = this.baseColor[b.type];
      let alpha = def.glass ? def.alpha : 1;
      if (s === ST.DIM) {
        const l = r0 * 0.3 + g0 * 0.59 + b0 * 0.11;
        r0 = l * 0.16 + 0.012; g0 = l * 0.18 + 0.016; b0 = l * 0.2 + 0.02;
        if (def.glass) alpha *= 0.35;
      } else if (s === ST.HIGHLIGHT) {
        r0 = r0 * 0.62 + acc.r * 0.42; g0 = g0 * 0.62 + acc.g * 0.42; b0 = b0 * 0.62 + acc.b * 0.42;
      }
      const boxes = cube ? null : shapeBoxes(b);
      const list = boxes || [[0, 0, 0, 1, 1, 1]];

      for (const box of list) {
        for (let f = 0; f < 6; f++) {
          const F = FACES[f];
          const onBoundary = F.s > 0 ? box[F.a + 3] === 1 : box[F.a] === 0;
          let nIdx = -1;
          if (onBoundary) {
            nIdx = at(b.x + F.n[0], b.y + F.n[1], b.z + F.n[2]);
            if (b.y + F.n[1] < 0) continue; // Boden
            if (opaqueVis(nIdx)) continue;
            if (cube && nIdx >= 0 && st[nIdx] >= ST.DIM) {
              const nb = blocks[nIdx];
              if (s === ST.GHOST) { /* Geist neben sichtbarem Block: Fläche bleibt */ }
              else if (def.glass && nb.type === b.type && nb.shape === 'cube') continue;
            }
            if (s === ST.GHOST && nIdx >= 0 && st[nIdx] === ST.GHOST && blocks[nIdx].shape === 'cube' && cube) continue;
          }
          const corners = faceCorners(f, box);
          // Flächenausdehnung für UV
          const ta = F.a === 0 ? [2, 1] : F.a === 1 ? [0, 2] : [0, 1];
          const du = box[ta[0] + 3] - box[ta[0]];
          const dv = box[ta[1] + 3] - box[ta[1]];
          let flip = false;
          if (wr === this.writers.opaque && cube && onBoundary) {
            // Ambient Occlusion pro Ecke
            const nx = b.x + F.n[0], ny = b.y + F.n[1], nz = b.z + F.n[2];
            const t1 = F.a === 0 ? 1 : 0, t2 = F.a === 2 ? 1 : 2;
            const aos = [0, 0, 0, 0];
            for (let k = 0; k < 4; k++) {
              const v = corners[k];
              const s1 = v[t1] > 0.5 ? 1 : -1, s2 = v[t2] > 0.5 ? 1 : -1;
              const o1 = [0, 0, 0], o2 = [0, 0, 0];
              o1[t1] = s1; o2[t2] = s2;
              const a1 = solidAt(nx + o1[0], ny + o1[1], nz + o1[2]) ? 1 : 0;
              const a2 = solidAt(nx + o2[0], ny + o2[1], nz + o2[2]) ? 1 : 0;
              const ac = solidAt(nx + o1[0] + o2[0], ny + o1[1] + o2[1], nz + o1[2] + o2[2]) ? 1 : 0;
              aos[k] = a1 && a2 ? 0 : 3 - (a1 + a2 + ac);
              const m = AO[aos[k]];
              col[k][0] = r0 * m; col[k][1] = g0 * m; col[k][2] = b0 * m; col[k][3] = alpha;
            }
            flip = aos[0] + aos[2] < aos[1] + aos[3];
          } else {
            let m = 1;
            if (wr === this.writers.light) m = f === 2 ? 1 : f === 3 ? 0.7 : (f < 2 ? 0.86 : 0.93);
            for (let k = 0; k < 4; k++) { col[k][0] = r0 * m; col[k][1] = g0 * m; col[k][2] = b0 * m; col[k][3] = alpha; }
          }
          wr.quad(b.x, b.y, b.z, corners, F.n, du, dv, col, flip);
        }
      }
    }
    for (const [k, w] of Object.entries(this.writers)) {
      const mesh = this.meshes[k];
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BufferGeometry();
      w.apply(mesh.geometry);
      mesh.visible = w.n > 0;
    }
    this.needsRender = true;
  }

  // ---------------- Rendering ----------------
  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // optional Bild nach rechts versetzen (Platz für Text links), nur auf breiten Bühnen
    const sx = this.opts.shiftX && w > 900 ? this.opts.shiftX : 0;
    if (sx) this.camera.setViewOffset(w, h, -w * sx, 0, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.needsRender = true;
  }

  _loop(now) {
    if (!this.active) return;
    if (this.tween) {
      const tw = this.tween;
      const t = Math.min(1, (now - tw.t0) / tw.dur);
      const e = easeInOut(t);
      this.camera.position.lerpVectors(tw.p0, tw.p1, e);
      this.controls.target.lerpVectors(tw.q0, tw.q1, e);
      this.needsRender = true;
      if (t >= 1) this.tween = null;
    }
    const changed = this.controls.update();
    if (changed || this.needsRender) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
    }
    requestAnimationFrame(this._loop);
  }

  renderNow() { this.controls.update(); this.renderer.render(this.scene, this.camera); }

  // Momentaufnahme in eine Textur (für Vorschaubilder), ohne die Ansicht zu verändern
  snapshot(width, height, viewName, box, scale = 1, lens = null) {
    const cam = this.camera.clone();
    cam.clearViewOffset();
    if (lens && lens.fov) cam.fov = lens.fov;
    cam.aspect = width / height; cam.updateProjectionMatrix();
    let dir = this.viewDir(viewName || 'iso').normalize();
    if (lens && lens.el != null) {
      const az = THREE.MathUtils.degToRad(lens.az ?? 30), el = THREE.MathUtils.degToRad(lens.el);
      dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    }
    let tgt = this.center.clone(), rad = this.radius;
    if (box) {
      tgt = new THREE.Vector3((box.x0 + box.x1 + 1) / 2, (box.y0 + box.y1 + 1) / 2, (box.z0 + box.z1 + 1) / 2);
      rad = Math.max(4, Math.hypot(box.x1 - box.x0 + 1, box.y1 - box.y0 + 1, box.z1 - box.z0 + 1) / 2);
    }
    const fov = THREE.MathUtils.degToRad(cam.fov);
    const dist = rad / Math.sin(fov / 2) / Math.min(1, cam.aspect * 0.95) * 0.86 * scale;
    if (lens && lens.dy) tgt.y += lens.dy;
    if (lens && lens.dx) tgt.x += lens.dx;
    cam.position.copy(tgt).addScaledVector(dir, dist); cam.lookAt(tgt);
    const rt = new THREE.WebGLRenderTarget(width, height, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const prevHover = this.hoverBox.visible; this.hoverBox.visible = false;
    this.renderer.setRenderTarget(rt);
    this.renderer.render(this.scene, cam);
    const buf = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, width, height, buf);
    this.renderer.setRenderTarget(null);
    this.hoverBox.visible = prevHover;
    rt.dispose();
    const cv = document.createElement('canvas'); cv.width = width; cv.height = height;
    const g = cv.getContext('2d'); const img = g.createImageData(width, height);
    for (let y = 0; y < height; y++) img.data.set(buf.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
    g.putImageData(img, 0, 0);
    this.needsRender = true;
    return cv.toDataURL('image/png');
  }

  // ---------------- Picking ----------------
  _bindPointer() {
    const el = this.renderer.domElement;
    let raf = 0, last = null, down = null;
    const ndc = (e) => {
      const r = el.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1];
    };
    el.addEventListener('pointermove', (e) => {
      if (!this.opts.hover || e.pointerType === 'touch') return;
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const hit = this.pick(...ndc(last));
        this._setHover(hit);
      });
    });
    el.addEventListener('pointerleave', () => this._setHover(null));
    el.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY, performance.now()]; });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
      if (moved < 5 && performance.now() - down[2] < 500) {
        const hit = this.pick(...ndc(e));
        if (e.pointerType === 'touch') this._setHover(hit);
        this.emit('pick', hit);
      }
      down = null;
    });
    el.addEventListener('dblclick', (e) => { this.emit('dblpick', this.pick(...ndc(e))); });
  }

  _setHover(hit) {
    const b = hit ? hit.block : null;
    if (b) { this.hoverBox.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5); this.hoverBox.visible = true; }
    else this.hoverBox.visible = false;
    if ((this._hovered || null) !== b) { this._hovered = b; this.emit('hover', hit); }
    this.needsRender = true;
  }

  pick(nx, ny) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const { w, h, d: D } = this.model.dims;
    // Eintritt in die Rasterbox
    let tmin = 0, tmax = 1e9;
    const lo = [0, 0, 0], hi = [w, h, D], O = [o.x, o.y, o.z], V = [d.x, d.y, d.z];
    for (let a = 0; a < 3; a++) {
      if (Math.abs(V[a]) < 1e-9) { if (O[a] < lo[a] || O[a] > hi[a]) return null; continue; }
      let t1 = (lo[a] - O[a]) / V[a], t2 = (hi[a] - O[a]) / V[a];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    const p = [O[0] + V[0] * (tmin + 1e-4), O[1] + V[1] * (tmin + 1e-4), O[2] + V[2] * (tmin + 1e-4)];
    const c = p.map((v, a) => Math.min(hi[a] - 1, Math.max(0, Math.floor(v))));
    const step = V.map((v) => (v > 0 ? 1 : -1));
    const tDelta = V.map((v) => (Math.abs(v) < 1e-9 ? 1e9 : Math.abs(1 / v)));
    const tMax = V.map((v, a) => {
      if (Math.abs(v) < 1e-9) return 1e9;
      const next = v > 0 ? c[a] + 1 : c[a];
      return tmin + (next - p[a]) / v;
    });
    const { index, blocks } = this.model;
    let face = -1;
    for (let n = 0; n < 600; n++) {
      if (c[0] < 0 || c[1] < 0 || c[2] < 0 || c[0] >= w || c[1] >= h || c[2] >= D) return null;
      const i = index[(c[1] * D + c[2]) * w + c[0]];
      if (i >= 0) {
        const s = this.states[i];
        if (s >= ST.DIM || (this.opts.pickGhost && s === ST.GHOST)) return { block: blocks[i], face };
      }
      let a = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
      c[a] += step[a]; tMax[a] += tDelta[a]; face = a;
    }
    return null;
  }
}
