// Boot: build the view, the title screen, the opening, and run the fixed-timestep loop.
import { View, pickQuality, loadImage, registerSheet } from './view.js?v=14';
import { Input } from './input.js?v=14';
import { UI, t, STR, getLang, setLang } from './ui.js?v=14';
import { Audio } from './audio.js?v=14';
import { Game, mapName } from './game.js?v=14';
import { CAST, PEOPLE_IMAGE } from './people_art.js?v=14';
import { preloadBattleArt } from './battle.js?v=14';
import { PLACE_AT } from './world_map.js?v=14';
import { paperTileURL, deckleURL, woodURL } from './paper.js?v=14';

const params = new URLSearchParams(location.search);
const NORENDER = params.has('norender');
setLang(getLang());
// the paper pictures the windows use (drawn once in code): grain, the deckled edge, the wooden table
{ const st = document.documentElement.style; st.setProperty('--grain', `url(${paperTileURL()})`); st.setProperty('--deckle', `url(${deckleURL()})`); st.setProperty('--wood', `url(${woodURL()})`); }

const input = new Input(), audio = new Audio();
const ui = new UI(document.getElementById('ui'), input, audio);
let view = null;
if (!NORENDER) { try { view = new View(document.getElementById('view'), pickQuality()); } catch (e) { console.warn('no WebGL', e); } }
const G = new Game({ view, ui, input, audio });
window.LQ = { G, ui, input, audio, view };

// touch pad on touch devices
const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window || params.has('touch');
document.body.classList.toggle('touch', touch);
if (touch) input.bindTouch(document);

// layout: on touch screens the pad sits beside the picture in landscape and under it in portrait
function layout() {
  const W = document.body.clientWidth, H = document.body.clientHeight, st = document.documentElement.style, b = document.body.classList;
  let sw = W, sh = H;
  b.remove('land', 'port');
  if (touch) {
    if (W >= H) { const side = Math.round(Math.min(Math.max(H * 0.42, 120), W * 0.22)); st.setProperty('--side', side + 'px'); st.setProperty('--pad', Math.round(side * 0.88) + 'px'); sw = W - 2 * side; b.add('land'); }
    else { sh = Math.round(Math.min(H * 0.62, W * 1.15)); st.setProperty('--sh', sh + 'px'); st.setProperty('--pad', Math.round(Math.min(W * 0.42, (H - sh) * 0.8)) + 'px'); b.add('port'); }
  }
  const fs = Math.max(12, Math.min(30, Math.round(Math.min(sw / 30, sh / 18))));
  st.setProperty('--fs', fs + 'px'); st.setProperty('--bd', Math.max(2, Math.round(fs / 7)) + 'px');
  st.setProperty('--pz', String(Math.max(1, Math.round(fs * 4.4 / 56 * 2) / 2)));
  const bz = Math.max(1, Math.floor(Math.min(sw * 0.5 / 160, (sh - fs * 8.5) * 0.62 / 120) * 4) / 4);
  st.setProperty('--bz', String(bz));
  b.toggle('narrow', sw < 760);
  if (view) view.resize();
}
window.addEventListener('resize', layout); window.addEventListener('orientationchange', () => setTimeout(layout, 200));
layout();

// field controls: A talks/checks, B opens the menu
input.push((k) => {
  if (G.mode !== 'field') return;
  if (k === 'A') G.interact(); else if (k === 'B') G.menu();
});

async function loadArt() {
  const jobs = [loadImage(PEOPLE_IMAGE).then((i) => registerSheet('npcs', i)), loadImage('assets/enemies.png?v=14').then((i) => registerSheet('enemies', i))];
  for (const [id, c] of Object.entries(CAST)) jobs.push(loadImage(c.sheet).then((i) => registerSheet('cast_' + id, i)));
  await Promise.all(jobs); preloadBattleArt();
}

// ---------------------------------------------------------------- the loop (fixed 60 Hz logic, render once per frame)
let acc = 0, last = performance.now(), fps = 60, slow = 0, lastMode = null, still = 0, lastTalk = false;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
  input.pollPad(dt);
  const step = 1 / 60; let n = 0;
  while (acc >= step && n < 6) { G.update(step); acc -= step; n++; }
  if (acc > step) acc = 0;
  // menus are DOM windows over a still map: draw the map twice when a menu opens, then leave the GPU idle so the
  // menu itself stays snappy
  if (G.mode !== lastMode) { lastMode = G.mode; still = 0; }
  // (a fade or flash always gets drawn: view.dirty)
  const rest = view && !view.dirty;
  if (rest && G.mode === 'menu' && still++ >= 2) { requestAnimationFrame(loop); return; }
  // a message box is open and nobody is walking: the map behind it is still, so draw it twice and then let the GPU rest
  // (keeps the typing and the next key press instant)
  const talk = ui.talking && !G.moving && view && view.settled && !G.npcs.some((q) => q.mv) && !(ui.msgBox && ui.msgBox.classList.contains('hidden'));
  if (talk !== lastTalk) { lastTalk = talk; still = 0; }
  if (rest && talk && G.mode === 'field' && still++ >= 2) { requestAnimationFrame(loop); return; }
  // standing still on the map: 30 frames a second is plenty for the water shimmer and wandering townsfolk
  if (rest && G.mode === 'field' && !G.moving && view.settled && (still++ & 1)) { requestAnimationFrame(loop); return; }
  // (the title is a closed book cover over the whole screen: nothing to draw behind it)
  if (view && (G.mode === 'field' || G.mode === 'menu')) {
    view.render(); view.dirty = false;
    // weak device: drop the post effects once if the frame rate stays low
    fps = fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
    // slow device: step down once per ~2 s of low frame rate - first the resolution, then the post effects, then shadows
    if (G.mode === 'field' && fps < 48 && performance.now() > 6000) {
      if (++slow > 120) {
        slow = 0; fps = 60;
        if (!view.prCap) { view.prCap = 1; view.resize(); }
        else if (view.post) { view.post = false; view.composer = null; }
        else if (!view.cheap) view.setCheap();
      }
    } else slow = 0;
  }
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- title
async function title() {
  G.mode = 'title';
  const tl = document.getElementById('title'); tl.classList.remove('hidden', 'open', 'gone');
  audio.play('title');
  for (;;) {
    const auto = Game.slotInfo('auto'); const any = [0, 1, 2].some((i) => Game.slotInfo(i));
    const items = [{ label: STR.newgame }];
    if (auto) items.push({ label: STR.cont, sub: t(STR.lv) + auto.lv + ' ' + mapName(auto.map) });
    if (any) items.push({ label: STR.load });
    items.push({ label: getLang() === 'zh' ? 'English' : '中文' });
    const i = await ui.choose(items, { cls: 'titlemenu', cancel: false, ctx: 'title' });
    const pick = items[i].label;
    if (pick === STR.newgame) { G.newGame(); await openCover(true); await opening(); return; }
    if (pick === STR.cont) { G.load(auto.raw); await resume(); return openCover(); }
    if (pick === STR.load) {
      const slots = [0, 1, 2].map((k) => { const s = Game.slotInfo(k); return { label: t(STR.slot) + ' ' + (k + 1), sub: s ? t(STR.lv) + s.lv + ' ' + mapName(s.map) : t(STR.empty), disabled: !s }; });
      const j = await ui.choose(slots, { title: STR.load, ctx: 'loadslot' });
      if (j >= 0) { G.load(Game.slotInfo(j).raw); await resume(); return openCover(); }
      continue;
    }
    setLang(getLang() === 'zh' ? 'en' : 'zh'); drawTitle();
  }
}
// the cover swings open on its spine, showing the first page; then the book fades into the game
async function openCover(toPage) {
  const tl = document.getElementById('title'); if (tl.classList.contains('hidden')) return;
  if (toPage) { const box = document.getElementById('ending'); box.classList.remove('hidden'); box.innerHTML = ''; }
  tl.classList.add('open'); if (!G.fast) await new Promise((r) => setTimeout(r, 900));
  tl.classList.add('gone'); if (!G.fast) await new Promise((r) => setTimeout(r, 380));
  tl.classList.add('hidden'); tl.classList.remove('open', 'gone');
}
function drawTitle() { document.getElementById('tname').textContent = t(['龍門刀客傳', 'Longmen Quest']); document.getElementById('tsub').textContent = t(['龍門雙奕・番外', 'A Longmen Twins side story']); document.getElementById('tpress').textContent = '© 2026  ' + t(['原創 8-bit 武俠立體書 RPG', 'An original 8-bit wuxia pop-up book RPG']); const em = document.getElementById('temb'); if (em && CAST.yirui) em.src = CAST.yirui.portrait; }
async function resume() {
  if (G.map === 'world') await G.enterWorld(G.x, G.y); else await G.enterMap(G.map, G.x, G.y, G.dir);
  G.mode = 'field';
}
async function opening() {
  const box = document.getElementById('ending'); box.classList.remove('hidden'); box.innerHTML = '';
  const lines = [
    ['龍門鎮，入夜，細雨。', 'Longmen Town. Nightfall. A fine rain.'],
    ['黃昏時，奕碩在河邊踢球，被一夥黑衣人擄走了。', 'At dusk, Yi Shuo was kicking his ball by the river when men in black carried him off.'],
    ['有人看見，他們往北邊黑風寨的方向去了。', 'Someone saw them head north, toward the Black Wind Fort.'],
    ['奕叡背起父親留下的舊環首刀，推開了家門。', 'Yi Rui shoulders the old ring-pommel saber his father left him, and opens the door.'],
  ];
  const skip = { v: false }; const off = input.push((k) => { if (k === 'A' || k === 'B') skip.v = true; });
  const wait = async (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms && !skip.v && !G.fast) await new Promise((r) => setTimeout(r, 50)); };
  audio.play('title');
  for (const l of lines) { if (skip.v) break; const p = document.createElement('p'); p.textContent = t(l); box.appendChild(p); await wait(30); p.classList.add('in'); await wait(2800); }
  await wait(600); off();
  // the prologue page fades and the map spread opens under it, its pop-ups rising
  await G.enterMap('longmen', 4, 7, 'down'); G.mode = 'field';
  box.classList.add('fadeout'); if (!G.fast) await new Promise((r) => setTimeout(r, 450));
  box.classList.add('hidden'); box.classList.remove('fadeout'); box.innerHTML = '';
  await G.run(async () => {
    await ui.say('oldman', [ '大少爺！二少爺在河邊被黑風寨的人擄走了！', 'Young master! The Black Wind bandits took your brother by the river!' ]);
    await ui.say('oldman', [ '聽雨樓的白先生消息最靈通，快去問問他吧！聽雨樓就在鎮子北邊正中。', 'Mr Bai at the Listening Rain House always knows the news. Ask him! It is the big house at the north of town.' ]);
    await ui.say(null, [ '（方向鍵移動，Z／A 鍵交談、調查，X／B 鍵打開選單。）', '(Arrows move. Z / A talks and checks. X / B opens the menu.)' ]);
  });
}
G.onEnd = () => title();

// save when the page goes away (iOS: pagehide; also when hidden)
window.addEventListener('pagehide', () => G.autosave());
document.addEventListener('visibilitychange', () => { if (document.hidden) G.autosave(); });
setInterval(() => G.autosave(), 30000);

(async () => {
  drawTitle();
  await loadArt();
  document.getElementById('loading').classList.add('hidden');
  requestAnimationFrame(loop);
  if (params.has('bot')) return;   // a test driver takes over
  title();
})();
export { G, title, resume };
