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
// kind: use (consumable) | key (story item) | mat (material, to sell) | gear: w weapon, a armour, c bracer, hd head,
// bt boots, ck cloak, pd pendant
export const ITEMS = {
  herb:     { zh: '金創藥', en: 'Wound Salve', kind: 'use', price: 12, heal: [25, 35], battle: true, field: true, dz: '回復約三十點體力。', de: 'Restores about 30 HP.' },
  antidote: { zh: '解毒草', en: 'Antidote Herb', kind: 'use', price: 8, cure: true, battle: true, field: true, dz: '解除中毒。', de: 'Cures poison.' },
  wing:     { zh: '歸雁符', en: 'Homing Charm', kind: 'use', price: 30, home: true, field: true, dz: '回到上次記錄的地方。', de: 'Returns you to where you last saved.' },
  incense:  { zh: '驅獸香', en: 'Beast-ward Incense', kind: 'use', price: 40, ward: true, field: true, dz: '一段時間內弱小的妖物不敢靠近。', de: 'Weak creatures keep away for a while.' },
  fruit:    { zh: '朱果', en: 'Crimson Fruit', kind: 'use', price: 400, heal: [999, 999], battle: true, field: true, dz: '白猿守著的果子，吃下體力全滿。', de: 'The fruit the White Ape guards: restores all HP.' },
  qipill:   { zh: '回氣丹', en: 'Qi Pill', kind: 'use', price: 120, mp: 25, battle: true, field: true, dz: '回復二十五點內力。', de: 'Restores 25 MP.' },
  key:      { zh: '銅鑰匙', en: 'Bronze Key', kind: 'use', price: 40, dz: '打開一扇上鎖的門，用後即壞。', de: 'Opens one locked door, then breaks.' },
  lantern:  { zh: '燈籠', en: 'Lantern', kind: 'key', price: 60, dz: '照亮黑暗的洞窟。', de: 'Lights up dark caves.' },
  token:    { zh: '寨門令牌', en: 'Fort Token', kind: 'key', dz: '黑風寨的通行令牌。', de: 'Pass token of the Black Wind Fort.' },
  cellkey:  { zh: '牢房鑰匙', en: 'Cell Key', kind: 'key', dz: '黑風寨牢房的鑰匙。', de: 'Key to the cells of the Black Wind Fort.' },
  rope:     { zh: '飛索', en: 'Flying Rope', kind: 'key', dz: '柳寒煙所贈，可以重新架起斷了的吊橋。', de: 'A gift from Liu Hanyan; it can rig a broken rope bridge.' },
  tian:     { zh: '天符', en: 'Heaven Seal', kind: 'key', dz: '三符之一，千佛寺的鎮寺之寶。', de: 'One of the three seals, kept by the Thousand Buddha Temple.' },
  di:       { zh: '地符', en: 'Earth Seal', kind: 'key', dz: '三符之一，埋在沙海古墓深處。', de: 'One of the three seals, buried deep in the Sand Sea Tomb.' },
  ren:      { zh: '人符', en: 'Mortal Seal', kind: 'key', dz: '三符之一，冷笑天贈。', de: 'One of the three seals, given by Leng Xiaotian.' },
  // ---- materials: monster drops that sell for silver (half the price, like everything)
  pelt:      { zh: '獸皮', en: 'Beast Pelt', kind: 'mat', price: 30, dz: '野獸的毛皮，可以賣給商人。', de: 'A beast\'s hide. Merchants buy it.' },
  venom:     { zh: '毒囊', en: 'Venom Sac', kind: 'mat', price: 40, dz: '藥鋪收購的毒囊。', de: 'A venom sac; apothecaries buy them.' },
  talisman:  { zh: '黃符紙', en: 'Talisman Paper', kind: 'mat', price: 60, dz: '畫過符的黃紙，道觀肯收。', de: 'Yellow paper with a spell on it.' },
  ore:       { zh: '鐵礦石', en: 'Iron Ore', kind: 'mat', price: 90, dz: '沉甸甸的礦石，鐵匠會收。', de: 'Heavy ore a smith will buy.' },
  pearl:     { zh: '明珠', en: 'Bright Pearl', kind: 'mat', price: 300, dz: '水底的明珠，值不少銀子。', de: 'A pearl from deep water, worth good silver.' },
  tigerbone: { zh: '虎骨', en: 'Tiger Bone', kind: 'mat', price: 500, dz: '名貴的藥材。', de: 'A costly medicine.' },
  // ---- gear. Seven places on the body (SLOTS). Stats any piece may give: atk, def, agi, mhp (max HP), mmp (max MP);
  // effects (the same rules as anyone's): crit (+chance of a critical hit), rpsn / rpin / rseal (chance to shrug off
  // poison, pressure points, sealing), regen (MP back per 10 steps). look: how it shows on 奕叡 (js/doll.js).
  // weapons
  w0: { zh: '舊環首刀', en: 'Old Ring Saber', kind: 'w', atk: 4, price: 10, look: { f: 'dao' } },
  w1: { zh: '精鋼刀', en: 'Steel Dao', kind: 'w', atk: 10, price: 120, look: { f: 'dao', c: 0x30 } },
  w14: { zh: '鐵棍', en: 'Iron Cudgel', kind: 'w', atk: 11, def: 1, price: 180, look: { f: 'staff', a: 0x00, c: 0x07 } },
  w7: { zh: '白蠟槍', en: 'Waxwood Spear', kind: 'w', atk: 12, agi: 2, price: 260, look: { f: 'spear', a: 0x10, b: 0x30, c: 0x17 } },
  w_scar: { zh: '斷魂刀', en: 'Soul-cutter', kind: 'w', atk: 14, crit: 0.03, price: 500, look: { f: 'dao', c: 0x16 }, dz: '刀疤的佩刀。', de: 'Scar\'s own blade.' },
  w2: { zh: '雁翎刀', en: 'Goose-feather Dao', kind: 'w', atk: 16, price: 450, look: { f: 'dao', c: 0x31 } },
  w8: { zh: '青鋼劍', en: 'Blue Steel Sword', kind: 'w', atk: 19, crit: 0.03, price: 820, look: { f: 'sword', a: 0x21, b: 0x31, c: 0x28 } },
  w6: { zh: '藏鋒刀', en: 'Hidden-edge Dao', kind: 'w', atk: 21, price: 600, look: { f: 'dao', c: 0x00 } },
  w9: { zh: '鐵禪杖', en: 'Iron Monk Staff', kind: 'w', atk: 22, def: 3, price: 1000, look: { f: 'staff', a: 0x28, c: 0x08 } },
  w3: { zh: '斬馬刀', en: 'Horse-cutter', kind: 'w', atk: 26, price: 1300, look: { f: 'bigdao', b: 0x30, c: 0x16 } },
  w4: { zh: '寒鐵刀', en: 'Cold Iron Dao', kind: 'w', atk: 34, price: 3200, look: { f: 'dao', c: 0x21 } },
  w12: { zh: '寒江劍', en: 'Cold River Sword', kind: 'w', atk: 37, agi: 3, crit: 0.03, price: 4000, look: { f: 'sword', a: 0x31, b: 0x30, c: 0x21 }, dz: '寒潭底下撈起的劍，劍身冰冷。', de: 'A sword raised from a cold pool, icy to the touch.' },
  w5: { zh: '龍吟刀', en: 'Dragon Song Dao', kind: 'w', atk: 44, price: 9000, look: { f: 'dao', c: 0x28 } },
  w_fan: { zh: '千秋白骨扇', en: 'Bone Fan of Ages', kind: 'w', atk: 46, crit: 0.05, mmp: 10, price: 9999, look: { f: 'fan', a: 0x30, b: 0x36 }, dz: '屠千秋的白骨扇。', de: 'Tu Qianqiu\'s bone fan.' },
  // armour
  a0: { zh: '粗布衣', en: 'Plain Robe', kind: 'a', def: 2, price: 10 },
  a1: { zh: '皮甲', en: 'Leather Vest', kind: 'a', def: 5, price: 60, look: { a: 0x17, b: 0x27, p: 'trim' } },
  a2: { zh: '鎖子甲', en: 'Chain Shirt', kind: 'a', def: 10, price: 280, look: { a: 0x10, b: 0x00, p: 'chain' } },
  a3: { zh: '鐵鱗甲', en: 'Iron Scale', kind: 'a', def: 16, price: 900, look: { a: 0x00, b: 0x10, p: 'scale', t: 0x0C } },
  a_blood: { zh: '血刀戰袍', en: 'Blood Saber War Robe', kind: 'a', def: 22, atk: 2, price: 3000, look: { a: 0x06, b: 0x16, p: 'trim', t: 0x0F }, dz: '血刀門的戰袍。', de: 'A war robe of the Blood Saber Sect.' },
  a4: { zh: '玄鐵甲', en: 'Dark Iron Mail', kind: 'a', def: 24, price: 2600, look: { a: 0x0C, b: 0x1C, p: 'scale', t: 0x0C } },
  a5: { zh: '天蠶衣', en: 'Heaven Silk Robe', kind: 'a', def: 30, price: 8000, look: { a: 0x30, b: 0x31, p: 'trim', t: 0x30 } },
  // 護具: bracers (and the dragon-scale chest mirror)
  c1: { zh: '木護腕', en: 'Wood Bracer', kind: 'c', def: 2, price: 20, look: { f: 'bracer', a: 0x17 } },
  c2: { zh: '銅護腕', en: 'Bronze Bracer', kind: 'c', def: 5, price: 140, look: { f: 'bracer', a: 0x18 } },
  c3: { zh: '鐵護腕', en: 'Iron Bracer', kind: 'c', def: 9, price: 650, look: { f: 'bracer', a: 0x10 } },
  c_ape: { zh: '白猿臂環', en: 'White Ape Armlet', kind: 'c', def: 8, mhp: 10, agi: 2, price: 900, look: { f: 'bracer', a: 0x30 }, dz: '白猿留下的臂環。', de: 'An armlet the White Ape left behind.' },
  c_jiao: { zh: '蛟鱗護腕', en: 'Jiao-scale Bracer', kind: 'c', def: 12, agi: 2, price: 1500, look: { f: 'bracer', a: 0x2C }, dz: '江蛟的鱗片打成的護腕。', de: 'Bracers of River Jiao scales.' },
  c4: { zh: '金絲護腕', en: 'Gold-thread Bracer', kind: 'c', def: 14, price: 2000, look: { f: 'bracer', a: 0x28 } },
  c5: { zh: '龍鱗護心鏡', en: 'Dragon-scale Mirror', kind: 'c', def: 20, price: 7000, look: { f: 'mirror', a: 0x10, b: 0x31 } },
  // 頭: head
  hd1: { zh: '紅頭巾', en: 'Red Headband', kind: 'hd', def: 1, agi: 1, price: 25, look: { f: 'band', a: 0x16 } },
  hd2: { zh: '竹斗笠', en: 'Bamboo Hat', kind: 'hd', def: 3, rpin: 0.2, price: 150, look: { f: 'hat', a: 0x27, b: 0x37, c: 0x17 } },
  hd3: { zh: '鐵額護', en: 'Iron Brow Guard', kind: 'hd', def: 5, price: 500, look: { f: 'brow', a: 0x10, b: 0x30, c: 0x00 } },
  hd_veil: { zh: '黑紗斗笠', en: 'Black-veil Hat', kind: 'hd', def: 5, agi: 4, crit: 0.02, price: 1600, look: { f: 'hat', a: 0x00, b: 0x10, c: 0x0F, veil: 1 }, dz: '刺客戴的斗笠。', de: 'An assassin\'s hat.' },
  hd4: { zh: '鐵盔', en: 'Iron Helm', kind: 'hd', def: 7, price: 1500, look: { f: 'helm', a: 0x10, b: 0x30, c: 0x00 } },
  hd_crow: { zh: '金烏羽冠', en: 'Golden-crow Crown', kind: 'hd', def: 7, agi: 3, mmp: 12, price: 2600, look: { f: 'crown', a: 0x16, b: 0x27, c: 0x28 }, dz: '火鴉的羽毛做的冠。', de: 'A crown of fire-crow feathers.' },
  hd_jiang: { zh: '將軍盔', en: 'General\'s Helm', kind: 'hd', def: 8, rpsn: 0.5, price: 2000, look: { f: 'helm', a: 0x18, b: 0x28, c: 0x08 }, dz: '殭屍將軍生前的頭盔。', de: 'The Jiangshi General\'s helm from his living days.' },
  hd5: { zh: '紫金冠', en: 'Purple-gold Crown', kind: 'hd', def: 9, mmp: 12, price: 4200, look: { f: 'crown', a: 0x28, b: 0x38, c: 0x14 } },
  hd_lion: { zh: '獅頭盔', en: 'Lion-head Helm', kind: 'hd', def: 10, mhp: 10, price: 2400, look: { f: 'helm', a: 0x28, b: 0x38, c: 0x18 }, dz: '石獅口中銜著的頭盔。', de: 'The helm the stone lion held in its jaws.' },
  // 靴: boots
  bt1: { zh: '草鞋', en: 'Straw Sandals', kind: 'bt', agi: 2, price: 20, look: { f: 'boots', a: 0x27 } },
  bt2: { zh: '布靴', en: 'Cloth Boots', kind: 'bt', def: 1, agi: 3, price: 110, look: { f: 'boots', a: 0x00 } },
  bt_monkey: { zh: '猴兒快靴', en: 'Monkey\'s Quick Boots', kind: 'bt', def: 1, agi: 5, price: 300, look: { f: 'boots', a: 0x16 }, dz: '瘦猴逃命用的快靴。', de: 'The boots Skinny Monkey ran away in.' },
  bt3: { zh: '鹿皮靴', en: 'Deerskin Boots', kind: 'bt', def: 2, agi: 5, price: 480, look: { f: 'boots', a: 0x17 } },
  bt4: { zh: '鐵脛靴', en: 'Iron Greaves', kind: 'bt', def: 5, agi: 1, price: 1400, look: { f: 'greaves', a: 0x10, b: 0x30 } },
  bt_tiger: { zh: '虎紋靴', en: 'Tiger-stripe Boots', kind: 'bt', def: 3, agi: 7, price: 1800, look: { f: 'boots', a: 0x28, b: 0x38 } },
  bt5: { zh: '踏雲靴', en: 'Cloud-step Boots', kind: 'bt', def: 3, agi: 9, price: 3800, look: { f: 'boots', a: 0x31, b: 0x30 } },
  // 披風: cloaks
  ck1: { zh: '麻布披風', en: 'Hemp Cape', kind: 'ck', def: 1, mhp: 4, price: 70, look: { a: 0x27, b: 0x37 } },
  ck_wolf: { zh: '灰狼皮披風', en: 'Wolf-pelt Cape', kind: 'ck', def: 2, mhp: 6, price: 240, look: { a: 0x00, b: 0x10 } },
  ck2: { zh: '青布披風', en: 'Green Cloth Cape', kind: 'ck', def: 2, mhp: 8, price: 260, look: { a: 0x1B, b: 0x2B } },
  ck3: { zh: '錦緞披風', en: 'Brocade Cape', kind: 'ck', def: 3, mhp: 14, price: 900, look: { a: 0x16, b: 0x26 } },
  ck_bear: { zh: '黑熊皮氅', en: 'Black Bear Mantle', kind: 'ck', def: 4, mhp: 14, price: 800, look: { a: 0x07, b: 0x17 }, dz: '黑熊披的熊皮。', de: 'Black Bear\'s bearskin.' },
  ck_tiger: { zh: '虎皮披風', en: 'Tiger-skin Cape', kind: 'ck', def: 4, mhp: 12, agi: 2, price: 1200, look: { a: 0x28, b: 0x38 } },
  ck_fox: { zh: '九尾狐裘', en: 'Nine-tail Fox Cloak', kind: 'ck', def: 5, mhp: 18, mmp: 8, rpin: 0.3, price: 2000, look: { a: 0x30, b: 0x31 }, dz: '妖姬留下的白狐裘。', de: 'The white fox fur the Siren left behind.' },
  ck4: { zh: '玄狐裘', en: 'Black Fox Cloak', kind: 'ck', def: 5, mhp: 22, rpsn: 0.3, price: 2800, look: { a: 0x00, b: 0x30 } },
  ck_ghost: { zh: '鬼面披風', en: 'Ghost-mask Mantle', kind: 'ck', def: 7, mhp: 28, rpin: 0.4, price: 3500, look: { a: 0x05, b: 0x15 }, dz: '鬼面護法的血色披風。', de: 'The Ghost-mask Warden\'s blood-red mantle.' },
  // 佩飾: pendants
  pd1: { zh: '平安符', en: 'Safe-travel Charm', kind: 'pd', def: 1, rpsn: 0.25, price: 50, look: { f: 'charm', a: 0x16, b: 0x28 } },
  pd2: { zh: '青玉佩', en: 'Green Jade Pendant', kind: 'pd', mmp: 8, regen: 1, price: 420, look: { f: 'jade', a: 0x2A, b: 0x1A } },
  pd3: { zh: '避毒珠', en: 'Venom-ward Pearl', kind: 'pd', rpsn: 1, price: 1100, look: { f: 'jade', a: 0x30, b: 0x34 } },
  pd_beads: { zh: '金剛念珠', en: 'Vajra Prayer Beads', kind: 'pd', def: 3, mmp: 10, rpin: 0.5, rseal: 0.5, price: 1500, look: { f: 'beads', a: 0x18, b: 0x28 }, dz: '金身羅漢頸上的念珠。', de: 'The Golden Arhat\'s prayer beads.' },
  pd4: { zh: '定神香囊', en: 'Calm-mind Sachet', kind: 'pd', mmp: 6, rpin: 0.6, rseal: 0.6, price: 1600, look: { f: 'charm', a: 0x14, b: 0x24 } },
  pd_moon: { zh: '冷月佩', en: 'Cold Moon Pendant', kind: 'pd', agi: 4, mmp: 10, crit: 0.05, price: 2500, look: { f: 'jade', a: 0x31, b: 0x21 }, dz: '冷笑天隨身的玉佩。', de: 'Leng Xiaotian\'s own pendant.' },
  pd5: { zh: '龍紋玉佩', en: 'Dragon Jade', kind: 'pd', def: 2, mmp: 15, regen: 2, crit: 0.02, price: 5000, look: { f: 'jade', a: 0x2B, b: 0x28 } },
};
export const BAG_MAX = 100;   // kinds of items carried (stacks of up to 9)
// the places on the body, in menu order; the hero object holds the item id worn in each
export const SLOTS = ['w', 'hd', 'a', 'ck', 'c', 'pd', 'bt'];
export const SLOT_NAME = { w: ['兵器', 'Weapon'], hd: ['頭', 'Head'], a: ['衣甲', 'Armour'], ck: ['披風', 'Cloak'], c: ['護具', 'Bracer'], pd: ['佩飾', 'Pendant'], bt: ['靴', 'Boots'] };
export const isGear = (id) => !!ITEMS[id] && SLOTS.includes(ITEMS[id].kind);
// what a piece gives, in words (shops, menus): [zh, en] fragments
export const GEAR_STATS = [['atk', '攻', 'Atk'], ['def', '防', 'Def'], ['agi', '身法', 'Agi'], ['mhp', '體力', 'HP'], ['mmp', '內力', 'MP']];
export const GEAR_FX = [['crit', '會心', 'Crit', 100, '%'], ['rpsn', '抗毒', 'Poison res', 100, '%'], ['rpin', '抗點穴', 'Pin res', 100, '%'], ['rseal', '抗封脈', 'Seal res', 100, '%'], ['regen', '回內力', 'MP regen', 1, '/10']];
for (const it of Object.values(ITEMS)) {   // a description for gear without its own words
  if (!SLOTS.includes(it.kind)) continue;
  const z = [], e = [];
  for (const [k, zh, en] of GEAR_STATS) if (it[k]) { z.push(zh + '+' + it[k]); e.push(en + '+' + it[k]); }
  for (const [k, zh, en, m, u] of GEAR_FX) if (it[k]) { z.push(zh + '+' + Math.round(it[k] * m) + u); e.push(en + '+' + Math.round(it[k] * m) + u); }
  it.dz = (it.dz ? it.dz + ' ' : '') + z.join(' '); it.de = (it.de ? it.de + ' ' : '') + e.join(' ');
}

// ---------------------------------------------------------------- shops
export const SHOPS = {
  longmen_w: ['w1', 'a1', 'c1', 'hd1', 'bt1'],
  longmen_i: ['herb', 'antidote', 'wing'],
  qingshi:   ['w1', 'w7', 'a1', 'a2', 'c1', 'c2', 'hd1', 'bt1', 'ck1', 'pd1'],
  qingshi_i: ['herb', 'antidote', 'wing', 'incense'],
  linjiang:  ['w2', 'w7', 'a2', 'c2', 'hd2', 'bt2', 'ck1', 'ck2', 'pd1'],
  linjiang_i:['herb', 'antidote', 'wing', 'incense'],
  nanling:   ['w2', 'w8', 'w3', 'a2', 'a3', 'c2', 'c3', 'hd2', 'hd3', 'bt2', 'bt3', 'ck2', 'ck3', 'pd2'],
  nanling_i: ['herb', 'antidote', 'wing', 'incense', 'lantern', 'key'],
  hanjiang:  ['herb', 'antidote', 'wing', 'qipill', 'pd2'],
  qianfo:    ['a3', 'c3', 'hd3', 'pd2', 'pd4', 'herb', 'antidote', 'wing'],
  chisha:    ['w3', 'a3', 'a4', 'c3', 'c4', 'hd3', 'hd4', 'bt3', 'bt4', 'ck3', 'pd3', 'pd4'],
  chisha_i:  ['herb', 'antidote', 'wing', 'key', 'lantern', 'qipill'],
  wanghai:   ['w4', 'a4', 'c4', 'hd4', 'hd5', 'bt4', 'bt5', 'ck4', 'pd5'],
  wanghai_i: ['herb', 'antidote', 'wing', 'incense', 'qipill', 'key'],
};

// ---------------------------------------------------------------- enemies
// hp, atk, def, agi, xp, gold; sk = [skill, chance] tried in order; items = herbs carried (used by the same rules
// as the hero's); res = chance to shrug off pressure points and sealing; run = may flee from a much stronger hero.
// poison: its bite may poison. skName: the enemy's own name for a shared art (flavour only).
// The 50 common foes are the Character Gallery's (tiers 1-5; art, names and bios via tools/gallery.py). Their numbers
// sit on one smooth curve fitted to the first roster, by rank (weakest first), times a role:
//   fast (agi x1.6, hp/def x0.85), tank (hp x1.2, def x1.4, agi x0.45), brute (hp x1.25, atk x1.05),
//   caster / spirit (arts, resistances), man (carries salves, more silver). A palette-swap family's later
//   members rank higher, so they are simply stronger. Nothing scales with the hero's level.
const E = (zh, en, hp, atk, def, agi, xp, gold, o = {}) => ({ zh, en, hp, atk, def, agi, xp, gold, ...o });
export const ENEMIES = {
  e_cavebat: E('洞蝠', 'Cave Bat', 5, 7, 3, 7, 1, 2, { run: 1 }), // T1 fast
  e_bambooviper: E('竹葉青', 'Bamboo Viper', 7, 8, 4, 5, 2, 3, { poison: 0.25, run: 1 }), // T1 plain
  e_greywolf: E('灰狼', 'Grey Wolf', 8, 9, 4, 5, 2, 3, { run: 1 }), // T1 plain
  e_lackey: E('黑風嘍囉', 'Black Wind Lackey', 9, 10, 5, 5, 3, 5, { items: 1, run: 1 }), // T1 man
  e_rivercrab: E('河蟹', 'River Crab', 12, 11, 8, 3, 4, 4, { run: 1 }), // T1 tank
  e_mountainmonkey: E('山猴', 'Mountain Monkey', 10, 13, 6, 11, 4, 5, { run: 1 }), // T1 fast
  e_wildboar: E('山豬', 'Wild Boar', 16, 15, 7, 5, 5, 6, { run: 1 }), // T1 brute
  e_dummy: E('木人樁', 'Living Training Dummy', 17, 14, 12, 4, 6, 7, { res: 1 }), // T1 tank
  e_wisp: E('鬼火', "Will-o'-wisp", 13, 16, 12, 10, 7, 8, { sk: [['fire', 0.3]], res: 0.3 }), // T1 spirit
  e_cudgeler: E('黑風棍手', 'Black Wind Cudgeler', 18, 18, 11, 8, 8, 13, { items: 1, run: 1 }), // T2 man
  e_redsnake: E('赤鍊蛇', 'Red Chain Snake', 16, 20, 10, 15, 9, 11, { poison: 0.3, run: 1 }), // T2 fast
  e_archer: E('山賊弓手', 'Bandit Archer', 21, 21, 13, 9, 11, 17, { items: 1, sk: [['qi', 0.25]], skName: { qi: ['冷箭', 'Cold Arrow'] } }), // T2 man
  e_tigerhornet: E('虎頭蜂', 'Tiger Hornet', 19, 23, 12, 17, 12, 13, { poison: 0.2, run: 1 }), // T2 fast
  e_centipede: E('蜈蚣', 'Centipede', 25, 25, 15, 11, 13, 15, { poison: 0.3 }), // T2 plain
  e_toadstool: E('毒菇妖', 'Toadstool Imp', 24, 24, 15, 13, 16, 16, { sk: [['mist', 0.25]], poison: 0.2, skName: { mist: ['毒粉', 'Spore Cloud'] } }), // T2 caster
  e_windsprite: E('風精', 'Wind Sprite', 23, 27, 24, 15, 18, 18, { sk: [['qi', 0.25]], res: 0.4, skName: { qi: ['旋風刃', 'Whirlwind Edge'] } }), // T2 spirit
  e_littlejiangshi: E('小殭屍', 'Little Jiangshi', 37, 29, 27, 6, 20, 19, { poison: 0.2, res: 0.8 }), // T2 tank
  e_treesprite: E('樹精', 'Tree Sprite', 39, 30, 29, 6, 24, 21, { sk: [['heal', 0.3]] }), // T2 tank
  e_sandscorpion: E('沙蠍', 'Sand Scorpion', 35, 34, 23, 14, 22, 23, { poison: 0.35 }), // T2 plain
  e_roguemonk: E('惡僧', 'Rogue Monk', 37, 36, 24, 13, 25, 35, { items: 1, sk: [['guard', 0.2], ['heal', 0.25]], res: 0.3 }), // T2 man
  e_drowned: E('水鬼', 'Drowned Ghost', 35, 34, 23, 16, 27, 26, { sk: [['sleep', 0.2], ['qi', 0.25]], res: 0.3 }), // T3 caster
  e_bloodbat: E('吸血蝠', 'Blood Bat', 35, 39, 23, 25, 27, 28, { run: 1 }), // T3 fast
  e_papereffigy: E('紙人', 'Paper Effigy', 34, 39, 37, 19, 31, 30, { sk: [['sleep', 0.25]], res: 0.5 }), // T3 spirit
  e_inkspirit: E('墨靈', 'Ink Spirit', 36, 41, 39, 20, 33, 31, { sk: [['seal', 0.2]], res: 0.4 }), // T3 spirit
  e_goldmonkey: E('金毛猴', 'Golden Monkey', 40, 45, 27, 27, 33, 33, { items: 1, run: 1 }), // T3 fast
  e_bloodwolf: E('血狼', 'Blood Wolf', 41, 47, 29, 28, 35, 35, {}), // T3 fast
  e_skeleton: E('骷髏劍客', 'Skeleton Swordsman', 51, 49, 35, 18, 37, 37, { res: 0.6 }), // T3 plain
  e_ironboar: E('鐵鬃豬', 'Ironbristle Boar', 66, 53, 33, 11, 39, 38, {}), // T3 brute
  e_assassin: E('斗笠刺客', 'Bamboo-hat Assassin', 46, 53, 33, 31, 44, 57, { items: 1, sk: [['sleep', 0.2]] }), // T3 fast
  e_daoist: E('妖道', 'Rogue Daoist', 51, 50, 36, 22, 46, 60, { items: 1, sk: [['heal', 0.25], ['seal', 0.15], ['fire', 0.35]], res: 0.4, skName: { fire: ['符火', 'Talisman Fire'] } }), // T3 caster
  e_bronzeman: E('銅人', 'Bronze Guardian', 70, 54, 59, 9, 53, 44, { sk: [['guard', 0.25]], res: 1 }), // T3 tank
  e_thundersprite: E('雷精', 'Thunder Sprite', 48, 56, 57, 25, 50, 46, { sk: [['fire', 0.4]], res: 0.5, skName: { fire: ['落雷', 'Thunderclap'] } }), // T4 spirit
  e_ghosthornet: E('鬼面蜂', 'Ghostface Hornet', 53, 61, 39, 34, 49, 48, { poison: 0.35 }), // T4 fast
  e_netherflame: E('冥火', 'Nether Flame', 52, 60, 62, 26, 55, 51, { sk: [['fire', 0.5]], res: 0.5 }), // T4 spirit
  e_goldcentipede: E('金頭蜈蚣', 'Golden Centipede', 67, 65, 50, 22, 58, 53, { poison: 0.4, sk: [['mist', 0.2]], skName: { mist: ['金毒', 'Golden Venom'] } }), // T4 plain
  e_deadwood: E('枯木精', 'Deadwood Sprite', 83, 64, 72, 10, 67, 56, { sk: [['heal2', 0.2]] }), // T4 tank
  e_ironcrab: E('鐵甲蟹', 'Iron Crab', 86, 66, 75, 11, 65, 59, {}), // T4 tank
  e_bloodthug: E('血刀門打手', 'Blood Saber Thug', 74, 72, 56, 22, 67, 88, { items: 1, sk: [['qi', 0.2]], skName: { qi: ['血刀', 'Blood Saber'] } }), // T4 man
  e_ironmonk: E('鐵頭惡僧', 'Iron-head Monk', 96, 78, 52, 15, 71, 93, { sk: [['guard', 0.2]], res: 0.4, items: 1 }), // T4 brute
  e_irondummy: E('鐵木人', 'Iron-bound Dummy', 95, 73, 85, 11, 82, 69, { sk: [['guard', 0.2]], res: 1 }), // T4 tank
  e_coldpool: E('寒潭鬼', 'Cold Pool Ghost', 74, 73, 57, 28, 80, 73, { sk: [['sleep', 0.25], ['qi', 0.3]], res: 0.5, skName: { qi: ['寒冰刺', 'Ice Spike'] } }), // T5 caster
  e_frostwolf: E('霜狼', 'Frost Wolf', 73, 82, 56, 42, 78, 78, {}), // T5 fast
  e_inkscorpion: E('墨蠍', 'Ink Scorpion', 89, 85, 69, 27, 84, 83, { poison: 0.4 }), // T5 plain
  e_bronzejiangshi: E('銅甲小殭屍', 'Bronze-armoured Jiangshi', 112, 84, 101, 12, 107, 89, { sk: [['seal', 0.2]], res: 0.8, poison: 0.2 }), // T5 tank
  e_netherarcher: E('幽冥弓手', 'Netherworld Archer', 98, 92, 76, 25, 105, 137, { items: 1, sk: [['qi2', 0.12]], skName: { qi2: ['冥火箭', 'Nether Arrow'] } }), // T5 man
  e_blackbone: E('黑骨劍客', 'Black-bone Swordsman', 102, 96, 80, 28, 114, 104, { sk: [['seal', 0.15]], res: 0.7 }), // T5 plain
  e_vajraguardian: E('金剛銅人', 'Vajra Guardian', 129, 95, 118, 13, 137, 113, { sk: [['guard', 0.25]], res: 1 }), // T5 tank
  e_netherassassin: E('幽冥刺客', 'Netherworld Assassin', 97, 105, 75, 47, 137, 176, { items: 1, sk: [['sleep', 0.2], ['qi2', 0.12]] }), // T5 fast
  e_blackdaoist: E('黑袍妖道', 'Black-robed Daoist', 108, 101, 84, 33, 152, 194, { items: 1, sk: [['fire2', 0.35], ['seal', 0.15], ['heal2', 0.2]], res: 0.6, skName: { fire2: ['黑符冥火', 'Black Talisman Blaze'] } }), // T5 caster
  // the stone toad runs off with its coins: hard to hurt, flees, rich (most rolls of it become the zone's first foe)
  e_stonetoad: E('石蟾', 'Stone Toad', 16, 30, 70, 40, 30, 150, { res: 1, flee: 0.5 }), // T2 rare
  // ---- big beasts met rarely in the wild (they can be fled; no special powers, only bigger numbers and shared arts)
  bx_tiger:   E('吊睛白額虎', 'White-Browed Tiger', 95, 38, 22, 32, 80, 60, { res: 0.3 }),
  bx_shanxiao: E('山魈', 'Shanxiao', 140, 54, 34, 48, 140, 110, { items: 2, sk: [['sleep', 0.15]], res: 0.5 }),
  bx_crow:    E('三足火鴉', 'Fire Crow', 150, 66, 44, 52, 190, 160, { sk: [['fire2', 0.25]], skName: { fire2: ['三足金焰', 'Three-foot Blaze'] }, res: 0.5 }),
  bx_toad:    E('毒蟾', 'Venom Toad', 270, 82, 56, 12, 200, 150, { poison: 0.4, sk: [['mist', 0.35]], res: 0.6 }),
  // ---- big beasts guarding a place: optional fights the hero chooses (boss rules: no running once begun)
  bx_ape:     E('白猿', 'White Ape', 160, 50, 30, 30, 300, 200, { boss: 1, items: 2, sk: [['guard', 0.2]], res: 0.6 }),
  bx_jiao:    E('江蛟', 'River Jiao', 210, 58, 40, 22, 340, 260, { boss: 1, mp: 40, sk: [['qi', 0.3], ['heal', 0.2]], skName: { qi: ['翻江浪', 'Overturning Wave'] }, res: 0.5 }),
  bx_lion:    E('鎮宅石獅', 'Stone Guardian Lion', 330, 85, 64, 10, 520, 400, { boss: 1, mp: 40, sk: [['guard', 0.3]], res: 1 }),
  // ---- bosses: people are shown by their gallery portrait; creatures by a gallery beast or their own picture.
  // Their HP and attack were raised (and the guardians' above) when the hero got seven gear slots and boss drops,
  // so a bot that buys the best gear still loses a fight now and then, as before. Only plain numbers changed.
  shouhou:    E('瘦猴', 'Skinny Monkey', 46, 20, 11, 16, 40, 60, { boss: 1, items: 3, por: 'shouhou' }),
  daoba:      E('刀疤', 'Scar', 100, 38, 20, 13, 110, 150, { boss: 1, mp: 15, items: 3, sk: [['sleep', 0.15]], por: 'daoba', res: 0.5 }),
  heixiong:   E('黑熊', 'Black Bear', 150, 47, 25, 10, 220, 300, { boss: 1, mp: 24, items: 4, sk: [['guard', 0.2]], por: 'heixiong', res: 0.6 }),
  b_yaoji:    E('水月妖姬', 'Moonwater Siren', 195, 55, 34, 24, 360, 400, { boss: 1, mp: 50, sk: [['sleep', 0.2], ['heal', 0.25], ['qi', 0.3]], res: 0.6, art: 'bx_fox' }),
  b_luohan:   E('金身羅漢', 'Golden Arhat', 270, 73, 54, 8, 560, 500, { boss: 1, mp: 40, sk: [['guard', 0.3], ['heal2', 0.2]], res: 1, art: 'b_luohan', big: 1.5 }),
  b_jiangjun: E('殭屍將軍', 'Jiangshi General', 310, 84, 52, 14, 800, 700, { boss: 1, mp: 50, poison: 0.35, sk: [['seal', 0.2], ['mist', 0.25]], res: 1, art: 'bx_jiangshi' }),
  xiaotian:   E('冷笑天', 'Leng Xiaotian', 395, 103, 64, 58, 1200, 0, { boss: 1, mp: 60, items: 3, sk: [['qi2', 0.22], ['heal2', 0.2]], skName: { qi2: ['笑盡天下', 'Laugh at the World'] }, por: 'xiaotian', res: 0.8 }),
  b_hufa:     E('鬼面護法', 'Ghost-mask Warden', 380, 116, 80, 46, 1300, 900, { boss: 1, mp: 70, items: 3, sk: [['sleep', 0.2], ['seal', 0.15], ['qi2', 0.15]], res: 0.8, por: 'guimian' }),
  tuqianqiu:  E('屠千秋', 'Tu Qianqiu', 480, 116, 76, 62, 0, 0, { boss: 1, mp: 64, items: 4, sk: [['qi2', 0.25], ['heal2', 0.2], ['sleep', 0.12], ['seal', 0.1]], skName: { qi2: ['白骨扇・千秋寂', 'Bone Fan: Silent Ages'] }, por: 'tuqianqiu', res: 1 }),
};
export const ART_OF = (id) => ENEMIES[id].art || id;

// ---------------------------------------------------------------- how a foe's blows look in battle (presentation only)
// atkFx: claw | bite | ram | blunt | sting | arrow | magic | spore | slash (default: a weapon swing)
// mc: [outer, mid, core] NES colours of the foe's magic (its arts and, for magic users, its plain attack)
const ATK_FX_OF = {
  claw: ['e_mountainmonkey', 'e_goldmonkey', 'e_rivercrab', 'e_ironcrab', 'e_littlejiangshi', 'e_bronzejiangshi', 'bx_tiger', 'bx_shanxiao', 'bx_ape', 'bx_crow', 'b_jiangjun'],
  bite: ['e_cavebat', 'e_bloodbat', 'e_bambooviper', 'e_redsnake', 'e_greywolf', 'e_bloodwolf', 'e_frostwolf', 'e_centipede', 'e_goldcentipede', 'bx_toad', 'bx_jiao', 'bx_lion', 'e_stonetoad'],
  ram: ['e_wildboar', 'e_ironboar'],
  blunt: ['e_cudgeler', 'e_dummy', 'e_irondummy', 'e_bronzeman', 'e_vajraguardian', 'e_roguemonk', 'e_ironmonk', 'b_luohan', 'heixiong', 'e_treesprite', 'e_deadwood'],
  sting: ['e_tigerhornet', 'e_ghosthornet', 'e_sandscorpion', 'e_inkscorpion'],
  arrow: ['e_archer', 'e_netherarcher'],
  magic: ['e_wisp', 'e_windsprite', 'e_papereffigy', 'e_inkspirit', 'e_thundersprite', 'e_netherflame', 'e_drowned', 'e_coldpool', 'e_daoist', 'e_blackdaoist', 'b_yaoji'],
  spore: ['e_toadstool'],
};
const MAGIC_COL = {
  e_wisp: [0x1C, 0x2C, 0x3C], e_windsprite: [0x1A, 0x2A, 0x3A], e_papereffigy: [0x06, 0x16, 0x30], e_inkspirit: [0x00, 0x10, 0x30],
  e_thundersprite: [0x28, 0x38, 0x30], e_netherflame: [0x14, 0x24, 0x34], e_drowned: [0x12, 0x22, 0x32], e_coldpool: [0x11, 0x21, 0x31],
  e_daoist: [0x16, 0x27, 0x38], e_blackdaoist: [0x04, 0x14, 0x24], b_yaoji: [0x15, 0x25, 0x35], bx_jiao: [0x12, 0x21, 0x31],
  e_toadstool: [0x14, 0x24, 0x29], e_goldcentipede: [0x18, 0x28, 0x38], bx_toad: [0x14, 0x24, 0x29], b_jiangjun: [0x1A, 0x29, 0x39],
  bx_crow: [0x16, 0x27, 0x38], xiaotian: [0x11, 0x21, 0x31], b_hufa: [0x04, 0x14, 0x24], tuqianqiu: [0x00, 0x10, 0x30],
};
for (const [fx, ids] of Object.entries(ATK_FX_OF)) for (const id of ids) ENEMIES[id].atkFx = fx;
for (const [id, E] of Object.entries(ENEMIES)) { if (!E.atkFx) E.atkFx = 'slash'; E.mc = MAGIC_COL[id] || null; }

// ---------------------------------------------------------------- what a beaten foe may drop: [item, chance] each rolled
// on its own. Common foes: materials and supplies (8-30%), now and then a piece of gear (2-5%). Big beasts and
// bosses always leave their signature piece.
const DROPS = {
  e_cavebat: [['herb', 0.1]], e_bambooviper: [['venom', 0.12]], e_greywolf: [['pelt', 0.2], ['ck_wolf', 0.03]],
  e_lackey: [['herb', 0.15], ['bt1', 0.05]], e_rivercrab: [['ore', 0.08]], e_mountainmonkey: [['pelt', 0.15], ['hd1', 0.04]],
  e_wildboar: [['pelt', 0.25]], e_dummy: [['ore', 0.1]], e_wisp: [['talisman', 0.1]],
  e_cudgeler: [['herb', 0.15], ['w14', 0.05]], e_redsnake: [['venom', 0.2], ['antidote', 0.1]], e_archer: [['herb', 0.2], ['hd2', 0.04]],
  e_tigerhornet: [['venom', 0.2]], e_centipede: [['venom', 0.2], ['antidote', 0.1]], e_toadstool: [['antidote', 0.25]],
  e_windsprite: [['talisman', 0.12], ['bt2', 0.04]], e_littlejiangshi: [['talisman', 0.15]], e_treesprite: [['herb', 0.25], ['pd2', 0.02]],
  e_sandscorpion: [['venom', 0.25]], e_roguemonk: [['herb', 0.2], ['w9', 0.04]], e_drowned: [['pearl', 0.05], ['qipill', 0.06]],
  e_bloodbat: [['pelt', 0.15]], e_papereffigy: [['talisman', 0.25]], e_inkspirit: [['talisman', 0.2], ['qipill', 0.05]],
  e_goldmonkey: [['pelt', 0.2], ['bt3', 0.03]], e_bloodwolf: [['pelt', 0.25], ['ck_wolf', 0.04]], e_skeleton: [['ore', 0.12], ['hd3', 0.03]],
  e_ironboar: [['pelt', 0.3]], e_assassin: [['herb', 0.2], ['hd_veil', 0.03]], e_daoist: [['talisman', 0.25], ['pd1', 0.05]],
  e_bronzeman: [['ore', 0.3], ['c3', 0.03]], e_thundersprite: [['talisman', 0.15], ['qipill', 0.06]], e_ghosthornet: [['venom', 0.3]],
  e_netherflame: [['talisman', 0.2]], e_goldcentipede: [['venom', 0.3], ['pd3', 0.02]], e_deadwood: [['herb', 0.3], ['pd2', 0.04]],
  e_ironcrab: [['ore', 0.3]], e_bloodthug: [['herb', 0.2], ['a_blood', 0.03]], e_ironmonk: [['qipill', 0.08], ['w9', 0.05]],
  e_irondummy: [['ore', 0.35], ['bt4', 0.03]], e_coldpool: [['pearl', 0.08], ['w12', 0.03]], e_frostwolf: [['pelt', 0.3], ['ck4', 0.02]],
  e_inkscorpion: [['venom', 0.3]], e_bronzejiangshi: [['ore', 0.2], ['hd4', 0.03]], e_netherarcher: [['herb', 0.2], ['qipill', 0.08]],
  e_blackbone: [['ore', 0.2], ['ck3', 0.04]], e_vajraguardian: [['ore', 0.4], ['pd4', 0.03]], e_netherassassin: [['qipill', 0.1], ['hd_veil', 0.04]],
  e_blackdaoist: [['talisman', 0.3], ['pd5', 0.02]], e_stonetoad: [['pearl', 0.3]],
  bx_tiger: [['ck_tiger', 0.5], ['tigerbone', 0.6]], bx_shanxiao: [['pelt', 1], ['bt_tiger', 0.4]], bx_crow: [['hd_crow', 0.6]],
  bx_toad: [['pd3', 0.6], ['venom', 1]], bx_ape: [['c_ape', 1]], bx_jiao: [['c_jiao', 1], ['pearl', 1]], bx_lion: [['hd_lion', 1]],
  shouhou: [['bt_monkey', 1]], daoba: [['w_scar', 1]], heixiong: [['ck_bear', 1]], b_yaoji: [['ck_fox', 1]], b_luohan: [['pd_beads', 1]],
  b_jiangjun: [['hd_jiang', 1]], xiaotian: [['pd_moon', 1]], b_hufa: [['ck_ghost', 1]], tuqianqiu: [['w_fan', 1]],
};
for (const [id, d] of Object.entries(DROPS)) ENEMIES[id].drop = d;
for (const E of Object.values(ENEMIES)) if (!E.drop) E.drop = [];

// ---------------------------------------------------------------- where enemies live (by tier and habitat)
// zones 1-2 and the woods: tier 1; the fort, zone 3 and the water cave: tier 2; zone 4, the grotto and the tower:
// tiers 2-3; zone 5 and the tomb: tiers 3-4; zone 6 and the ice caves: tiers 4-5; the isle and the lair: tier 5.
export const ZONES = {
  1: ['e_greywolf', 'e_bambooviper', 'e_cavebat', 'e_greywolf', 'e_lackey'],
  2: ['e_lackey', 'e_greywolf', 'e_rivercrab', 'e_mountainmonkey', 'e_wildboar', 'e_dummy', 'e_wisp'],
  3: ['e_wisp', 'e_redsnake', 'e_tigerhornet', 'e_centipede', 'e_toadstool', 'e_windsprite', 'e_treesprite', 'e_cudgeler', 'e_stonetoad'],
  4: ['e_sandscorpion', 'e_roguemonk', 'e_goldmonkey', 'e_bloodwolf', 'e_papereffigy', 'e_inkspirit', 'e_littlejiangshi', 'e_archer', 'e_stonetoad'],
  5: ['e_ironboar', 'e_assassin', 'e_daoist', 'e_thundersprite', 'e_ghosthornet', 'e_netherflame', 'e_goldcentipede', 'e_bloodwolf', 'e_stonetoad'],
  6: ['e_deadwood', 'e_ironcrab', 'e_bloodthug', 'e_ironmonk', 'e_irondummy', 'e_frostwolf', 'e_coldpool', 'e_thundersprite'],
  7: ['e_inkscorpion', 'e_bronzejiangshi', 'e_netherarcher', 'e_blackbone', 'e_vajraguardian', 'e_netherassassin', 'e_blackdaoist', 'e_coldpool'],
  heifenglin: ['e_cavebat', 'e_bambooviper', 'e_mountainmonkey', 'e_lackey', 'e_greywolf', 'e_wildboar'],
  fort: ['e_lackey', 'e_cudgeler', 'e_archer', 'e_wildboar', 'e_cudgeler', 'e_dummy'],
  shuiyue: ['e_drowned', 'e_toadstool', 'e_redsnake', 'e_windsprite', 'e_littlejiangshi', 'e_bloodbat', 'e_stonetoad'],
  cangjian: ['e_littlejiangshi', 'e_bloodbat', 'e_papereffigy', 'e_skeleton', 'e_treesprite', 'e_inkspirit'],
  tower: ['e_roguemonk', 'e_goldmonkey', 'e_bloodbat', 'e_inkspirit', 'e_skeleton', 'e_papereffigy', 'e_stonetoad'],
  tower2: ['e_bronzeman', 'e_skeleton', 'e_ironboar', 'e_goldmonkey', 'e_assassin', 'e_roguemonk'],
  tomb: ['e_skeleton', 'e_ghosthornet', 'e_netherflame', 'e_goldcentipede', 'e_daoist', 'e_bronzeman', 'e_papereffigy'],
  longji: ['e_frostwolf', 'e_coldpool', 'e_ironmonk', 'e_irondummy', 'e_deadwood', 'e_thundersprite'],
  lair: ['e_inkscorpion', 'e_bronzejiangshi', 'e_netherarcher', 'e_blackbone', 'e_vajraguardian', 'e_netherassassin', 'e_blackdaoist'],
};
// now and then a big beast instead (overworld zone -> by tile: sand s, swamp w, else any)
export const RARE = { 3: { any: 'bx_tiger' }, 4: { any: 'bx_shanxiao' }, 5: { s: 'bx_crow', w: 'bx_toad', any: 'bx_crow' } };
export const RARE_CHANCE = 1 / 40;
export const MONEY_FOE = 'e_stonetoad';

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
