// The one set of rules the hero and every enemy share: stats, damage, skills, items, levels.
import { LEVELS, MAX_LV, XP_FOR, SKILLS, LEARN_ORDER, ITEMS, BAG_MAX, SLOTS } from './data.js?v=14';

export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export function newHero() {
  return { lv: 1, xp: 0, hp: 15, mp: 0, gold: 60, w: 'w0', a: 'a0', c: null, hd: null, bt: null, ck: null, pd: null, bag: [{ id: 'herb', n: 2 }], learned: [], poison: false };
}
// the sum of one number over everything worn
export const gear = (h, k) => { let s = 0; for (const sl of SLOTS) { const id = h[sl]; if (id && ITEMS[id] && ITEMS[id][k]) s += ITEMS[id][k]; } return s; };
export const stat = (h) => { const L = LEVELS[h.lv]; return { maxHp: L[0] + gear(h, 'mhp'), maxMp: L[1] + gear(h, 'mmp'), str: L[2], agi: L[3] + gear(h, 'agi') }; };
export const heroAtk = (h) => stat(h).str + gear(h, 'atk');
export const heroDef = (h) => Math.floor(stat(h).agi / 2) + gear(h, 'def');
export const heroCrit = (h) => CRIT + gear(h, 'crit');
export const resist = (h, k) => Math.min(1, gear(h, k));   // rpsn | rpin | rseal
export const known = (h) => LEARN_ORDER.filter((k) => h.lv >= SKILLS[k].lv).concat(h.learned.filter((k) => !LEARN_ORDER.includes(k)));
export const xpToNext = (h) => (h.lv >= MAX_LV ? 0 : XP_FOR[h.lv + 1] - h.xp);
// how good a piece is, all told (for "is it better?" prompts and the test bot)
export const gearScore = (id) => { const it = id && ITEMS[id]; if (!it) return -1; return (it.atk || 0) * 1.2 + (it.def || 0) + (it.agi || 0) * 0.6 + (it.mhp || 0) * 0.3 + (it.mmp || 0) * 0.3 + (it.crit || 0) * 120 + ((it.rpsn || 0) + (it.rpin || 0) + (it.rseal || 0)) * 6 + (it.regen || 0) * 3; };
// the hero's numbers as they would be with `id` worn in `slot` instead (null: that slot emptied)
export function withGear(h, slot, id) { const o = { ...h, [slot]: id }; const s = stat(o); return { atk: heroAtk(o), def: heroDef(o), agi: s.agi, maxHp: s.maxHp, maxMp: s.maxMp, crit: heroCrit(o) }; }
// keep HP/MP within their (gear-dependent) maximum
export function clampHero(h) { const s = stat(h); h.hp = Math.min(h.hp, s.maxHp); h.mp = Math.min(h.mp, s.maxMp); }

// bag: stacks of up to 9; at most BAG_MAX kinds
export const count = (h, id) => (h.bag.find((b) => b.id === id) || { n: 0 }).n;
export function canAdd(h, id) { const b = h.bag.find((x) => x.id === id); return b ? b.n < 9 : h.bag.length < BAG_MAX; }
export function addItem(h, id) {
  const it = ITEMS[id];
  if (it.kind === 'key') { if (!h.bag.find((b) => b.id === id)) h.bag.push({ id, n: 1 }); return true; }
  const b = h.bag.find((x) => x.id === id); if (b) { if (b.n >= 9) return false; b.n++; return true; }
  if (h.bag.length >= BAG_MAX) return false; h.bag.push({ id, n: 1 }); return true;
}
export function removeItem(h, id) { const b = h.bag.find((x) => x.id === id); if (!b) return false; b.n--; if (b.n <= 0) h.bag.splice(h.bag.indexOf(b), 1); return true; }
// gear is equipped from the bag: the old piece goes back into the bag
export function equip(h, id) {
  const it = ITEMS[id], slot = it.kind; const old = h[slot];
  removeItem(h, id); h[slot] = id; if (old) addItem(h, old);
  clampHero(h);
}
// take a piece off into the bag (false if the bag is full)
export function unequip(h, slot) { const id = h[slot]; if (!id) return true; if (!canAdd(h, id)) return false; addItem(h, id); h[slot] = null; clampHero(h); return true; }

// add XP; returns a list of level-ups [{lv, gains:{hp,mp,str,agi}, skills:[]}]
export function gainXp(h, n) {
  h.xp += n; const ups = [];
  while (h.lv < MAX_LV && h.xp >= XP_FOR[h.lv + 1]) {
    const before = stat(h), had = known(h); h.lv++; const after = stat(h);
    const gains = { hp: after.maxHp - before.maxHp, mp: after.maxMp - before.maxMp, str: after.str - before.str, agi: after.agi - before.agi };
    h.hp += gains.hp; h.mp += gains.mp;
    ups.push({ lv: h.lv, gains, skills: known(h).filter((k) => !had.includes(k)) });
  }
  return ups;
}
// what a beaten foe leaves: each [item, chance] of its table rolled on its own
export function rollDrops(E) { return (E.drop || []).filter(([, p]) => Math.random() < p).map(([id]) => id); }

// ---------------------------------------------------------------- combat numbers (same for both sides)
export function physDamage(atk, def) {
  const base = atk - def / 2;
  if (base < 2) return Math.random() < 0.5 ? 1 : 0;
  return Math.max(1, Math.floor(base * (0.4 + Math.random() * 0.25)));
}
export const critDamage = (atk) => Math.floor(atk * (0.6 + Math.random() * 0.4));
export const dodgeChance = (defAgi, atkAgi) => Math.max(0.02, Math.min(0.15, (defAgi - atkAgi) / 200 + 1 / 32));
export const CRIT = 1 / 32;
export const skillRoll = (k) => rand(SKILLS[k].lo, SKILLS[k].hi);
export function runChance(heroAgi, foeAgi) { return Math.max(0.25, Math.min(0.95, 0.55 + (heroAgi - foeAgi) / 80)); }
