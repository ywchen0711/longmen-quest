// Where the story stands and what to do next, worked out from the flags and key items alone (so an old record
// knows its objective too). Used by the 線索 / Clues window, by Mr Bai, and by townsfolk who talk about the
// current goal. Also the signposts that stand at the forks of the world map.
import { L } from './maps.js?v=16';

// the story stage, in the order the tale is told
export function stage(G) {
  const F = G.flags, has = (k) => G.has(k);
  if (F.tuDone || F.ending) return 'end';
  if (F.causeway) return 'lair';
  if (!F.fortDone) return has('token') ? 'fort' : 'woods';
  if (!F.shuoFree) return 'cell';
  if (!F.shuoHome) return 'home';
  if (!F.quest3 && !F.metLiu && !F.yaojiDone) return 'bai';
  if (!F.yaojiDone) return F.metLiu ? 'cave' : 'liu';
  if (!has('rope')) return 'rope';
  if (has('tian') && has('di') && has('ren')) return 'cape';
  return !has('tian') ? 'tian' : !has('di') ? 'di' : 'ren';
}
export const sealsLeft = (G) => ['tian', 'di', 'ren'].filter((k) => !G.has(k));

const SEAL = {
  tian: [L('天符：千佛寺後山的千佛塔頂，由金身羅漢守著。', 'Heaven Seal: atop the Thousand Buddha Tower behind the temple, guarded by the Golden Arhat.'),
    L('過了北邊斷崖的吊橋往西北是千佛寺；塔在寺的東北邊山上。塔有五層，樓梯一層在東、一層在西，輪流著走。', 'Past the bridge over the northern chasm, the temple is north-west; the tower stands on the hill to its north-east. Five floors: the stairs alternate east and west.')],
  di: [L('地符：南方沙海古墓的最深處，殭屍將軍握在手裡。', 'Earth Seal: deep in the Sand Sea Tomb in the south, in the Jiangshi General\'s fist.'),
    L('從南陵城往東到赤沙堡，古墓在赤沙堡東南。墓裡漆黑，沒有燈籠進不去（南陵、赤沙堡的雜貨鋪都有賣）。上鎖的門後只是陪葬品，往下的路不用鑰匙。', 'From Nanling go east to the Red Sand Fort; the tomb lies south-east of it. It is pitch dark: no lantern, no entry (Nanling and Red Sand Fort sell them). The locked doors only hide grave goods; the way down needs no key.')],
  ren: [L('人符：在龍脊峰頂的冷笑天手上。', 'Mortal Seal: in Leng Xiaotian\'s hand on Dragonspine Summit.'),
    L('過了斷崖吊橋，沿雪嶺上的小路一直往東，就是龍脊洞。洞裡兩層，出口都在東邊，最上面就是峰頂。', 'Over the chasm bridge, follow the path east along the snowy ridge to the Dragonspine Caves. Two floors, both exits on the east side; the summit is at the top.')],
};

// { now: one or two lines, more: a few lines of detail } for the Clues window
export function objective(G) {
  const s = stage(G), F = G.flags;
  switch (s) {
    case 'woods': return { now: L('黑風寨擄走了奕碩。寨門要令牌，令牌在瘦猴身上——他躲在黑風林裡。', 'The Black Wind gang took Yi Shuo. The fort gate needs a token, and Skinny Monkey has it: he hides in the Black Wind Woods.'),
      more: [L('出龍門鎮往西北走大路到青石村，從村子往東北就是黑風林。', 'Take the road north-west from Longmen to Qingshi Village; the Black Wind Woods are north-east of the village.'),
        L('林子第一層的出口在東北角；瘦猴的窩在深處的西北邊。', 'The first part of the woods exits at its north-east corner; Skinny Monkey\'s den is on the north-west side of the heart of the woods.'),
        L('灰狼和毒蛇不少：先在鎮外和青石村附近練到五、六級，帶些金創藥和解毒草。', 'Wolves and vipers abound: train to level 5 or 6 near town and Qingshi, and carry salves and antidote herbs.')] };
    case 'fort': return { now: L('有了令牌。到黑風林東北的山口，亮出令牌進黑風寨救奕碩。', 'You have the token. Go to the mountain pass north-east of the woods, show it, and enter the Black Wind Fort.'),
      more: [L('山口的木柵在黑風林的東北邊，一直往北的山谷裡就是寨子。', 'The palisade is north-east of the woods; the fort is in the valley straight north of it.'),
        L('前院有刀疤守著牢房鑰匙；黑熊在樓上大堂（前院北邊的樓梯）。', 'Scar holds the cell key in the yard; Black Bear is upstairs in the hall (the stairs on the north side of the yard).'),
        L('刀疤八級就能應付；黑熊力氣大，最好十級以上再上樓。', 'Scar is fine at level 8; Black Bear hits hard, so climb the stairs at level 10 or more.')] };
    case 'cell': return { now: L('黑熊服了。用牢房鑰匙打開大堂西邊的牢門，救出奕碩。', 'Black Bear yields. Use the cell key on the cell door on the west side of the hall and free Yi Shuo.'),
      more: [L(G.has('cellkey') ? '鑰匙已在你身上。牢門在大堂西邊的小房間。' : '還沒有牢房鑰匙？是前院的刀疤拿著。', G.has('cellkey') ? 'You carry the key. The cell is the little room on the west side of the hall.' : 'No cell key yet? Scar in the yard has it.')] };
    case 'home': return { now: L('帶奕碩回龍門鎮。', 'Take Yi Shuo home to Longmen Town.'),
      more: [L('從黑風寨往南出山口，經過黑風林、青石村，順著大路往東南回到龍門鎮。', 'South out of the pass, past the woods and Qingshi Village, then follow the road south-east to Longmen Town.')] };
    case 'bai': return { now: L('鬼面人是什麼來頭？回聽雨樓問白先生。', 'Who was the man in the ghost mask? Ask Mr Bai at the Listening Rain House.'),
      more: [L('聽雨樓在龍門鎮北邊正中的大屋。黑熊撤了渡口，河也能過了。', 'The Listening Rain House is the big hall at the north of Longmen Town. Black Bear has opened the ferry, so you can cross the river too.')] };
    case 'liu': return { now: L('渡河往東，去寒江閣找柳閣主——她有過斷崖用的飛索。', 'Cross the river east and find Mistress Liu at the Cold River Pavilion: she has a flying rope for crossing chasms.'),
      more: [L('從龍門鎮往東到臨江渡，村外的木棧橋就是渡口。', 'East from Longmen to Linjiang Ferry; the wooden pier outside the village is the crossing.'),
        L('過河後的岔路：往東北的大路到寒江閣，往東南去南陵城。', 'Across the river the road forks: north-east to the Cold River Pavilion, south-east to Nanling City.')] };
    case 'cave': return { now: L('柳閣主要你除掉水月洞的妖姬。水月洞在湖的北岸。', 'Mistress Liu wants the siren of Moonwater Cave gone. The cave is on the lake\'s north shore.'),
      more: [L('從寒江閣往北，再沿大湖的北邊往東走。洞的第一層出口在東北角，深處的妖姬在水潭北邊。', 'Go north from the pavilion, then east along the north side of the great lake. The cave\'s first floor exits at the north-east corner; the siren waits north of the pool below.'),
        L('妖姬會點穴、會迷人：帶足金創藥，練到十二級左右再去。', 'She strikes pressure points and bewitches: carry plenty of salve and go at around level 12.')] };
    case 'rope': return { now: L('妖姬除掉了。回寒江閣向柳閣主拿飛索。', 'The siren is gone. Return to the Cold River Pavilion for Mistress Liu\'s flying rope.'), more: [L('柳閣主在閣中湖上的水榭裡。', 'Mistress Liu is in the water pavilion on the lake.')] };
    case 'tian': case 'di': case 'ren': {
      const left = sealsLeft(G), first = SEAL[s];
      const more = [first[1]];
      for (const k of left) if (k !== s) more.push(SEAL[k][0]);
      more.push(L('三符可以照任何順序取得。還差 ' + left.length + ' 枚。', 'The seals can be taken in any order. ' + left.length + ' still to find.'));
      return { now: L('集齊天、地、人三符，才能散開東海的霧。' + first[0].zh, 'Gather the Heaven, Earth and Mortal seals to part the fog on the eastern sea. ' + first[0].en), more };
    }
    case 'cape': return { now: L('三符齊了！到望海村東南的海角，三符會打開去幽冥島的路。', 'You hold all three seals! Go to the cape south-east of Wanghai Village: the seals will open the way to the Netherworld Isle.'),
      more: [L('從寒江閣沿大路往東就是望海村；村外往東南的海邊有一段石路，走到盡頭的海角。', 'Follow the road east from the Cold River Pavilion to Wanghai Village; south-east of the village a stone road runs out to the cape.')] };
    case 'lair': return { now: F.hufaDone ? L('鬼面護法倒了。到幽冥殿最深處，打倒屠千秋。', 'The warden is down. Go to the deepest hall and defeat Tu Qianqiu.') : L('石路通了。渡海到幽冥島，闖進幽冥殿打倒屠千秋。', 'The causeway has risen. Cross to the Netherworld Isle and storm the hall to defeat Tu Qianqiu.'),
      more: [L('幽冥殿四層：一樓往北的樓梯，二樓往東北，三樓有鬼面護法，四樓是屠千秋。', 'The hall has four floors: north stairs on the first, north-east on the second, the warden on the third, Tu Qianqiu on the fourth.'),
        L('先在望海村把刀甲換到最好，多帶回氣丹。屠千秋大約要二十級才打得過。', 'Buy the best gear in Wanghai first and bring qi pills. Tu Qianqiu wants about level 20.')] };
    default: return { now: L('故事說完了。到處走走，看看還有什麼沒找到的吧。', 'The tale is told. Wander a while and see what you have not found yet.'),
      more: [L('西南深林裡的藏劍窟、各地的珍獸，還有圖鑑上沒填滿的格子……', 'The Hidden Blade Grotto in the south-west forest, the rare beasts in the wilds, and the empty pages of your bestiary...')] };
  }
}

// signposts at the forks of the world map: [x, y, text]
export const SIGNS = [
  [27, 43, L('↖ 西北：青石村・黑風林　→ 東：臨江渡', '↖ North-west: Qingshi Village, Black Wind Woods   → East: Linjiang Ferry')],
  [19, 30, L('↗ 東北：黑風林　← 西：青石村　↘ 東南：龍門鎮', '↗ North-east: Black Wind Woods   ← West: Qingshi Village   ↘ South-east: Longmen Town')],
  [30, 16, L('↑ 北：黑風寨。「無令牌者，回頭！」', '↑ North: Black Wind Fort. "No token? Turn back!"')],
  [52, 47, L('↗ 東北：寒江閣・斷崖　↘ 東南：南陵城　← 西：渡口', '↗ North-east: Cold River Pavilion, the chasm   ↘ South-east: Nanling City   ← West: the ferry')],
  [62, 44, L('↑ 北：斷崖吊橋（已斷），橋那邊是千佛寺・龍脊峰　→ 東：寒江閣', '↑ North: the chasm bridge (broken); beyond it the Thousand Buddha Temple and Dragonspine Peak   → East: Cold River Pavilion')],
  [72, 41, L('→ 東：望海村　↖ 北：繞湖往北岸是水月洞', '→ East: Wanghai Village   ↖ North: round the lake to its north shore lies Moonwater Cave')],
  [64, 19, L('↖ 西北：千佛寺・千佛塔　→ 東：雪嶺小路通龍脊洞', '↖ North-west: Thousand Buddha Temple and Tower   → East: the snow-ridge path to the Dragonspine Caves')],
  [60, 63, L('→ 東：赤沙堡・沙海　↑ 北：渡口', '→ East: Red Sand Fort and the Sand Sea   ↑ North: the ferry')],
  [76, 61, L('↘ 東南：沙海古墓。墓中漆黑，須帶燈籠。', '↘ South-east: the Sand Sea Tomb. It is pitch dark: bring a lantern.')],
  [92, 43, L('→ 東：海角觀潮石。「三符合一，霧開潮退。」', '→ East: the Tide-watch Rock on the cape. "Three seals made one: the fog opens, the tide withdraws."')],
];
export const SIGN_AT = {}; for (const [x, y, l] of SIGNS) SIGN_AT[x + ',' + y] = l;
