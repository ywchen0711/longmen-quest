// The HD-2D view: the map as pixel-textured 3D blocks under soft light, seen through a tilted perspective camera with
// tilt-shift depth of field, bloom and a light colour grade. People and props are 8-bit billboards.
import * as THREE from 'three';
import { EffectComposer } from '../lib/addons/EffectComposer.js';
import { RenderPass } from '../lib/addons/RenderPass.js';
import { UnrealBloomPass } from '../lib/addons/UnrealBloomPass.js';
import { OutputPass } from '../lib/addons/OutputPass.js';
import { ShaderPass } from '../lib/addons/ShaderPass.js';
import { tex, spr } from './tiles.js?v=6';
import { TILES } from './maps.js?v=6';

const TiltShift = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) }, dir: { value: new THREE.Vector2(1, 0) }, focus: { value: 0.5 }, band: { value: 0.18 }, amount: { value: 2.2 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res, dir; uniform float focus, band, amount; varying vec2 vUv;
    void main(){
      float d = max(0.0, abs(vUv.y - focus) - band);
      float r = clamp(d * 3.5, 0.0, 1.0) * amount;
      vec2 st = dir / res * r;
      vec4 c = texture2D(tDiffuse, vUv) * 0.2270270270;
      c += texture2D(tDiffuse, vUv + st * 1.3846153846) * 0.3162162162;
      c += texture2D(tDiffuse, vUv - st * 1.3846153846) * 0.3162162162;
      c += texture2D(tDiffuse, vUv + st * 3.2307692308) * 0.0702702703;
      c += texture2D(tDiffuse, vUv - st * 3.2307692308) * 0.0702702703;
      gl_FragColor = c;
    }`,
};
const Grade = {
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.5 }, fade: { value: 0 }, flash: { value: 0 }, tint: { value: new THREE.Vector3(1.03, 1.0, 0.95) } },
  vertexShader: TiltShift.vertexShader,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, fade, flash; uniform vec3 tint; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb *= tint;
      vec2 d = vUv - 0.5; c.rgb *= 1.0 - dot(d, d) * vig * 1.6;
      c.rgb = mix(c.rgb, vec3(1.0), flash);
      c.rgb *= 1.0 - fade;
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), 1.0);
    }`,
};

function texOf(canvas, repeat, mip) {
  const t = new THREE.CanvasTexture(canvas); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  if (mip) { t.minFilter = THREE.NearestMipmapLinearFilter; t.generateMipmaps = true; } else { t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const T = {}; const tx = (name) => T[name] || (T[name] = texOf(tex(name), false, true));
const S = {}; const sx = (name) => S[name] || (S[name] = texOf(spr(name)));

// ---------------------------------------------------------------- quality
export function pickQuality() {
  let q = 'high';
  try { const s = localStorage.getItem('lq_quality'); if (s) return s; } catch (e) {}
  // phones and tablets: post effects but no shadow maps; a frame-rate watchdog in main.js drops the post effects if slow
  const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window, mem = navigator.deviceMemory || 4;
  if (touch && mem <= 2) q = 'low'; else if (touch) q = 'medium';
  return q;
}

export class View {
  constructor(canvas, quality) {
    this.canvas = canvas; this.quality = quality;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = quality === 'high'; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x0d0d1a);
    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 120);
    this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x404a60, 0.95); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 0.85); this.sun.castShadow = quality === 'high';
    this.sun.shadow.mapSize.set(2048, 2048); const sc = this.sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60; this.sun.shadow.bias = -0.0015; this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.lantern = new THREE.PointLight(0xffd8a0, 0, 9, 1); this.scene.add(this.lantern);
    this.post = quality !== 'low';
    if (this.post) {
      const size = r.getDrawingBufferSize(new THREE.Vector2());
      this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType }));
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.32, 0.5, 0.82); this.composer.addPass(this.bloom);
      this.tsH = new ShaderPass(TiltShift); this.tsV = new ShaderPass(TiltShift); this.tsV.uniforms.dir.value.set(0, 1);
      this.composer.addPass(this.tsH); this.composer.addPass(this.tsV);
      this.composer.addPass(new OutputPass());
      this.grade = new ShaderPass(Grade); this.composer.addPass(this.grade);
    }
    this.group = null; this.actors = new Map(); this.time = 0; this.cam = new THREE.Vector3(); this.camReady = false;
    this.resize(); window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    const touch = (navigator.maxTouchPoints || 0) > 0;
    let pr = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : 1.5);
    if (touch) pr = Math.max(1, Math.min(pr, Math.sqrt(2000000 / (w * h))));
    if (this.quality === 'low') pr = 1;
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.aspect = w / h;
    if (this.composer) { this.composer.setPixelRatio(pr); this.composer.setSize(w, h); const s = this.renderer.getDrawingBufferSize(new THREE.Vector2()); this.tsH.uniforms.res.value.copy(s); this.tsV.uniforms.res.value.copy(s); }
  }

  // ---------------------------------------------------------------- building a map
  clear() {
    if (this.group) { this.scene.remove(this.group); this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); }); }
    for (const a of this.actors.values()) a.dispose(); this.actors.clear();
    this.group = new THREE.Group(); this.scene.add(this.group); this.water = null; this.dyn = {}; this.lights = []; this.anim = [];
  }
  mat(top, side, opts = {}) {
    const m = (t) => new THREE.MeshLambertMaterial({ map: tx(t), ...opts });
    const s = m(side || top), t = m(top);
    return [s, s, t, s, s, s];
  }
  // instanced boxes: list of [x, z, height, base] all with one material set
  boxes(list, mats, opts = {}) {
    if (!list.length) return null;
    const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(g, mats, list.length); const m = new THREE.Matrix4();
    list.forEach(([x, z, h, base = 0, sx = 1, sz = 1], i) => { m.makeScale(sx, h, sz); m.setPosition(x + 0.5, base, z + 0.5); mesh.setMatrixAt(i, m); });
    mesh.castShadow = !!opts.cast && this.quality === 'high'; mesh.receiveShadow = this.quality === 'high'; this.group.add(mesh); return mesh;
  }
  // instanced flat decals (floors on top of boxes)
  planes(list, texName, y = 0.001, opts = {}) {
    if (!list.length) return null;
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({ map: tx(texName), transparent: !!opts.transparent, alphaTest: opts.alphaTest || 0 });
    const mesh = new THREE.InstancedMesh(g, mat, list.length); const m = new THREE.Matrix4();
    list.forEach(([x, z, yy], i) => { m.makeTranslation(x + 0.5, yy ?? y, z + 0.5); mesh.setMatrixAt(i, m); });
    mesh.receiveShadow = this.quality === 'high'; this.group.add(mesh); return mesh;
  }
  // instanced billboards (all facing the camera's fixed direction): [x, z, w, h, base]
  billboards(list, sprName, opts = {}) {
    if (!list.length) return null;
    const c = spr(sprName); const ar = c.height / c.width;
    const g = new THREE.PlaneGeometry(1, ar); g.translate(0, ar / 2, 0);
    const mat = new THREE.MeshLambertMaterial({ map: sx(sprName), alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(opts.glow ? 0xffffff : 0x303030), emissiveMap: sx(sprName), emissiveIntensity: opts.glow ? 1 : 1 });
    const mesh = new THREE.InstancedMesh(g, mat, list.length); const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-this.tilt, 0, 0)), s = new THREE.Vector3(), p = new THREE.Vector3();
    list.forEach(([x, z, w = 1, base = 0], i) => { s.set(w, w, w); p.set(x, base, z); m.compose(p, q, s); mesh.setMatrixAt(i, m); });
    mesh.castShadow = this.quality === 'high'; if (mesh.castShadow) mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: sx(sprName), alphaTest: 0.5 });
    this.group.add(mesh); return mesh;
  }
  // mountains: four-sided rocky pyramids
  peaks(list, texName) {
    if (!list.length) return;
    const g = new THREE.ConeGeometry(0.72, 1, 4, 3); g.translate(0, 0.5, 0); g.rotateY(Math.PI / 4);
    const t = tx(texName); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const mesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ map: t, flatShading: true }), list.length); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach(([x, z, h, w, rot], i) => { e.set(0, (rot - 0.5) * 0.5, 0); q.setFromEuler(e); m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(w, h, w)); mesh.setMatrixAt(i, m); });
    mesh.castShadow = this.quality === 'high'; mesh.receiveShadow = this.quality === 'high'; this.group.add(mesh);
  }
  waterPlane(w, h, y = -0.22) {
    const t = tx('water'); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: t }, time: { value: 0 }, rep: { value: new THREE.Vector2(w / 2, h / 2) } },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform sampler2D map; uniform float time; uniform vec2 rep; varying vec2 vUv; varying vec3 vW;
        void main(){
          vec2 uv = vUv * rep; uv.x += time * 0.03; uv.y += sin(time * 0.6 + vW.x * 0.3) * 0.02;
          uv = floor(uv * 32.0) / 32.0;
          vec3 c = texture2D(map, uv).rgb;
          float sp = step(0.985, fract(sin(dot(floor(vW.xz * 4.0), vec2(12.9898, 78.233)) + floor(time * 3.0)) * 43758.5453));
          c += sp * vec3(0.6);
          c = pow(c, vec3(2.2));
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const g = new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, mat); mesh.position.set(w / 2, y, h / 2); this.group.add(mesh); this.water = mat; return mesh;
  }
  light(x, z, y = 1.2, col = 0xffb060, int = 1.6, dist = 5) {
    if (this.quality === 'low' || this.lights.length > 10) return;
    const l = new THREE.PointLight(col, int, dist, 1.6); l.position.set(x + 0.5, y, z + 0.5); this.group.add(l); this.lights.push(l);
  }

  // the overworld: rows of tile letters plus the places and which gates are open
  buildWorld(W, places, open) {
    this.clear(); this.tilt = this.pitch();
    const rows = W; const H = rows.length, Wd = rows[0].length; this.size = [Wd, H];
    const groups = {};
    const add = (k, v) => (groups[k] || (groups[k] = [])).push(v);
    const r = mulberry(5);
    const LAND = { '.': 'grass', '=': 'road', f: 'forest', h: 'hill', s: 'sand', w: 'swamp', n: 'snow', M: 'grass', N: 'snow', G: 'road' };
    for (let z = 0; z < H; z++) for (let x = 0; x < Wd; x++) {
      const c = rows[z][x];
      if (c === '~' || c === 'D' || c === 'v' || c === 'X' || c === 'c') {
        if (c === 'D') add('dock', [x, z, 0.12, -0.12]);
        if (c === 'v') add('chasm', [x, z, 2.38, -2.5]);
        if (c === 'X') { add('chasm', [x, z, 2.38, -2.5]); add('rope', [x, z]); }
        if (c === 'c') add('causeway', [x, z]);
        continue;
      }
      let k = LAND[c] || 'grass'; if (k === 'grass' && ((x * 7 + z * 13) % 5 === 0 || Math.sin(x * 0.7) + Math.cos(z * 0.6) > 1.3)) k = 'grass2'; add('land_' + k, [x, z, 0.5, -0.5]);
      if (c === 'f') { const n = 1 + (r() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) add('tree', [x + 0.2 + r() * 0.6, z + 0.25 + r() * 0.6, 1.05 + r() * 0.25]); }
      if (c === 'h') { add('mound', [x + 0.3 + r() * 0.2, z + 0.45, 0.85 + r() * 0.25]); if (r() < 0.6) add('mound', [x + 0.6 + r() * 0.2, z + 0.75, 0.65 + r() * 0.2]); }
      if (c === 'M') { add('peak', [x + 0.5, z + 0.5, 0.8 + r() * 0.6, 1.3 + r() * 0.2, r()]); }
      if (c === 'N') { add('speak', [x + 0.5, z + 0.5, 0.9 + r() * 0.8, 1.3 + r() * 0.2, r()]); }
      if (c === 'n' && r() < 0.08) add('snowpine', [x + 0.5, z + 0.6, 1]);
      if (c === 's' && r() < 0.03) add('palm', [x + 0.5, z + 0.6, 1]);
      if (c === 'w' && r() < 0.1) add('deadtree', [x + 0.5, z + 0.6, 0.9]);
      if (c === '.' && r() < 0.02) add('bush', [x + 0.5, z + 0.6, 0.6]);
      if (c === 'G') add('palisade', [x, z, 0.9, 0]);
    }
    this.waterPlane(Wd, H);
    this.boxes(groups.land_grass || [], this.mat('grass', 'grassSide')); this.boxes(groups.land_grass2 || [], this.mat('grass2', 'grassSide'));
    this.boxes(groups.land_road || [], this.mat('road', 'dirtSide'));
    this.boxes(groups.land_forest || [], this.mat('forestFloor', 'grassSide'));
    this.boxes(groups.land_hill || [], this.mat('grass', 'grassSide'));
    this.boxes(groups.land_sand || [], this.mat('sand', 'sandSide'));
    this.boxes(groups.land_swamp || [], this.mat('swamp', 'dirtSide'));
    this.boxes(groups.land_snow || [], this.mat('snow', 'snowSide'));
    this.boxes(groups.hill || [], this.mat('hill', 'grassSide'), { cast: 1 });
    this.peaks(groups.peak || [], 'rockPeak'); this.peaks(groups.speak || [], 'snowPeak');
    this.boxes(groups.dock || [], this.mat('plank', 'plankSide'));
    this.boxes(groups.chasm || [], this.mat('chasm'));
    this.dyn.palisade = this.boxes(groups.palisade || [], this.mat('palisadeTop', 'palisade'), { cast: 1 });
    this.dyn.rope = this.boxes((groups.rope || []).map(([x, z]) => [x, z, 0.08, -0.1, 0.8, 1]), this.mat('plank', 'plankSide'));
    this.dyn.causeway = this.boxes((groups.causeway || []).map(([x, z]) => [x, z, 0.4, -0.5]), this.mat('pave', 'wallStone'));
    this.billboards(groups.mound || [], 'mound'); this.billboards(groups.tree || [], 'tree'); this.billboards(groups.snowpine || [], 'snowpine'); this.billboards(groups.palm || [], 'palm');
    this.billboards(groups.deadtree || [], 'deadtree'); this.billboards(groups.bush || [], 'bush');
    for (const [id, [x, z, look]] of Object.entries(places)) this.placeModel(x, z, look);
    this.setOpen(open);
    this.dark(false); this.scene.background.set(0x7fa8d8); this.scene.fog = new THREE.Fog(0x9ab8dc, 30, 70); this.camDist = 21;
  }
  setOpen(open) {
    if (this.dyn.palisade) this.dyn.palisade.visible = !open.G;
    if (this.dyn.rope) this.dyn.rope.visible = !!open.X;
    if (this.dyn.causeway) this.dyn.causeway.visible = !!open.c;
    if (this.boat) this.boat.visible = !!open.D;
  }
  // little dioramas standing for towns, caves, towers on the world map
  placeModel(x0, z0, look) {
    const g = new THREE.Group(); g.position.set(x0 + 0.5, 0, z0 + 0.5); g.scale.setScalar(1.6); this.group.add(g);
    const x = -0.5, z = -0.5;
    const add = (mesh) => { mesh.castShadow = this.quality === 'high'; mesh.receiveShadow = this.quality === 'high'; g.add(mesh); return mesh; };
    const box = (w, h, d, px, py, pz, top, side) => { const geo = new THREE.BoxGeometry(w, h, d); const m = add(new THREE.Mesh(geo, this.mat(top, side))); m.position.set(x + 0.5 + px, py + h / 2, z + 0.5 + pz); return m; };
    const roof = (w, d, px, py, pz, col, h = 0.35) => {
      const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.04, 0); sh.lineTo(w / 2 + 0.04, 0); sh.lineTo(0, h); sh.lineTo(-w / 2 - 0.04, 0);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: d + 0.08, bevelEnabled: false }); geo.translate(0, 0, -(d + 0.08) / 2);
      const key = { 0x9a3020: 'roofRed', 0x2a4a8a: 'roofBlue', 0x2a6a4a: 'roofGreen', 0x8a6a30: 'roofThatch', 0xc89820: 'roofGold', 0x3a3020: 'roofDark', 0x3a1a4a: 'roofPurple', 0x2a5a7a: 'roofBlue' }[col] || 'roofRed';
      const t = tx(key); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
      const m = add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: t }))); m.position.set(x + 0.5 + px, py, z + 0.5 + pz); return m; };
    const house = (px, pz, s = 0.32, col = 0x9a3020) => { box(s, s * 0.7, s * 0.8, px, 0, pz, 'plasterTop', 'plaster'); roof(s, s * 0.8, px, s * 0.7, pz, col, s * 0.5); };
    if (look === 'town' || look === 'city') {
      for (const [a, b, w, d] of [[0, -0.46, 1, 0.06], [-0.47, 0, 0.06, 0.98], [0.47, 0, 0.06, 0.98], [-0.32, 0.46, 0.36, 0.06], [0.32, 0.46, 0.36, 0.06]]) box(w, 0.14, d, a, 0, b, 'wallStoneTop', 'wallStone');
      house(-0.22, -0.2, 0.34); house(0.22, -0.2, 0.3, 0x2a4a8a); house(-0.2, 0.17, 0.28, 0x2a6a4a); house(0.22, 0.16, 0.3);
      if (look === 'city') { box(0.22, 0.5, 0.22, -0.4, 0, 0.4, 'wallStoneTop', 'wallStone'); box(0.22, 0.5, 0.22, 0.4, 0, 0.4, 'wallStoneTop', 'wallStone'); }
    }
    else if (look === 'village') { house(-0.2, -0.12, 0.34, 0x8a6a30); house(0.24, 0.16, 0.3, 0x8a6a30); for (const a of [-0.45, 0.45]) box(0.04, 0.12, 0.9, a, 0, 0, 'plank', 'fortWall'); }
    else if (look === 'pavilion') { box(0.6, 0.06, 0.6, 0, 0, 0, 'plank', 'plankSide'); for (const [a, b] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) box(0.05, 0.4, 0.05, a, 0.06, b, 'plank', 'plank'); roof(0.75, 0.75, 0, 0.46, 0, 0x2a5a7a, 0.32); }
    else if (look === 'temple') { box(0.7, 0.32, 0.5, 0, 0, -0.05, 'templeWallTop', 'templeWall'); roof(0.9, 0.7, 0, 0.32, -0.05, 0xc89820, 0.32); roof(0.6, 0.45, 0, 0.6, -0.05, 0xc89820, 0.22); }
    else if (look === 'tower') { for (let i = 0; i < 4; i++) { const s = 0.5 - i * 0.08; box(s, 0.32, s, 0, i * 0.42, 0, 'templeWallTop', 'templeWall'); roof(s * 1.35, s * 1.35, 0, i * 0.42 + 0.32, 0, 0x2a6a4a, 0.12); } }
    else if (look === 'fort') { box(0.9, 0.5, 0.06, 0, 0, 0.42, 'palisadeTop', 'palisade'); box(0.06, 0.5, 0.9, -0.42, 0, 0, 'palisadeTop', 'palisade'); box(0.06, 0.5, 0.9, 0.42, 0, 0, 'palisadeTop', 'palisade'); box(0.3, 0.8, 0.3, 0, 0, -0.1, 'palisadeTop', 'palisade'); roof(0.4, 0.4, 0, 0.8, -0.1, 0x3a3020, 0.25); }
    else if (look === 'desertfort') { box(0.8, 0.45, 0.8, 0, 0, 0, 'tombWallTop', 'tombWall'); box(0.3, 0.75, 0.3, -0.25, 0, -0.25, 'tombWallTop', 'tombWall'); }
    else if (look === 'tomb') { box(0.7, 0.35, 0.7, 0, 0, 0, 'tombWallTop', 'tombWall'); box(0.45, 0.3, 0.45, 0, 0.35, 0, 'tombWallTop', 'tombWall'); box(0.2, 0.2, 0.2, 0, 0.65, 0, 'tombWallTop', 'tombWall'); box(0.18, 0.28, 0.02, 0, 0, 0.36, 'void', 'void'); }
    else if (look === 'cave' || look === 'grove') {
      if (look === 'grove') { this.billboards([[x0 + 0.1, z0 + 0.3, 1.4], [x0 + 0.9, z0 + 0.35, 1.45], [x0 + 0.5, z0 + 0.05, 1.6]], 'pine'); }
      else { const cg = new THREE.ConeGeometry(0.62, 0.9, 5, 2); cg.translate(0, 0.45, 0); const cm = add(new THREE.Mesh(cg, new THREE.MeshLambertMaterial({ map: tx('rockPeak'), flatShading: true }))); cm.position.set(0, 0, -0.12); box(0.3, 0.32, 0.05, 0, 0, 0.3, 'void', 'void'); box(0.42, 0.06, 0.08, 0, 0.32, 0.31, 'rockTop', 'rockSide'); }
    }
    else if (look === 'lair') { box(0.8, 0.6, 0.6, 0, 0, -0.1, 'lairWallTop', 'lairWall'); box(0.2, 1.1, 0.2, -0.35, 0, -0.3, 'lairWallTop', 'lairWall'); box(0.2, 1.1, 0.2, 0.35, 0, -0.3, 'lairWallTop', 'lairWall'); roof(0.9, 0.7, 0, 0.6, -0.1, 0x3a1a4a, 0.4); this.light(x0, z0 + 0.6, 1.2, 0xa040ff, 2.4, 5); }
  }

  // an interior map (town or dungeon)
  buildMap(M, state) {
    this.clear(); this.tilt = this.pitch();
    const theme = THEMES[M.theme] || THEMES.town; const rows = M.rows, H = rows.length, W = rows[0].length; this.size = [W, H];
    const G = {}; const add = (k, v) => (G[k] || (G[k] = [])).push(v); const r = mulberry(9);
    const floorOf = (c) => {
      if (c === ',' || c === '"' || c === '%') return theme.grass ? 'grass' : theme.floor;
      if (c === ':') return theme.pave || 'pave'; if (c === 'o' || c === 'b' || c === 't' || c === 'k' || c === '=') return 'wood';
      if (c === 'n') return 'snow'; if (c === 's') return 'sand'; if (c === 'm') return 'carpet'; if (c === 'e') return 'plank'; if (c === '^') return 'ice';
      if (c === 'f') return 'flowersG';
      return theme.floor;
    };
    this.chests = {}; this.doors = {}; this.gates = {};
    // an apron of scenery round the edge so the map does not float in the sky
    const apron = { town: '"', village: '"', city: '"', temple: '"', pavilion: '~', forest: '"', desert: 's', fort: '#' }[M.theme];
    if (apron) {
      const A = 12;
      for (let z = -A; z < H + A; z++) for (let x = -A; x < W + A; x++) {
        if (z >= 0 && z < H && x >= 0 && x < W && rows[z][x] !== ' ') continue;
        if (apron === '~') continue;
        if (apron === '#') { add('wall', [x, z, 1 + r() * 0.8, 0]); continue; }
        if (apron === 's') { add('f_sand', [x, z, 0.3, -0.3]); if (r() < 0.06) add('palm', [x + 0.5, z + 0.6, 1]); continue; }
        add('f_' + (M.theme === 'forest' ? 'forestFloor' : 'grass'), [x, z, 0.3, -0.3]);
        if (r() < (M.theme === 'forest' ? 0.75 : 0.45)) add('tree', [x + 0.2 + r() * 0.6, z + 0.3 + r() * 0.5, 1.1 + r() * 0.3]);
      }
    }
    let ci = 0;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      let c = rows[z][x]; if (c === ' ') continue;
      if (/[A-Z]/.test(c)) c = M.floor || '.';
      const t = TILES[c] || TILES['.'];
      if (c === '~') { continue; }
      if (c === 'v') { add('void', [x, z, 0.05, -3]); continue; }
      if (c === '#') { add('wall', [x, z, theme.wallH || 1, 0]); continue; }
      if (c === 'h') { add('house', [x, z, 0.85, 0]); continue; }
      if (c === 'x' && theme.fortFence) { add('pal', [x, z, 0.9, 0]); continue; }
      add('f_' + floorOf(c), [x, z, 0.3, -0.3]);
      if (c === '"' && M.theme === 'forest') { add('hedge', [x, z, 0.75 + r() * 0.15, 0]); if (r() < 0.22) add('treetop', [x + 0.5, z + 0.5, 0.9 + r() * 0.3, 0.6]); }
      else if (c === '"') add('tree', [x + 0.5, z + 0.55, 1.15 + r() * 0.2]);
      else if (c === '%') add('bush', [x + 0.5, z + 0.6, 0.9]);
      else if (c === 'p') add('pot', [x + 0.5, z + 0.6, 0.7]);
      else if (c === 'r') add('rock', [x + 0.5, z + 0.6, 0.85]);
      else if (c === 'u') add('statue', [x + 0.5, z + 0.5, 0.9]);
      else if (c === 'l') { add('lamp', [x + 0.5, z + 0.5, 0.9]); this.light(x, z, 1.2); }
      else if (c === '&') { add('brazier', [x + 0.5, z + 0.5, 0.7]); add('fire', [x + 0.5, z + 0.5, 0.55, 0.3]); this.light(x, z, 0.9, 0xff8030, 2.2, 5); }
      else if (c === 'w') add('well', [x + 0.5, z + 0.6, 0.9]);
      else if (c === 'x') add('fence', [x + 0.5, z + 0.5, 1]);
      else if (c === 'i') add('pillar', [x, z, 1.25, 0, 0.32, 0.32]);
      else if (c === 'b') add('bed', [x, z, 0.3, 0, 0.8, 0.9]);
      else if (c === 't') add('table', [x, z, 0.4, 0, 0.8, 0.8]);
      else if (c === 'q') add('coffin', [x, z, 0.35, 0, 0.6, 0.9]);
      else if (c === 'k') add('shelf', [x, z, 0.9, 0, 1, 0.5]);
      else if (c === '=') add('counter', [x, z, 0.45, 0]);
      else if (c === 'd') { const k = x + ',' + z; this.doors[k] = [x, z]; }
      else if (c === 'g') { const k = x + ',' + z; this.gates[k] = [x, z]; }
      else if (c === 'c') { this.chests[x + ',' + z] = { x, z, i: ci++ }; }
      else if (/[1-9]/.test(c)) add('stairs', [x, z]);
    }
    if (rows.some((rw) => rw.includes('~')) || apron === '~') { const wm = this.waterPlane(W + 40, H + 40, -0.24); wm.position.x -= 20; wm.position.z -= 20; }
    for (const k of Object.keys(G)) if (k.startsWith('f_')) this.boxes(G[k], this.mat(k.slice(2), theme.side || 'dirtSide'));
    this.boxes(G.wall || [], this.mat(theme.wallTop, theme.wall), { cast: 1 });
    this.boxes(G.hedge || [], this.mat('leafTop', 'leafSide'), { cast: 1 }); this.billboards(G.treetop || [], 'tree');
    this.boxes(G.house || [], this.mat('plasterTop', 'plaster'), { cast: 1 });
    this.boxes(G.pal || [], this.mat('palisadeTop', 'palisade'), { cast: 1 });
    this.boxes(G.void || [], this.mat('void'));
    this.boxes(G.pillar || [], this.mat('templeWallTop', 'templeWall'), { cast: 1 });
    this.boxes(G.bed || [], this.mat('bed', 'wood'));
    this.boxes(G.table || [], this.mat('table', 'wood'), { cast: 1 });
    this.boxes(G.coffin || [], this.mat('coffin', 'wood'), { cast: 1 });
    this.boxes(G.shelf || [], this.mat('wood', 'shelf'), { cast: 1 });
    this.boxes(G.counter || [], this.mat('counter', 'counter'));
    this.billboards(G.palm || [], 'palm');
    for (const [n, list] of Object.entries({ tree: G.tree, bush: G.bush, pot: G.pot, rock: G.rock, statue: G.statue, lamp: G.lamp, brazier: G.brazier, well: G.well, fence: G.fence })) this.billboards(list || [], n === 'tree' ? (M.theme === 'snowpeak' ? 'snowpine' : 'tree') : n);
    if (G.fire) this.dyn.fire = this.billboards(G.fire, 'fire', { glow: 1 });
    // stairs: a flat step texture
    this.planes((G.stairs || []).map(([x, z]) => [x, z, 0.004]), 'stairs');
    // doors, gates and chests change state: one mesh each
    this.dyn.doorMeshes = {}; this.dyn.chestMeshes = {}; this.dyn.gateMeshes = {};
    for (const [k, [x, z]] of Object.entries(this.doors)) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.85, 1), this.mat('wood', 'door')); m.position.set(x + 0.5, 0.425, z + 0.5); m.castShadow = this.quality === 'high'; this.group.add(m); this.dyn.doorMeshes[k] = m; }
    for (const [k, [x, z]] of Object.entries(this.gates)) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.85, 0.15), new THREE.MeshLambertMaterial({ map: tx('gate'), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })); m.position.set(x + 0.5, 0.425, z + 0.9); this.group.add(m); this.dyn.gateMeshes[k] = m; }
    for (const [k, c] of Object.entries(this.chests)) this.dyn.chestMeshes[k] = this.prop(c.x + 0.5, c.z + 0.55, 'chest', 0.75);
    this.refresh(state);
    if (M.dark) { this.dark(true, state.lantern); } else this.dark(false);
    this.camDist = M.town ? 16 : 15;
    this.scene.background.set(M.dark ? 0x000000 : theme.sky); this.scene.fog = M.dark ? new THREE.Fog(0x000000, this.camDist - 3, this.camDist + (state.lantern ? 5 : 2)) : new THREE.Fog(theme.sky, 26, 60);
    if (!M.dark) { this.hemi.intensity = theme.light ?? 0.95; this.sun.intensity = theme.sun ?? 0.85; }
    this.camDist = M.town ? 16 : 15;
  }
  prop(x, z, sprName, w = 1) {
    const c = spr(sprName); const ar = c.height / c.width; const g = new THREE.PlaneGeometry(w, w * ar); g.translate(0, w * ar / 2, 0);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: sx(sprName), alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(0x303030), emissiveMap: sx(sprName) }));
    m.position.set(x, 0, z); m.rotation.x = -this.tilt; m.castShadow = this.quality === 'high'; this.group.add(m); return m;
  }
  setPropSprite(m, sprName) { m.material.map = sx(sprName); m.material.emissiveMap = sx(sprName); m.material.needsUpdate = true; }
  // doors opened, chests looted, gates raised
  refresh(state) {
    if (!this.dyn.doorMeshes) return;
    for (const [k, m] of Object.entries(this.dyn.doorMeshes)) m.visible = !state.isOpen(k);
    for (const [k, m] of Object.entries(this.dyn.gateMeshes)) m.visible = !state.isOpen(k);
    for (const [k, m] of Object.entries(this.dyn.chestMeshes)) this.setPropSprite(m, state.isOpen(k) ? 'chestOpen' : 'chest');
  }
  dark(on, lantern) {
    this.isDark = on;
    this.hemi.intensity = on ? 0.14 : 0.95; this.sun.intensity = on ? 0 : 0.85;
    this.lantern.intensity = on ? (lantern ? 7 : 2) : 0; this.lantern.distance = lantern ? 10 : 4;
  }

  // ---------------------------------------------------------------- people (billboards from sprite sheets)
  actor(id, look) { let a = this.actors.get(id); if (!a) { a = new Actor(this, look); this.actors.set(id, a); } return a; }
  drop(id) { const a = this.actors.get(id); if (a) { a.dispose(); this.actors.delete(id); } }
  pitch() { return Math.PI / 2 - (this.aspect < 1 ? 0.95 : 0.86); }    // billboard lean: matches the camera elevation in frame()

  // ---------------------------------------------------------------- per frame
  frame(dt, focus) {
    this.time += dt;
    if (this.water) this.water.uniforms.time.value = this.time;
    const portrait = this.aspect < 1;
    const base = this.camDist || 15; const dist = portrait ? base * 1.15 : base, el = portrait ? 0.95 : 0.86;      // camera distance and elevation angle
    const want = new THREE.Vector3(focus.x, 0, focus.z);
    if (!this.camReady) { this.cam.copy(want); this.camReady = true; } else this.cam.lerp(want, Math.min(1, dt * 8));
    const c = this.camera; c.fov = portrait ? 38 : 30; c.updateProjectionMatrix();
    c.position.set(this.cam.x, this.cam.y + Math.sin(el) * dist, this.cam.z + Math.cos(el) * dist); c.lookAt(this.cam.x, 0.3, this.cam.z);
    this.tilt = Math.PI / 2 - el;
    // snap the shadow camera to whole shadow-map texels so shadows don't shimmer while the camera glides
    const snap = 32 / 2048, sx0 = Math.round(this.cam.x / snap) * snap, sz0 = Math.round(this.cam.z / snap) * snap;
    this.sun.position.set(sx0 - 10, 16, sz0 + 3); this.sun.target.position.set(sx0, 0, sz0);
    this.lantern.position.set(focus.x, 1.4, focus.z + 0.3);
    for (const a of this.actors.values()) a.face(this.tilt);
    if (this.dyn && this.dyn.fire) this.dyn.fire.material.emissiveIntensity = 0.9 + Math.sin(this.time * 14) * 0.15;
    if (this.post) { const f = 0.52; this.tsH.uniforms.focus.value = f; this.tsV.uniforms.focus.value = f; this.tsH.uniforms.band.value = this.tsV.uniforms.band.value = portrait ? 0.16 : 0.13; }
  }
  render() { if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera); }
  fade(v) { if (this.grade) this.grade.uniforms.fade.value = v; this.canvas.style.opacity = this.grade ? 1 : String(1 - v); }
  flash(v) { if (this.grade) this.grade.uniforms.flash.value = v; }
}

const THEMES = {
  town: { floor: 'grass', grass: 1, wall: 'wallStone', wallTop: 'wallStoneTop', sky: 0x86b0e0 },
  village: { floor: 'grass', grass: 1, wall: 'wallStone', wallTop: 'wallStoneTop', sky: 0x86b0e0 },
  city: { floor: 'pave', wall: 'wallStone', wallTop: 'wallStoneTop', sky: 0x86b0e0, grass: 1 },
  pavilion: { floor: 'grass', grass: 1, wall: 'wallStone', wallTop: 'wallStoneTop', sky: 0x9ac0e8 },
  temple: { floor: 'grass', grass: 1, wall: 'templeWall', wallTop: 'templeWallTop', sky: 0x9ac0e8, pave: 'pave' },
  desert: { floor: 'sand', wall: 'tombWall', wallTop: 'tombWallTop', sky: 0xe8c890, side: 'sandSide' },
  forest: { floor: 'forestFloor', grass: 1, wall: 'rockSide', wallTop: 'rockTop', sky: 0x3a6a4a, light: 0.75, sun: 0.6 },
  fort: { floor: 'road', wall: 'fortWall', wallTop: 'palisadeTop', sky: 0x5a6a80, fortFence: 1 },
  sea: { floor: 'caveFloor', wall: 'wallCave', wallTop: 'wallCaveTop', sky: 0x0a1a2a, light: 0.55, sun: 0.35 },
  cave: { floor: 'caveFloor', wall: 'wallCave', wallTop: 'wallCaveTop', sky: 0x0a0a12, light: 0.55, sun: 0.35 },
  tower: { floor: 'floor', wall: 'templeWall', wallTop: 'templeWallTop', sky: 0x1a1008, light: 0.75, sun: 0.5, pave: 'floor' },
  tomb: { floor: 'tombFloor', wall: 'tombWall', wallTop: 'tombWallTop', sky: 0x000000 },
  ice: { floor: 'snow', wall: 'iceWall', wallTop: 'iceWallTop', sky: 0x1a2a3a, light: 0.8, sun: 0.5 },
  snowpeak: { floor: 'snow', wall: 'snowRockSide', wallTop: 'snowRock', sky: 0xa8c8e8 },
  lair: { floor: 'lairFloor', wall: 'lairWall', wallTop: 'lairWallTop', sky: 0x08040c, light: 0.5, sun: 0.3 },
};
export { THEMES };

function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- one person on the map
const SHEETS = {};
export function loadImage(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
export function registerSheet(key, img) { SHEETS[key] = img; }
// look = { sheet: key, frames: { down: [[x,y,w,h],...], up: [...], side: [...] } } (side faces right)
class Actor {
  constructor(view, look) {
    this.view = view; this.look = look; this.cache = {};
    this.cw = look.cw || 16; this.ch = look.ch || 24;
    const pw = this.cw / 16, ph = this.ch / 16; const g = new THREE.PlaneGeometry(pw, ph); g.translate(0, ph / 2, 0);
    this.mat = new THREE.MeshLambertMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(0x404040) });
    // people use the soft blob below them only: a cast shadow from a flat sprite flickers as walk frames change
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.castShadow = false;
    view.group.add(this.mesh);
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.32, 12), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false }));
    b.rotation.x = -Math.PI / 2; this.blob = b; view.group.add(b);
    this.set('down', 0);
  }
  frameTex(dir, i) {
    const k = dir + i; if (this.cache[k]) return this.cache[k];
    const L = this.look, list = L.frames[dir] || L.frames.down, f = list[i % list.length];
    const img = SHEETS[f[5] || L.sheet]; const W = this.cw, H = this.ch; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    if (img) { x.imageSmoothingEnabled = false; const flip = f[4]; if (flip) { x.translate(W, 0); x.scale(-1, 1); } x.drawImage(img, f[0], f[1], f[2], f[3], Math.floor((W - f[2]) / 2), H - f[3], f[2], f[3]);
      const lg = f[6]; if (lg) { const n = lg.rows, dx = Math.floor((W - f[2]) / 2); x.clearRect(dx, H - n, f[2], n); if (lg.mirror) { x.save(); x.translate(2 * dx + f[2], 0); x.scale(-1, 1); } x.drawImage(img, lg.x, lg.y + f[3] - n, f[2], n, dx, H - n, f[2], n); if (lg.mirror) x.restore(); } }
    return (this.cache[k] = texOf(c));
  }
  set(dir, i) {
    let d = dir, flip = false; if (dir === 'left') { d = 'side'; flip = true; } else if (dir === 'right') d = 'side';
    const t = this.frameTex(d, i); if (this.mat.map !== t) { this.mat.map = t; this.mat.emissiveMap = t; this.mat.needsUpdate = true; if (this.mesh.customDepthMaterial) { this.mesh.customDepthMaterial.map = t; this.mesh.customDepthMaterial.needsUpdate = true; } }
    const s = this.look.scale || 1; this.mesh.scale.x = flip ? -s : s;
  }
  place(x, z, y = 0) { this.mesh.position.set(x + 0.5, y, z + 0.5); this.blob.position.set(x + 0.5, 0.01 + y, z + 0.5); }
  // stand upright (so the head never sinks into a wall behind) and stretch to undo the camera's foreshortening
  face(tilt) { this.mesh.rotation.x = 0; this.mesh.scale.y = (this.look.scale || 1) / Math.cos(tilt); }
  visible(v) { this.mesh.visible = v; this.blob.visible = v; }
  dispose() { this.view.group.remove(this.mesh); this.view.group.remove(this.blob); this.mat.dispose(); for (const t of Object.values(this.cache)) t.dispose(); }
}
