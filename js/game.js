// The game: where the hero is, walking on tile maps, people and their scripts, chests, doors, encounters, menus,
// inns, shops, saving and the story's turning points. The view only draws what this holds.
import { MAPS, PLACES, TILES, L } from './maps.js?v=17';
import { WORLD, WORLD_W, WORLD_H, PLACE_AT } from './world_map.js?v=17';
import { ITEMS, SKILLS, SHOPS, ENEMIES, ZONES, zoneAt, ENCOUNTER, RARE, RARE_CHANCE, MONEY_FOE, ART_OF, SLOTS, SLOT_NAME, isGear, GEAR_FX, BAG_MAX } from './data.js?v=17';
import { dress, dressView, dressPortrait, sheetCanvas, portraitCanvas, paint } from './doll.js?v=17';
import { NES } from './tiles.js?v=17';
import { registerSheet } from './view.js?v=17';
import { dieCut } from './paper.js?v=17';
import { PEOPLE, CAST } from './people_art.js?v=17';
import { ENEMY_ART, ENEMY_INFO } from './enemy_art.js?v=17';
import * as R from './rules.js?v=17';
import { battle } from './battle.js?v=17';
import { t, STR, getLang, setLang, nameOf } from './ui.js?v=17';
import { stage, objective, SIGNS, SIGN_AT } from './hints.js?v=17';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SAVE_KEYS = ['lq_slot1', 'lq_slot2', 'lq_slot3'];
const AUTO = 'lq_auto';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// how a person looks: frames into a sheet ([x, y, w, h, flip, sheetKey])
export function lookOf(s) {
  if (CAST[s]) {
    // the sheets' second walk frame is the whole body mirrored, which made the sword and headband flip sides every
    // step; keep the first frame's body and only swap in the second frame's legs (the bottom rows)
    const k = 'cast_' + s, row = (r) => [[0, r * 24, 16, 24, 0, k], [0, r * 24, 16, 24, 0, k, { x: 16, y: r * 24, rows: 5 }]];
    const look = { sheet: k, frames: { down: row(1), side: row(2), up: row(1) } };
    if (s === 'yirui') look.frames.up = PEOPLE.hero_back.map((f) => [f.x, f.y, f.w, f.h, 0, 'npcs']);
    if (s === 'yishuo') look.frames.up = PEOPLE.yishuo_back.map((f) => [f.x, f.y, f.w, f.h, 0, 'npcs']);
    return look;
  }
  if (PEOPLE[s] && !Array.isArray(PEOPLE[s])) { const f = PEOPLE[s]; const a = [[f.x, f.y, f.w, f.h, 0], [f.x, f.y, f.w, f.h, 0, null, { x: f.x, y: f.y, rows: 4, mirror: true }]]; return { sheet: 'npcs', frames: { down: a, side: a, up: a } }; }
  if (ENEMY_ART[s] && ENEMY_ART[s].f) { const [x, y, w, h] = ENEMY_ART[s].f; const a = [[x, y, w, h, 0], [x + w, y, w, h, 0]]; return { sheet: 'enemies', cw: w, ch: h, scale: s.startsWith('bx_') ? 1.5 : 1, frames: { down: a, side: a, up: a } }; }
  if (ENEMY_ART[s]) { const f = ENEMY_ART[s]; const a = [[f.x, f.y, f.w, f.h, 0], [f.x, f.y, f.w, f.h, 0]]; return { sheet: 'enemies', cw: Math.ceil(f.w / 8) * 8, ch: f.h, frames: { down: a, side: a, up: a } }; }
  return lookOf('man');
}

// 奕叡 as the paper doll dresses him: his frames in the 'doll' sheet (walk frames x down/side/up)
const heroLook = () => { const r = (y) => [[0, y, 16, 24, 0, 'doll'], [16, y, 16, 24, 0, 'doll']]; return { sheet: 'doll', frames: { down: r(0), side: r(24), up: r(48) } }; };
const SAVE_V = 2;
// old records: v1 had three gear slots; the new ones start empty, the bag is kept
function migrate(d) {
  const h = d.hero; for (const s of SLOTS) if (!(s in h)) h[s] = null;
  h.bag = (h.bag || []).filter((b) => ITEMS[b.id]);
  if (d.stats && !d.stats.got) d.stats.got = {};
  d.v = SAVE_V; return d;
}

export class Game {
  constructor({ view, ui, input, audio }) {
    this.view = view; this.ui = ui; this.input = input; this.audio = audio;
    this.busy = 0; this.fast = false; this.mode = 'title'; this.npcs = []; this.anim = 0;
    this.stats = { battles: 0, wins: 0, steps: 0, deaths: 0, time: 0 };
  }
  // ---------------------------------------------------------------- state
  newGame() {
    this.hero = R.newHero(); this.flags = {}; this.open = {}; this.follow = null; this.ward = 0;
    this.map = 'longmen'; this.x = 4; this.y = 7; this.dir = 'down'; this.lastSave = { map: 'longmen', x: 15, y: 4 };
    this.stats = { battles: 0, wins: 0, steps: 0, deaths: 0, time: 0, got: {} }; this.encCool = 6; this.dollSig = null;
  }
  // ---------------------------------------------------------------- the paper doll
  looksOf(over) { const h = this.hero, L = {}; for (const s of SLOTS) { const id = over && s in over ? over[s] : h[s]; L[s] = id && ITEMS[id] && ITEMS[id].look ? ITEMS[id].look : null; } return L; }
  // rebuild his sprites only when what he wears changed: the sheet (field + battle card) and the portrait
  dressUp() {
    const h = this.hero; if (!h || typeof document === 'undefined') return;
    const sig = SLOTS.map((s) => h[s] || '').join(','); if (sig === this.dollSig) return;
    this.dollSig = sig; this.dollImgs = null;
    const looks = this.looksOf();
    this.dollSheet = sheetCanvas(dress(looks), NES, this.dollSheet); registerSheet('doll', this.dollSheet);
    try { this.ui.por.yirui = portraitCanvas(dressPortrait(looks), NES).toDataURL(); } catch (e) {}
    if (this.heroA) this.heroA.relook(heroLook());
  }
  wear(id) { R.equip(this.hero, id); this.dressUp(); }
  // die-cut pictures of the doll for the menus (front, side and back); `over` previews a piece
  dollPics(over) {
    if (!over && this.dollImgs) return this.dollImgs;
    const looks = this.looksOf(over), out = {};
    for (const v of ['down', 'side', 'up']) { const c = document.createElement('canvas'); c.width = 16; c.height = 24; paint(c.getContext('2d'), dressView(v, 0, looks), 16, 24, NES); out[v] = dieCut(c, 1, 2, 2, '#fffaf0', '#a89a80').toDataURL(); }
    if (!over) this.dollImgs = out; return out;
  }
  // a dropped or found item when the pack is full: leave it, or drop something carried to make room
  async makeRoom(id) {
    const h = this.hero, it = ITEMS[id];
    const tossable = h.bag.filter((b) => ITEMS[b.id].kind !== 'key');
    const opts = [{ label: ['不要了', 'Leave it'], sub: t(it) }].concat(tossable.map((b) => ({ label: ITEMS[b.id], sub: '×' + b.n })));
    const i = await this.ui.choose(opts, { title: L('行囊滿了：丟掉什麼？', 'Pack full: drop what?'), ctx: 'room', cls: 'shoplist' });
    if (i <= 0) { await this.ui.say(null, L(it.zh + '只好留下了。', 'You leave the ' + it.en + ' behind.')); return false; }
    const b = tossable[i - 1]; h.bag.splice(h.bag.indexOf(b), 1); R.addItem(h, id);
    await this.ui.say(null, L('丟掉了' + ITEMS[b.id].zh + '，收下了' + it.zh + '。', 'You drop the ' + ITEMS[b.id].en + ' and take the ' + it.en + '.'));
    return true;
  }
  serialize() { return JSON.stringify({ v: SAVE_V, hero: this.hero, flags: this.flags, open: this.open, follow: this.follow, map: this.map, x: this.x, y: this.y, dir: this.dir, lastSave: this.lastSave, stats: this.stats, ward: this.ward, when: Date.now() }); }
  load(json) { const d = migrate(JSON.parse(json)); this.dollSig = null; Object.assign(this, { hero: d.hero, flags: d.flags, open: d.open || {}, follow: d.follow, map: d.map, x: d.x, y: d.y, dir: d.dir || 'down', lastSave: d.lastSave, stats: d.stats || this.stats, ward: d.ward || 0 }); this.encCool = 4; }
  autosave() { if (this.mode !== 'field' && this.mode !== 'menu') return; try { localStorage.setItem(AUTO, this.serialize()); } catch (e) {} }
  saveSlot(i) { try { localStorage.setItem(SAVE_KEYS[i], this.serialize()); localStorage.setItem(AUTO, this.serialize()); return true; } catch (e) { return false; } }
  static slotInfo(i) { try { const s = localStorage.getItem(i === 'auto' ? AUTO : SAVE_KEYS[i]); if (!s) return null; const d = JSON.parse(s); return { lv: d.hero.lv, map: d.map, when: d.when, raw: s }; } catch (e) { return null; } }
  isOpen(k) { return !!this.open[this.map + ':' + k]; }
  setOpenKey(k) { this.open[this.map + ':' + k] = 1; }
  has(id) { return R.count(this.hero, id) > 0; }
  get M() { return this.map === 'world' ? null : MAPS[this.map]; }

  // ---------------------------------------------------------------- tiles and walking
  tile(x, y) {
    if (this.map === 'world') { if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return '~'; return WORLD[y][x]; }
    const M = this.M; if (y < 0 || y >= M.h || x < 0 || x >= M.w) return null; const c = M.rows[y][x]; return /[A-Z]/.test(c) ? (M.floor || '.') : c;
  }
  worldOpen() { return { G: this.has('token') || this.flags.fortDone, X: this.flags.bridge, D: this.flags.fortDone, c: this.flags.causeway }; }
  passable(x, y) {
    const c = this.tile(x, y);
    if (this.map === 'world') {
      if (c === '~' || c === 'M' || c === 'N' || c === 'v') return false;
      if (SIGN_AT[x + ',' + y]) return false;
      if (c === 'G') return this.has('token') || !!this.flags.fortDone;
      if (c === 'X') return this.has('rope');
      if (c === 'D') return !!this.flags.fortDone;
      if (c === 'c') return !!this.flags.causeway;
      return true;
    }
    if (c === null) return !!this.exitsToWorld();
    if (c === ' ') return false;
    if (c === 'd' || c === 'g') return this.isOpen(x + ',' + y);
    const T = TILES[c]; if (T && T.solid) return false;
    if (this.npcAt(x, y)) return false;
    return true;
  }
  exitsToWorld() { const M = this.M; return M && M.place && PLACES[M.place].map === this.map; }
  npcAt(x, y) { return this.npcs.find((n) => n.x === x && n.y === y && !n.hidden); }

  // ---------------------------------------------------------------- entering places
  async enterMap(id, x, y, dir) {
    this.map = id; const M = MAPS[id];
    if (x == null) { [x, y] = M.start || this.findDigit(M, '1'); dir = 'up'; }
    this.x = x; this.y = y; this.dir = dir || this.dir; this.moving = null;
    this.spawnPeople();
    if (this.view) { this.view.buildMap(M, { isOpen: (k) => this.isOpen(k), lantern: this.has('lantern') }); this.setupActors(); }
    this.audio.play(M.music || 'dungeon');
    this.ui.banner2(M.name);
    this.autosave();
  }
  async enterWorld(x, y) {
    this.map = 'world'; this.x = x; this.y = y; this.dir = 'down'; this.moving = null; this.npcs = [];
    if (this.view) { const pl = {}; for (const [k, [px, py]] of Object.entries(PLACE_AT)) pl[k] = [px, py, PLACES[k].look]; this.view.buildWorld(WORLD, pl, this.worldOpen(), SIGNS); this.setupActors(); }
    this.audio.play('field');
    this.autosave();
  }
  findDigit(M, d) { for (let y = 0; y < M.h; y++) { const x = M.rows[y].indexOf(d); if (x >= 0) return [x, y]; } return [1, 1]; }
  spawnPeople() {
    const M = this.M; this.npcs = [];
    const add = (key, x, y) => {
      const def = M.people && M.people[key]; if (!def) return;
      if (def.flag && !this.flags[def.flag]) return; if (def.notFlag && this.flags[def.notFlag]) return;
      this.npcs.push({ key, def, s: def.s, x, y, hx: x, hy: y, dir: 'down', walk: !!def.walk, t: Math.random() * 3, mv: null });
    };
    M.rows.forEach((r, y) => [...r].forEach((c, x) => { if (/[A-Z]/.test(c)) add(c, x, y); }));
    for (const [k, x, y] of M.extra || []) add(k, x, y);
    if (M.boss && !this.flags[M.boss.flag]) {
      const [bx, by] = this.findDigit(M, 'z');
      this.npcs.push({ key: 'boss', boss: M.boss, s: M.boss.s || M.boss.art, x: bx, y: by, hx: bx, hy: by, dir: 'down', walk: false, t: 0 });
    }
    for (const b of M.beasts || []) if (!this.flags[b.flag]) this.npcs.push({ key: 'beast_' + b.id, boss: b, beast: 1, s: b.id, x: b.x, y: b.y, hx: b.x, hy: b.y, dir: 'down', walk: false, t: 0 });
  }
  setupActors() {
    const v = this.view; this.dressUp(); this.heroA = v.actor('hero', this.dollSheet ? heroLook() : lookOf('yirui'));
    if (this.heroA.look.sheet !== 'doll' && this.dollSheet) this.heroA.relook(heroLook());
    this.followA = this.follow ? v.actor('follow', lookOf(this.follow)) : null;
    if (this.followA) { this.fx = this.x; this.fy = this.y + 1; if (!this.passable(this.fx, this.fy) && this.map !== 'world') { this.fx = this.x; this.fy = this.y; } }
    for (const n of this.npcs) n.actor = v.actor('npc' + n.key + n.x + n.y, lookOf(n.s));
    v.camReady = false;
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    this.stats.time += dt; this.anim += dt;
    if (this.mode !== 'field') return this.draw(dt);
    // walking
    if (this.moving) {
      const m = this.moving; m.t += dt / m.dur;
      if (m.t >= 1) { this.moving = null; this.afterStep(); }
    } else if (!this.busy) {
      const d = this.input.dir();
      if (d) this.tryMove(d);
    }
    // townsfolk wander
    for (const n of this.npcs) {
      if (n.mv) { n.mv.t += dt / 0.3; if (n.mv.t >= 1) n.mv = null; continue; }
      if (!n.walk || this.busy) continue;
      n.t -= dt; if (n.t > 0) continue; n.t = 1.5 + Math.random() * 2.5;
      const ds = Object.keys(DIRS), d = ds[Math.floor(Math.random() * 4)], [dx, dy] = DIRS[d], nx = n.x + dx, ny = n.y + dy;
      n.dir = d;
      if (Math.abs(nx - n.hx) > 2 || Math.abs(ny - n.hy) > 2) continue;
      const c = this.tile(nx, ny); if (c == null || (TILES[c] && TILES[c].solid) || /[1-9cdg]/.test(c)) continue;
      if (this.npcAt(nx, ny) || (nx === this.x && ny === this.y) || (this.moving && nx === this.moving.tx && ny === this.moving.ty) || (this.follow && nx === this.fx && ny === this.fy)) continue;
      n.mv = { fx: n.x, fy: n.y, t: 0 }; n.x = nx; n.y = ny;
    }
    this.draw(dt);
  }
  tryMove(d) {
    this.dir = d; const [dx, dy] = DIRS[d], nx = this.x + dx, ny = this.y + dy;
    if (!this.passable(nx, ny)) { if (!this.bumpT || this.anim - this.bumpT > 0.3) { this.audio.sfx('bump'); this.bumpT = this.anim; } this.worldGateHint(nx, ny); return false; }
    const dur = this.fast ? 0.0001 : (this.map === 'world' ? 0.2 : 0.17);
    this.moving = { fx: this.x, fy: this.y, tx: nx, ty: ny, t: 0, dur };
    if (this.follow) { this.pfx = this.fx; this.pfy = this.fy; this.fx = this.x; this.fy = this.y; }
    this.x = nx; this.y = ny; return true;
  }
  worldGateHint(nx, ny) {
    if (this.map !== 'world' || this.busy) return; const c = this.tile(nx, ny);
    const msg = c === 'G' ? L('木柵擋住了山口。上面寫著：「黑風寨，無令牌者回頭。」', 'A palisade blocks the pass: "Black Wind Fort. No token, turn back."')
      : c === 'X' ? L('吊橋斷了，深谷下雲霧翻騰。要是有繩索就好了。', 'The rope bridge is broken; mist churns in the gorge below. If only you had a rope.')
      : c === 'D' ? L('渡口空無一船。', 'No boat waits at the pier.') : SIGN_AT[nx + ',' + ny] ? this.signText(SIGN_AT[nx + ',' + ny]) : null;
    if (msg && this.hintAt !== nx + ',' + ny) { this.hintAt = nx + ',' + ny; this.run(async () => { await this.ui.say(null, msg); }); }
  }
  signText(l) { return L('路牌上寫著：' + l.zh, 'The signpost reads: ' + l.en); }
  // run an async scene with walking paused
  async run(fn) { this.busy++; try { return await fn(); } finally { this.busy--; } }

  async afterStep() {
    this.stats.steps++; this.hintAt = null;
    await this.run(async () => {
      const c = this.tile(this.x, this.y);
      // walking off the edge of a town or a dungeon's first floor
      if (this.map !== 'world' && c === null) { const P = PLACE_AT[this.M.place]; this.audio.sfx('stairs'); await this.turnOut(); await this.enterWorld(P[0], P[1]); await this.turnIn(); return; }
      // poison and swamp
      if (this.hero.poison) { this.hero.hp = Math.max(1, this.hero.hp - 1); this.flashRed(); }
      const rg = R.gear(this.hero, 'regen');   // a jade pendant breathes qi back as you walk
      if (rg) { this.regenAcc = (this.regenAcc || 0) + rg; while (this.regenAcc >= 10) { this.regenAcc -= 10; this.hero.mp = Math.min(R.stat(this.hero).maxMp, this.hero.mp + 1); } }
      if (this.map === 'world' && c === 'w') { this.hero.hp = Math.max(1, this.hero.hp - 1); this.flashRed(); }
      if (this.ward > 0) { this.ward--; if (this.ward === 0) await this.ui.say(null, L('驅邪的效力消失了。', 'The ward fades.')); }
      if (this.map === 'world') {
        for (const [pid, [px, py]] of Object.entries(PLACE_AT)) if (px === this.x && py === this.y) return this.enterPlace(pid);
        if (c === 'G' && !this.flags.gateSeen) { this.flags.gateSeen = 1; this.audio.sfx('door'); await this.ui.say(null, L('你亮出寨門令牌，守柵的嘍囉不敢多問，拉開了木柵。', 'You show the fort token; the lackey on watch hauls the palisade aside without a word.')); }
        if (c === 'X' && !this.flags.bridge) { this.flags.bridge = 1; this.audio.sfx('door'); if (this.view) this.view.setOpen(this.worldOpen()); await this.ui.say(null, L('你把飛索拋過深谷，重新繫好了吊橋。', 'You throw the flying rope across the gorge and rig the bridge again.')); }
        if (c === 'D' && !this.flags.ferried) { this.flags.ferried = 1; await this.ui.say('boatman', L('坐穩了！', 'Hold on tight!')); }
        if ((this.x === 94 || this.x === 95) && this.y === 44) await this.cape();
      } else {
        if (/[1-9]/.test(c) && this.M.links && this.M.links[c]) {
          const [to, d] = this.M.links[c]; const T = MAPS[to];
          if (T.dark && !this.has('lantern') && !MAPS[this.map].dark) { await this.ui.say(null, L('前面一片漆黑，伸手不見五指。沒有燈籠是走不下去的。', 'Ahead is pitch black. Without a lantern you cannot go on.')); return; }
          this.audio.sfx('stairs'); await this.turnOut(); const [tx, ty] = this.findDigit(T, String(d)); await this.enterMap(to, tx, ty, this.dir); await this.turnIn(); return;
        }
        // bringing 奕碩 home
        if (this.map === 'longmen' && this.follow === 'yishuo') await this.homecoming();
      }
      await this.encounter(c);
    });
  }
  async enterPlace(pid) {
    const P = PLACES[pid], M = MAPS[P.map];
    if (M.dark && !this.has('lantern')) { await this.ui.say(null, L('古墓裡一片漆黑，伸手不見五指。沒有燈籠是進不去的。', 'The tomb is pitch black inside. You cannot go in without a lantern.')); return; }
    this.audio.sfx('stairs'); await this.turnOut(); await this.enterMap(P.map); await this.turnIn();
  }

  // ---------------------------------------------------------------- random encounters
  async encounter(c) {
    let rate = 0, pool = null, scene = 'grass';
    if (this.map === 'world') { rate = ENCOUNTER[c] ?? 1 / 20; pool = ZONES[zoneAt(this.x, this.y)]; scene = { f: 'forest', h: 'hill', s: 'sand', w: 'swamp', n: 'snow', D: 'sea', c: 'sea' }[c] || 'grass'; }
    else { const M = this.M; if (!M.enc) return; rate = M.rate || 1 / 16; pool = ZONES[M.enc]; scene = { forest: 'forest', fort: 'fort', sea: 'sea', tower: 'tower', tomb: 'tomb', ice: 'ice', lair: 'lair', cave: 'cave', snowpeak: 'snow' }[M.theme] || 'cave'; }
    if (this.encCool > 0) { this.encCool--; return; }
    if (this.noEnc || !pool || Math.random() >= rate) return;
    let id = pool[Math.floor(Math.random() * pool.length)];
    if (id === MONEY_FOE && Math.random() < 0.7) id = pool[0];
    const rare = this.map === 'world' && RARE[zoneAt(this.x, this.y)];
    if (rare && Math.random() < RARE_CHANCE) id = rare[c] || rare.any;
    if (this.ward > 0 && ENEMIES[id].atk < R.heroDef(this.hero) * 1.2) return;
    this.encCool = 3;
    await this.fight(id, { scene });
  }
  async fight(id, opts = {}) {
    this.audio.sfx('encounter'); this.mode = 'battle';
    if (this.view && !this.fast) { for (let i = 0; i < 6; i++) { this.view.flash(i % 2 ? 0.6 : 0); await sleep(45); } this.view.flash(0); }
    const r = await battle(this, id, opts);
    this.mode = 'field';
    if (r === 'lose') { await this.die(); return 'lose'; }
    this.audio.play(this.map === 'world' ? 'field' : (this.M.music || 'dungeon'));
    return r;
  }
  async die() {
    this.stats.deaths++;
    const h = this.hero, s = R.stat(h); h.hp = s.maxHp; h.mp = s.maxMp; h.poison = false; h.gold = Math.floor(h.gold / 2); this.ward = 0;
    await this.turnOut();
    const ls = this.lastSave; await this.enterMap(ls.map, ls.x, ls.y, 'up');
    await this.turnIn();
    await this.ui.say('baixian', L('……醒了？是過路的人把你抬回來的。銀兩丟了一半，命還在，就好。', '...Awake? Some travellers carried you back. You lost half your silver, but you have your life.'));
  }

  // ---------------------------------------------------------------- talking and checking
  async interact() {
    if (this.busy || this.moving || this.mode !== 'field') return;
    await this.run(async () => {
      const [dx, dy] = DIRS[this.dir]; let x = this.x + dx, y = this.y + dy;
      let n = this.npcAt(x, y);
      if (!n && this.map !== 'world' && this.tile(x, y) === '=') { x += dx; y += dy; n = this.npcAt(x, y); }
      if (n) { n.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[this.dir]; return this.talk(n); }
      if (this.map === 'world') return this.ui.say(null, SIGN_AT[x + ',' + y] ? this.signText(SIGN_AT[x + ',' + y]) : L('四下無人。', 'There is no one here.'));
      const c = this.tile(x, y), k = x + ',' + y;
      if (c === 'c') return this.openChest(x, y);
      if (c === 'd' && !this.isOpen(k)) {
        if (!this.has('key')) return this.ui.say(null, L('門鎖著。需要銅鑰匙。', 'The door is locked. You need a bronze key.'));
        R.removeItem(this.hero, 'key'); this.setOpenKey(k); this.audio.sfx('door'); this.refreshView();
        return this.ui.say(null, L('用銅鑰匙打開了門。鑰匙斷在了鎖裡。', 'The bronze key opens the door, and snaps in the lock.'));
      }
      if (c === 'g' && !this.isOpen(k)) {
        if (this.has('cellkey')) { this.setOpenKey(k); this.audio.sfx('door'); this.refreshView(); return this.ui.say(null, L('用牢房鑰匙打開了牢門。', 'The cell key opens the cell door.')); }
        return this.ui.say(null, L('牢門上了鎖。', 'The cell door is locked.'));
      }
      if (c === 'y') { const n = (this.M.notes || {})[k]; const ls = !n ? [L('字跡模糊，看不清楚。', 'The words have worn away.')] : Array.isArray(n) ? n : [n]; for (const l of ls) await this.ui.say(null, typeof l === 'function' ? l(this) : l); return; }
      if (c === 'u' && this.M.tablet) return this.ui.say(null, this.M.tablet);
      if (c === 'u') return this.ui.say(null, L('一尊莊嚴的佛像。', 'A solemn statue.'));
      if (c === 'k') return this.ui.say(null, L('架上擺滿了舊書和罈罈罐罐。', 'The shelf is full of old books and jars.'));
      if (c === 'w') return this.ui.say(null, L('井水清涼。', 'The well water is cool.'));
      if (c === 'q') return this.ui.say(null, L('一口沉重的石棺。', 'A heavy stone coffin.'));
      return this.ui.say(null, L('什麼也沒有。', 'Nothing here.'));
    });
  }
  async openChest(x, y) {
    const k = x + ',' + y, M = this.M;
    if (this.isOpen(k)) return this.ui.say(null, L('箱子是空的。', 'The chest is empty.'));
    let i = 0; outer: for (let yy = 0; yy < M.h; yy++) for (let xx = 0; xx < M.w; xx++) { if (M.rows[yy][xx] === 'c') { if (xx === x && yy === y) break outer; i++; } }
    const C = M.chests[i]; this.audio.sfx('chest');
    if (C.gold) { this.setOpenKey(k); this.hero.gold += C.gold; this.refreshView(); return this.ui.say(null, L('打開寶箱，得到 ' + C.gold + ' 兩銀子！', 'You open the chest: ' + C.gold + ' gold!')); }
    if (!R.canAdd(this.hero, C.item)) return this.ui.say(null, L('行囊滿了，拿不下' + ITEMS[C.item].zh + '。先去賣掉或丟掉一些東西吧。', 'Your pack is full: no room for the ' + ITEMS[C.item].en + '. Sell or drop something first.'));
    this.setOpenKey(k); R.addItem(this.hero, C.item); this.refreshView();
    const it = ITEMS[C.item]; if (isGear(C.item) || it.kind === 'key') await this.audio.jingle('j_item');
    await this.ui.say(null, L('打開寶箱，得到了' + it.zh + '！', 'You open the chest: ' + it.en + '!'));
    if (isGear(C.item)) await this.offerEquip(C.item);
  }
  async offerEquip(id) {
    const it = ITEMS[id], cur = this.hero[it.kind]; const better = R.gearScore(id) > R.gearScore(cur);
    if (better && await this.ui.yesno(L('要現在裝備' + it.zh + '嗎？', 'Equip the ' + it.en + ' now?'))) { this.wear(id); this.audio.sfx('ok'); }
  }
  refreshView() { if (this.view) this.view.refresh({ isOpen: (k) => this.isOpen(k) }); }
  scripts() {
    const G = this, ui = this.ui;
    return {
      say: (who, text) => ui.say(who, text), flag: (f) => !!G.flags[f], set: (f) => { G.flags[f] = 1; },
      has: (id) => G.has(id), gold: (n) => { G.hero.gold += n; },
      give: async (id) => { R.addItem(G.hero, id); await G.audio.jingle('j_item'); await ui.say(null, L('得到了' + ITEMS[id].zh + '！', 'Received the ' + ITEMS[id].en + '!')); },
      take: (id) => R.removeItem(G.hero, id),
      shop: (id) => G.shop(id), inn: (p) => G.inn(p), storyteller: () => G.storyteller(),
      teach: async (k) => { if (!G.hero.learned.includes(k)) G.hero.learned.push(k); await G.audio.jingle('j_item'); await ui.say(null, L('奕叡學會了「' + SKILLS[k].zh + '」！', 'Yi Rui learned ' + SKILLS[k].en + '!')); },
      follow: (s) => { G.follow = s; if (G.view) { G.followA = G.view.actor('follow', lookOf(s)); G.fx = G.x; G.fy = G.y; } },
      battle: (id) => G.fight(id, {}),
      stage: () => stage(G), stageIn: (...ks) => ks.includes(stage(G)),
    };
  }
  async talk(n) {
    if (n.boss) return this.bossFight(n);
    this.audio.sfx('cursor');
    await n.def.say(this.scripts());
  }
  async bossFight(n) {
    const B = n.boss;
    for (const [who, l] of B.pre) await this.ui.say(who, l);
    if (B.ask && !(await this.ui.yesno(B.ask))) return;
    const scene = { forest: 'forest', fort: 'fort', sea: 'sea', tower: 'tower', tomb: 'tomb', ice: 'snow', snowpeak: 'snow', lair: 'lair' }[this.M.theme] || 'cave';
    const r = await this.fight(B.id, { scene, final: B.final });
    if (r !== 'win') return;
    this.flags[B.flag] = 1; this.stats['boss_' + B.id] = { lv: this.hero.lv, t: Math.round(this.stats.time), battles: this.stats.battles, deaths: this.stats.deaths };
    if (B.final) this.audio.stop();
    for (const [who, l] of B.post) await this.ui.say(who, l);
    if (B.give) { if (!R.canAdd(this.hero, B.give)) await this.makeRoom(B.give); else R.addItem(this.hero, B.give); await this.audio.jingle('j_item'); await this.ui.say(null, L('得到了' + ITEMS[B.give].zh + '！', 'Received the ' + ITEMS[B.give].en + '!')); }
    this.npcs = this.npcs.filter((x) => x !== n); if (n.actor && this.view) { this.view.drop('npc' + n.key + n.x + n.y); }
    if (B.flag === 'fortDone') await this.ui.say(null, L('牢房在大堂的西邊。', 'The cells are on the west side of the hall.'));
    if (B.final) await this.ending();
    this.autosave();
  }

  // ---------------------------------------------------------------- story beats
  async homecoming() {
    this.flags.shuoHome = 1; this.follow = null; if (this.view) { this.view.drop('follow'); this.followA = null; }
    await this.ui.say('yishuo', L('到家了！哥，我去跟管家伯伯說！', 'We\'re home! Brother, I\'ll go tell the steward!'));
    await this.ui.say('oldman', L('二少爺！謝天謝地……大少爺，這點銀子是老爺留下的，您拿去添置些刀甲吧。', 'Young master! Thank heaven... Elder master, your father left this silver. Take it for blades and armour.'));
    this.hero.gold += 200; this.audio.sfx('buy');
    await this.ui.say(null, L('得到 200 兩銀子。', 'Received 200 gold.'));
    await this.ui.say(null, L('去聽雨樓找白先生吧，他也許知道鬼面人的來歷。', 'Go see Mr Bai at the Listening Rain House; he may know who the ghost-masked man is.'));
    this.spawnPeople(); if (this.view) this.setupActors();
  }
  async cape() {
    if (this.flags.causeway || !(this.has('tian') && this.has('di') && this.has('ren'))) return;
    this.audio.stop();
    await this.ui.say(null, L('天符、地符、人符在懷中同時發燙，飛上半空，合而為一！', 'The Heaven, Earth and Mortal seals burn in your coat, fly up into the air and become one!'));
    if (this.view) for (let i = 0; i < 8; i++) { this.view.flash(i % 2 ? 0.8 : 0.2); await sleep(90); }
    if (this.view) this.view.flash(0);
    this.flags.causeway = 1; if (this.view) this.view.setOpen(this.worldOpen());
    await this.audio.jingle('j_item');
    await this.ui.say(null, L('濃霧散開，潮水退去——一條石路從海中升起，直通幽冥島。', 'The fog parts and the tide draws back: a stone road rises from the sea, straight to the Netherworld Isle.'));
    this.audio.play('field');
  }
  async storyteller() {
    const F = this.flags, has = (k) => this.has(k), ui = this.ui, B = 'baixian';
    if (F.shuoHome && !F.quest3) {
      F.quest3 = 1;
      await ui.say(B, L('鬼面人……幽冥教。三十年前被正派聯手剿滅，如今竟又死灰復燃。', 'A ghost mask... the Netherworld Sect. Thirty years ago the righteous sects destroyed it. Now its embers glow again.'));
      await ui.say(B, L('傳說教主屠千秋藏身東海的幽冥島，島外終年濃霧。唯有天、地、人三符合一，霧散潮退，方見通路。', 'They say its master, Tu Qianqiu, hides on the Netherworld Isle in the eastern sea, wrapped in endless fog. Only the Heaven, Earth and Mortal seals made one can part the fog and turn the tide.'));
      await ui.say(B, L('黑熊撤了渡口，你可以過河往東了。先去寒江閣，柳閣主正需要幫手。', 'Black Bear has opened the ferry; you can cross the river east. Go first to the Cold River Pavilion: Mistress Liu needs a hand.'));
    } else {
      // the storyteller tells you where the tale goes next: the same objective as the Clues window, in his words
      const o = objective(this), s = stage(this);
      const lead = { woods: L('下回分解：令牌在瘦猴身上，瘦猴在黑風林裡。', 'Next chapter: the token is on Skinny Monkey, and he is in the Black Wind Woods.'),
        fort: L('寨中有個刀疤，刀快，心更狠。', 'In the fort is Scar: quick blade, harder heart.'), home: L('人救出來了？好，好。先帶孩子回家。', 'You freed him? Good, good. Take the boy home first.'),
        ren: L('人符……龍脊峰上住著一個脾氣很壞的人。', 'The Mortal Seal... a man with a very bad temper lives on Dragonspine Peak.'), end: L('這段書，總算說完了。', 'This tale is finally told.') }[s];
      if (lead) await ui.say(B, lead);
      if (s !== 'end') { await ui.say(B, o.now); if (o.more[0]) await ui.say(B, o.more[0]); }
    }
    const n = R.xpToNext(this.hero);
    if (n > 0) await ui.say(B, L('依老夫看，你再得 ' + n + ' 點經驗，功力便可更上一層。', 'By my reckoning, ' + n + ' more experience and your skill will rise again.'));
    if (await ui.yesno(L('要把你的事蹟記錄下來嗎？', 'Shall I write down your deeds so far?'), B)) await this.saveMenu({ map: 'longmen', x: 15, y: 4 });
  }
  async saveMenu(here) {
    const items = SAVE_KEYS.map((k, i) => { const s = Game.slotInfo(i); return { label: t(STR.slot) + ' ' + (i + 1), sub: s ? t(STR.lv) + s.lv + ' ' + mapName(s.map) : t(STR.empty) }; });
    const i = await this.ui.choose(items, { title: L('記錄在哪一冊？', 'Which record?'), ctx: 'save' });
    if (i < 0) return;
    this.lastSave = here || this.lastSave; this.saveSlot(i);
    await this.audio.jingle('j_save'); await this.ui.say(null, L('記錄好了。', 'Your deeds are recorded.'));
  }
  async inn(price) {
    const ui = this.ui, h = this.hero;
    if (!await ui.yesno(L('歡迎光臨！住一晚 ' + price + ' 兩銀子，要住宿嗎？', 'Welcome! A night is ' + price + ' gold. Will you stay?'), 'innkeeper')) return ui.say('innkeeper', L('歡迎再來。', 'Come again.'));
    if (h.gold < price) return ui.say('innkeeper', L('客官，銀兩不夠啊。', 'You don\'t have enough, friend.'));
    h.gold -= price; const s = R.stat(h); h.hp = s.maxHp; h.mp = s.maxMp; h.poison = false;
    await this.fadeOut(); await this.audio.jingle('j_inn'); await this.fadeIn();
    await ui.say('innkeeper', L('早安！昨晚睡得好嗎？', 'Good morning! Did you sleep well?'));
    this.lastSave = { map: this.map, x: this.x, y: this.y };
    if (await ui.yesno(L('要寫下旅途的記錄嗎？', 'Will you write in your travel journal?'), 'innkeeper')) await this.saveMenu({ map: this.map, x: this.x, y: this.y });
  }
  async shop(id) {
    const ui = this.ui, h = this.hero;
    for (;;) {
      const mode = await ui.choose([STR.buy, STR.sell, STR.leave], { title: L('要什麼？', 'What will it be?'), ctx: 'shopmode' });
      if (mode === 0) {
        for (;;) {
          const list = SHOPS[id];
          const gold = ui.panel('goldwin', `${t('gold')} ${h.gold}`);
          const i = await ui.choose(list.map((k) => ({ label: ITEMS[k], sub: ITEMS[k].price + t('gp') })), { title: STR.buy, cls: 'shoplist', ctx: 'buy', keys: list, onMove: (j) => this.showCompare(list[j], null, true) });
          gold.remove(); this.hideCompare();
          if (i < 0) break;
          const k = list[i], it = ITEMS[k];
          if (h.gold < it.price) { await ui.say(null, L('銀兩不夠。', 'Not enough gold.')); continue; }
          if (it.kind === 'key' && this.has(k)) { await ui.say(null, L('你已經有了。', 'You already have one.')); continue; }
          if (!R.canAdd(h, k)) { await ui.say(null, L('行囊滿了。', 'Your pack is full.')); continue; }
          h.gold -= it.price; R.addItem(h, k); this.audio.sfx('buy');
          if (isGear(k)) {
            if (await ui.yesno(L('要現在裝備嗎？', 'Equip it now?'))) {
              const old = h[it.kind]; this.wear(k);
              if (old && ITEMS[old].price && await ui.yesno(L('舊的' + ITEMS[old].zh + '，' + Math.floor(ITEMS[old].price / 2) + '兩收了吧？', 'Sell your old ' + ITEMS[old].en + ' for ' + Math.floor(ITEMS[old].price / 2) + ' gold?'))) { R.removeItem(h, old); h.gold += Math.floor(ITEMS[old].price / 2); this.audio.sfx('buy'); }
            }
          } else await ui.say(null, L('謝謝惠顧！', 'Thank you!'));
        }
      } else if (mode === 1) {
        const sell = h.bag.filter((b) => ITEMS[b.id].kind !== 'key' && ITEMS[b.id].price);
        if (!sell.length) { await ui.say(null, STR.noItem); continue; }
        const gold = ui.panel('goldwin', `${t('gold')} ${h.gold}`);
        const i = await ui.choose(sell.map((b) => ({ label: ITEMS[b.id], sub: '×' + b.n + '　' + Math.floor(ITEMS[b.id].price / 2) + t('gp') })), { title: STR.sell, ctx: 'sell', cls: 'shoplist', onMove: (j) => this.desc(ITEMS[sell[j].id]) });
        gold.remove(); this.desc(null);
        if (i < 0) continue;
        R.removeItem(h, sell[i].id); h.gold += Math.floor(ITEMS[sell[i].id].price / 2); this.audio.sfx('buy');
      } else return ui.say(null, L('慢走！', 'Safe travels!'));
    }
  }
  // what a piece would change, with the doll wearing it: every number that moves (+ green, - red) and its effects.
  // id null = the slot emptied
  showCompare(id, slot, shop) {
    this.hideCompare(); const h = this.hero;
    if (id && !isGear(id)) { const it = ITEMS[id]; this.cmp = this.ui.panel('cmpwin', t([it.dz || '', it.de || ''])); return; }
    slot = slot || ITEMS[id].kind;
    const now = R.withGear(h, slot, h[slot]), then = R.withGear(h, slot, id || null);
    const rows = [['atk', STR.atk], ['def', STR.def], ['agi', STR.agi], ['maxHp', ['體力上限', 'Max HP']], ['maxMp', ['內力上限', 'Max MP']], ['crit', ['會心', 'Crit']]];
    const fmt = (k, v) => (k === 'crit' ? Math.round(v * 100) + '%' : v);
    const lines = rows.filter(([k]) => then[k] !== now[k] || k === 'atk' || k === 'def').map(([k, n]) => { const d = then[k] - now[k], ds = k === 'crit' ? Math.round(d * 100) + '%' : d; return `<div class="cmprow"><span>${t(n)}</span><span>${fmt(k, now[k])}→${fmt(k, then[k])}</span><b class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' + ds : d < 0 ? ds : ''}</b></div>`; }).join('');
    const it = id ? ITEMS[id] : null, fx = it ? GEAR_FX.filter(([k]) => it[k]).map(([k, zh, en, m, u]) => t([zh, en]) + '+' + Math.round(it[k] * m) + u).join('　') : '';
    const pic = this.dollPics({ [slot]: id || null }).down;
    const cur = shop && h[slot] ? `<div class="cmpnow">${t(['現在', 'Now'])}：${t(ITEMS[h[slot]])}</div>` : '';
    this.cmp = this.ui.panel('cmpwin cmpgear', `<img class="cmpdoll" src="${pic}"><div class="cmpstats"><div class="cmpname">${it ? t(it) : t(STR.unequip)}　<span>${t(SLOT_NAME[slot])}</span></div>${lines}${fx ? `<div class="cmpfx">${fx}</div>` : ''}${cur}</div>`);
  }
  hideCompare() { if (this.cmp) { this.cmp.remove(); this.cmp = null; } }

  // ---------------------------------------------------------------- the field menu
  async menu() {
    if (this.busy || this.moving || this.mode !== 'field') return;
    this.mode = 'menu';
    await this.run(async () => {
      const ui = this.ui, h = this.hero;
      for (;;) {
        const panel = ui.panel('fieldstat', this.statusHTML(true));
        const c = await ui.choose([STR.skill, STR.item, STR.equip, STR.status, STR.clue, STR.book, STR.config, STR.save, STR.close], { cls: 'fieldmenu', ctx: 'field' });
        panel.remove();
        if (c < 0 || c === 8) break;
        if (c === 0) { if (await this.fieldSkill()) break; }
        else if (c === 1) { if (await this.itemMenu()) break; }
        else if (c === 2) await this.equipMenu();
        else if (c === 3) { const p = ui.panel('statuswin', this.statusHTML(false)); await ui.choose([STR.close], { cls: 'tiny', ctx: 'close' }); p.remove(); }
        else if (c === 4) await this.clues();
        else if (c === 5) await this.bestiary();
        else if (c === 6) await this.settings();
        else if (c === 7) await this.saveMenu();   // save right here; the Homeward return point stays at the last inn or hall
      }
    });
    if (this.mode === 'menu') this.mode = 'field';
  }
  // 線索: the current objective in a line or two, worked out from the flags; a second press shows more detail
  async clues() {
    const o = objective(this), ui = this.ui;
    const body = (more) => `<div class="cluehead">${t(['線索', 'Clues'])}</div><div class="cluenow">${t(o.now)}</div>` + (more ? o.more.map((l) => `<div class="cluemore">・${t(l)}</div>`).join('') : `<div class="cluetip">${t(['（再按「更多提示」看詳情）', '(Press "More detail" for more)'])}</div>`);
    const p = ui.panel('cluewin', body(false));
    const i = await ui.choose([['更多提示', 'More detail'], STR.close], { cls: 'tiny', ctx: 'clue' });
    if (i === 0) { p.innerHTML = body(true); await ui.choose([STR.close], { cls: 'tiny', ctx: 'clue2' }); }
    p.remove();
  }
  // 圖鑑: every foe met so far, with its gallery picture, home and story
  async bestiary() {
    const seen = this.stats.seen || {};
    const ids = Object.keys(ENEMIES).filter((id) => seen[id]);
    if (!ids.length) { await this.ui.say(null, L('還沒有遇過任何敵人。', 'You have not met any foes yet.')); return; }
    const total = Object.keys(ENEMIES).length;
    let card = null;
    const show = (j) => {
      if (card) card.remove();
      const id = ids[j], E = ENEMIES[id], info = ENEMY_INFO[ART_OF(id)] || ENEMY_INFO[id];
      const pic = E.por ? `<div class="bkpic"><img src="assets/people/${E.por}_portrait.png"></div>` : (() => { const a = ENEMY_ART[ART_OF(id)]; return a ? `<div class="bkpic"><div class="bkspr" style="width:${a.w}px;height:${a.h}px;background-position:-${a.x}px -${a.y}px"></div></div>` : ''; })();
      const meta = info ? `${info.tier ? t(['第' + info.tier + '階', 'Tier ' + info.tier]) + '　' : ''}${t(info.habitat)}` : t(['首領', 'Boss']);
      const bio = info ? t(info.bio) : '';
      const got = (this.stats.got || {})[id] || {};
      const drops = E.drop.length ? E.drop.map(([d]) => (got[d] ? t(ITEMS[d]) : '？？？')).join('、') : '—';
      card = this.ui.panel('bookwin', `${pic}<div class="bktext"><div class="bkname">${t(E)}</div><div class="bkmeta">${meta}</div><div class="bkbio">${bio}</div><div class="bkmeta">${t(['擊敗', 'Defeated'])} ${(this.stats.kills || {})[id] || 0}</div><div class="bkdrop">${t(STR.drop)}：${drops}</div></div>`);
    };
    await this.ui.choose(ids.map((id) => ({ label: ENEMIES[id], sub: '' })), { title: L('圖鑑 ' + ids.length + '/' + total, 'Bestiary ' + ids.length + '/' + total), cls: 'booklist', ctx: 'book', onMove: show });
    if (card) card.remove();
  }
  statusHTML(short) {
    const h = this.hero, s = R.stat(h);
    if (short) return `<div>${t(['奕叡', 'Yi Rui'])}</div><div>${t('lv')} ${h.lv}</div><div>${t('hp')} ${h.hp}/${s.maxHp}</div><div>${t('mp')} ${h.mp}/${s.maxMp}</div><div>${t('gold')} ${h.gold}</div>${h.poison ? `<div class="psn">${t(['中毒', 'Poisoned'])}</div>` : ''}`;
    const fx = GEAR_FX.map(([k, zh, en, m, u]) => [Math.min(R.gear(h, k), u === '%' ? 1 : 99), zh, en, m, u]).filter(([v]) => v).map(([v, zh, en, m, u]) => t([zh, en]) + '+' + Math.round(v * m) + u).join('　');
    return `<div class="stname">${t(['奕叡　啟程刀客', 'Yi Rui, the Departing Blade'])}</div>
      <div class="stwrap">${this.dollHTML()}<div class="stright"><div class="stgrid"><span>${t('lv')}</span><b>${h.lv}</b><span>${t('xp')}</span><b>${h.xp}</b>
      <span>${t('hp')}</span><b>${h.hp}/${s.maxHp}</b><span>${t('mp')}</span><b>${h.mp}/${s.maxMp}</b>
      <span>${t('str')}</span><b>${s.str}</b><span>${t('agi')}</span><b>${s.agi}</b>
      <span>${t('atk')}</span><b>${R.heroAtk(h)}</b><span>${t('def')}</span><b>${R.heroDef(h)}</b>
      <span>${t('gold')}</span><b>${h.gold}</b><span>${t(['下一級', 'Next'])}</span><b>${R.xpToNext(h)}</b></div>
      </div>${fx ? `<div class="stfx">${fx}</div>` : ''}</div></div>
      <div class="stsk">${t('skill')}：${R.known(h).map((k) => t(SKILLS[k])).join('　') || t(STR.none)}</div>`;
  }
  async fieldSkill() {
    const h = this.hero, ks = R.known(h).filter((k) => SKILLS[k].field);
    if (!ks.length) { await this.ui.say(null, STR.noSkill); return false; }
    const i = await this.ui.choose(ks.map((k) => ({ label: SKILLS[k], sub: SKILLS[k].mp + '', disabled: h.mp < SKILLS[k].mp })), { title: STR.skill, ctx: 'fskill', keys: ks, onMove: (j) => this.desc(SKILLS[ks[j]]) });
    this.desc(null);
    if (i < 0) return false;
    const k = ks[i], S = SKILLS[k];
    if (S.kind === 'escape' && (this.map === 'world' || this.M.town)) { await this.ui.say(null, L('這裡用不著。', 'Not needed here.')); return false; }
    h.mp -= S.mp;
    await this.ui.say(null, L('奕叡使出了「' + S.zh + '」！', 'Yi Rui uses ' + S.en + '!'));
    return this.fieldEffect(S);
  }
  async fieldEffect(S) {
    const h = this.hero;
    if (S.kind === 'heal') { const v = R.rand(S.lo, S.hi), b = h.hp; h.hp = Math.min(R.stat(h).maxHp, h.hp + v); this.audio.sfx('heal'); await this.ui.say(null, L('體力回復了' + (h.hp - b) + '點。', 'Recovered ' + (h.hp - b) + ' HP.')); return false; }
    if (S.kind === 'home' || S.home) { this.audio.sfx('run'); await this.whiteOut(); await this.turnOut(); const ls = this.lastSave; await this.enterMap(ls.map, ls.x, ls.y, 'up'); await this.turnIn(); return true; }
    if (S.kind === 'escape') { const P = PLACE_AT[this.M.place]; this.audio.sfx('run'); await this.whiteOut(); await this.turnOut(); await this.enterWorld(P[0], P[1]); await this.turnIn(); return true; }
    if (S.kind === 'ward' || S.ward) { this.ward = 150; this.audio.sfx('skill'); await this.ui.say(null, L('一身正氣，弱小的妖物不敢靠近了。', 'Weak creatures will keep their distance.')); return false; }
    return false;
  }
  desc(x) { if (this.descP) { this.descP.remove(); this.descP = null; } if (x && (x.dz || x.de)) this.descP = this.ui.panel('descwin', t([x.dz, x.de])); }
  async itemMenu() {
    const h = this.hero;
    if (!h.bag.length) { await this.ui.say(null, STR.noItem); return false; }
    const i = await this.ui.choose(h.bag.map((b) => ({ label: ITEMS[b.id], sub: ITEMS[b.id].kind === 'key' ? '' : '×' + b.n })), { title: t(STR.item) + ' ' + h.bag.length + '/' + BAG_MAX, ctx: 'fitem', cls: 'shoplist', onMove: (j) => this.desc(ITEMS[h.bag[j].id]) });
    this.desc(null);
    if (i < 0) return false;
    const id = h.bag[i].id, it = ITEMS[id];
    if (isGear(id)) { this.wear(id); this.audio.sfx('ok'); await this.ui.say(null, L('裝備了' + it.zh + '。', 'Equipped the ' + it.en + '.')); return false; }
    if (it.kind === 'key' || id === 'key') { await this.ui.say(null, [it.dz, it.de]); return false; }
    if (it.kind === 'mat') { if (await this.ui.yesno(L('這是拿去賣錢的。要丟掉' + it.zh + '嗎？', 'This is for selling. Drop the ' + it.en + '?'))) R.removeItem(h, id); return false; }
    const what = await this.ui.choose([STR.use, STR.toss], { ctx: 'usetoss', cls: 'tiny' });
    if (what === 1) { if (await this.ui.yesno(L('丟掉' + it.zh + '嗎？', 'Drop the ' + it.en + '?'))) R.removeItem(h, id); return false; }
    if (what !== 0) return false;
    if (it.heal) { R.removeItem(h, id); const v = R.rand(it.heal[0], it.heal[1]), b = h.hp; h.hp = Math.min(R.stat(h).maxHp, h.hp + v); this.audio.sfx('heal'); await this.ui.say(null, L('體力回復了' + (h.hp - b) + '點。', 'Recovered ' + (h.hp - b) + ' HP.')); return false; }
    if (it.mp) { R.removeItem(h, id); const b = h.mp; h.mp = Math.min(R.stat(h).maxMp, h.mp + it.mp); this.audio.sfx('heal'); await this.ui.say(null, L('內力回復了' + (h.mp - b) + '點。', 'Recovered ' + (h.mp - b) + ' MP.')); return false; }
    if (it.cure) { R.removeItem(h, id); h.poison = false; this.audio.sfx('heal'); await this.ui.say(null, L('毒解了。', 'The poison is gone.')); return false; }
    if (it.home) { R.removeItem(h, id); return this.fieldEffect(it); }
    if (it.ward) { R.removeItem(h, id); return this.fieldEffect(it); }
    return false;
  }
  // seven places on the body: the doll beside the list shows what he wears; picking a piece previews the change
  async equipMenu() {
    const h = this.hero, ui = this.ui; let at = 0;
    for (;;) {
      const doll = ui.panel('eqdoll', this.dollHTML());
      const i = await ui.choose(SLOTS.map((s) => ({ label: SLOT_NAME[s], sub: h[s] ? ITEMS[h[s]] : STR.none })), { title: STR.equip, ctx: 'eqslot', cls: 'wide eqmenu', start: at });
      doll.remove();
      if (i < 0) return;
      at = i; const s = SLOTS[i];
      const own = h.bag.filter((b) => ITEMS[b.id].kind === s);
      const opts = own.map((b) => ({ label: ITEMS[b.id], sub: shortStats(b.id) }));
      if (h[s]) opts.push({ label: STR.unequip, sub: '' });
      if (!opts.length) { await ui.say(null, L('沒有可以換的。', 'Nothing to change to.')); continue; }
      const j = await ui.choose(opts, { title: SLOT_NAME[s], ctx: 'eqpick', cls: 'eqpick', keys: own.map((b) => b.id), onMove: (k) => this.showCompare(k < own.length ? own[k].id : null, s) });
      this.hideCompare();
      if (j < 0) continue;
      if (j < own.length) this.wear(own[j].id);
      else if (!R.unequip(h, s)) { await ui.say(null, L('行囊滿了，卸不下來。', 'Your pack is full.')); continue; }
      else this.dressUp();
      this.audio.sfx('ok');
    }
  }
  // the doll card: the front view big with the side and back small, and the seven places round it
  dollHTML() {
    const h = this.hero, P = this.dollPics();
    const slot = (s) => `<div class="dslot"><span>${t(SLOT_NAME[s])}</span><b>${h[s] ? t(ITEMS[h[s]]) : '—'}</b></div>`;
    return `<div class="dollbox"><div class="dcol">${['hd', 'ck', 'a', 'c'].map(slot).join('')}</div><div class="dfig"><img class="dbig" src="${P.down}"><div class="dsmall"><img src="${P.side}"><img src="${P.up}"></div></div><div class="dcol">${['w', 'pd', 'bt'].map(slot).join('')}</div></div>`;
  }
  async settings() {
    const ui = this.ui, a = this.audio;
    const step = (v) => { const n = Math.round(v * 10) + 2; return n > 10 ? 0 : n / 10; };  // 0, 2, 4 ... 10, then off
    let at = 0;
    for (;;) {
      const q = this.view ? this.view.quality : 'high';
      const i = await ui.choose([
        { label: getLang() === 'zh' ? '語言：中文' : 'Language: English' },
        { label: STR.music, sub: Math.round(a.vol.music * 10) + '' }, { label: STR.sound, sub: Math.round(a.vol.sfx * 10) + '' },
        { label: STR.quality, sub: { low: STR.qlow, medium: STR.qmed, high: STR.qhigh }[q] },
      ], { title: STR.config, ctx: 'settings', cls: 'wide', start: at });
      if (i < 0) return;
      at = i;
      if (i === 0) { setLang(getLang() === 'zh' ? 'en' : 'zh'); }
      if (i === 1) { a.vol.music = step(a.vol.music); a.applyVol(); }
      if (i === 2) { a.vol.sfx = step(a.vol.sfx); a.applyVol(); a.sfx('ok'); }
      if (i === 3) { const nq = { low: 'medium', medium: 'high', high: 'low' }[q]; try { localStorage.setItem('lq_quality', nq); } catch (e) {} this.autosave(); await ui.say(null, L('畫質將在重新載入後套用。', 'Graphics change applies after a reload.')); location.reload(); return; }
    }
  }

  // ---------------------------------------------------------------- fades and drawing
  // a quick white-out (light-foot arts): two hard flashes, then the screen burns white before the fade
  async whiteOut() { if (!this.view || this.fast) return; for (const v of [1, 0, 1, 0.3, 1]) { this.view.flash(v); await sleep(45); } this.view.flash(0); }
  // map changes turn the book's page: the pop-ups fold flat, the page lifts and turns over, the new ones rise
  async turnOut() { if (!this.view || this.fast) return; await this.view.turnOut(); }
  async turnIn() { if (!this.view || this.fast) return; await this.view.turnIn(); }
  async fadeOut() { if (!this.view || this.fast) return; for (let i = 1; i <= 6; i++) { this.view.fade(i / 6); await sleep(30); } }
  async fadeIn() { if (!this.view || this.fast) return; for (let i = 5; i >= 0; i--) { this.view.fade(i / 6); await sleep(30); } }
  flashRed() { this.audio.sfx('poison'); const s = document.getElementById('screen'); if (s && !this.fast) { s.classList.remove('red'); void s.offsetWidth; s.classList.add('red'); } }
  draw(dt) {
    const v = this.view; if (!v || !this.heroA) return;
    const fr = Math.floor(this.anim * 4) % 2;
    let hx = this.x, hy = this.y;
    if (this.moving) { const m = this.moving, k = Math.min(1, m.t); hx = m.fx + (m.tx - m.fx) * k; hy = m.fy + (m.ty - m.fy) * k; }
    this.heroA.set(this.dir, fr); this.heroA.place(hx, hy);
    if (this.followA) {
      let fx = this.fx, fy = this.fy; if (this.moving && this.pfx != null) { const k = Math.min(1, this.moving.t); fx = this.pfx + (this.fx - this.pfx) * k; fy = this.pfy + (this.fy - this.pfy) * k; }
      const d = fy < hy ? 'down' : fy > hy ? 'up' : fx < hx ? 'right' : 'left'; this.followA.set(d, fr); this.followA.place(fx, fy);
    }
    for (const n of this.npcs) { if (!n.actor) continue; let x = n.x, y = n.y; if (n.mv) { const k = Math.min(1, n.mv.t); x = n.mv.fx + (n.x - n.mv.fx) * k; y = n.mv.fy + (n.y - n.mv.fy) * k; } n.actor.set(n.dir, fr); n.actor.place(x, y); }
    v.frame(dt, { x: hx + 0.5, z: hy + 0.5 });
  }

  // ---------------------------------------------------------------- the ending
  async ending() {
    this.flags.ending = 1; this.mode = 'ending';
    await this.fadeOut();
    const box = document.getElementById('ending'); box.classList.remove('hidden'); box.innerHTML = '';
    this.audio.play('ending');
    const lines = [
      ['幽冥殿在身後崩塌，沉入東海。', 'Behind you the Netherworld Hall crumbles and sinks into the eastern sea.'],
      ['霧散了。三十年來第一次，望海村的人看見了日出。', 'The fog is gone. For the first time in thirty years, Wanghai Village sees the sunrise.'],
      ['龍門鎮，聽雨樓。', 'Longmen Town. The Listening Rain House.'],
      ['「話說那龍門刀客，一刀斬開東海霧……」', '"And so the blade of Longmen cut through the fog of the eastern sea..."'],
      ['白先生的醒木一拍，滿堂喝采。', 'Mr Bai brings down his block, and the whole house cheers.'],
      ['奕碩擠在最前排，抱著他的球，笑得最大聲。', 'Yi Shuo squeezes into the front row, hugging his ball, laughing loudest of all.'],
      ['說完了書，白先生用左手摺了一隻紙鶴，放在窗邊。', 'When the tale is done, Mr Bai folds a paper crane with his left hand and sets it on the windowsill.'],
      ['他望著窗外的雨，輕聲說：「這江湖……才剛開始呢。」', 'He watches the rain and says softly, "This jianghu... has only just begun."'],
    ];
    const wait = (ms) => (this.fast ? Promise.resolve() : sleep(ms));
    let li = 0;
    for (const l of lines) {
      if (li === 2) { box.innerHTML = ''; const row = document.createElement('div'); row.className = 'endpor'; for (const c of ['baixian', 'yirui', 'yishuo']) { const im = document.createElement('img'); im.src = this.ui.por[c] || CAST[c].portrait; row.appendChild(im); } box.appendChild(row); }
      const p = document.createElement('p'); p.textContent = t(l); box.appendChild(p); await wait(30); p.classList.add('in'); await wait(4200); li++;
    }
    await wait(1500); box.innerHTML = '';
    const cr = document.createElement('div'); cr.className = 'credits'; cr.innerHTML = creditsHTML(this); box.appendChild(cr);
    await wait(50); cr.classList.add('roll');
    await wait(26000);
    const fin = document.createElement('div'); fin.className = 'fin'; fin.textContent = t(['— 完 —', '— The End —']); box.appendChild(fin);
    this.map = 'longmen'; this.x = 15; this.y = 4; this.dir = 'up'; this.lastSave = { map: 'longmen', x: 15, y: 4 };
    try { localStorage.setItem(AUTO, this.serialize()); } catch (e) {}
    await new Promise((res) => { if (this.ui.driver || this.fast) return res(); const off = this.input.push((k) => { if (k === 'A') { off(); res(); } }); });
    box.classList.add('hidden'); box.innerHTML = '';
    this.mode = 'done';
    if (this.onEnd) this.onEnd();
  }
}
// the gist of a piece in a few characters (the equip list)
function shortStats(id) { const it = ITEMS[id], o = []; for (const [k, zh, en] of [['atk', '攻', 'A'], ['def', '防', 'D'], ['agi', '敏', 'Ag'], ['mhp', '體', 'HP'], ['mmp', '氣', 'MP']]) if (it[k]) o.push(t([zh, en]) + it[k]); return o.slice(0, 2).join(' '); }
export function mapName(id) { if (id === 'world') return t(['野外', 'Wilds']); const M = MAPS[id]; return M ? t(M.name) : id; }
function creditsHTML(G) {
  const s = G.stats, mm = Math.floor(s.time / 60);
  return `<h2>${t(['龍門刀客傳', 'Longmen Quest'])}</h2>
  <p>${t(['龍門雙奕・番外', 'A side story of the Longmen Twins'])}</p>
  <h3>${t(['登場人物', 'Cast'])}</h3><p>奕叡　奕碩　白先生　柳寒煙　苦禪　冷笑天<br>黑熊　刀疤　瘦猴　屠千秋</p>
  <h3>${t(['美術', 'Art'])}</h3><p>${t(['人物、怪物、地圖：本作原創 8-bit 像素（人物圖庫 Character Gallery）', 'People, monsters and maps: original 8-bit pixel art (Character Gallery)'])}</p>
  <h3>${t(['音樂', 'Music'])}</h3><p>${t(['原創晶片音樂，程式合成', 'Original chiptune, synthesised in code'])}</p>
  <h3>${t(['字型', 'Font'])}</h3><p>Cubic 11 (俐方體11號) — SIL OFL 1.1</p>
  <h3>${t(['引擎', 'Engine'])}</h3><p>three.js (MIT)</p>
  <h3>${t(['你的旅程', 'Your journey'])}</h3><p>${t(['等級', 'Level'])} ${G.hero.lv}　${t(['戰鬥', 'Battles'])} ${s.battles}　${t(['時間', 'Time'])} ${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, '0')}</p>
  <p class="thanks">${t(['感謝遊玩', 'Thank you for playing'])}</p>`;
}
