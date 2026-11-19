// Game data: levels, martial skills, items and gear, enemies and where they live. Every number the player and the
// enemies use comes from the same rules (battle.js); bosses are hard only through their stats, gear-like numbers,
// the same skills and a smarter AI.

// ---------------------------------------------------------------- the hero's growth: [hp, mp, str, agi] per level
export const LEVELS = [
  null,
  [15, 0, 4, 4], [22, 0, 5, 5], [26, 6, 7, 7], [32, 12, 9, 9], [38, 16, 13, 11],
  [44, 20, 17, 13], [50, 24, 20, 17], [56, 28, 24, 20], [62, 34, 30, 23], [70, 40, 34, 28],
  [78, 46, 40, 32], [86, 52, 46, 37], [94, 58, 52, 42], [102, 64, 58, 47], [112, 72, 64, 52],
  [122, 80, 70, 56], [132, 88, 76, 60], [142, 96, 82, 64], [152, 104, 88, 68], [165, 115, 94, 72],
];
export const MAX_LV = 20;
export const XP_FOR = [0, 0, 6, 18, 36, 70, 130, 220, 340, 500, 700, 950, 1250, 1650, 2150, 2750, 3450, 4300, 5300, 6500, 8000];

// ---------------------------------------------------------------- martial skills (武功); MP = 內力
// kind: heal | hurt | sleep | seal | guard | home | escape | ward | fire
export const SKILLS = {
  heal:   { zh: '調息', en: 'Breathe', mp: 4, kind: 'heal', lo: 12, hi: 18, lv: 3, field: true, battle: true, dz: '運氣調息，回復少量體力。', de: 'Circulate your qi to recover a little HP.' },
  qi:     { zh: '氣刀', en: 'Qi Blade', mp: 2, kind: 'hurt', lo: 8, hi: 13, lv: 4, battle: true, dz: '刀氣離刃，不看防禦。', de: 'Sword qi leaves the blade; ignores defence.' },
  sleep:  { zh: '點穴', en: 'Pressure Point', mp: 3, kind: 'sleep', lv: 6, battle: true, dz: '點中穴道，使敵人動彈不得。', de: 'Strike an acupoint so the foe cannot move.' },
  home:   { zh: '歸鄉', en: 'Homeward', mp: 6, kind: 'home', lv: 8, field: true, dz: '施展輕功，回到上次記錄的地方。', de: 'Light-foot back to where you last saved.' },
  escape: { zh: '遁地', en: 'Slip Away', mp: 4, kind: 'escape', lv: 10, field: true, dz: '從洞窟或塔中脫身到外面。', de: 'Get out of a cave or tower at once.' },
  seal:   { zh: '封脈', en: 'Seal Meridians', mp: 3, kind: 'seal', lv: 11, battle: true, dz: '封住經脈，敵人無法施展武功。', de: 'Seal the meridians: the foe cannot use skills.' },
  ward:   { zh: '驅邪', en: 'Ward', mp: 3, kind: 'ward', lv: 14, field: true, dz: '一身正氣，弱小的妖物不敢近身。', de: 'Righteous qi: weak creatures keep away.' },
  heal2:  { zh: '大調息', en: 'Deep Breath', mp: 10, kind: 'heal', lo: 70, hi: 90, lv: 13, field: true, battle: true, dz: '大周天運轉，回復大量體力。', de: 'A full circulation that restores much HP.' },
  qi2:    { zh: '天河刀氣', en: 'Sky River Blade', mp: 6, kind: 'hurt', lo: 50, hi: 62, lv: 16, battle: true, dz: '一刀如天河倒瀉。', de: 'One cut like the Milky Way pouring down.' },
  guard:  { zh: '金剛護體', en: 'Diamond Body', mp: 4, kind: 'guard', battle: true, dz: '少林心法，本場戰鬥防禦大增。', de: 'A temple art: defence greatly up for this fight.' },
  // the same arts in an enemy's hands may carry its own name (flavour only; the numbers are the skill's)
  fire:   { zh: '鬼火', en: 'Ghost Fire', mp: 0, kind: 'hurt', lo: 9, hi: 14 },
  fire2:  { zh: '冥火', en: 'Nether Blaze', mp: 0, kind: 'hurt', lo: 30, hi: 40 },
  mist:   { zh: '毒霧', en: 'Venom Mist', mp: 0, kind: 'hurt', lo: 12, hi: 18, poison: true },
};
export const LEARN_ORDER = ['heal', 'qi', 'sleep', 'home', 'escape', 'seal', 'heal2', 'ward', 'qi2'];

// ---------------------------------------------------------------- items and gear
// kind: use (consumable) | key (story item) | w (weapon) | a (armour) | c (bracer/charm)
export const ITEMS = {
  herb:     { zh: '金創藥', en: 'Wound Salve', kind: 'use', price: 12, heal: [25, 35], battle: true, field: true, dz: '回復約三十點體力。', de: 'Restores about 30 HP.' },
  antidote: { zh: '解毒草', en: 'Antidote Herb', kind: 'use', price: 8, cure: true, battle: true, field: true, dz: '解除中毒。', de: 'Cures poison.' },
  wing:     { zh: '歸雁符', en: 'Homing Charm', kind: 'use', price: 30, home: true, field: true, dz: '回到上次記錄的地方。', de: 'Returns you to where you last saved.' },
  incense:  { zh: '驅獸香', en: 'Beast-ward Incense', kind: 'use', price: 40, ward: true, field: true, dz: '一段時間內弱小的妖物不敢靠近。', de: 'Weak creatures keep away for a while.' },
  qipill:   { zh: '回氣丹', en: 'Qi Pill', kind: 'use', price: 120, mp: 25, battle: true, field: true, dz: '回復二十五點內力。', de: 'Restores 25 MP.' },
  key:      { zh: '銅鑰匙', en: 'Bronze Key', kind: 'use', price: 40, dz: '打開一扇上鎖的門，用後即壞。', de: 'Opens one locked door, then breaks.' },
  lantern:  { zh: '燈籠', en: 'Lantern', kind: 'key', price: 60, dz: '照亮黑暗的洞窟。', de: 'Lights up dark caves.' },
  token:    { zh: '寨門令牌', en: 'Fort Token', kind: 'key', dz: '黑風寨的通行令牌。', de: 'Pass token of the Black Wind Fort.' },
  cellkey:  { zh: '牢房鑰匙', en: 'Cell Key', kind: 'key', dz: '黑風寨牢房的鑰匙。', de: 'Key to the cells of the Black Wind Fort.' },
  rope:     { zh: '飛索', en: 'Flying Rope', kind: 'key', dz: '柳寒煙所贈，可以重新架起斷了的吊橋。', de: 'A gift from Liu Hanyan; it can rig a broken rope bridge.' },
  tian:     { zh: '天符', en: 'Heaven Seal', kind: 'key', dz: '三符之一，千佛寺的鎮寺之寶。', de: 'One of the three seals, kept by the Thousand Buddha Temple.' },
  di:       { zh: '地符', en: 'Earth Seal', kind: 'key', dz: '三符之一，埋在沙海古墓深處。', de: 'One of the three seals, buried deep in the Sand Sea Tomb.' },
  ren:      { zh: '人符', en: 'Mortal Seal', kind: 'key', dz: '三符之一，冷笑天贈。', de: 'One of the three seals, given by Leng Xiaotian.' },
  // weapons (atk), armour (def), bracers/charms (def)
  w0: { zh: '舊環首刀', en: 'Old Ring Saber', kind: 'w', atk: 4, price: 10 },
  w1: { zh: '精鋼刀', en: 'Steel Dao', kind: 'w', atk: 10, price: 120 },
  w2: { zh: '雁翎刀', en: 'Goose-feather Dao', kind: 'w', atk: 16, price: 450 },
  w6: { zh: '藏鋒刀', en: 'Hidden-edge Dao', kind: 'w', atk: 21, price: 600 },
  w3: { zh: '斬馬刀', en: 'Horse-cutter', kind: 'w', atk: 26, price: 1300 },
  w4: { zh: '寒鐵刀', en: 'Cold Iron Dao', kind: 'w', atk: 34, price: 3200 },
  w5: { zh: '龍吟刀', en: 'Dragon Song Dao', kind: 'w', atk: 44, price: 9000 },
  a0: { zh: '粗布衣', en: 'Plain Robe', kind: 'a', def: 2, price: 10 },
  a1: { zh: '皮甲', en: 'Leather Vest', kind: 'a', def: 5, price: 60 },
  a2: { zh: '鎖子甲', en: 'Chain Shirt', kind: 'a', def: 10, price: 280 },
  a3: { zh: '鐵鱗甲', en: 'Iron Scale', kind: 'a', def: 16, price: 900 },
  a4: { zh: '玄鐵甲', en: 'Dark Iron Mail', kind: 'a', def: 24, price: 2600 },
  a5: { zh: '天蠶衣', en: 'Heaven Silk Robe', kind: 'a', def: 30, price: 8000 },
  c1: { zh: '木護腕', en: 'Wood Bracer', kind: 'c', def: 2, price: 20 },
  c2: { zh: '銅護腕', en: 'Bronze Bracer', kind: 'c', def: 5, price: 140 },
  c3: { zh: '鐵護腕', en: 'Iron Bracer', kind: 'c', def: 9, price: 650 },
  c4: { zh: '金絲護腕', en: 'Gold-thread Bracer', kind: 'c', def: 14, price: 2000 },
  c5: { zh: '龍鱗護心鏡', en: 'Dragon-scale Mirror', kind: 'c', def: 20, price: 7000 },
};
export const BAG_MAX = 10;   // kinds of items carried (stacks of up to 9)

// ---------------------------------------------------------------- shops
export const SHOPS = {
  longmen_w: ['w1', 'a1', 'c1'],
  longmen_i: ['herb', 'antidote', 'wing'],
  qingshi:   ['w1', 'a1', 'a2', 'c1', 'c2'],
  qingshi_i: ['herb', 'antidote', 'wing', 'incense'],
  linjiang:  ['w2', 'a2', 'c2'],
  linjiang_i:['herb', 'antidote', 'wing', 'incense'],
  nanling:   ['w2', 'w3', 'a2', 'a3', 'c2', 'c3'],
  nanling_i: ['herb', 'antidote', 'wing', 'incense', 'lantern', 'key'],
  hanjiang:  ['herb', 'antidote', 'wing', 'qipill'],
  qianfo:    ['a3', 'c3', 'herb', 'antidote', 'wing'],
  chisha:    ['w3', 'a3', 'a4', 'c3', 'c4'],
  chisha_i:  ['herb', 'antidote', 'wing', 'key', 'lantern', 'qipill'],
  wanghai:   ['w4', 'a4', 'c4'],
  wanghai_i: ['herb', 'antidote', 'wing', 'incense', 'qipill', 'key'],
};

// ---------------------------------------------------------------- enemies
// hp, atk, def, agi, xp, gold; sk = [skill, chance] tried in order; items = herbs carried (used by the same rules
// as the hero's); res = chance to shrug off pressure points and sealing; run = may flee from a much stronger hero.
// poison: its bite may poison. big = draw scale in battle.
const E = (zh, en, hp, atk, def, agi, xp, gold, o = {}) => ({ zh, en, hp, atk, def, agi, xp, gold, ...o });
export const ENEMIES = {
  e_dog:      E('野狗', 'Wild Dog', 6, 7, 3, 4, 1, 2, { run: 1 }),
  e_snake:    E('竹葉青', 'Bamboo Viper', 6, 8, 4, 6, 2, 2, { poison: 0.25, run: 1 }),
  e_bat:      E('山蝠', 'Cave Bat', 7, 9, 4, 10, 2, 3, { run: 1 }),
  e_bandit:   E('黑風嘍囉', 'Black Wind Lackey', 11, 11, 6, 5, 3, 7, { items: 1, run: 1 }),
  e_wolf:     E('灰狼', 'Grey Wolf', 14, 15, 8, 11, 5, 6, { run: 1 }),
  e_monkey:   E('山猴', 'Mountain Monkey', 12, 14, 7, 15, 5, 8, { run: 1 }),
  e_boar:     E('野豬', 'Wild Boar', 19, 18, 10, 6, 7, 9, { run: 1 }),
  e_bandit2:  E('黑風刀手', 'Black Wind Blade', 22, 21, 12, 8, 10, 16, { items: 1, run: 1 }),
  e_wisp:     E('鬼火', "Will-o'-wisp", 15, 16, 16, 12, 9, 10, { sk: [['fire', 0.4]], res: 0.3 }),
  e_tree:     E('樹妖', 'Tree Spirit', 28, 22, 16, 4, 12, 13, { sk: [['heal', 0.3]] }),
  e_toad:     E('蟾蜍精', 'Toad Spirit', 24, 24, 14, 6, 13, 15, { poison: 0.3 }),
  e_snake2:   E('赤練蛇', 'Red Racer', 22, 27, 12, 15, 14, 13, { poison: 0.3, run: 1 }),
  e_fox:      E('狐妖', 'Fox Spirit', 26, 27, 16, 19, 16, 22, { sk: [['sleep', 0.25]], res: 0.3 }),
  e_ghost:    E('水鬼', 'Drowned Ghost', 32, 31, 20, 16, 19, 24, { sk: [['sleep', 0.2], ['qi', 0.25]], res: 0.3 }),
  e_skel:     E('白骨兵', 'Bone Soldier', 36, 35, 24, 10, 21, 25, { res: 0.6 }),
  e_bat2:     E('吸血蝠', 'Blood Bat', 30, 33, 18, 22, 19, 19, { run: 1 }),
  e_wood:     E('木人', 'Wooden Dummy', 42, 37, 30, 6, 25, 21, { res: 1 }),
  e_ape:      E('白猿', 'White Ape', 46, 43, 26, 19, 29, 31, { run: 1 }),
  e_spider:   E('毒蛛', 'Venom Spider', 40, 41, 24, 16, 27, 29, { poison: 0.35, sk: [['sleep', 0.2]] }),
  e_disciple: E('幽冥教徒', 'Netherworld Cultist', 48, 45, 30, 20, 33, 42, { sk: [['heal', 0.25], ['seal', 0.15], ['qi', 0.25]], items: 1 }),
  e_wisp2:    E('冥火', 'Nether Flame', 38, 41, 40, 24, 31, 31, { sk: [['fire', 0.5]], res: 0.5 }),
  e_boar2:    E('鐵背豬', 'Ironback Boar', 58, 51, 40, 10, 35, 35, {}),
  e_scorp:    E('沙蠍', 'Sand Scorpion', 52, 53, 44, 16, 39, 41, { poison: 0.35 }),
  e_jiang:    E('殭屍', 'Jiangshi', 66, 57, 40, 8, 45, 45, { poison: 0.25, res: 0.8 }),
  e_skel2:    E('骨將', 'Bone Captain', 62, 61, 48, 14, 47, 52, { res: 0.6, sk: [['guard', 0.15]] }),
  e_toad2:    E('毒蟾', 'Venom Toad', 58, 57, 40, 10, 43, 45, { sk: [['mist', 0.3]], poison: 0.3 }),
  e_ghost2:   E('白衣鬼', 'Pale Ghost', 56, 59, 46, 26, 49, 54, { sk: [['sleep', 0.25], ['qi', 0.3]], res: 0.4 }),
  e_scorp2:   E('赤蠍', 'Crimson Scorpion', 66, 67, 50, 18, 55, 62, { poison: 0.4 }),
  e_wolf2:    E('雪狼', 'Snow Wolf', 72, 71, 48, 31, 61, 61, {}),
  e_bronze:   E('銅人', 'Bronze Man', 82, 75, 80, 8, 72, 72, { sk: [['guard', 0.25]], res: 1 }),
  e_jiang2:   E('銅甲屍', 'Bronze Jiangshi', 88, 79, 64, 12, 74, 76, { sk: [['seal', 0.2]], res: 0.8, poison: 0.2 }),
  e_fox2:     E('銀狐', 'Silver Fox', 72, 75, 56, 41, 72, 82, { sk: [['sleep', 0.25], ['qi', 0.2]], res: 0.4 }),
  e_tree2:    E('枯木精', 'Withered Elder', 92, 73, 60, 6, 72, 66, { sk: [['heal2', 0.2]] }),
  e_spider2:  E('人面蛛', 'Man-faced Spider', 82, 81, 60, 27, 80, 82, { poison: 0.35, sk: [['sleep', 0.2]] }),
  e_assassin: E('鬼面刺客', 'Ghost-mask Assassin', 92, 95, 70, 49, 102, 112, { sk: [['sleep', 0.2], ['qi2', 0.12]], items: 1 }),
  e_skel3:    E('黑骨魔', 'Black Bone Fiend', 112, 99, 84, 24, 112, 122, { sk: [['seal', 0.15]], res: 0.7 }),
  e_ghost3:   E('怨魂', 'Wrathful Spirit', 98, 97, 76, 41, 107, 112, { sk: [['qi2', 0.15], ['sleep', 0.2]], res: 0.5 }),
  e_ape2:     E('金剛猿', 'Vajra Ape', 132, 105, 80, 31, 122, 122, { sk: [['guard', 0.2]] }),
  e_wisp3:    E('幽冥火', 'Underworld Flame', 92, 101, 100, 41, 112, 112, { sk: [['fire2', 0.4]], res: 0.6 }),
  e_toad3:    E('金蟾', 'Golden Toad', 30, 60, 160, 60, 40, 400, { res: 1, flee: 0.5 }),
  // ---- bosses: people are shown by their portrait; creatures are a bigger, recoloured kin of a common enemy
  shouhou:    E('瘦猴', 'Skinny Monkey', 46, 19, 11, 16, 40, 60, { boss: 1, items: 3, por: 'shouhou' }),
  daoba:      E('刀疤', 'Scar', 90, 31, 20, 13, 110, 150, { boss: 1, mp: 15, items: 3, sk: [['sleep', 0.15]], por: 'daoba', res: 0.5 }),
  heixiong:   E('黑熊', 'Black Bear', 132, 40, 25, 10, 220, 300, { boss: 1, mp: 24, items: 4, sk: [['guard', 0.2]], por: 'heixiong', res: 0.6 }),
  b_yaoji:    E('水月妖姬', 'Moonwater Siren', 170, 47, 34, 24, 360, 400, { boss: 1, mp: 50, sk: [['sleep', 0.2], ['heal', 0.25], ['qi', 0.3]], res: 0.6, art: 'b_yaoji', big: 1.5 }),
  b_luohan:   E('金身羅漢', 'Golden Arhat', 230, 60, 54, 8, 560, 500, { boss: 1, mp: 40, sk: [['guard', 0.3], ['heal2', 0.2]], res: 1, art: 'b_luohan', big: 1.5 }),
  b_jiangjun: E('殭屍將軍', 'Jiangshi General', 250, 67, 52, 14, 800, 700, { boss: 1, mp: 50, poison: 0.35, sk: [['seal', 0.2], ['mist', 0.25]], res: 1, art: 'b_jiangjun', big: 1.5 }),
  xiaotian:   E('冷笑天', 'Leng Xiaotian', 320, 85, 64, 58, 1200, 0, { boss: 1, mp: 60, items: 3, sk: [['qi2', 0.22], ['heal2', 0.2]], skName: { qi2: ['笑盡天下', 'Laugh at the World'] }, por: 'xiaotian', res: 0.8 }),
  b_hufa:     E('鬼面護法', 'Ghost-mask Warden', 300, 98, 80, 46, 1300, 900, { boss: 1, mp: 70, items: 3, sk: [['sleep', 0.2], ['seal', 0.15], ['qi2', 0.15]], res: 0.8, art: 'b_hufa', big: 1.5 }),
  tuqianqiu:  E('屠千秋', 'Tu Qianqiu', 370, 96, 76, 62, 0, 0, { boss: 1, mp: 64, items: 4, sk: [['qi2', 0.25], ['heal2', 0.2], ['sleep', 0.12], ['seal', 0.1]], skName: { qi2: ['白骨扇・千秋寂', 'Bone Fan: Silent Ages'] }, por: 'tuqianqiu', res: 1 }),
};
export const ART_OF = (id) => ENEMIES[id].art || id;

// ---------------------------------------------------------------- where enemies live
export const ZONES = {
  1: ['e_dog', 'e_snake', 'e_bat', 'e_dog', 'e_bandit'],
  2: ['e_bandit', 'e_wolf', 'e_monkey', 'e_snake', 'e_boar', 'e_bat'],
  3: ['e_boar', 'e_wisp', 'e_tree', 'e_toad', 'e_snake2', 'e_fox', 'e_bandit2'],
  4: ['e_ghost', 'e_skel', 'e_bat2', 'e_fox', 'e_wood', 'e_ape', 'e_spider', 'e_toad'],
  5: ['e_scorp', 'e_jiang', 'e_skel2', 'e_toad2', 'e_ghost2', 'e_boar2', 'e_disciple', 'e_wisp2', 'e_toad3'],
  6: ['e_wolf2', 'e_jiang2', 'e_fox2', 'e_tree2', 'e_spider2', 'e_ape', 'e_scorp2', 'e_bronze'],
  7: ['e_assassin', 'e_skel3', 'e_ghost3', 'e_ape2', 'e_wisp3', 'e_jiang2', 'e_disciple', 'e_toad3'],
  heifenglin: ['e_bat', 'e_snake', 'e_monkey', 'e_bandit', 'e_wolf'],
  fort: ['e_bandit', 'e_bandit2', 'e_wolf', 'e_boar', 'e_bandit2'],
  shuiyue: ['e_ghost', 'e_toad', 'e_snake2', 'e_bat2', 'e_wisp', 'e_fox'],
  cangjian: ['e_skel', 'e_bat2', 'e_spider', 'e_ghost', 'e_tree'],
  tower: ['e_wood', 'e_wisp2', 'e_bat2', 'e_ape', 'e_skel', 'e_spider'],
  tower2: ['e_bronze', 'e_wood', 'e_wisp2', 'e_ape', 'e_disciple'],
  tomb: ['e_jiang', 'e_skel2', 'e_ghost2', 'e_scorp', 'e_wisp2', 'e_scorp2'],
  longji: ['e_wolf2', 'e_jiang2', 'e_spider2', 'e_fox2', 'e_ape', 'e_bronze'],
  lair: ['e_assassin', 'e_skel3', 'e_ghost3', 'e_ape2', 'e_wisp3', 'e_jiang2', 'e_disciple'],
};

// overworld danger: which zone a tile belongs to
export function zoneAt(x, y) {
  if (x >= 99) return 7;
  if (y <= 21 && x >= 74) return 6;
  if (y <= 21 && x >= 50) return 4;
  if (y >= 51 && x >= 64) return 5;
  if (x >= 78 && y >= 36) return 5;
  if (x >= 68 && y >= 24 && y <= 40) return 4;
  if (x >= 50) return 3;
  if (y <= 16) return 3;
  if (y >= 56) return 3;
  const d = Math.hypot(x - 26, y - 44);
  if (d < 11) return 1;
  return 2;
}
// chance per step to meet an enemy, by tile
export const ENCOUNTER = { '.': 1 / 22, '=': 1 / 40, f: 1 / 13, h: 1 / 12, s: 1 / 12, w: 1 / 12, n: 1 / 12, B: 1 / 40, D: 0, X: 1 / 30, c: 1 / 24 };
