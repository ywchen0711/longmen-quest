// Front-view one-on-one battles in pure 8-bit style. Rounds: the hero picks a command, then hero and foe act in
// order of agility (with a little luck). Everything the foe does goes through the same rules as the hero.
import { ENEMIES, SKILLS, ITEMS, ART_OF } from './data.js?v=3';
import { ENEMY_ART } from './enemy_art.js?v=3';
import { CAST } from './people_art.js?v=3';
import * as R from './rules.js?v=3';
import { t, STR } from './ui.js?v=3';
import { hex } from './tiles.js?v=3';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imgs = {};
function img(src) { if (!imgs[src]) { imgs[src] = new Image(); imgs[src].src = src; } return imgs[src]; }
export function preloadBattleArt() { img('assets/enemies.png'); for (const c of Object.values(CAST)) img(c.portrait); }

const SCENES = {   // backdrop strip colours (NES indexes): sky, far, near
  grass: [0x21, 0x1A, 0x0A], forest: [0x0A, 0x0B, 0x1A], hill: [0x21, 0x19, 0x09], sand: [0x31, 0x27, 0x17], swamp: [0x0C, 0x0B, 0x04],
  snow: [0x31, 0x30, 0x10], cave: [0x0D, 0x00, 0x2D], tower: [0x07, 0x16, 0x28], tomb: [0x08, 0x18, 0x07], lair: [0x03, 0x04, 0x13],
  sea: [0x02, 0x12, 0x11], fort: [0x2D, 0x07, 0x17], town: [0x21, 0x1A, 0x0A], ice: [0x11, 0x21, 0x31],
};

export async function battle(G, foeId, opts = {}) {
  const ui = G.ui, au = G.audio, h = G.hero, E = ENEMIES[foeId];
  const foe = { id: foeId, ...E, hp: E.hp, maxHp: E.hp, mp: E.mp ?? 999, items: E.items || 0, sleep: 0, sealed: false, guard: 1, fled: false };
  const me = { sleep: 0, sealed: false, guard: 1 };
  const fname = t(E);
  const fast = G.fast;
  const wait = (ms) => (fast ? Promise.resolve() : sleep(ms));

  // ---------------------------------------------------------------- the screen
  const root = document.getElementById('battle'); root.innerHTML = ''; root.classList.remove('hidden');
  const el = (tag, cls, p = root) => { const e = document.createElement(tag); e.className = cls; p.appendChild(e); return e; };
  const stage = el('div', 'win bstage'); const cv = el('canvas', 'bcanvas', stage); cv.width = 160; cv.height = 120; const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false;
  const stat = el('div', 'win bstat'); const log = el('div', 'win blog'); const lines = [];
  const drawStat = () => { const s = R.stat(h); stat.innerHTML = `<div class="bname">${t(['奕叡', 'Yi Rui'])}${h.poison ? ' <span class="psn">' + t(['毒', 'PSN']) + '</span>' : ''}</div><div>${t('lv')} ${h.lv}</div><div class="${h.hp <= s.maxHp / 4 ? 'low' : ''}">${t('hp')} ${h.hp}/${s.maxHp}</div><div>${t('mp')} ${h.mp}/${s.maxMp}</div>`; stat.classList.toggle('danger', h.hp <= s.maxHp / 4); };
  const say = async (zh, en, ms = 420) => { if (G.ui.driver && G.ui.driver.onLog) G.ui.driver.onLog(zh); lines.push(t([zh, en])); while (lines.length > 4) lines.shift(); log.innerHTML = lines.map((l) => `<div>${l}</div>`).join(''); await wait(ms); };
  const waitA = () => new Promise((res) => { if (G.ui.driver || fast) return res(); const off = G.input.push((k) => { if (k === 'A' || k === 'B') { off(); res(); } }); });

  // enemy picture
  const scene = SCENES[opts.scene] || SCENES.grass;
  let art = null, src = null;
  if (E.por) { src = img(CAST[E.por].portrait); art = { x: 0, y: 0, w: 48, h: 56, por: 1 }; }
  else { src = img('assets/enemies.png'); art = ENEMY_ART[ART_OF(foeId)]; }
  const scale = art.por ? 2 : (E.big ? 2.4 : 2);
  const fx = { flash: 0, shake: 0, alpha: 1, dissolve: 0, parts: [], slash: 0, heal: 0 };
  let alive = true, raf = 0, last = performance.now();
  function draw(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    cx.fillStyle = '#000'; cx.fillRect(0, 0, 160, 120);
    // backdrop strip: sky band, a far ridge and near ground, all in NES colours, above the foe only
    cx.fillStyle = hex(scene[0]); cx.fillRect(0, 0, 160, 26);
    cx.fillStyle = hex(scene[1]); for (let x = 0; x < 160; x += 2) { const y = 14 + Math.round(Math.sin(x * 0.07) * 4 + Math.sin(x * 0.19) * 2); cx.fillRect(x, y, 2, 26 - y); }
    cx.fillStyle = hex(scene[2]); for (let x = 0; x < 160; x += 2) { const y = 20 + Math.round(Math.sin(x * 0.11 + 1) * 2); cx.fillRect(x, y, 2, 26 - y); }
    cx.fillStyle = '#000'; cx.fillRect(0, 26, 160, 2);
    if (src && src.complete && art && fx.alpha > 0) {
      const w = Math.round(art.w * scale), hh = Math.round(art.h * scale);
      const ox = Math.round(80 - w / 2 + (fx.shake > 0 ? (Math.random() * 6 - 3) : 0)), oy = Math.round(118 - hh);
      const vis = fx.flash > 0 ? (Math.floor(fx.flash * 20) % 2 === 0) : true;
      if (vis) {
        cx.save(); cx.globalAlpha = fx.alpha;
        if (art.por) { cx.drawImage(src, 0, 0, 48, 56, ox, oy, w, hh); }
        else {
          const cut = Math.floor(art.h * (1 - fx.dissolve));
          if (cut > 0) cx.drawImage(src, art.x, art.y, art.w, cut, ox, oy, w, Math.round(cut * scale));
        }
        cx.restore();
      }
      if (art.por && fx.dissolve > 0) { cx.fillStyle = '#000'; cx.fillRect(ox, oy + hh * (1 - fx.dissolve), w, hh * fx.dissolve + 1); }
    }
    // effects
    if (fx.slash > 0) { cx.strokeStyle = hex(0x30); cx.lineWidth = 3; const k = 1 - fx.slash; cx.beginPath(); cx.moveTo(30 + k * 20, 30); cx.lineTo(130 - k * 10, 110); cx.stroke(); cx.strokeStyle = hex(0x31); cx.lineWidth = 1; cx.beginPath(); cx.moveTo(26 + k * 20, 36); cx.lineTo(124 - k * 10, 114); cx.stroke(); }
    for (const p of fx.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; cx.fillStyle = hex(p.c); cx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    fx.parts = fx.parts.filter((p) => p.life > 0);
    fx.flash = Math.max(0, fx.flash - dt); fx.shake = Math.max(0, fx.shake - dt); fx.slash = Math.max(0, fx.slash - dt * 3);
    if (alive) raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  const burst = (cols, n = 24, cxp = 80, cyp = 70, sp = 60, up = 0) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (0.3 + Math.random()); fx.parts.push({ x: cxp, y: cyp, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, life: 0.4 + Math.random() * 0.4, c: cols[i % cols.length], s: 2 }); } };
  const shakeScreen = () => { if (fast) return; root.classList.remove('hit'); void root.offsetWidth; root.classList.add('hit'); };

  drawStat();
  au.play(opts.music || (E.boss ? (opts.final ? 'final' : 'boss') : 'battle'));
  if (!fast) { root.classList.add('enter'); await sleep(300); root.classList.remove('enter'); }
  await say(E.boss ? fname + '擋在面前！' : fname + '出現了！', E.boss ? fname + ' stands in your way!' : 'A ' + fname + ' appears!');

  // ambush: a quick foe may strike first (never a boss fight's opening)
  const hs = R.stat(h);
  if (!E.boss && Math.random() < Math.max(0, (E.agi - hs.agi) / 120)) { await say(fname + '搶先出手！', fname + ' strikes first!'); await foeTurn(); }

  // ---------------------------------------------------------------- actions
  async function heroAttack() {
    const atk = R.heroAtk(h);
    if (Math.random() < R.CRIT) { const d = R.critDamage(atk); au.sfx('crit'); fx.slash = 1; fx.flash = 0.5; burst([0x30, 0x28, 0x16], 30); await say('會心一擊！', 'A critical blow!', 300); return hurtFoe(d); }
    au.sfx('cursor'); fx.slash = 1; await wait(120);
    if (Math.random() < R.dodgeChance(foe.agi, R.stat(h).agi)) { au.sfx('miss'); return say(fname + '閃開了！', fname + ' dodges!'); }
    return hurtFoe(R.physDamage(atk, foe.def * foe.guard));
  }
  async function hurtFoe(d) {
    if (d <= 0) { au.sfx('miss'); return say('沒有造成傷害！', 'No damage!'); }
    au.sfx('hit'); fx.flash = 0.35; foe.hp = Math.max(0, foe.hp - d);
    if (foe.sleep && Math.random() < 0.4) { foe.sleep = 0; }
    await say(fname + '受到' + d + '點傷害！', fname + ' takes ' + d + ' damage!');
  }
  async function hurtHero(d, what) {
    if (d <= 0) { au.sfx('miss'); return say('奕叡沒有受傷！', 'Yi Rui is unhurt!'); }
    au.sfx('hurt'); shakeScreen(); h.hp = Math.max(0, h.hp - d); drawStat();
    await say('奕叡受到' + d + '點傷害！', 'Yi Rui takes ' + d + ' damage!');
  }
  async function useSkill(user, k, target) {   // user: 'hero' | 'foe'
    const S = SKILLS[k], isHero = user === 'hero';
    const uname = isHero ? t(['奕叡', 'Yi Rui']) : fname;
    const nm = (!isHero && E.skName && E.skName[k]) ? E.skName[k] : [S.zh, S.en];
    if (isHero) h.mp -= S.mp; else if (S.mp) foe.mp -= S.mp;
    drawStat();
    await say(uname + '使出了「' + nm[0] + '」！', uname + ' uses ' + nm[1] + '!', 300);
    if (S.kind === 'heal') {
      au.sfx('heal'); const v = R.skillRoll(k);
      if (isHero) { const mx = R.stat(h).maxHp; const before = h.hp; h.hp = Math.min(mx, h.hp + v); drawStat(); return say('體力回復了' + (h.hp - before) + '點。', 'Recovered ' + (h.hp - before) + ' HP.'); }
      burst([0x2A, 0x30, 0x39], 20, 80, 90, 40, 60); const before = foe.hp; foe.hp = Math.min(foe.maxHp, foe.hp + v); return say(fname + '回復了' + (foe.hp - before) + '點體力。', fname + ' recovers ' + (foe.hp - before) + ' HP.');
    }
    if (S.kind === 'hurt') {
      const v = R.skillRoll(k);
      if (isHero) { au.sfx('skill'); burst([0x31, 0x30, 0x21], 40, 80, 70, 90); fx.slash = 1; await wait(150); return hurtFoe(v); }
      au.sfx(k.startsWith('fire') ? 'fire' : 'skill'); burst(k.startsWith('fire') ? [0x16, 0x28, 0x30] : k === 'mist' ? [0x1A, 0x2A, 0x04] : [0x30, 0x23, 0x13], 40, 80, 80, 80);
      await hurtHero(v);
      if (S.poison && !h.poison && h.hp > 0 && Math.random() < 0.5) { h.poison = true; au.sfx('poison'); drawStat(); await say('奕叡中毒了！', 'Yi Rui is poisoned!'); }
      return;
    }
    if (S.kind === 'sleep') {
      if (isHero) { if (Math.random() < 1 - (foe.res || 0) * 0.9) { foe.sleep = 1; au.sfx('skill'); return say(fname + '被點中穴道，動彈不得！', fname + ' is frozen by the strike!'); } au.sfx('miss'); return say('但是沒有效果。', 'But it has no effect.'); }
      if (Math.random() < 0.7) { me.sleep = 1; au.sfx('skill'); return say('奕叡被點中穴道，動彈不得！', 'Yi Rui is frozen by the strike!'); }
      au.sfx('miss'); return say('奕叡運氣衝開了穴道！', 'Yi Rui forces the point open!');
    }
    if (S.kind === 'seal') {
      if (isHero) { if (Math.random() < 1 - (foe.res || 0) * 0.9) { foe.sealed = true; au.sfx('skill'); return say(fname + '的經脈被封住了！', fname + '\'s meridians are sealed!'); } au.sfx('miss'); return say('但是沒有效果。', 'But it has no effect.'); }
      if (Math.random() < 0.6) { me.sealed = true; au.sfx('skill'); return say('奕叡的經脈被封住了！', 'Yi Rui\'s meridians are sealed!'); }
      au.sfx('miss'); return say('但是沒有效果。', 'But it has no effect.');
    }
    if (S.kind === 'guard') {
      au.sfx('heal');
      if (isHero) { if (me.guard > 1) return say('已經護住全身了。', 'Already guarded.'); me.guard = 1.5; return say('奕叡全身如金鐘罩體！', 'Yi Rui\'s body turns hard as bronze!'); }
      if (foe.guard > 1) return say('但是沒有變化。', 'But nothing changes.'); foe.guard = 1.5; burst([0x28, 0x38], 20); return say(fname + '的防禦提高了！', fname + '\'s defence rises!');
    }
  }
  async function useItem(id) {
    const it = ITEMS[id]; R.removeItem(h, id);
    await say('奕叡使用了' + it.zh + '。', 'Yi Rui uses the ' + it.en + '.', 300);
    if (it.heal) { au.sfx('heal'); const mx = R.stat(h).maxHp, v = R.rand(it.heal[0], it.heal[1]), b = h.hp; h.hp = Math.min(mx, h.hp + v); drawStat(); return say('體力回復了' + (h.hp - b) + '點。', 'Recovered ' + (h.hp - b) + ' HP.'); }
    if (it.mp) { au.sfx('heal'); const mx = R.stat(h).maxMp, b = h.mp; h.mp = Math.min(mx, h.mp + it.mp); drawStat(); return say('內力回復了' + (h.mp - b) + '點。', 'Recovered ' + (h.mp - b) + ' MP.'); }
    if (it.cure) { au.sfx('heal'); h.poison = false; drawStat(); return say('毒解了。', 'The poison is gone.'); }
  }
  // the foe's choice: the same options a careful player has
  async function foeTurn() {
    if (foe.hp <= 0) return;
    if (foe.sleep) { if (Math.random() < 0.34) { foe.sleep = 0; return say(fname + '的穴道解開了。', fname + ' breaks free.'); } return say(fname + '動彈不得。', fname + ' cannot move.'); }
    const s = R.stat(h);
    // flee from a far stronger hero (and the golden toad simply runs)
    if ((E.run && R.heroAtk(h) >= E.atk * 2 && Math.random() < 0.25) || (E.flee && Math.random() < E.flee)) { foe.fled = true; au.sfx('run'); fx.alpha = 0; return say(fname + '逃走了。', 'The ' + fname + ' runs away.'); }
    const sk = (E.sk || []).filter(([k]) => !foe.sealed && (SKILLS[k].mp || 0) <= foe.mp);
    const low = foe.hp < foe.maxHp * 0.35;
    const has = (k) => sk.find((x) => x[0] === k);
    if (E.boss) {
      // a boss reads the fight: heal when low, pin a hero who is not pinned, seal a hero who relies on arts
      const heal = has('heal2') || has('heal');
      if (low && heal && Math.random() < 0.7) return useSkill('foe', heal[0]);
      if (low && foe.items > 0 && Math.random() < 0.6) { foe.items--; const v = R.rand(25, 35); foe.hp = Math.min(foe.maxHp, foe.hp + v); au.sfx('heal'); return say(fname + '吃下金創藥，回復了' + v + '點體力。', fname + ' eats a wound salve: +' + v + ' HP.'); }
      if (has('guard') && foe.guard === 1 && Math.random() < 0.5) return useSkill('foe', 'guard');
      if (has('sleep') && !me.sleep && Math.random() < has('sleep')[1]) return useSkill('foe', 'sleep');
      if (has('seal') && !me.sealed && G.usedArts && Math.random() < 0.4) return useSkill('foe', 'seal');
      for (const [k, p] of sk) if (SKILLS[k].kind === 'hurt' && Math.random() < p) return useSkill('foe', k);
    } else {
      if (low && foe.items > 0 && Math.random() < 0.5) { foe.items--; const v = R.rand(25, 35); foe.hp = Math.min(foe.maxHp, foe.hp + v); au.sfx('heal'); return say(fname + '吃下金創藥，回復了' + v + '點體力。', fname + ' eats a wound salve: +' + v + ' HP.'); }
      for (const [k, p] of sk) {
        const S = SKILLS[k];
        if (S.kind === 'heal' && !low) continue; if (S.kind === 'guard' && foe.guard > 1) continue; if (S.kind === 'sleep' && me.sleep) continue; if (S.kind === 'seal' && me.sealed) continue;
        if (Math.random() < p) return useSkill('foe', k);
      }
    }
    // a plain attack
    await say(fname + '攻擊！', fname + ' attacks!', 220);
    if (Math.random() < R.dodgeChance(s.agi, foe.agi)) { au.sfx('miss'); return say('奕叡閃開了！', 'Yi Rui dodges!'); }
    let d = Math.random() < R.CRIT ? R.critDamage(foe.atk) : R.physDamage(foe.atk, R.heroDef(h) * me.guard);
    await hurtHero(d);
    if (E.poison && !h.poison && h.hp > 0 && Math.random() < E.poison) { h.poison = true; au.sfx('poison'); drawStat(); await say('奕叡中毒了！', 'Yi Rui is poisoned!'); }
  }
  async function heroTurn(cmd) {
    if (me.sleep) { if (Math.random() < 0.5) { me.sleep = 0; await say('奕叡衝開了穴道！', 'Yi Rui breaks free!'); } else return say('奕叡動彈不得……', 'Yi Rui cannot move...'); }
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
    if (h.poison && h.hp > 0 && foe.hp > 0 && !foe.fled) { const d = Math.max(1, Math.floor(R.stat(h).maxHp / 16)); h.hp = Math.max(1, h.hp - d); au.sfx('poison'); drawStat(); await say('毒性發作，失去' + d + '點體力。', 'Poison: -' + d + ' HP.', 300); }
    if (foe.hp <= 0) result = 'win'; else if (h.hp <= 0) result = 'lose'; else if (foe.fled) result = 'fled';
  }

  // ---------------------------------------------------------------- the end
  if (result === 'win') {
    au.sfx('die'); for (let i = 0; i <= 10; i++) { fx.dissolve = i / 10; await wait(40); }
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
  G.stats.battles++; if (result === 'win') G.stats.wins++;
  return result;
}
