// Front-view one-on-one battles in pure 8-bit style. Rounds: the hero picks a command, then hero and foe act in
// order of agility (with a little luck). Everything the foe does goes through the same rules as the hero.
// Presentation: every blow is drawn on the 160x120 stage in NES colours with whole-pixel shapes (saber arcs, sparks,
// qi orbs, claws, jaws...), from pools that are filled once per battle so the 60 fps loop allocates nothing.
import { ENEMIES, SKILLS, ITEMS, ART_OF } from './data.js?v=9';
import { ENEMY_ART } from './enemy_art.js?v=9';
import { CAST } from './people_art.js?v=9';
import * as R from './rules.js?v=9';
import { t, STR } from './ui.js?v=9';
import { hex, NES } from './tiles.js?v=9';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imgs = {};
function img(src) { if (!imgs[src]) { imgs[src] = new Image(); imgs[src].src = src; } return imgs[src]; }
export function preloadBattleArt() { img('assets/enemies.png?v=9'); for (const c of Object.values(CAST)) img(c.portrait); }

const SCENES = {   // backdrop strip colours (NES indexes): sky, far, near
  grass: [0x21, 0x1A, 0x0A], forest: [0x0A, 0x0B, 0x1A], hill: [0x21, 0x19, 0x09], sand: [0x31, 0x27, 0x17], swamp: [0x0C, 0x0B, 0x04],
  snow: [0x31, 0x30, 0x10], cave: [0x0D, 0x00, 0x2D], tower: [0x07, 0x16, 0x28], tomb: [0x08, 0x18, 0x07], lair: [0x03, 0x04, 0x13],
  sea: [0x02, 0x12, 0x11], fort: [0x2D, 0x07, 0x17], town: [0x21, 0x1A, 0x0A], ice: [0x11, 0x21, 0x31],
};
const PI = Math.PI, TAU = PI * 2;
const COLS = NES.map((_, i) => hex(i));            // NES index -> css colour, built once
const R3 = (v) => Math.round(v * 3) / 3;
const easeOut = (q) => 1 - (1 - q) * (1 - q);            // snap to a whole device pixel (the stage is stored at 3x)
// palettes (NES indexes), shared constants so spawning an effect allocates nothing but its own small option object
const ARC_PAL = { cut: [0x30, 0x31, 0x21, 0x11], crit: [0x30, 0x38, 0x28, 0x27], whiff: [0x10, 0x00, 0x2D, 0x2D] };
const QI = [0x21, 0x31, 0x30], QI2 = [0x11, 0x21, 0x31, 0x30], FIRE = [0x16, 0x27, 0x38], FIRE2 = [0x06, 0x16, 0x28], MIST = [0x14, 0x24, 0x29];
const SPARK = [0x30, 0x38, 0x31, 0x28], CRITSPARK = [0x30, 0x28, 0x27, 0x16, 0x38], BOOM = [0x30, 0x38, 0x28, 0x27, 0x16, 0x06];
const GREEN = [0x2A, 0x39, 0x30, 0x1A], BLUE = [0x21, 0x31, 0x30, 0x11], GOLD = [0x28, 0x38, 0x30, 0x27], PURPLE = [0x24, 0x34, 0x14, 0x30];
const GREYS = [0x10, 0x00, 0x2D], RED = [0x16, 0x06, 0x30], DUST = [0x17, 0x27, 0x10, 0x00];

// ---------------------------------------------------------------- crisp text sprites (Cubic 11 at its native 12px)
const TXT = new Map(); let mctx = null;
function txt(s, c) {
  const key = s + '/' + c; let cv = TXT.get(key); if (cv) return cv;
  if (!mctx) { mctx = document.createElement('canvas').getContext('2d'); mctx.font = '12px Cubic11, monospace'; }
  const W = Math.ceil(mctx.measureText(s).width) + 4, H = 16;
  cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.font = '12px Cubic11, monospace'; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(s, 2, 2);
  try {
    const id = g.getImageData(0, 0, W, H), d = id.data, on = new Uint8Array(W * H), n = NES[c], r = n >> 16 & 255, gg = n >> 8 & 255, b = n & 255;
    for (let i = 0; i < W * H; i++) on[i] = d[i * 4 + 3] >= 110 ? 1 : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4;
      if (on[i]) { d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255; continue; }
      let edge = 0;   // a one-pixel black outline, like the NES damage digits
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && on[Y * W + X]) { edge = 1; break; } }
      d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = edge ? 255 : 0;
    }
    g.putImageData(id, 0, 0);
  } catch (e) {}
  TXT.set(key, cv); return cv;
}

export async function battle(G, foeId, opts = {}) {
  const ui = G.ui, au = G.audio, h = G.hero, E = ENEMIES[foeId];
  (G.stats.seen = G.stats.seen || {})[foeId] = 1;   // for the bestiary
  const foe = { id: foeId, ...E, hp: E.hp, maxHp: E.hp, mp: E.mp ?? 999, items: E.items || 0, sleep: 0, sealed: false, guard: 1, fled: false };
  const me = { sleep: 0, sealed: false, guard: 1 };
  const fname = t(E);
  const fast = G.fast;
  const wait = (ms) => (fast ? Promise.resolve() : sleep(ms));

  // ---------------------------------------------------------------- the screen
  const root = document.getElementById('battle'); root.innerHTML = ''; root.classList.remove('hidden');
  const el = (tag, cls, p = root) => { const e = document.createElement(tag); e.className = cls; p.appendChild(e); return e; };
  const stage = el('div', 'win bstage'); const cv = el('canvas', 'bcanvas', stage); cv.width = 480; cv.height = 360; const cx = cv.getContext('2d'); cx.setTransform(3, 0, 0, 3, 0, 0); cx.imageSmoothingEnabled = false;   // drawn at 160x120, stored at 3x so pictures can use whole device pixels
  const stat = el('div', 'win bstat'); const sbody = el('div', 'sbody', stat); const snum = el('div', 'snum', stat); for (let i = 0; i < 6; i++) el('i', 'spk', stat);
  const log = el('div', 'win blog'); const lines = [];
  const drawStat = () => {
    const s = R.stat(h);
    const tags = (h.poison ? ' <span class="psn">' + t(['毒', 'PSN']) + '</span>' : '') + (me.sleep ? ' <span class="pin">' + t(['定', 'PIN']) + '</span>' : '') + (me.sealed ? ' <span class="sea">' + t(['封', 'SEAL']) + '</span>' : '');
    sbody.innerHTML = `<div class="bname">${t(['奕叡', 'Yi Rui'])}${tags}</div><div>${t('lv')} ${h.lv}</div><div class="${h.hp <= s.maxHp / 4 ? 'low' : ''}">${t('hp')} ${h.hp}/${s.maxHp}</div><div>${t('mp')} ${h.mp}/${s.maxMp}</div>`;
    stat.classList.toggle('danger', h.hp <= s.maxHp / 4); stat.classList.toggle('guarded', me.guard > 1);
  };
  const say = async (zh, en, ms = 420) => { if (G.ui.driver && G.ui.driver.onLog) G.ui.driver.onLog(zh); lines.push(t([zh, en])); while (lines.length > 4) lines.shift(); log.innerHTML = lines.map((l) => `<div>${l}</div>`).join(''); await wait(ms); };
  const waitA = () => new Promise((res) => { if (G.ui.driver || fast) return res(); const off = G.input.push((k) => { if (k === 'A' || k === 'B') { off(); res(); } }); });

  // enemy picture
  const scene = SCENES[opts.scene] || SCENES.grass;
  let art = null, src = null;
  if (E.por) { src = img(CAST[E.por].portrait); art = { x: 0, y: 0, w: 48, h: 56, por: 1 }; }
  else { src = img('assets/enemies.png?v=9'); art = ENEMY_ART[ART_OF(foeId)]; }
  // whole device pixels per art pixel (k/3 on the 160x120 stage); bigger pictures step down so they always fit
  // a third larger than 1:1 on the 160x120 stage, so the foe fills about two thirds of the black area
  const k = art.por ? 4 : Math.max(3, Math.min(4, Math.floor(276 / art.h), Math.floor(468 / art.w)));
  const W0 = art.w * k / 3, H0 = art.h * k / 3;
  const FCY = Math.max(28, 73 - H0 / 2) + H0 / 2, FCX = 80, FTOP = FCY - H0 / 2;   // the foe's centre and top on the stage
  const sx0 = art.por ? 0 : art.x, sy0 = art.por ? 0 : art.y;
  let sil = null, silTried = false;   // the foe as a white silhouette (hit flash)
  function makeSil() {
    silTried = true;
    try {
      const c = document.createElement('canvas'); c.width = art.w; c.height = art.h; const g = c.getContext('2d');
      g.drawImage(src, sx0, sy0, art.w, art.h, 0, 0, art.w, art.h);
      const id = g.getImageData(0, 0, art.w, art.h), d = id.data;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 0 && d[i] + d[i + 1] + d[i + 2] > 60) { d[i] = d[i + 1] = d[i + 2] = 252; d[i + 3] = 255; } else d[i + 3] = 0; }
      g.putImageData(id, 0, 0); sil = c;
    } catch (e) { sil = null; }
  }
  const NSTRIP = Math.ceil(art.w / 2), thr = new Float32Array(NSTRIP);

  // ---------------------------------------------------------------- effect pools (filled once)
  // fx: foe picture state. white = hit-stop silhouette, blink = white/normal flicker, kx/ky = knock-back,
  // lunge = the foe's forward step, diss = dissolve 0..1, scr = full-stage flash
  const fx = { alpha: 1, shake: 0, white: 0, blink: 0, kx: 0, ky: 0, lunge: 0, diss: 0, dissRate: 0, scr: 0, scrC: 0x30, flee: 0, dodge: 0, ddir: 1 };
  const NP = 300, P = []; for (let i = 0; i < NP; i++) P.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, g: 0, dr: 0, life: 0, c: 0, s: 1, k: 0 });
  let pi = 0;
  function part(x, y, vx, vy, life, c, s = 1, g = 0, dr = 0, kind = 0) {
    for (let n = 0; n < NP; n++) { pi = (pi + 1) % NP; const p = P[pi]; if (!p.on) { p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.c = c; p.s = s; p.g = g; p.dr = dr; p.k = kind; return p; } }
    return null;
  }
  const burst = (cols, n = 24, x = 80, y = 70, sp = 60, up = 0, s = 2, life = 0.4, g = 0, kind = 0) => {
    if (fast) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.3 + Math.random()); part(x, y, Math.cos(a) * v, Math.sin(a) * v - up, life * (0.6 + Math.random() * 0.8), cols[i % cols.length], s, g, 2.5, kind); }
  };
  const NF = 28, F = []; for (let i = 0; i < NF; i++) F.push({ on: false, type: '', t: 0, dur: 1, x: 0, y: 0, x1: 0, y1: 0, r: 0, r1: 0, a0: 0, a1: 0, s: 1, v: 0, p: null, acc: 0, pts: new Float32Array(24) });
  function add(type, dur, o, delay = 0) {
    if (fast) return null;
    let e = null; for (const f of F) if (!f.on) { e = f; break; } if (!e) e = F[0];
    e.on = true; e.type = type; e.t = -delay; e.dur = dur; e.acc = 0;
    e.x = o.x ?? 80; e.y = o.y ?? FCY; e.x1 = o.x1 ?? 80; e.y1 = o.y1 ?? 118; e.r = o.r ?? 4; e.r1 = o.r1 ?? 4; e.a0 = o.a0 ?? 0; e.a1 = o.a1 ?? 0; e.s = o.s ?? 1; e.v = o.v ?? 0; e.p = o.p || QI;
    if (type === 'bolt') { let x = e.x1 + (Math.random() - 0.5) * 30; for (let i = 0; i < 12; i++) { const f = i / 11; e.pts[i * 2] = i === 11 ? e.x1 : x; e.pts[i * 2 + 1] = f * e.y1; x += (Math.random() - 0.5) * 22; x += (e.x1 - x) * 0.25; } }
    return e;
  }
  const NT = 6, TX = []; for (let i = 0; i < NT; i++) TX.push({ on: false, a: null, b: null, x: 0, y: 0, t: 0, sc: 1 });
  function pop(s, c, x = FCX, y = FCY - 6, sc = 4 / 3, c2 = -1) {   // a damage number over the foe
    if (fast) return;
    let o = TX[0]; for (const q of TX) { if (!q.on) { o = q; break; } if (q.t > o.t) o = q; }
    o.on = true; o.a = txt(String(s), c); o.b = c2 >= 0 ? txt(String(s), c2) : o.a; o.x = x; o.y = y; o.t = 0; o.sc = sc;
  }

  // ---------------------------------------------------------------- pixel drawing helpers (whole stage pixels)
  const fill = (c) => { cx.fillStyle = COLS[c]; };
  const px = (x, y, s = 1) => cx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
  function line(x0, y0, x1, y1, s = 1) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) { const f = i / n; px(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, s); } }
  function disc(x, y, r) { x = Math.round(x); y = Math.round(y); r = Math.max(0, Math.round(r)); for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35); cx.fillRect(x - w, y + dy, 2 * w + 1, 1); } }
  function circ(x, y, r) { const n = Math.max(8, Math.ceil(r * 6.3)); for (let i = 0; i < n; i++) { const a = i / n * TAU; cx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1); } }
  function star(x, y, r, c1, c2) {   // a four-point spark
    x = Math.round(x); y = Math.round(y); r = Math.round(r);
    fill(c2); const d = Math.round(r * 0.55); for (let i = 1; i <= d; i++) { cx.fillRect(x - i, y - i, 1, 1); cx.fillRect(x + i, y - i, 1, 1); cx.fillRect(x - i, y + i, 1, 1); cx.fillRect(x + i, y + i, 1, 1); }
    fill(c1); cx.fillRect(x - r, y, 2 * r + 1, 1); cx.fillRect(x, y - r, 1, 2 * r + 1); cx.fillRect(x - 1, y - 1, 3, 3);
  }
  const blinkOn = (t2, hz = 15) => (Math.floor(t2 * hz) & 1) === 0;

  // ---------------------------------------------------------------- the frame
  let alive = true, raf = 0, last = performance.now(), T = 0;
  function drawFoe() {
    let kk = k, dy = 0;
    if (fx.lunge > 0) { const u = fx.lunge; if (u > 0.30) dy = -2; else if (u > 0.08) { kk = k + 1; dy = 5; } else dy = 1; }
    const w = art.w * kk / 3, hh = art.h * kk / 3, sp = kk / 3;
    const dg = fx.dodge > 0 ? fx.ddir * 18 * (fx.dodge > 0.34 ? (0.42 - fx.dodge) / 0.08 : fx.dodge > 0.14 ? 1 : fx.dodge / 0.14) : 0;   // a sidestep: out fast, hold, back
    const x0 = R3(FCX - w / 2 + fx.kx + Math.round(dg) + (fx.shake > 0 ? Math.random() * 4 - 2 : 0)), y0 = R3(FCY - hh / 2 + dy + fx.ky);
    const white = fx.white > 0 || (fx.blink > 0 && blinkOn(fx.blink, 15));
    if (white && !sil) return;   // no silhouette available: the old blink
    const S = white ? sil : src, sx = white ? 0 : sx0, sy = white ? 0 : sy0;
    cx.globalAlpha = fx.alpha;
    if (fx.diss <= 0) cx.drawImage(S, sx, sy, art.w, art.h, x0, y0, w, hh);
    else {
      // pixel-column dissolve: two-pixel strips burn away from the top at their own pace, with a white burning edge
      for (let i = 0; i < NSTRIP; i++) {
        const p = Math.min(1, Math.max(0, fx.diss * 1.7 - thr[i] * 0.7)); if (p >= 1) continue;
        const top = Math.floor(art.h * p), cw = Math.min(2, art.w - i * 2), X = x0 + i * 2 * sp, Y = y0 + top * sp;
        cx.drawImage(S, sx + i * 2, sy + top, cw, art.h - top, X, Y, cw * sp, (art.h - top) * sp);
        if (p > 0) { cx.fillStyle = COLS[(i + Math.floor(T * 20)) % 3 ? 0x30 : 0x38]; cx.fillRect(X, Y, cw * sp, sp); if (Math.random() < 0.05) part(X + sp, Y, (Math.random() - 0.5) * 20, -20 - Math.random() * 30, 0.35, SPARK[i & 3], 1, 0, 1); }
      }
    }
    cx.globalAlpha = 1;
  }
  function marks() {   // lasting states over the foe
    if (fx.alpha <= 0 || fx.diss > 0) return;
    if (foe.sleep) for (let i = 0; i < 3; i++) {
      const ph = (T * 0.9 + i / 3) % 1, s = txt(i === 1 ? 'Z' : 'z', 0x30);
      cx.drawImage(s, R3(FCX + W0 * 0.28 + ph * 8 + i * 2), R3(FTOP + 10 - ph * 16), s.width, s.height);
    }
    if (foe.sealed) {
      const x = Math.round(Math.max(4, FCX - W0 / 2 - 4)), y = Math.round(FTOP + 4 + (Math.floor(T * 2) & 1));
      fill(0x16); cx.fillRect(x - 1, y - 1, 15, 19); fill(0x38); cx.fillRect(x, y, 13, 17); const s = txt('封', 0x16); cx.drawImage(s, x - 1, y + 1);
    }
    if (foe.guard > 1) {
      const n = Math.floor(T / 0.7), ph = T % 0.7;
      if (ph < 0.18) { const a = (n * 2.39996) % TAU; star(FCX + Math.cos(a) * W0 * 0.42, FCY + Math.sin(a) * H0 * 0.42, ph < 0.09 ? 3 : 2, 0x30, 0x28); }
    }
  }
  function drawFx(e, dt) {
    e.t += dt; if (e.t < 0) return; const u = e.t / e.dur; if (u >= 1) { e.on = false; return; }
    const p = e.p;
    switch (e.type) {
      case 'arc': {   // a saber crescent: thick in the middle, a white outer edge, blue inside, and a thin afterimage
        const hp = easeOut(Math.min(1, u / 0.5)), tp = easeOut(Math.min(1, Math.max(0, (u - 0.2) / 0.8)));
        const aH = e.a0 + (e.a1 - e.a0) * hp, aT = e.a0 + (e.a1 - e.a0) * tp, span = aH - aT; if (Math.abs(span) < 0.02) break;
        const n = Math.ceil(Math.abs(span) * e.r * 1.3);
        fill(p[3]); for (let j = 0; j <= n; j++) { const a = aT + span * j / n * 0.8, rr = e.r - e.s - 3; cx.fillRect(Math.round(e.x + Math.cos(a) * rr), Math.round(e.y + Math.sin(a) * rr), 1, 1); }
        for (let band = 2; band >= 0; band--) {
          fill(p[band]);
          for (let j = 0; j <= n; j++) {
            const f = j / n, w = Math.max(1, Math.round(e.s * Math.sin(PI * Math.min(1, 0.08 + f * 0.86)))), a = aT + span * f, ca = Math.cos(a), sa = Math.sin(a);
            const d0 = band === 0 ? 0 : band === 1 ? 1 : Math.ceil(w * 0.6), d1 = band === 0 ? 1 : band === 1 ? Math.ceil(w * 0.6) : w;
            for (let d = d0; d < d1; d++) cx.fillRect(Math.round(e.x + ca * (e.r - d)), Math.round(e.y + sa * (e.r - d)), 1, 1);
          }
        }
        break;
      }
      case 'star': { if (u > 0.6 && !blinkOn(e.t)) break; star(e.x, e.y, 2 + (e.r - 2) * Math.min(1, u * 3), p[0], p[1]); break; }
      case 'orb': {   // qi gathers, then flies (with a trail) and grows or shrinks with distance
        let x = e.x, y = e.y, rad;
        if (u < e.v) { rad = 1 + (e.r - 1) * (u / e.v); if (Math.random() < 0.7) { const a = Math.random() * TAU, d = 12 + Math.random() * 6; part(x + Math.cos(a) * d, y + Math.sin(a) * d, -Math.cos(a) * d * 5, -Math.sin(a) * d * 5, 0.16, p[1 + (Math.random() * 2 | 0)], 1); } }
        else {
          const q = (u - e.v) / (1 - e.v), qe = q * q; x = e.x + (e.x1 - e.x) * qe; y = e.y + (e.y1 - e.y) * qe; rad = e.r + (e.r1 - e.r) * q;
          fill(p[0]); for (let j = 1; j <= 3; j++) { const qq = Math.max(0, q - j * 0.09), qq2 = qq * qq; disc(e.x + (e.x1 - e.x) * qq2, e.y + (e.y1 - e.y) * qq2, rad * (1 - j * 0.25)); }
        }
        for (let j = 0; j < 3; j++) { const a = T * 14 + j * 2.09, d = rad + 4; fill(p[2]); cx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 2, 2); }
        const rr = rad + (blinkOn(T, 15) ? 1 : 0);
        fill(p[0]); disc(x, y, rr + 1); fill(p[1]); disc(x, y, rr); fill(p[2]); disc(x, y, Math.max(0.5, rr - 2));
        break;
      }
      case 'beam': {   // 天河刀氣: a river of light pours down onto the foe
        const bot = e.y1, head = u < 0.22 ? bot * (u / 0.22) : bot;
        const w = u < 0.22 ? 1 : u < 0.72 ? 4 + Math.round(2 * Math.sin(T * 40)) + Math.round(4 * Math.min(1, (u - 0.22) * 8)) : Math.max(1, Math.round(10 * (1 - (u - 0.72) / 0.28)));
        const x = Math.round(e.x);
        fill(p[0]); cx.fillRect(x - w - 2, 0, 2 * w + 5, head); fill(p[1]); cx.fillRect(x - w, 0, 2 * w + 1, head); fill(p[2]); cx.fillRect(x - w + 2, 0, Math.max(1, 2 * w - 3), head); fill(p[3]); cx.fillRect(x - Math.max(0, w - 4), 0, Math.max(1, 2 * w - 7), head);
        fill(0x30); for (let j = 0; j < 5; j++) { const yy = Math.round((T * 260 + j * 23) % Math.max(1, head)); cx.fillRect(x - w - 4, yy, 2 * w + 9, 1); }
        if (u > 0.2 && u < 0.8) for (let j = 0; j < 2; j++) part(x + (Math.random() - 0.5) * 2 * w, bot - 2, (Math.random() - 0.5) * 140, -40 - Math.random() * 90, 0.35, p[1 + (j & 1) * 2], 1, 300);
        break;
      }
      case 'pt': {   // a pressure point: struck with a spark, then glows
        if (u < 0.22) { star(e.x, e.y, 3 + 6 * (u / 0.22), 0x30, 0x28); if (u < 0.08) { fill(0x30); disc(e.x, e.y, 3); } break; }
        fill(0x27); disc(e.x, e.y, 3); fill(blinkOn(T, 12) ? 0x38 : 0x28); disc(e.x, e.y, 2); fill(0x30); cx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
        if (blinkOn(T, 6)) { fill(0x38); circ(e.x, e.y, 5 + (Math.floor(T * 12) % 2)); }
        break;
      }
      case 'sealbox': {   // 封脈: a talisman square traces itself around the foe, then a cross locks it
        const r = e.r, x = Math.round(e.x), y = Math.round(e.y), L = 8 * r, n = Math.floor(L * Math.min(1, u / 0.45));
        if (u > 0.8 && !blinkOn(T)) break;
        for (let pass = 0; pass < 2; pass++) {
          fill(pass ? 0x38 : 0x16); const s = pass ? 1 : 3;
          for (let i = 0; i < n; i += 1) { const sd = Math.floor(i / (2 * r)), o = i % (2 * r) - r; const X = sd === 0 ? x + o : sd === 1 ? x + r : sd === 2 ? x - o : x - r, Y = sd === 0 ? y - r : sd === 1 ? y + o : sd === 2 ? y + r : y - o; px(X, Y, s); }
          if (u > 0.45) { const f = Math.min(1, (u - 0.45) / 0.25), d = r * f; line(x - r, y - r, x - r + 2 * d, y - r + 2 * d, s); line(x + r, y - r, x + r - 2 * d, y - r + 2 * d, s); }
        }
        break;
      }
      case 'claw': {   // three scratches tear across, toward the viewer
        if (u > 0.75 && !blinkOn(T)) break;
        for (let i = 0; i < 3; i++) {
          const f = Math.min(1, Math.max(0, (u - i * 0.1) / 0.18)); if (f <= 0) continue;
          const xa = e.x + i * 14 + 22, ya = e.y, xb = e.x + i * 14 - 10, yb = e.y + 62, xe = xa + (xb - xa) * f, ye = ya + (yb - ya) * f;
          fill(0x06); line(xa, ya, xe, ye, 5); fill(0x16); line(xa + (xb - xa) * 0.08, ya + (yb - ya) * 0.08, xe, ye, 3); fill(0x30); line(xa + (xb - xa) * 0.2, ya + (yb - ya) * 0.2, xa + (xe - xa) * 0.85, ya + (ye - ya) * 0.85, 1);
        }
        break;
      }
      case 'bite': {   // a jaw snaps shut on the viewer
        const mid = e.y, q = u < 0.42 ? (u / 0.42) * (u / 0.42) : u < 0.62 ? 1 : 1 - (u - 0.62) / 0.38 * 0.35;
        if (u > 0.7 && !blinkOn(T)) break;
        const top = -16 + (mid - 3 + 16) * q, bot = 136 - (136 - mid - 3) * q;
        fill(0x06); cx.fillRect(24, Math.round(top) - 10, 112, 10); cx.fillRect(24, Math.round(bot), 112, 10); fill(0x16); cx.fillRect(24, Math.round(top) - 2, 112, 2); cx.fillRect(24, Math.round(bot), 112, 2);
        for (let xx = 28; xx < 132; xx += 10) for (let r = 0; r < 7; r++) {
          fill(r < 2 ? 0x10 : 0x30); cx.fillRect(xx + Math.floor(r / 2), Math.round(top) + r, 8 - r, 1); cx.fillRect(xx + 5 + Math.floor(r / 2), Math.round(bot) - 1 - r, 8 - r, 1);
        }
        break;
      }
      case 'wslash': {   // a weapon cut at the viewer: grey edge, red body, white core
        const f = Math.min(1, u / 0.35), tl = Math.min(1, Math.max(0, (u - 0.3) / 0.6));
        const xa = e.x + (e.x1 - e.x) * tl, ya = e.y + (e.y1 - e.y) * tl, xb = e.x + (e.x1 - e.x) * f, yb = e.y + (e.y1 - e.y) * f;
        const n = Math.max(1, Math.ceil(Math.hypot(xb - xa, yb - ya))), nx = -(e.y1 - e.y), ny = e.x1 - e.x, nl = Math.hypot(nx, ny) || 1;
        for (let pass = 0; pass < 3; pass++) {
          fill(pass === 0 ? 0x2D : pass === 1 ? 0x16 : 0x30);
          for (let i = 0; i <= n; i++) {
            const f = i / n, g = tl + (Math.min(1, u / 0.35) - tl) * f, bow = Math.sin(PI * g) * 7, w = Math.max(1, Math.round((pass === 0 ? 7 : pass === 1 ? 4 : 1) * Math.sin(PI * Math.min(1, 0.1 + g * 0.85))));
            px(e.x + (e.x1 - e.x) * g + nx / nl * bow, e.y + (e.y1 - e.y) * g + ny / nl * bow, w);
          }
        }
        break;
      }
      case 'impact': {   // a blunt blow: a spiky burst
        if (u > 0.55 && !blinkOn(T)) break;
        const rr = e.r * Math.min(1, 0.35 + u * 4);
        for (let pass = 0; pass < 2; pass++) {
          fill(pass ? 0x30 : p[0]); const s = pass ? 1 : 3;
          for (let i = 0; i < 8; i++) { const a = i * PI / 4 + 0.2, L = (i & 1 ? 0.55 : 1) * rr * (pass ? 0.6 : 1); line(e.x, e.y, e.x + Math.cos(a) * L, e.y + Math.sin(a) * L, s); }
        }
        fill(0x30); disc(e.x, e.y, Math.max(1, rr * 0.25));
        break;
      }
      case 'arrow': {   // an arrow flies out of the picture at the viewer, growing as it comes
        const q = Math.min(1, u / 0.8), qe = q * q, x = e.x + (e.x1 - e.x) * qe, y = e.y + (e.y1 - e.y) * qe, L = 6 + 30 * qe, dx = e.x1 - e.x, dy = e.y1 - e.y, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, s = q > 0.5 ? 3 : 2, hw = 2 + 4 * qe;
        const tx = x - ux * L, ty = y - uy * L;
        fill(p[0]); line(tx, ty, x, y, s); fill(0x27); line(tx + ux * 2, ty + uy * 2, x - ux * L * 0.4, y - uy * L * 0.4, 1);
        fill(0x16); for (let k2 = 0; k2 < 3; k2++) { const bx = tx + ux * k2 * 2, by = ty + uy * k2 * 2; line(bx, by, bx - ux * hw - uy * hw, by - uy * hw + ux * hw, 1); line(bx, by, bx - ux * hw + uy * hw, by - uy * hw - ux * hw, 1); }
        fill(0x10); for (let k2 = 0; k2 <= hw; k2++) { const bx = x - ux * k2 * 1.5, by = y - uy * k2 * 1.5, w2 = k2 * 0.8; line(bx - uy * w2, by + ux * w2, bx + uy * w2, by - ux * w2, 1); }
        fill(0x30); px(x, y, 2);
        break;
      }
      case 'sting': {   // a quick needle jab
        const ex = u < 0.4 ? u / 0.4 : u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4, x = e.x + (e.x1 - e.x) * ex, y = e.y + (e.y1 - e.y) * ex;
        fill(0x07); line(e.x, e.y, x, y, 4); fill(p[0]); line(e.x, e.y, x, y, 2); fill(0x30); line(e.x + (x - e.x) * 0.6, e.y + (y - e.y) * 0.6, x, y, 1);
        if (ex > 0.95) star(x, y, 7, 0x30, p[1]);
        break;
      }
      case 'bolt': {   // a thunderclap from the sky
        if (!blinkOn(T, 12) && u > 0.35) break;
        const n = Math.min(11, Math.floor(u / 0.15 * 11) + 1);
        for (let pass = 0; pass < 3; pass++) { fill(pass === 2 ? 0x30 : pass ? p[0] : 0x27); for (let i = 0; i < n; i++) line(e.pts[i * 2], e.pts[i * 2 + 1], e.pts[i * 2 + 2], e.pts[i * 2 + 3], pass === 2 ? 1 : pass ? 3 : 5); }
        break;
      }
      case 'breath': {   // fire breath: a widening cone of flame toward the viewer
        e.acc += dt * 420; while (e.acc > 1) { e.acc--; const a = PI / 2 + (Math.random() - 0.5) * 1.3, v = 150 + Math.random() * 110; part(e.x + (Math.random() - 0.5) * 4, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.4 + Math.random() * 0.25, p[Math.random() * 3 | 0], 3 + (Math.random() < 0.4 ? 1 : 0), -80, 0.6); }
        fill(0x30); disc(e.x, e.y + 2, 3 + (blinkOn(T, 15) ? 1 : 0)); fill(0x38); disc(e.x, e.y + 2, 2);
        break;
      }
      case 'bubbles': {   // poison mist / spores: bubbles drifting up over the stage
        e.acc += dt * e.v; while (e.acc > 1) { e.acc--; part(e.x + (Math.random() - 0.5) * e.r * 2, e.y - Math.random() * 55, (Math.random() - 0.5) * 16, -20 - Math.random() * 40, 0.5 + Math.random() * 0.5, p[Math.random() * 3 | 0], 3, -10, 0, 1); }
        break;
      }
      case 'rise': {   // sparkles rising (heal, shield, qi pill)
        e.acc += dt * e.v; while (e.acc > 1) { e.acc--; part(e.x + (Math.random() - 0.5) * e.r * 2, e.y - Math.random() * e.r * 0.7, (Math.random() - 0.5) * 6, -35 - Math.random() * 45, 0.45 + Math.random() * 0.4, p[Math.random() * p.length | 0], Math.random() < 0.55 ? 5 : Math.random() < 0.5 ? 3 : 2, 0, 0, 2); }
        if (e.s > 1) { fill(p[0]); for (let j = 0; j < 7; j++) { const x = Math.round(e.x - e.r + ((j * 37 + 11) % (2 * e.r))), yy = Math.round(e.y - ((T * 110 + j * 29) % (e.r * 1.2))); cx.fillRect(x, yy, 1, 6); fill(p[2]); cx.fillRect(x, yy, 1, 2); fill(p[0]); } }
        break;
      }
      case 'rings': {   // expanding rings (a foe's guard, a calm breath)
        for (let i = 0; i < 3; i++) { const q = (u - i * 0.18) / 0.55; if (q <= 0 || q >= 1) continue; fill(p[i % p.length]); circ(e.x, e.y, e.r + (e.r1 - e.r) * q); }
        break;
      }
    }
  }
  function draw(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    cx.fillStyle = '#000'; cx.fillRect(0, 0, 160, 120);
    // backdrop strip: sky band, a far ridge and near ground, all in NES colours, above the foe only
    cx.fillStyle = COLS[scene[0]]; cx.fillRect(0, 0, 160, 26);
    cx.fillStyle = COLS[scene[1]]; for (let x = 0; x < 160; x += 2) { const y = 14 + Math.round(Math.sin(x * 0.07) * 4 + Math.sin(x * 0.19) * 2); cx.fillRect(x, y, 2, 26 - y); }
    cx.fillStyle = COLS[scene[2]]; for (let x = 0; x < 160; x += 2) { const y = 20 + Math.round(Math.sin(x * 0.11 + 1) * 2); cx.fillRect(x, y, 2, 26 - y); }
    cx.fillStyle = '#000'; cx.fillRect(0, 26, 160, 2);
    if (src && src.complete && src.naturalWidth && art && fx.alpha > 0) { if (!silTried) makeSil(); drawFoe(); }
    marks();
    for (let i = 0; i < NF; i++) if (F[i].on) drawFx(F[i], dt);
    for (let i = 0; i < NP; i++) {
      const p = P[i]; if (!p.on) continue;
      p.life -= dt; if (p.life <= 0) { p.on = false; continue; }
      const d = Math.max(0, 1 - p.dr * dt); p.vx *= d; p.vy = p.vy * d + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life < 0.12 && !blinkOn(p.life, 15)) continue;
      const x = Math.round(p.x), y = Math.round(p.y); cx.fillStyle = COLS[p.c];
      if (p.k === 1) { cx.fillRect(x - 1, y - 2, 3, 1); cx.fillRect(x - 1, y + 2, 3, 1); cx.fillRect(x - 2, y - 1, 1, 3); cx.fillRect(x + 2, y - 1, 1, 3); cx.fillStyle = COLS[0x30]; cx.fillRect(x - 1, y - 1, 1, 1); }
      else if (p.k === 2 && p.s > 2) { const a = p.s >> 1; cx.fillRect(x - a, y, p.s, 1); cx.fillRect(x, y - a, 1, p.s); if (p.s > 3) { cx.fillStyle = COLS[0x30]; cx.fillRect(x, y, 1, 1); } }
      else cx.fillRect(x, y, p.s, p.s);
    }
    for (let i = 0; i < NT; i++) {   // damage numbers: pop up, bounce, hold, then float off blinking
      const o = TX[i]; if (!o.on) continue; o.t += dt; const tt = o.t; if (tt > 0.95) { o.on = false; continue; }
      const dy = tt < 0.07 ? -7 * tt / 0.07 : tt < 0.15 ? -7 + 6 * (tt - 0.07) / 0.08 : tt < 0.55 ? -1 : -1 - (tt - 0.55) * 22;
      if (tt > 0.7 && !blinkOn(tt, 15)) continue;
      const s = (o.a !== o.b && blinkOn(tt, 15)) ? o.b : o.a, w = s.width * o.sc, hh = s.height * o.sc;
      cx.drawImage(s, R3(Math.max(0, Math.min(160 - w, o.x - w / 2))), R3(Math.max(0, o.y + dy - hh / 2)), w, hh);
    }
    if (fx.scr > 0) { cx.fillStyle = COLS[fx.scrC]; cx.fillRect(0, 0, 160, 120); fx.scr -= dt; }
    // the foe's own timers (hit-stop holds the knock-back until it ends)
    fx.shake = Math.max(0, fx.shake - dt); fx.blink = Math.max(0, fx.blink - dt); fx.lunge = Math.max(0, fx.lunge - dt); fx.dodge = Math.max(0, fx.dodge - dt);
    if (fx.white > 0) fx.white -= dt;
    else { const back = 45 * dt; fx.kx = Math.abs(fx.kx) <= back ? 0 : fx.kx - Math.sign(fx.kx) * back; fx.ky = Math.abs(fx.ky) <= back ? 0 : fx.ky - Math.sign(fx.ky) * back; }
    if (fx.flee) fx.kx += fx.flee * dt;
    if (fx.dissRate > 0) fx.diss = Math.min(1, fx.diss + fx.dissRate * dt);
    if (alive) raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  // ---------------------------------------------------------------- hero-side effects (the status window)
  const restart = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };
  const shakeScreen = (lv = 1) => { if (fast) return; root.classList.remove('hit', 'hit2'); void root.offsetWidth; root.classList.add(lv > 1 ? 'hit2' : 'hit'); };
  const glow = (cls) => { if (fast) return; stat.classList.remove('hurt', 'glow', 'mpglow', 'shine', 'psnfl', 'pinfl'); void stat.offsetWidth; stat.classList.add(cls); };
  const heroNum = (s, cls) => { if (fast) return; snum.textContent = s; snum.className = 'snum ' + cls; restart(snum, 'go'); };
  const rnd = (a) => (Math.random() - 0.5) * a;

  drawStat();
  au.play(opts.music || (E.boss ? (opts.final ? 'final' : 'boss') : 'battle'));
  if (!fast) { root.classList.add('enter'); await sleep(300); root.classList.remove('enter'); }
  await say(E.boss ? fname + '擋在面前！' : fname + '出現了！', E.boss ? fname + ' stands in your way!' : 'A ' + fname + ' appears!');

  // ambush: a quick foe may strike first (never a boss fight's opening)
  const hs = R.stat(h);
  if (!E.boss && Math.random() < Math.max(0, (E.agi - hs.agi) / 120)) { await say(fname + '搶先出手！', fname + ' strikes first!'); await foeTurn(); }

  // ---------------------------------------------------------------- hero blows
  // three saber arcs (down-left, down-right, a rising sweep); the knock-back follows the cut
  const ARCS = [[FCX - 32, FCY - 32, 48, -0.55, 2.05, -6, 1], [FCX + 32, FCY - 32, 48, PI + 0.55, PI - 2.05, 6, 1], [FCX, FCY + 46, 50, PI + 0.4, TAU - 0.4, 0, -5]];
  const arc = (v, pal, s, dur, delay = 0, dx = 0) => { const A = ARCS[v]; add('arc', dur, { x: A[0] + dx, y: A[1], r: A[2], a0: A[3], a1: A[4], s, p: pal }, delay); };
  async function heroAttack() {
    const atk = R.heroAtk(h);
    if (Math.random() < R.CRIT) {
      const d = R.critDamage(atk);
      if (!fast) { au.sfx('slash2'); arc(0, ARC_PAL.crit, 8, 0.34); arc(1, ARC_PAL.crit, 8, 0.34, 0.1); await sleep(230); }
      return hurtFoe(d, 'crit');
    }
    const v = Math.random() * 3 | 0;
    if (Math.random() < R.dodgeChance(foe.agi, R.stat(h).agi)) {
      if (!fast) { au.sfx('whiff'); fx.dodge = 0.42; fx.ddir = v === 1 ? -1 : 1; arc(v, ARC_PAL.whiff, 4, 0.28, 0.04, v === 1 ? 14 : -14); await sleep(150); pop(t(['落空', 'MISS']), 0x30, FCX, FTOP + 16, 4 / 3); }
      return say(fname + '閃開了！', fname + ' dodges!');
    }
    if (!fast) { au.sfx('slash'); arc(v, ARC_PAL.cut, 7, 0.32); await sleep(120); }
    return hurtFoe(R.physDamage(atk, foe.def * foe.guard), 'hit', v);
  }
  // the blow lands: white hit-stop, sparks, knock-back, the number
  async function impact(d, how, v = 0) {
    if (fast) return;
    const crit = how === 'crit', big = crit || how === 'qi2';
    const x = FCX + rnd(10), y = FCY + rnd(12);
    au.sfx(crit ? 'crit' : how === 'qi' || how === 'qi2' ? 'boom' : 'hit');
    fx.white = big ? 0.11 : 0.065;
    add('star', big ? 0.32 : 0.24, { x, y, r: big ? 14 : 10, p: crit ? CRITSPARK : SPARK });
    burst(crit ? CRITSPARK : how === 'qi' || how === 'qi2' ? QI2 : SPARK, big ? 40 : 22, x, y, big ? 140 : 100, 0, 2, big ? 0.45 : 0.32, 120);
    if (big) { fx.scr = 0.05; fx.scrC = 0x30; shakeScreen(2); }
    await sleep(big ? 100 : 60);   // hit-stop
    fx.kx = crit ? 9 : how === 'hit' ? ARCS[v][5] || 0 : 0; fx.ky = crit ? -4 : how === 'hit' ? ARCS[v][6] : -4; fx.shake = big ? 0.25 : 0.14;
    if (how === 'qi' || how === 'qi2') fx.kx = 0;
    pop(d, crit ? 0x28 : 0x30, FCX, FTOP + 16, crit || how === 'qi2' ? 5 / 3 : 4 / 3, crit ? 0x27 : -1);
  }
  async function hurtFoe(d, how = 'hit', v = 0) {
    if (d <= 0) { au.sfx(fast ? 'miss' : 'tink'); if (!fast) { add('star', 0.18, { x: FCX + rnd(10), y: FCY + rnd(10), r: 5, p: GREYS }); pop('0', 0x30, FCX, FTOP + 16); } return say('沒有造成傷害！', 'No damage!'); }
    await impact(d, how, v);
    foe.hp = Math.max(0, foe.hp - d);
    if (foe.sleep && Math.random() < 0.4) { foe.sleep = 0; }
    if (how === 'crit') await say('會心一擊！', 'A critical blow!', 250);
    await say(fname + '受到' + d + '點傷害！', fname + ' takes ' + d + ' damage!');
  }
  // ---------------------------------------------------------------- foe blows
  async function hurtHero(d, crit = false, col = 0x30) {
    if (d <= 0) { au.sfx('miss'); heroNum('0', 'white'); return say('奕叡沒有受傷！', 'Yi Rui is unhurt!'); }
    au.sfx('hurt'); shakeScreen(crit || d >= R.stat(h).maxHp / 4 ? 2 : 1); glow('hurt');
    if (crit && !fast) { fx.scr = 0.07; fx.scrC = 0x16; }
    h.hp = Math.max(0, h.hp - d); drawStat(); heroNum('-' + d, crit ? 'crit' : 'red');
    await say('奕叡受到' + d + '點傷害！', 'Yi Rui takes ' + d + ' damage!');
  }
  // the foe steps forward while it announces the blow; returns once the blow's picture is under way
  async function foeBlow(kind, line) {
    if (!fast) fx.lunge = 0.36;
    await line;
    if (fast) return;
    const mc = E.mc || QI, mx = FCX + rnd(16), my = FCY + 4;
    switch (kind) {
      case 'claw': au.sfx('claw'); add('claw', 0.34, { x: 46 + rnd(10), y: 36 }); await sleep(170); break;
      case 'bite': au.sfx('bite'); add('bite', 0.36, { y: 72 }); await sleep(160); fx.scr = 0.03; fx.scrC = 0x06; break;
      case 'ram': au.sfx('blunt'); fx.lunge = Math.max(fx.lunge, 0.2); add('impact', 0.3, { x: 80 + rnd(20), y: 92, r: 22, p: GOLD }); burst(DUST, 14, 80, 104, 70, 20, 2, 0.4, 120); await sleep(120); break;
      case 'blunt': au.sfx('blunt'); add('impact', 0.3, { x: 80 + rnd(30), y: 92 + rnd(8), r: 26, p: GOLD }); burst(GOLD, 12, 80, 96, 90, 0, 2, 0.3); await sleep(120); break;
      case 'sting': au.sfx('sting'); for (let i = 0; i < 3; i++) add('sting', 0.14, { x: mx, y: my, x1: 60 + i * 20 + rnd(8), y1: 100 + rnd(10), p: [0x28, 0x38] }, i * 0.07); await sleep(220); break;
      case 'arrow': au.sfx('arrow'); add('arrow', 0.24, { x: mx, y: FCY - 4, x1: 80 + rnd(24), y1: 106, p: [0x17] }); await sleep(200); add('star', 0.22, { x: 80, y: 106, r: 10, p: SPARK }); burst(SPARK, 12, 80, 106, 90, 0, 2, 0.3); break;
      case 'magic': au.sfx('magic'); add('orb', 0.34, { x: mx, y: my, x1: 80 + rnd(20), y1: 104, r: 5, r1: 13, v: 0.4, p: mc }); await sleep(320); add('rings', 0.3, { x: 80, y: 104, r: 4, r1: 40, p: mc }); burst(mc, 28, 80, 104, 110, 0, 2, 0.4); break;
      case 'spore': au.sfx('bubble'); add('bubbles', 0.45, { x: 80, y: 116, r: 64, v: 170, p: mc }); await sleep(260); break;
      default: au.sfx('slash'); { const l2r = Math.random() < 0.5; add('wslash', 0.3, { x: l2r ? 34 : 126, y: 34 + rnd(10), x1: l2r ? 128 : 32, y1: 112 }); } await sleep(130);
    }
  }
  // a foe's art aimed at the hero
  async function foeArt(k) {
    if (fast) return;
    const mc = E.mc, x = FCX + rnd(10), y = FCY + 2;
    if (foeId === 'bx_crow' && (k === 'fire' || k === 'fire2')) { au.sfx('breath'); add('breath', 0.55, { x: FCX, y: FTOP + H0 * 0.3, p: FIRE }); await sleep(520); fx.scr = 0.04; fx.scrC = 0x27; return; }
    if (foeId === 'e_thundersprite' && k === 'fire') { au.sfx('charge'); await sleep(150); au.sfx('thunder'); add('bolt', 0.4, { x1: 80 + rnd(20), y1: 112, p: [0x28] }); fx.scr = 0.04; fx.scrC = 0x30; await sleep(130); fx.scr = 0.04; fx.scrC = 0x38; await sleep(160); return; }
    if (k === 'mist') { au.sfx('bubble'); add('bubbles', 0.55, { x: 80, y: 116, r: 72, v: 220, p: mc || MIST }); await sleep(400); return; }
    if (k === 'fire' || k === 'fire2') {
      const p = mc || (k === 'fire2' ? FIRE2 : FIRE), big = k === 'fire2';
      au.sfx('charge'); add('orb', big ? 0.5 : 0.38, { x, y, x1: 80, y1: 104, r: big ? 6 : 4, r1: big ? 18 : 13, v: 0.45, p }); await sleep(big ? 480 : 360);
      au.sfx('fire'); burst(p, big ? 40 : 26, 80, 104, big ? 120 : 90, 30, 2, 0.45, 60); if (big) { fx.scr = 0.05; fx.scrC = p[1]; } return;
    }
    // qi / qi2 in a foe's hands: its own coloured orb, a big one with a flash for qi2
    const p = mc || QI, big = k === 'qi2';
    au.sfx('charge'); add('orb', big ? 0.5 : 0.36, { x, y, x1: 80 + rnd(16), y1: 104, r: big ? 6 : 4, r1: big ? 18 : 13, v: 0.45, p }); await sleep(big ? 480 : 340);
    au.sfx(big ? 'release' : 'magic'); burst(p, big ? 40 : 24, 80, 104, big ? 130 : 90, 0, 2, 0.4); if (big) { fx.scr = 0.06; fx.scrC = 0x30; }
  }
  // ---------------------------------------------------------------- healing and guarding pictures
  function heroHeal(kind, v) {   // kind: hp | mp | cure | big
    if (fast) return;
    const pal = kind === 'mp' ? BLUE : kind === 'cure' ? PURPLE : GREEN;
    au.sfx('chime'); add('rise', kind === 'big' ? 0.8 : 0.6, { x: 80, y: 120, r: 66, v: kind === 'big' ? 170 : 120, s: 2, p: pal });
    glow(kind === 'mp' ? 'mpglow' : kind === 'cure' ? 'psnfl' : 'glow');
    if (v != null) heroNum('+' + v, kind === 'mp' ? 'blue' : 'green');
  }
  function foeHeal(v) {
    if (fast) return;
    au.sfx('chime'); add('rise', 0.6, { x: FCX, y: FCY + H0 / 2, r: W0 * 0.45, v: 110, p: GREEN }); add('rings', 0.6, { x: FCX, y: FCY, r: 6, r1: W0 * 0.6, p: GREEN });
    fx.blink = 0.15; pop('+' + v, 0x2A, FCX, FTOP + 16);
  }

  // ---------------------------------------------------------------- actions
  async function useSkill(user, k, target) {   // user: 'hero' | 'foe'
    const S = SKILLS[k], isHero = user === 'hero';
    const uname = isHero ? t(['奕叡', 'Yi Rui']) : fname;
    const nm = (!isHero && E.skName && E.skName[k]) ? E.skName[k] : [S.zh, S.en];
    if (isHero) h.mp -= S.mp; else if (S.mp) foe.mp -= S.mp;
    drawStat();
    const line = say(uname + '使出了「' + nm[0] + '」！', uname + ' uses ' + nm[1] + '!', 300);
    if (!isHero && !fast && (S.kind === 'hurt' || S.kind === 'sleep' || S.kind === 'seal')) fx.lunge = 0.36;
    await line;
    if (S.kind === 'heal') {
      const v = R.skillRoll(k);
      if (isHero) { const mx = R.stat(h).maxHp; const before = h.hp; h.hp = Math.min(mx, h.hp + v); drawStat(); heroHeal(k === 'heal2' ? 'big' : 'hp', h.hp - before); return say('體力回復了' + (h.hp - before) + '點。', 'Recovered ' + (h.hp - before) + ' HP.'); }
      const before = foe.hp; foe.hp = Math.min(foe.maxHp, foe.hp + v); foeHeal(foe.hp - before); return say(fname + '回復了' + (foe.hp - before) + '點體力。', fname + ' recovers ' + (foe.hp - before) + ' HP.');
    }
    if (S.kind === 'hurt') {
      const v = R.skillRoll(k);
      if (isHero) {
        if (!fast && k === 'qi2') { au.sfx('charge'); add('rise', 0.3, { x: 80, y: 120, r: 50, v: 80, p: QI2 }); await sleep(160); au.sfx('beam'); add('beam', 0.46, { x: FCX, y1: FCY + H0 * 0.3, p: QI2 }); await sleep(300); }
        else if (!fast) { au.sfx('charge'); add('orb', 0.38, { x: 80, y: 110, x1: FCX, y1: FCY, r: 8, r1: 4, v: 0.45, p: QI }); await sleep(360); au.sfx('release'); add('rings', 0.3, { x: FCX, y: FCY, r: 3, r1: 26, p: QI2 }); burst(QI2, 36, FCX, FCY, 120, 0, 2, 0.4); }
        return hurtFoe(v, k === 'qi2' ? 'qi2' : 'qi');
      }
      await foeArt(k);
      await hurtHero(v, false);
      if (S.poison && !h.poison && h.hp > 0 && Math.random() < 0.5) { h.poison = true; poisonFx(); drawStat(); await say('奕叡中毒了！', 'Yi Rui is poisoned!'); }
      return;
    }
    if (S.kind === 'sleep') {
      if (isHero) {
        if (!fast) { for (let i = 0; i < 3; i++) { add('pt', 0.6 - i * 0.08, { x: FCX + rnd(W0 * 0.5), y: FCY + rnd(H0 * 0.5) }, i * 0.08); } au.sfx('point'); await sleep(80); au.sfx('point'); await sleep(80); au.sfx('point'); await sleep(200); }
        if (Math.random() < 1 - (foe.res || 0) * 0.9) { foe.sleep = 1; au.sfx('zz'); fx.blink = 0.12; return say(fname + '被點中穴道，動彈不得！', fname + ' is frozen by the strike!'); }
        au.sfx('miss'); burst(GREYS, 12, FCX, FCY, 50); return say('但是沒有效果。', 'But it has no effect.');
      }
      if (!fast) { for (let i = 0; i < 3; i++) add('pt', 0.35, { x: 50 + i * 30 + rnd(8), y: 96 + rnd(10) }, i * 0.07); au.sfx('point'); await sleep(260); }
      if (Math.random() < 0.7) { me.sleep = 1; au.sfx('zz'); glow('pinfl'); drawStat(); return say('奕叡被點中穴道，動彈不得！', 'Yi Rui is frozen by the strike!'); }
      au.sfx('miss'); return say('奕叡運氣衝開了穴道！', 'Yi Rui forces the point open!');
    }
    if (S.kind === 'seal') {
      if (isHero) {
        if (!fast) { au.sfx('sealfx'); add('sealbox', 0.5, { x: FCX, y: FCY, r: Math.round(Math.min(W0, H0) * 0.42) }); await sleep(420); }
        if (Math.random() < 1 - (foe.res || 0) * 0.9) { foe.sealed = true; au.sfx('skill'); fx.blink = 0.12; return say(fname + '的經脈被封住了！', fname + '\'s meridians are sealed!'); }
        au.sfx('miss'); burst(GREYS, 12, FCX, FCY, 50); return say('但是沒有效果。', 'But it has no effect.');
      }
      if (!fast) { au.sfx('sealfx'); add('sealbox', 0.5, { x: 80, y: 76, r: 34 }); await sleep(420); }
      if (Math.random() < 0.6) { me.sealed = true; au.sfx('skill'); glow('pinfl'); drawStat(); return say('奕叡的經脈被封住了！', 'Yi Rui\'s meridians are sealed!'); }
      au.sfx('miss'); return say('但是沒有效果。', 'But it has no effect.');
    }
    if (S.kind === 'guard') {
      au.sfx(fast ? 'heal' : 'shield');
      if (isHero) {
        if (me.guard > 1) return say('已經護住全身了。', 'Already guarded.');
        me.guard = 1.5; drawStat(); if (!fast) { glow('shine'); add('rise', 0.7, { x: 80, y: 120, r: 66, v: 130, s: 2, p: GOLD }); add('rings', 0.6, { x: 80, y: 118, r: 8, r1: 70, p: GOLD }); }
        return say('奕叡全身如金鐘罩體！', 'Yi Rui\'s body turns hard as bronze!');
      }
      if (foe.guard > 1) return say('但是沒有變化。', 'But nothing changes.'); foe.guard = 1.5;
      if (!fast) { add('rings', 0.6, { x: FCX, y: FCY, r: 4, r1: Math.max(W0, H0) * 0.6, p: GOLD }); burst(GOLD, 20, FCX, FCY, 70); fx.blink = 0.2; }
      return say(fname + '的防禦提高了！', fname + '\'s defence rises!');
    }
  }
  function poisonFx() { if (fast) { au.sfx('poison'); return; } au.sfx('bubble'); add('bubbles', 0.4, { x: 80, y: 116, r: 56, v: 110, p: PURPLE }); glow('psnfl'); }
  async function useItem(id) {
    const it = ITEMS[id]; R.removeItem(h, id);
    await say('奕叡使用了' + it.zh + '。', 'Yi Rui uses the ' + it.en + '.', 300);
    if (it.heal) { au.sfx('heal'); const mx = R.stat(h).maxHp, v = R.rand(it.heal[0], it.heal[1]), b = h.hp; h.hp = Math.min(mx, h.hp + v); drawStat(); heroHeal(it.heal[0] > 100 ? 'big' : 'hp', h.hp - b); return say('體力回復了' + (h.hp - b) + '點。', 'Recovered ' + (h.hp - b) + ' HP.'); }
    if (it.mp) { au.sfx('heal'); const mx = R.stat(h).maxMp, b = h.mp; h.mp = Math.min(mx, h.mp + it.mp); drawStat(); heroHeal('mp', h.mp - b); return say('內力回復了' + (h.mp - b) + '點。', 'Recovered ' + (h.mp - b) + ' MP.'); }
    if (it.cure) { au.sfx('heal'); h.poison = false; drawStat(); heroHeal('cure', null); burst(PURPLE, 16, 80, 104, 60, 30, 1, 0.4); return say('毒解了。', 'The poison is gone.'); }
  }
  async function foeSalve() {
    foe.items--; const v = R.rand(25, 35); const b = foe.hp; foe.hp = Math.min(foe.maxHp, foe.hp + v); au.sfx('heal'); foeHeal(foe.hp - b);
    return say(fname + '吃下金創藥，回復了' + v + '點體力。', fname + ' eats a wound salve: +' + v + ' HP.');
  }
  // the foe's choice: the same options a careful player has
  async function foeTurn() {
    if (foe.hp <= 0) return;
    if (foe.sleep) { if (Math.random() < 0.34) { foe.sleep = 0; return say(fname + '的穴道解開了。', fname + ' breaks free.'); } return say(fname + '動彈不得。', fname + ' cannot move.'); }
    const s = R.stat(h);
    // flee from a far stronger hero (and the golden toad simply runs)
    if ((E.run && R.heroAtk(h) >= E.atk * 2 && Math.random() < 0.25) || (E.flee && Math.random() < E.flee)) {
      foe.fled = true; au.sfx('run'); if (!fast) { fx.flee = 420; burst(DUST, 10, FCX, FCY + H0 / 2 - 2, 40, 10, 2, 0.35); await sleep(220); } fx.alpha = 0; fx.flee = 0; return say(fname + '逃走了。', 'The ' + fname + ' runs away.');
    }
    const sk = (E.sk || []).filter(([k]) => !foe.sealed && (SKILLS[k].mp || 0) <= foe.mp);
    const low = foe.hp < foe.maxHp * 0.35;
    const has = (k) => sk.find((x) => x[0] === k);
    if (E.boss) {
      // a boss reads the fight: heal when low, pin a hero who is not pinned, seal a hero who relies on arts
      const heal = has('heal2') || has('heal');
      if (low && heal && Math.random() < 0.7) return useSkill('foe', heal[0]);
      if (low && foe.items > 0 && Math.random() < 0.6) return foeSalve();
      if (has('guard') && foe.guard === 1 && Math.random() < 0.5) return useSkill('foe', 'guard');
      if (has('sleep') && !me.sleep && Math.random() < has('sleep')[1]) return useSkill('foe', 'sleep');
      if (has('seal') && !me.sealed && G.usedArts && Math.random() < 0.4) return useSkill('foe', 'seal');
      for (const [k, p] of sk) if (SKILLS[k].kind === 'hurt' && Math.random() < p) return useSkill('foe', k);
    } else {
      if (low && foe.items > 0 && Math.random() < 0.5) return foeSalve();
      for (const [k, p] of sk) {
        const S = SKILLS[k];
        if (S.kind === 'heal' && !low) continue; if (S.kind === 'guard' && foe.guard > 1) continue; if (S.kind === 'sleep' && me.sleep) continue; if (S.kind === 'seal' && me.sealed) continue;
        if (Math.random() < p) return useSkill('foe', k);
      }
    }
    // a plain attack
    const dodged = Math.random() < R.dodgeChance(s.agi, foe.agi);
    if (dodged) {
      if (!fast) fx.lunge = 0.36;
      await say(fname + '攻擊！', fname + ' attacks!', 220);
      au.sfx(fast ? 'miss' : 'whiff'); heroNum(t(['落空', 'MISS']), 'white');
      return say('奕叡閃開了！', 'Yi Rui dodges!');
    }
    const crit = Math.random() < R.CRIT;
    await foeBlow(E.atkFx, say(fname + '攻擊！', fname + ' attacks!', 220));
    if (crit) { if (!fast) { fx.scr = 0.06; fx.scrC = 0x30; } au.sfx('crit'); await say('致命的一擊！', 'A deadly blow!', 200); }
    const d = crit ? R.critDamage(foe.atk) : R.physDamage(foe.atk, R.heroDef(h) * me.guard);
    await hurtHero(d, crit);
    if (E.poison && !h.poison && h.hp > 0 && Math.random() < E.poison) { h.poison = true; poisonFx(); drawStat(); await say('奕叡中毒了！', 'Yi Rui is poisoned!'); }
  }
  async function heroTurn(cmd) {
    if (me.sleep) { if (Math.random() < 0.5) { me.sleep = 0; drawStat(); await say('奕叡衝開了穴道！', 'Yi Rui breaks free!'); } else return say('奕叡動彈不得……', 'Yi Rui cannot move...'); }
    if (cmd.k === 'attack') return heroAttack();
    if (cmd.k === 'skill') { G.usedArts = true; return useSkill('hero', cmd.v); }
    if (cmd.k === 'item') return useItem(cmd.v);
  }

  // ---------------------------------------------------------------- the round loop
  let result = null; G.usedArts = false;
  while (!result) {
    // the hero's command
    let cmd = null;
    if (me.sleep) cmd = { k: 'wait' };
    while (!cmd) {
      const c = await ui.choose([STR.attack, STR.skill, STR.item, STR.run], { cls: 'bcmd', cols: 2, cancel: false, ctx: 'battle', state: { foe, me } });
      if (c === 0) cmd = { k: 'attack' };
      else if (c === 1) {
        const ks = R.known(h).filter((k) => SKILLS[k].battle);
        if (!ks.length) { await say('還沒有學會武功。', 'You know no arts yet.', 300); continue; }
        if (me.sealed) { await say('經脈被封住了，使不出武功！', 'Your meridians are sealed!', 300); continue; }
        const i = await ui.choose(ks.map((k) => ({ label: SKILLS[k], sub: SKILLS[k].mp + '', disabled: h.mp < SKILLS[k].mp })), { cls: 'bsub', title: STR.skill, ctx: 'bskill', keys: ks });
        if (i >= 0) cmd = { k: 'skill', v: ks[i] };
      } else if (c === 2) {
        const its = h.bag.filter((b) => ITEMS[b.id].battle);
        if (!its.length) { await say('沒有可以用的道具。', 'Nothing to use.', 300); continue; }
        const i = await ui.choose(its.map((b) => ({ label: ITEMS[b.id], sub: '×' + b.n })), { cls: 'bsub', title: STR.item, ctx: 'bitem', keys: its.map((b) => b.id) });
        if (i >= 0) cmd = { k: 'item', v: its[i].id };
      } else if (c === 3) cmd = { k: 'run' };
    }
    if (cmd.k === 'run') {
      await say('奕叡轉身就跑……', 'Yi Rui tries to run...', 300);
      if (E.boss) { await say('但是被擋住了！', 'But the way is blocked!'); await foeTurn(); }
      else if (Math.random() < R.runChance(R.stat(h).agi, foe.agi * (foe.sleep ? 0 : 1))) { au.sfx('run'); result = 'run'; break; }
      else { await say('但是沒能逃掉！', 'But could not escape!'); await foeTurn(); }
    } else {
      // order by agility with luck
      const hi = R.stat(h).agi * (0.6 + Math.random() * 0.5), fi = foe.agi * (0.6 + Math.random() * 0.5);
      const order = hi >= fi ? ['hero', 'foe'] : ['foe', 'hero'];
      for (const who of order) {
        if (who === 'hero') { if (cmd.k !== 'wait') await heroTurn(cmd); else await heroTurn({ k: 'wait' }); } else await foeTurn();
        if (foe.hp <= 0 || h.hp <= 0 || foe.fled) break;
      }
    }
    if (h.poison && h.hp > 0 && foe.hp > 0 && !foe.fled) { const d = Math.max(1, Math.floor(R.stat(h).maxHp / 16)); h.hp = Math.max(1, h.hp - d); poisonFx(); heroNum('-' + d, 'purple'); drawStat(); await say('毒性發作，失去' + d + '點體力。', 'Poison: -' + d + ' HP.', 300); }
    if (foe.hp <= 0) result = 'win'; else if (h.hp <= 0) result = 'lose'; else if (foe.fled) result = 'fled';
  }

  // ---------------------------------------------------------------- the end
  if (result === 'win') {
    if (fast) au.sfx('die');
    else if (E.boss) {
      // a boss goes down in a run of blasts across its body, then burns away slowly
      for (let i = 0; i < 7; i++) {
        const x = FCX + rnd(W0 * 0.8), y = FCY + rnd(H0 * 0.8);
        au.sfx('boom'); add('impact', 0.28, { x, y, r: 9 + Math.random() * 6, p: [0x27] }); burst(BOOM, 20, x, y, 80, 10, 2, 0.45, 80);
        fx.blink = 0.12; fx.shake = 0.2; if (i % 2 === 0) shakeScreen(2); if (i === 3 || i === 6) { fx.scr = 0.05; fx.scrC = 0x30; }
        await sleep(170);
      }
      fx.blink = 0.4; await sleep(400);
      au.sfx('die'); for (let i = 0; i < NSTRIP; i++) thr[i] = Math.random(); fx.dissRate = 1 / 1.1; await sleep(1150);
    } else {
      au.sfx('vanish'); fx.blink = 0.22; await sleep(220);
      au.sfx('die'); for (let i = 0; i < NSTRIP; i++) thr[i] = Math.random(); fx.dissRate = 1 / 0.45; await sleep(470);
    }
    fx.alpha = 0;
    await say(E.boss ? '打倒了' + fname + '！' : '打倒了' + fname + '！', 'You defeated the ' + fname + '!', 200);
    au.stop(); if (!E.boss || !opts.final) await au.jingle('j_win');
    if (E.xp || E.gold) { h.gold += E.gold; await say('獲得 ' + E.xp + ' 點經驗，' + E.gold + ' 兩銀子。', 'Gained ' + E.xp + ' XP and ' + E.gold + ' gold.'); }
    const ups = R.gainXp(h, E.xp); drawStat();
    for (const u of ups) {
      await au.jingle('j_level');
      await say('奕叡升到了第' + u.lv + '級！', 'Yi Rui reached level ' + u.lv + '!', 300);
      const g = u.gains; await say(`力量+${g.str} 身法+${g.agi} 體力+${g.hp} 內力+${g.mp}`, `Str+${g.str} Agi+${g.agi} HP+${g.hp} MP+${g.mp}`, 300);
      for (const k of u.skills) await say('領悟了武功「' + SKILLS[k].zh + '」！', 'Learned the art ' + SKILLS[k].en + '!', 400);
    }
    await waitA();
  } else if (result === 'lose') {
    au.stop(); await say('奕叡倒下了……', 'Yi Rui has fallen...', 400); await au.jingle('j_over'); await waitA();
  } else if (result === 'run') { await say('順利逃脫了！', 'Got away safely!', 300); }
  else if (result === 'fled') { await wait(300); }
  alive = false; cancelAnimationFrame(raf);
  if (!fast) { root.classList.add('leave'); await sleep(250); root.classList.remove('leave'); }
  root.classList.add('hidden'); root.innerHTML = '';
  G.stats.battles++; if (result === 'win') { G.stats.wins++; const k = (G.stats.kills = G.stats.kills || {}); k[foeId] = (k[foeId] || 0) + 1; }
  return result;
}
