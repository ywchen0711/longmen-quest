// The one set of rules the hero and every enemy share: stats, damage, skills, items, levels.
import { LEVELS, MAX_LV, XP_FOR, SKILLS, LEARN_ORDER, ITEMS, BAG_MAX } from './data.js';

export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export function newHero() {
  return { lv: 1, xp: 0, hp: 15, mp: 0, gold: 60, w: 'w0', a: 'a0', c: null, bag: [{ id: 'herb', n: 2 }], learned: [], poison: false };
}
export const stat = (h) => { const L = LEVELS[h.lv]; return { maxHp: L[0], maxMp: L[1], str: L[2], agi: L[3] }; };
export const heroAtk = (h) => stat(h).str + (h.w ? ITEMS[h.w].atk : 0);
export const heroDef = (h) => Math.floor(stat(h).agi / 2) + (h.a ? ITEMS[h.a].def : 0) + (h.c ? ITEMS[h.c].def : 0);
export const known = (h) => LEARN_ORDER.filter((k) => h.lv >= SKILLS[k].lv).concat(h.learned.filter((k) => !LEARN_ORDER.includes(k)));
export const xpToNext = (h) => (h.lv >= MAX_LV ? 0 : XP_FOR[h.lv + 1] - h.xp);

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
}

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
