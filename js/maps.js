// Towns, dungeons and the people in them. Each map is typed as rows of tiles (legend in TILES below); an uppercase
// letter is a person standing on the map's floor, described in `people`. Digits 1-9 are stairs/doors that link to
// the same digit in another map (`links`). Walking off the edge of a town or the first floor of a dungeon leads
// back to the overworld. Talk scripts are async functions run by game.js with the helpers in `S`.

export const L = (zh, en) => ({ zh, en });

// what each map character is. solid = blocks walking; h = block height (world units); kind = how view.js draws it
export const TILES = {
  '#': { solid: 1, h: 1, kind: 'wall' },
  '.': { kind: 'floor' },
  ',': { kind: 'grass' },
  ':': { kind: 'pave' },
  '"': { solid: 1, kind: 'tree' },
  '~': { solid: 1, kind: 'water' },
  'h': { solid: 1, h: 0.85, kind: 'house' },
  'o': { kind: 'wood' },
  '=': { solid: 1, h: 0.45, kind: 'counter', over: 1 },
  'd': { solid: 1, h: 0.85, kind: 'door' },
  'c': { solid: 1, kind: 'chest' },
  'b': { solid: 1, kind: 'bed' },
  't': { solid: 1, kind: 'table' },
  'k': { solid: 1, h: 0.85, kind: 'shelf' },
  'p': { solid: 1, kind: 'pot' },
  'l': { solid: 1, kind: 'lamp' },
  'w': { solid: 1, kind: 'well' },
  'f': { kind: 'flowers' },
  'r': { solid: 1, kind: 'rock' },
  'x': { solid: 1, kind: 'fence' },
  'i': { solid: 1, h: 1.2, kind: 'pillar' },
  'g': { solid: 1, h: 0.85, kind: 'gate' },
  'v': { solid: 1, kind: 'void' },
  'n': { kind: 'snow' },
  's': { kind: 'sand' },
  'u': { solid: 1, kind: 'statue' },
  'q': { solid: 1, kind: 'coffin' },
  'm': { kind: 'carpet' },
  'e': { kind: 'plank' },
  'z': { kind: 'floor' },
  '%': { solid: 1, kind: 'bush' },
  '&': { solid: 1, kind: 'brazier' },
  '^': { kind: 'ice' },
  'y': { solid: 1, kind: 'sign' },     // a signpost (towns, woods) or a stone tablet (dungeons); its words are in the map's `notes`
};
for (let i = 1; i <= 9; i++) TILES[String(i)] = { kind: 'stairs' };

// ---------------------------------------------------------------- scripted helpers used by the talk functions
// S.say(who, L(...)) shows a line; S.ask(L) yes/no; S.has(item); S.give(item); S.take(item); S.flag(f) / S.set(f);
// S.battle(enemy) -> true if won; S.shop(id); S.inn(price); S.save(); S.teach(skill); S.jingle(name); S.gold(n)

const P = (s, say, o = {}) => ({ s, say, ...o });       // a person: sprite, talk, options (walk: 1 wanders)

// ================================================================= 龍門鎮 Longmen Town (start)
const longmen = {
  name: L('龍門鎮', 'Longmen Town'), theme: 'town', music: 'town', floor: ':',
  rows: [
    '"""""""""""""""""""""""""""""""',
    '"",,,,,,,,hhhhhhhhhhhh,,,,,,,""',
    '",hhhhhhh,hkm&mmmm&mkh,hhhhhh,"',
    '",hbooobh,hmmmmAmmmmmh,hoKokh,"',
    '",hcooooh,htmmtmmtmmth,h====h,"',
    '",hoooooh,hmmmmmmmmmmh,hooooh,"',
    '",hhhohhh,hhhhhmmhhhhh,hhhohh,"',
    '",,,:,,,,,,,,,:mm:,,,,,,,,:,,,"',
    '",f,:,,l,,::::::::::::,,l,:,f,"',
    '",,,:::::::::::w::::::::::::,,"',
    '"",,,,,,,:,,,,:::::,,,,,:,,,,""',
    '",hhhhhh,:,,B,::::::C,,,:hhhhh"',
    '",hoLokh,:,,,,::::::,,,,:hoook"',
    '",h====h,:,,,,::::::,,,,:h=M=h"',
    '",hooooh,:,,f,::::::,f,,:hoooh"',
    '",hhhohh,:,,,,::::::,,,,:hhohh"',
    '",,,,:,,,:,,,,::::::,,,,,,,:,,"',
    '",,,,::::::::::::::::::::::::,"',
    '",f,,,,,,,,l,,::::::,,l,,,,,f,"',
    '"",,,,,,,,,,,,::::::,,,,,,,,,""',
    '"""""""",,,,,,::::::,,,,,""""""',
    '      ",,,,,,,::::::,,,,,,"    ',
  ],
  start: [16, 21],
  chests: [{ item: 'herb' }],
  people: {
    A: P('baixian', async (S) => {
      if (S.flag('ending')) return S.say('baixian', L('故事說完了。客官，明日請早。', 'That is the end of the tale. Come early tomorrow, friend.'));
      if (!S.flag('metBai')) {
        S.set('metBai');
        await S.say('baixian', L('啪！醒木一拍——客官來得巧。今晚這段書，說的正是黑風寨擄人一事。', 'Clack! The block falls. You come at a good moment: tonight\'s tale is of the Black Wind Fort and a stolen boy.'));
        await S.say('baixian', L('黑風寨在北邊群山裡，寨門無令牌不開。令牌嘛……寨中那個叫瘦猴的，最愛躲在黑風林裡偷懶。', 'The fort sits in the northern peaks; its gate opens only for a token. And the token... a lackey called Skinny Monkey likes to idle in the Black Wind Woods.'));
        await S.say('baixian', L('出了鎮往北，經過青石村，就是黑風林。路上灰狼毒蛇不少，先在鎮外練練刀吧。', 'Go north past Qingshi Village to reach the woods. Grey wolves and vipers prowl the road; sharpen your blade near town first.'));
      }
      await S.storyteller();
    }),
    B: P('oldman', async (S) => {
      if (S.flag('ending')) return S.say('oldman', L('奕家兩兄弟，以後一定是了不起的人物。', 'Those two Yi brothers will be great men one day.'));
      const st = S.stage();
      if (S.flag('shuoHome')) {
        await S.say('oldman', L('二少爺平安回來啦！老奴這把老骨頭總算放下了。', 'The young master is home safe! These old bones can rest at last.'));
        if (st === 'bai') return S.say('oldman', L('白先生在北邊的聽雨樓等著您呢，他說鬼面人的事有眉目了。', 'Mr Bai is waiting for you in the Listening Rain House to the north. He says he has a lead on the masked man.'));
        if (st === 'liu' || st === 'cave' || st === 'rope') return S.say('oldman', L('老奴年輕時跑過碼頭：過了臨江渡往東北，大路盡頭的湖上就是寒江閣。', 'I worked the docks when I was young: past Linjiang Ferry, north-east, the road ends at a lake, and on it stands the Cold River Pavilion.'));
        if (['tian', 'di', 'ren'].includes(st)) return S.say('oldman', L('三符？老奴只聽過千佛寺供著一枚。千佛寺在北邊斷崖的那一頭。', 'The three seals? I have only heard that the Thousand Buddha Temple keeps one. It is beyond the chasm in the north.'));
        return;
      }
      if (st === 'cell' || st === 'home') return S.say('oldman', L('打下黑風寨了？那二少爺呢？牢房、牢房裡找找！', 'You took the fort? Then where is the young master? Look in the cells, the cells!'));
      await S.say('oldman', L('大少爺！二少爺在河邊踢球，被黑風寨的人擄走了！', 'Young master! Your brother was playing ball by the river when the Black Wind bandits took him!'));
      await S.say('oldman', L('聽雨樓的白先生消息最靈通，快去問問他。聽雨樓就是鎮子北邊正中那座大屋。', 'Mr Bai at the Listening Rain House always knows the news. Ask him: it is the big hall in the middle of the north side of town.'));
      if (st === 'fort') await S.say('oldman', L('您拿到令牌了？寨子就在黑風林東北的山口後頭，一路往北！', 'You have the token? The fort is behind the pass north-east of the Black Wind Woods. Straight north!'));
    }, { walk: 1 }),
    C: P('child', async (S) => {
      if (S.flag('shuoHome')) return S.say('child', L('奕碩哥哥說，他的球誰都不給。好帥！', 'Yi Shuo says he won\'t give his ball to anyone. So cool!'));
      await S.say('child', L('那些壞人一直搶奕碩哥哥的球……球有那麼好玩嗎？', 'The bad men kept grabbing at Yi Shuo\'s ball... is a ball really that fun?'));
      if (S.stage() === 'woods') await S.say('child', L('有一個瘦瘦的壞人，抱著饅頭往西北的大路跑了，說要回林子裡睡覺！', 'One skinny bad man ran off up the north-west road with a bun, saying he was going back to the woods for a nap!'));
    }, { walk: 1 }),
    K: P('merchant', async (S) => { await S.say('merchant', L('龍門鐵匠鋪，刀甲俱全！', 'Longmen Smithy: blades and armour!')); await S.shop('longmen_w'); }),
    L: P('innkeeper', async (S) => { await S.inn(6); }),
    M: P('woman', async (S) => { await S.say('woman', L('藥材雜貨，出門必備。', 'Herbs and sundries for the road.')); await S.shop('longmen_i'); }),
    D: P('yishuo', async (S) => {
      if (S.flag('ending')) return S.say('yishuo', L('哥，下次闖江湖，帶上我！', 'Brother, next time you go adventuring, take me!'));
      await S.say('yishuo', L('哥！你要去打幽冥教？我的球借你……算了，球不能借。加油！', 'Brother! You\'re going after the Netherworld Sect? I\'d lend you my ball... no, the ball stays with me. Good luck!'));
    }, { flag: 'shuoHome' }),
    E: P('guard', async (S) => {
      if (S.flag('causeway')) return S.say('guard', L('聽說東海的霧散了？這可是三十年沒有的事。', 'They say the fog over the eastern sea has lifted? That hasn\'t happened in thirty years.'));
      if (S.flag('fortDone')) return S.say('guard', L('黑風寨倒了，河也開了！出鎮往東走到臨江渡，村外的木棧橋上了船就能過河。', 'The Black Wind Fort has fallen and the river is open! Go east out of town to Linjiang Ferry; board at the wooden pier outside the village.'));
      await S.say('guard', L('出鎮往東是臨江渡，不過黑風寨的人把河封了，沒有船敢開。', 'East of town is Linjiang Ferry, but the bandits have closed the river. No boat dares to sail.'));
      await S.say('guard', L('往北的大路通青石村。再往北是黑風寨的山口，木柵上寫著：沒令牌的回頭。', 'The north road goes to Qingshi Village. Further north is the Black Wind pass; the palisade says: no token, turn back.'));
    }),
  },
};
// two more townsfolk placed by coordinates
longmen.people.F = P('man', async (S) => {
  const st = S.stage();
  if (st === 'woods') return S.say('man', L('我是走江湖的。給你個忠告：鎮外先打打灰狼，等到五、六級再進黑風林。打不過就回客棧睡一覺，命比面子要緊。', 'I\'m a wanderer. A word of advice: fight the wolves outside town, and enter the Black Wind Woods at level 5 or 6. If it goes badly, sleep at the inn: your life is worth more than your pride.'));
  if (!S.flag('apeDone')) return S.say('man', L('我從南邊來的。龍門往西南走，有一大片老林子，林子深處有個山洞叫藏劍窟，裡面住著一隻會武功的白猿！', 'I came up from the south. South-west of Longmen there is a great old forest, and deep in it a cave called the Hidden Blade Grotto. A white ape that knows kung fu lives there!'));
  return S.say('man', L('聽說荒野裡偶爾會撞見珍獸：南邊有吊睛白額虎，東邊沙海上空有三足火鴉。打贏了，掉的東西可值錢呢。', 'They say you sometimes meet rare beasts in the wilds: a white-browed tiger in the south, a three-legged fire crow over the eastern sands. Beat one and what it drops is worth a fortune.'));
}, { walk: 1 });
longmen.extra = [['D', 4, 5], ['E', 21, 18], ['F', 12, 19]];

// ================================================================= 青石村 Qingshi Village
const qingshi = {
  name: L('青石村', 'Qingshi Village'), theme: 'village', music: 'town', floor: ',',
  rows: [
    '"""""""""""""""""""""""""',
    '",,,,,,,,,,,,,,,,,,,,,,,"',
    '",hhhhhh,,,,%%,,,hhhhhh,"',
    '",hoKokh,,,,,,,,,hoooob,"',
    '",h====h,,f,,,f,,hoLoob,"',
    '",hooooh,,,,w,,,,h====h,"',
    '",hhohhh,,,,,,,,,hooooh,"',
    '",,,:,,,,,,,,,,,,hhhohh,"',
    '",,,::::::::::::::::::,,"',
    '",f,,,,,:,,,A,,,,:,,,,f,"',
    '",,xxxx,:,,,,,,,,:,xxxx,"',
    '",,x..x,:,,,B,,,,:,x..x,"',
    '",,xxxx,:,,,,,,,,:,xxxx,"',
    '",hhhhh,:::::::::::,,,,,"',
    '",hoMoh,,,,,:,,,,,,,,C,,"',
    '",h===h,,,,,:,,,,,,,,,,,"',
    '",hoooo,,,,,:,,,,,,,,,,,"',
    '",hhohh,,,,,:,,,,,,,,,,,"',
    '""""""",,,,:,,,,""""""""""',
    '      ",,,,:,,,,"        ',
  ],
  start: [11, 19],
  people: {
    K: P('blacksmith', async (S) => { await S.say('blacksmith', L('青石村的刀，砍得動黑風寨的木柵！', 'Qingshi steel cuts through the bandits\' palisade!')); await S.shop('qingshi'); }),
    L: P('innkeeper', async (S) => { await S.inn(8); }),
    M: P('woman', async (S) => { await S.say('woman', L('驅獸香點上，野獸就不敢靠近。', 'Light some beast-ward incense and wild things keep away.')); await S.shop('qingshi_i'); }),
    A: P('oldman', async (S) => {
      if (S.flag('fortDone')) return S.say('oldman', L('黑風寨的人說，是一個戴鬼面的人出錢擄人的。鬼面……莫非是幽冥教？', 'The bandits say a man in a ghost mask paid for the kidnapping. A ghost mask... the Netherworld Sect?'));
      if (S.flag('token')) return S.say('oldman', L('打贏了瘦猴？那黑風寨的山口就在林子的東北邊，往北的山谷裡。', 'You beat Skinny Monkey? Then the Black Wind pass is north-east of the woods, up the valley to the north.'));
      await S.say('oldman', L('黑風林就在村子東北邊，出村沿小路走就到。林子裡岔路多，走錯了就在原地打轉。', 'The Black Wind Woods lie north-east of the village, along the little road. Many forks; take a wrong one and you walk in circles.'));
      await S.say('oldman', L('老漢砍了一輩子柴，記住一句：外林的出口在東北角，碰到死路就回頭。', 'I have cut wood there all my life. Remember: the way out of the outer woods is the north-east corner. Hit a dead end, turn back.'));
    }),
    B: P('child', async (S) => {
      await S.say('child', L('我爹說，打不過就快跑，不丟人！', 'My dad says if you can\'t win, run. No shame in it!'));
      if (!S.flag('fortDone')) await S.say('child', L('我偷偷跟我哥進過黑風林！西邊的死路裡有個寶箱，我們不敢開。', 'I sneaked into the woods with my brother once! There\'s a chest in a dead end on the west side. We didn\'t dare open it.'));
    }, { walk: 1 }),
    C: P('man', async (S) => {
      if (S.flag('fortDone')) return S.say('man', L('瘦猴又回來賒酒了，說再也不幹土匪了。對了，聽說臨江渡的船又開了。', 'Skinny Monkey is back drinking on credit; says he\'s done with banditry. Oh, and they say the boats at Linjiang Ferry are running again.'));
      if (S.flag('token')) return S.say('man', L('有令牌了？黑風寨的柵門在黑風林東北邊的山口。', 'You have the token? The fort\'s barricade is at the mountain pass north-east of the woods.'));
      await S.say('man', L('瘦猴那傢伙常來村裡賒酒，說他在林子深處有個窩。', 'Skinny Monkey drinks here on credit. He says he has a den deep in the woods.'));
      await S.say('man', L('他喝醉了說溜嘴：「進了深處往西走，我那窩誰也找不到！」嘿，這不就找到了。', 'He let it slip when drunk: "Go deep and head west, nobody finds my den!" Well, now somebody will.'));
    }, { walk: 1 }),
  },
};

// ================================================================= 臨江渡 Linjiang Ferry
const linjiang = {
  name: L('臨江渡', 'Linjiang Ferry'), theme: 'village', music: 'town', floor: ',',
  rows: [
    '"""""""""""""""""""""""""',
    '",,,,,,,,,,,,,,,,,,,,,~~~',
    '",hhhhhh,,,,,,hhhhhh,,~~~',
    '",hoKokh,,,,,,hooLoh,,~~~',
    '",h====h,,f,,,h====h,,~~~',
    '",hooooh,,,,,,hooooh,,~~~',
    '",hhohhh,,,,,,hhohhh,,~~~',
    '",,,:,,,,,,,,,,,:,,,,,~~~',
    '",,,::::::::::::::::eeeee',
    '",f,,,,,,:,,,,,,,,,,A~~~~',
    '",hhhhh,,:,,,,,,,,,,,~~~~',
    '",hoMoh,,:,,,,,,,,f,,~~~~',
    '",h===h,,:,,,,,,,,,,,~~~~',
    '",hoooo,,:,,,,,C,,,,,~~~~',
    '",hhohh,,:,,,,,,,,,,,~~~~',
    '""""""",,:,,""""""""""~~~',
    '      ",,:,,"            ',
  ],
  start: [9, 16],
  people: {
    K: P('blacksmith', async (S) => { await S.shop('linjiang'); }),
    L: P('innkeeper', async (S) => { await S.inn(12); }),
    M: P('merchant', async (S) => { await S.shop('linjiang_i'); }),
    A: P('boatman', async (S) => {
      if (!S.flag('fortDone')) {
        await S.say('boatman', L('黑風寨的人把河封了，說誰敢開船就燒誰的船。對不住，渡不了。', 'The Black Wind gang closed the river; they\'ll burn any boat that sails. Sorry, no crossing.'));
        await S.say('boatman', L('封河的是寨主黑熊。寨子在西北的群山裡，過了青石村和黑風林還要往北。讓他服了，河自然就開了。', 'It was their chief, Black Bear, who closed it. The fort is in the north-western peaks, north past Qingshi and the Black Wind Woods. Make him yield and the river opens.'));
        return;
      }
      await S.say('boatman', L('寨子的人撤了！上船吧，龍門的少俠，這趟不收錢。', 'The bandits have gone! Climb aboard, young hero of Longmen. This one\'s free.'));
      await S.say('boatman', L('（渡口的木棧橋就在村外河邊，走上去就能過河。）', '(The ferry pier is on the riverbank outside the village; step onto it to cross.)'));
    }),
    B: P('yuweng', async (S) => {
      if (!S.flag('metYuweng')) {
        S.set('metYuweng');
        await S.say('yuweng', L('……魚不咬鉤，人倒是來了。', '...The fish won\'t bite, but a man comes along instead.'));
        await S.say('yuweng', L('你握刀的手太緊。刀是活的，握死了，它就不肯跟你走。', 'You grip your blade too tight. A blade is alive; strangle it and it won\'t follow you.'));
      }
      if (S.flag('jiaoDone') && !S.flag('apeDone')) return S.say('yuweng', L('……龍門西南的老林子裡，有個藏劍窟。石壁上的字，比我教你的有用。', '...In the old forest south-west of Longmen is the Hidden Blade Grotto. The words on its wall will teach you more than I can.'));
      if (!S.flag('jiaoDone')) return S.say('yuweng', L('河東邊有座南陵城。再往東的水月洞裡，除了唱歌的妖女，還有一條沒化成龍的江蛟。去不去，自己掂量。', 'East across the river is Nanling. Further east, in Moonwater Cave, there is the singing witch, and a river jiao that never became a dragon. Weigh it yourself.'));
      await S.say('yuweng', L('江蛟也服了你？……這條河，今年能太平些了。', 'Even the jiao yielded to you? ...This river may have a quiet year.'));
    }),
    C: P('woman', async (S) => {
      const st = S.stage();
      if (st === 'liu' || st === 'cave' || st === 'rope' || st === 'bai') return S.say('woman', L('過了河是條岔路：往東北的大路到寒江閣，往東南的到南陵城。寒江閣的姑娘們常來這兒買魚。', 'Across the river the road forks: north-east to the Cold River Pavilion, south-east to Nanling City. The Cold River girls often come here to buy fish.'));
      await S.say('woman', L('你看河上那霧……老人說，東海外的霧比這濃一百倍，誰也過不去。', 'See the mist on the river? The old folk say the fog off the eastern sea is a hundred times thicker. No one gets through.'));
    }, { walk: 1 }),
  },
};
linjiang.extra = [['B', 20, 12]];

// ================================================================= 南陵城 Nanling City
const nanling = {
  name: L('南陵城', 'Nanling City'), theme: 'city', music: 'town', floor: ':',
  rows: [
    '##############################',
    '#::::::::::::::::::::::::::::#',
    '#:hhhhhhh::hhhhhhhhhh::hhhhh:#',
    '#:hoKokkh::hkkmmmmmkh::hoLoh:#',
    '#:h=====h::htmmAmmmth::h===h:#',
    '#:hoooooh::hmmmmmmmmh::hoooh:#',
    '#:hhhohhh::hhhhmmhhhh::hhohh:#',
    '#::::::::::::::mm::::::::::::#',
    '#:l:::::::::::::::::::::::l::#',
    '#::::::"::::::w:::::::"::::::#',
    '#:hhhhhh:::::::::::::::hhhhh:#',
    '#:hoMokh:::::B:::::C:::hoNoh:#',
    '#:h====h:::::::::::::::h===h:#',
    '#:hooooh:::f:::::::f:::hoooh:#',
    '#:hhhohh:::::::::::::::hhohh:#',
    '#::::::::::::::::::::::::::::#',
    '#:"::D:::::l:::::::l::::E::":#',
    '#::::::::::::::::::::::::::::#',
    '#############::::#############',
  ],
  start: [14, 18],
  people: {
    K: P('blacksmith', async (S) => { await S.say('blacksmith', L('南陵刀劍行，江南第一！', 'Nanling Blades, finest in the south!')); await S.shop('nanling'); }),
    L: P('innkeeper', async (S) => { await S.inn(18); }),
    M: P('qianwanli', async (S) => {
      await S.say('qianwanli', L('萬里號，童叟無欺！燈籠、鑰匙、傷藥，一文一釐都算得清清楚楚。', 'The Wanli Store: fair to young and old! Lanterns, keys, salves, every copper counted true.'));
      await S.shop('nanling_i');
    }),
    W: P('wenruyu', async (S) => {
      if (S.flag('causeway')) return S.say('wenruyu', L('失禮了……東海的霧散了？我得記進帳本裡：這筆，是龍門記的。', 'Pardon me... the fog over the sea has lifted? I must enter it in the ledger: this one goes to Longmen\'s account.'));
      await S.say('wenruyu', L('失禮了。在下溫如玉，替錢掌櫃記帳。', 'Pardon me. I am Wen Ruyu; I keep the books for Master Qian.'));
      await S.say('wenruyu', L('沙海古墓的門鎖多，想開耳室的寶物，請多買幾把鑰匙……啊，這不是在幫掌櫃做生意，是真心話。', 'The Sand Sea Tomb has many locks; if you want the treasure in the side chambers, buy a few keys... ah, that isn\'t salesmanship for my master. I mean it.'));
      await S.say('wenruyu', L('帳本上記著：進墓的人，十個有九個忘了買燈籠。燈籠六十兩，我們鋪子就有。', 'My ledger says nine in ten who go into the tomb forget a lantern. Sixty gold; our shop has them.'));
    }),
    A: P('scholar', async (S) => {
      await S.say('scholar', L('三十年前，正派聯手剿滅幽冥教，教主屠千秋墜海，屍骨無存。', 'Thirty years ago the righteous sects destroyed the Netherworld Sect. Its master, Tu Qianqiu, fell into the sea; no body was found.'));
      await S.say('scholar', L('後來東海就起了霧，再沒散過。', 'Since then a fog has lain over the eastern sea, and it has never lifted.'));
    }),
    B: P('tiewusi', async (S) => {
      if (!S.flag('metTie')) {
        S.set('metTie');
        await S.say('tiewusi', L('武林盟執法堂，鐵無私。報上名來。', 'Tie Wusi, of the Alliance\'s Hall of Law. Your name.'));
        await S.say('tiewusi', L('……龍門刀莊的？你弟弟的案子，我聽說了。黑風寨的嘍囉不足為慮，背後出錢的人，才是正主。', '...Of the Longmen Saber Manor? I heard about your brother. The Black Wind rabble are nothing; the one who paid them is the real culprit.'));
      }
      if (S.has('rope')) return S.say('tiewusi', L('有飛索了？從渡口往東的岔路往北，就是斷崖。過了崖：西北是千佛寺，往東的雪嶺通龍脊峰。只認證據，不認交情。', 'You have the rope? From the fork east of the ferry, go north to the chasm. Beyond it: the Thousand Buddha Temple north-west, and the snow ridge east leads to Dragonspine Peak. Evidence, not friendship.'));
      await S.say('tiewusi', L('北邊斷崖的吊橋斷了好些年。寒江閣的人有法子過崖。記住：只認證據，不認交情。', 'The rope bridge over the northern chasm broke years ago. The Cold River folk have a way across. Remember: evidence, not friendship.'));
    }, { walk: 1 }),
    C: P('dancer', async (S) => {
      await S.say('dancer', L('寒江閣的柳閣主，人美劍更美。只是最近水月洞鬧鬼，她愁得很。', 'Mistress Liu of the Cold River Pavilion: lovely, and her sword lovelier. But a haunting at Moonwater Cave troubles her.'));
      if (!S.flag('yaojiDone')) await S.say('dancer', L('寒江閣怎麼走？出城往北回到渡口的岔路，再往東北走大路，看見湖就到了。', 'The way to the pavilion? North out of the city back to the fork by the ferry, then the north-east road until you see the lake.'));
    }, { walk: 1 }),
    N: P('innkeeper', async (S) => {
      await S.say('innkeeper', L('客官要聽消息？沙海古墓伸手不見五指，沒有燈籠連門都不敢進。耳室的門上了鎖，要銅鑰匙才開得了。', 'News, friend? The Sand Sea Tomb is pitch dark: without a lantern you won\'t even get through the entrance. The side chambers are locked; bronze keys open them.'));
      await S.say('innkeeper', L('古墓在東邊赤沙堡的東南。從城外的路牌往東走，就到赤沙堡。', 'The tomb is south-east of the Red Sand Fort, east of here. Follow the road east from the signpost outside the city to reach the fort.'));
    }),
    D: P('beggar', async (S) => {
      await S.say('beggar', L('好心的少俠……我看見過戴鬼面的人，往東邊望海村去了。', 'Kind hero... I saw men in ghost masks heading east, toward Wanghai Village.'));
    }, { walk: 1 }),
    E: P('oldwoman', async (S) => {
      await S.say('oldwoman', L('龍脊峰上住著一個白頭髮的怪人，誰上去誰被打下來。', 'A strange white-haired man lives on Dragonspine Peak. Whoever climbs up gets thrown back down.'));
    }, { walk: 1 }),
  },
};
nanling.extra = [['W', 3, 13]];

// ================================================================= 寒江閣 Cold River Pavilion
const hanjiang = {
  name: L('寒江閣', 'Cold River Pavilion'), theme: 'pavilion', music: 'town', floor: ':',
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~eeeeeeeeeeee~~~~~~',
    '~~~~~~e:i::mm::i:e~~~~~~',
    '~~~~~~e:::mAmm:::e~~~~~~',
    '~~~~~~e:i::mm::i:e~~~~~~',
    '~~~~~~eeeeemmeeeee~~~~~~',
    '~~~~~~~~~~~ee~~~~~~~~~~~',
    '",,,,,,,,,,ee,,,,,,,,,,"',
    '",hhhhh,,,:::::,,hhhhh,"',
    '",hoKoh,,,:::::,,hoLoh,"',
    '",h===h,f,:,B,:,,h===h,"',
    '",hoooh,,,:::::,,hoooh,"',
    '",hhohh,,,:::::,,hhohh,"',
    '",,,:,,,,,:::::,,,,:,,,"',
    '",,,:::::::::::::::::,,"',
    '",f,,,,,C,:::::,,,,,,f,"',
    '""""""",,,:::::,,"""""""',
    '      ",,,:::::,,"      ',
  ],
  start: [12, 17],
  people: {
    A: P('liuhanyan', async (S) => {
      if (S.flag('yaojiDone')) {
        if (!S.has('rope')) { await S.give('rope'); }
        return S.say('liuhanyan', L('北邊斷崖，用飛索就能過去。千佛寺的苦禪大師，是我師父的故交。', 'Use the rope at the northern chasm. Master Kuchan of the Thousand Buddha Temple was an old friend of my teacher.'));
      }
      if (!S.flag('metLiu')) {
        S.set('metLiu');
        await S.say('liuhanyan', L('龍門刀莊的人？……你的刀，還嫩了點。', 'From the Longmen Saber Manor? ...Your blade is still green.'));
        await S.say('liuhanyan', L('湖北岸的水月洞裡住著一個妖姬，夜夜唱歌，迷了我好幾個弟子。', 'On the lake\'s north shore, in Moonwater Cave, lives a siren. She sings every night and has bewitched several of my disciples.'));
        await S.say('liuhanyan', L('你若能除了她，寒江閣欠你一個人情。我們有渡崖用的飛索，你會用得上。', 'Rid us of her and the Cold River owes you a favour. We have a flying rope for crossing chasms; you will need it.'));
        return;
      }
      await S.say('liuhanyan', L('水月洞在湖的北岸：出了閣往北，繞到湖的北邊再往東，洞口就在岸上。洞裡潮濕，小心毒物。', 'Moonwater Cave is on the lake\'s north shore: go north from here, round to the north side of the lake, then east; the mouth is on the shore. It is damp in there; beware of venom.'));
    }),
    K: P('nun', async (S) => { await S.say('nun', L('寒江閣的丹藥，回氣最快。', 'The Cold River\'s pills restore qi fastest.')); await S.shop('hanjiang'); }),
    L: P('nun', async (S) => { await S.inn(20); }),
    B: P('nun', async (S) => {
      if (S.flag('yaojiDone')) return S.say('nun', L('師姊們都醒過來了。多謝少俠！', 'My sisters have all woken. Thank you!'));
      await S.say('nun', L('妖姬會點穴，被她定住就只能挨打。帶夠金創藥！', 'The siren strikes pressure points: once you\'re frozen, you can only take the blows. Bring plenty of salve!'));
    }, { walk: 1 }),
    C: P('fisherman', async (S) => {
      if (S.flag('metLiu') && !S.flag('yaojiDone')) return S.say('fisherman', L('水月洞？我天天在湖邊打魚：洞口在湖的正北岸。夜裡聽得見歌聲，千萬別跟著唱。', 'Moonwater Cave? I fish the lake every day: the mouth is on the north shore. At night you can hear the singing. Don\'t sing along.'));
      await S.say('fisherman', L('從這裡往東走到海邊，就是望海村。', 'Walk east from here to the sea and you reach Wanghai Village.'));
    }, { walk: 1 }),
    X: P('xiaolian', async (S) => {
      if (S.flag('yaojiDone') && !S.has('rope')) return S.say('xiaolian', L('你打贏妖姬啦？快去找師父！她在湖上的水榭裡，說要送你飛索！', 'You beat the siren? Go see Master! She\'s in the water pavilion on the lake, and she says she\'ll give you the flying rope!'));
      if (S.flag('yaojiDone')) return S.say('xiaolian', L('你真的打贏妖姬啦？聽說她其實是一隻九尾狐！飛索要在北邊斷崖用喔，從渡口過來那條路往北就是。', 'You really beat the siren? They say she was a nine-tailed fox! Use the rope at the northern chasm: go north on the road from the ferry.'));
      await S.say('xiaolian', L('我是小蓮，師父的徒弟！你是奕碩哥哥的哥哥？他的球踢得好遠！', 'I\'m Xiaolian, Mistress Liu\'s disciple! You\'re Yi Shuo\'s big brother? He kicks his ball so far!'));
      await S.say('xiaolian', L('師父不准我去水月洞……可是我偷看到了，洞裡的影子有好多條尾巴！', 'Master won\'t let me go to Moonwater Cave... but I peeked, and the shadow in there has lots of tails!'));
    }, { walk: 1 }),
  },
};
hanjiang.extra = [['X', 15, 13]];

// ================================================================= 千佛寺 Thousand Buddha Temple
const qianfo = {
  name: L('千佛寺', 'Thousand Buddha Temple'), theme: 'temple', music: 'tower', floor: ':',
  rows: [
    '""""""""""""""""""""""""',
    '"######################"',
    '"#u:u:u:u:u:u:u:u:u:u:#"',
    '"#:::::::::A::::::::::#"',
    '"#:i:::i::mmm::i:::i::#"',
    '"#:::::::mm&mm::::::::#"',
    '"#:i:::i::mmm::i:::i::#"',
    '"#########mmm##########"',
    '",,,,,,,,,:::,,,,,,,,,,"',
    '",hhhhh,,,:::,,,hhhhh,,"',
    '",hoKoh,,,:B:,,,hoLoh,,"',
    '",h===h,,,:::,,,h===h,,"',
    '",hoooh,,,:::,,,hoooh,,"',
    '",hhohh,,,:::,,,hhohh,,"',
    '",,,:,,,,,:::,,,,,:,,,,"',
    '",,,:::::::::::::::,C,,"',
    '""""""",,:::,,""""""""""',
    '      ",,:::,,"        ',
  ],
  start: [11, 17],
  people: {
    A: P('kuchan', async (S) => {
      if (S.flag('ending')) return S.say('kuchan', L('阿彌陀佛。刀在人心，不在刀鞘。', 'Amitabha. The blade lives in the heart, not in the scabbard.'));
      if (S.flag('luohanDone')) {
        if (!S.flag('learnGuard')) {
          S.set('learnGuard');
          await S.say('kuchan', L('施主過了千佛塔，天符已在你手。老衲再傳你一門金剛護體，以防不測。', 'You have passed the tower and hold the Heaven Seal. Let me also teach you Diamond Body, against the worst.'));
          await S.teach('guard');
          return;
        }
        return S.say('kuchan', L('地符在南方沙海的古墓；人符……去龍脊峰看看吧。', 'The Earth Seal lies in the tomb in the southern Sand Sea; the Mortal Seal... try Dragonspine Peak.'));
      }
      await S.say('kuchan', L('阿彌陀佛。施主要找天符？天符供在千佛塔頂。', 'Amitabha. You seek the Heaven Seal? It rests at the top of the Thousand Buddha Tower.'));
      await S.say('kuchan', L('塔中有金身羅漢守護，是本寺歷代試煉。過得了，天符便是你的。', 'A Golden Arhat guards it: this temple\'s ancient trial. Pass it, and the seal is yours.'));
    }),
    K: P('monk', async (S) => { await S.shop('qianfo'); }),
    L: P('monk', async (S) => { await S.inn(15); }),
    B: P('monk', async (S) => {
      await S.say('monk', L('千佛塔就在寺後東北邊的山上，出寺沿石階往東北走。塔中的銅人是練武用的，下手可不輕；還有被逐出寺門的惡僧躲在裡面。', 'The tower stands on the hill north-east behind the temple: follow the steps north-east out of the gate. The bronze men inside are for training, and they hit hard; and monks expelled from the temple hide in there.'));
      if (!S.flag('luohanDone')) await S.say('monk', L('塔有五層，樓梯一層在東、一層在西，輪著走。第四層的石獅守著寶箱，不惹牠，牠也不動。', 'Five floors, and the stairs alternate east and west. On the fourth a stone lion guards a chest; leave it be and it won\'t move.'));
    }, { walk: 1 }),
    C: P('monk', async (S) => {
      await S.say('monk', L('往東翻過雪嶺就是龍脊峰，冷得很。', 'East over the snowy ridge is Dragonspine Peak. Bitter cold.'));
      if (!S.has('ren')) await S.say('monk', L('回到吊橋北頭，有條往東的小路沿著雪嶺走到底，就是龍脊洞的洞口。洞裡兩層，出口都在東邊。', 'Go back to the north end of the bridge; a path runs east along the snow ridge to the mouth of the Dragonspine Caves. Two floors inside, both exits on the east.'));
    }, { walk: 1 }),
  },
};

// ================================================================= 赤沙堡 Red Sand Fort (desert town)
const chisha = {
  name: L('赤沙堡', 'Red Sand Fort'), theme: 'desert', music: 'town', floor: 's',
  rows: [
    '##########################',
    '#ssssssssssssssssssssssss#',
    '#s######ss~~~~ss#######ss#',
    '#s#oKok#ss~~~~ss#ooLoo#ss#',
    '#s#====#ss~~~~ss#=====#ss#',
    '#s#oooo#sss%%sss#ooooo#ss#',
    '#s##o###ssssssss###o###ss#',
    '#ssssssssssAsssssssssssss#',
    '#s######sssssssssssssss%s#',
    '#s#oMok#sssssBsssssssssss#',
    '#s#====#ssssssssss######s#',
    '#s#oooo#ssssssssss#oNoo#s#',
    '#s##o###sssssCssss##o###s#',
    '#ssssssssssssssssssssssss#',
    '###########ssss###########',
  ],
  start: [12, 14],
  people: {
    K: P('blacksmith', async (S) => { await S.shop('chisha'); }),
    L: P('innkeeper', async (S) => { await S.inn(25); }),
    M: P('merchant', async (S) => {
      await S.say('merchant', L(S.has('lantern') ? '進古墓？鑰匙多帶幾把，那墓裡的耳室一間比一間多。' : '進古墓？先買燈籠！沒燈籠，連墓門都摸不進去。鑰匙嘛，想開耳室再買。', S.has('lantern') ? 'The tomb? Bring extra keys: every hall has more side chambers than the last.' : 'The tomb? Buy a lantern first! Without one you can\'t even feel your way through the door. Keys only if you want the side chambers.'));
      await S.shop('chisha_i');
    }),
    A: P('guard', async (S) => {
      await S.say('guard', L('沙海古墓在東南邊。墓主是前朝的將軍，聽說死了也不肯躺下。', 'The Sand Sea Tomb is to the south-east. Its lord was a general of the old dynasty; they say even death couldn\'t make him lie down.'));
      if (!S.has('di')) await S.say('guard', L('出了堡門看路牌，往東南穿過沙海，看見一座石墳就是了。', 'Out of the gate, check the signpost, then head south-east across the sands until you see a stone mound.'));
    }),
    B: P('oldman', async (S) => {
      await S.say('oldman', L('殭屍會用屍毒，中了毒要趕快吃解毒草。', 'Jiangshi carry corpse venom. If you\'re poisoned, eat an antidote herb quickly.'));
      if (!S.has('di')) await S.say('oldman', L('我年輕時給盜墓的扛過燈：墓有三層，往下的樓梯先在東北角，再在東南角。將軍的棺材在最底層的正北邊。', 'When I was young I carried lamps for grave robbers: the tomb has three levels. The stairs down are in the north-east corner, then the south-east. The general\'s coffin is on the bottom level, due north.'));
    }, { walk: 1 }),
    C: P('dancer', async (S) => { await S.say('dancer', L('三足石蟾嘴裡含著銅錢，是財神爺的寵物！見到了別讓牠跑了。', 'The three-legged stone toad holds a coin in its mouth: the god of wealth\'s pet! Don\'t let it get away.')); }, { walk: 1 }),
    N: P('scholar', async (S) => { await S.say('scholar', L('三符合一，霧開潮退……這是我在古書上讀到的。', '"Three seals made one: the fog opens, the tide withdraws." I read it in an old book.')); }),
    H: P('lihanshan', async (S) => {
      await S.say('lihanshan', L('……血刀門，厲寒山。', '...Li Hanshan, of the Blood Saber Sect.'));
      await S.say('lihanshan', L('北邊雪嶺上那些紅衣打手是我門下的？哼，拿了幽冥教的錢，就不再是了。你砍了他們，不算得罪我。', 'Those red-clad thugs on the northern snow ridges, mine? Hmph. Once they took the Netherworld\'s silver, they stopped being mine. Cut them down; you won\'t offend me.'));
      await S.say('lihanshan', L('沙海上空有三隻腳的火鴉。遇上了，別硬拚。我這輩子最恨一個「輸」字——你也該學著恨它。', 'A three-legged fire crow flies over the sand sea. If you meet it, don\'t trade blows blindly. All my life I have hated one word, "lose". Learn to hate it too.'));
    }),
  },
};
chisha.extra = [['H', 22, 13]];

// ================================================================= 望海村 Wanghai Village (east coast)
const wanghai = {
  name: L('望海村', 'Wanghai Village'), theme: 'village', music: 'town', floor: ',',
  rows: [
    '"""""""""""""""""""""""""~~~',
    '",,,,,,,,,,,,,,,,,,,,,,,,,~~',
    '",hhhhhh,,,,,,,,,hhhhhh,,,~~',
    '",hoKokh,,,,f,,,,hooLoh,,,~~',
    '",h====h,,,,,,,,,h====h,,,~~',
    '",hooooh,,,,w,,,,hooooh,,,~~',
    '",hhohhh,,,,,,,,,hhohhh,,,~~',
    '",,,:,,,,,,,,,,,,,,:,,,,,,~~',
    '",,,:::::::::::::::::::::eee',
    '",f,,,,,:,,,,A,,,,,,,,,,,~~~',
    '",hhhhh,:,,,,,,,,,,,,B,,,~~~',
    '",hoMoh,:,,,,,,,,,,,,,,,,~~~',
    '",h===h,:,,,C,,,,,,,,,f,,~~~',
    '",hoooo,:,,,,,,,,,,,,,,,,~~~',
    '",hhohh,:,,,,,,,,,,,,,,,,~~~',
    '""""""",:,,"""""""""""""~~~~',
    '      ",:,,"             ~~~',
  ],
  start: [8, 16],
  people: {
    K: P('blacksmith', async (S) => { await S.say('blacksmith', L('寒鐵出自北海，一把刀要打七七四十九天。', 'Cold iron comes from the northern sea; a single blade takes forty-nine days to forge.')); await S.shop('wanghai'); }),
    L: P('innkeeper', async (S) => { await S.inn(30); }),
    M: P('merchant', async (S) => { await S.shop('wanghai_i'); }),
    A: P('oldman', async (S) => {
      const n = ['tian', 'di', 'ren'].filter((k) => S.has(k)).length;
      if (S.flag('causeway')) return S.say('oldman', L('潮退了，路出來了……少俠，活著回來。', 'The tide is out and the road has risen... come back alive, young hero.'));
      if (n === 3) return S.say('oldman', L('三符都在你身上了！出村往東南，海邊有一段石路，走到盡頭的海角，那裡正對著幽冥島。', 'You hold all three seals! Out of the village to the south-east a stone road runs along the shore; walk to the cape at its end, facing the Netherworld Isle.'));
      await S.say('oldman', L('海那邊的島，三十年來終年起霧。我爺爺說，霧裡有一條石路，潮退才看得見。', 'The isle out there has been fogbound for thirty years. My grandfather said a stone road lies under the fog, seen only at low tide.'));
      await S.say('oldman', L('要退那潮，得有天、地、人三符。你現在有 ' + n + ' 枚。', 'To turn that tide you need the Heaven, Earth and Mortal seals. You have ' + n + '.'));
      const miss = [['tian', '天符在千佛塔', 'the Heaven Seal is in the Thousand Buddha Tower'], ['di', '地符在沙海古墓', 'the Earth Seal is in the Sand Sea Tomb'], ['ren', '人符在龍脊峰', 'the Mortal Seal is on Dragonspine Peak']].filter(([k]) => !S.has(k));
      if (miss.length) await S.say('oldman', L('我爺爺說過：' + miss.map((m) => m[1]).join('，') + '。', 'My grandfather said: ' + miss.map((m) => m[2]).join('; ') + '.'));
    }),
    B: P('fisherman', async (S) => {
      if (S.flag('causeway')) return S.say('fisherman', L('石路通了！我遠遠看過那座殿：四層高，三樓站著一個戴鬼面的大個子。少俠多帶回氣丹。', 'The causeway is up! I\'ve seen that hall from afar: four storeys, and a big man in a ghost mask on the third. Bring qi pills.'));
      await S.say('fisherman', L('夜裡常有鬼火從島上飄過來，嚇得魚都不上鉤。', 'At night ghost-fires drift over from the isle. Even the fish won\'t bite.'));
    }, { walk: 1 }),
    C: P('woman', async (S) => { await S.say('woman', L('幽冥殿裡有一把龍吟刀，是當年被教主奪走的。', 'In the Netherworld Hall lies the Dragon Song Dao; the sect master took it long ago.')); }, { walk: 1 }),
  },
};

// ================================================================= dungeons
// 黑風林 Black Wind Woods: two floors of forest maze; 瘦猴 waits deep inside
const hfl1 = {
  name: L('黑風林', 'Black Wind Woods'), theme: 'forest', music: 'dungeon', floor: ',', enc: 'heifenglin', rate: 1 / 16,
  rows: [
    '""""""""""""""""""""""""',
    '",,,,,"",,,,,,,"",,,,,1"',
    '",""",,,,""""",,,,""",,"',
    '",",,,"",,,,,",""",,,,"',
    '",",""",,"",,,,,,",""""',
    '",,,,,,,,","""",""",,,"',
    '""""",""",",,,,,,,,,","',
    '",c,,,,,",",""""""",","',
    '",,""""",,,,"",,,,,,,,"',
    '",,,,,,,""",,,,,""",,,"',
    '"""",,,,,,,,""",,,,,"""',
    '",,,,""""",,,,,,,""",c"',
    '",""",,,,,,,""",,,,,,,"',
    '",,,,,,"",,,,,,,""",,,"',
    '"""""""""y,,,,""""""""""',
    '         ",,,,"         ',
  ],
  start: [11, 15],
  notes: { '9,14': L('樵夫釘的木牌：「林中岔路多，碰到死路就回頭。往深處的路在東北角。」', 'A woodcutter\'s board: "Many forks here. Hit a dead end, turn back. The way deeper is the north-east corner."') },
  chests: [{ item: 'herb' }, { gold: 40 }],
  links: { 1: ['hfl2', 1] },
};
const hfl2 = {
  name: L('黑風林深處', 'Heart of the Woods'), theme: 'forest', music: 'dungeon', floor: ',', enc: 'heifenglin', rate: 1 / 16,
  rows: [
    '""""""""""""""""""""',
    '",,,,,,,,,"",,,,c,"',
    '",""""",,,,,,,""",,"',
    '",",,,,,""""",,,,,"',
    '",",""z""",,,,,"",,"',
    '",",",,,",,""",,,,"',
    '",,,,,,,,,,",,,",""',
    '""""",""",,,,,,,,,"',
    '",c,,,,,,,,"""",,1"',
    '""""""""""""""""y"""',
  ],
  notes: { '16,9': L('歪歪扭扭的字：「瘦猴大爺的窩，往西！閒人勿近！」', 'Scrawled letters: "Lord Skinny Monkey\'s den, THAT WAY (west)! Keep out!"') },
  chests: [{ item: 'c1' }, { item: 'wing' }],
  links: { 1: ['hfl1', 1] },
  boss: { id: 'shouhou', flag: 'token', s: 'shouhou',
    pre: [['shouhou', L('嘿嘿嘿，龍門家的大少爺？你弟弟可值錢啦！', 'Heh heh, the young master of Longmen? Your brother is worth good money!')],
          ['shouhou', L('想要令牌？先問問我這把小刀！', 'Want the token? Ask my little knife first!')]],
    post: [['shouhou', L('別打了別打了！令牌給你！', 'Stop, stop! Take the token!')],
           ['shouhou', L('你弟弟關在寨子最上頭……老大說，有人出大價錢要那小子。', 'Your brother is locked at the top of the fort... the boss says someone is paying big money for the boy.')]],
    give: 'token' },
};

// 黑風寨 Black Wind Fort: the yard (刀疤 guards the inner gate), the hall upstairs (黑熊) and the cells
const fort1 = {
  name: L('黑風寨', 'Black Wind Fort'), theme: 'fort', music: 'dungeon', floor: '.', enc: 'fort', rate: 1 / 18,
  rows: [
    'xxxxxxxxxxxxxxxxxxxxxxxx',
    'x......x....1....x.....x',
    'x.&..c.x.........x..c..x',
    'x......x...ooooo.x.....x',
    'x..xxxxx...ooooo.xxxx..x',
    'x..........ooooo.......x',
    'x..xxxx....oozoo...xx..x',
    'x..x..x............x...x',
    'x..x..x..&......&..x.r.x',
    'x.....x............x...x',
    'x..xxxx..xxxx.xxxxxx...x',
    'x.r......x.......x.....x',
    'x........x...c...x.....x',
    'xxxxxxxxxy...g...xxxxxxx',
    '         x.......x      ',
    '         xxxx.xxxx      ',
  ],
  start: [13, 15],
  notes: { '9,13': [L('寨規告示：「一、牢房鑰匙由刀疤保管。二、樓上大堂（北邊樓梯）閒人免進。三、偷喝老大的酒者，罰洗茅房。」', 'Fort rules: "1. Scar keeps the cell key. 2. No loitering in the hall upstairs (north stairs). 3. Anyone caught drinking the boss\'s wine cleans the latrines."')] },
  chests: [{ gold: 80 }, { item: 'herb' }, { item: 'a1' }],
  links: { 1: ['fort2', 1] },
  boss: { id: 'daoba', flag: 'cellkey', s: 'daoba', guard: 1,
    pre: [['daoba', L('能走到這裡，算你有兩下子。', 'Getting this far means you have some skill.')],
          ['daoba', L('可惜，刀疤的刀，從來不留活口。', 'Pity. Scar\'s blade never leaves anyone standing.')]],
    post: [['daoba', L('……好刀法。', '...Fine swordwork.')],
           ['daoba', L('牢房鑰匙拿去。老大在樓上，他可不像我這麼好說話。', 'Take the cell key. The boss is upstairs, and he\'s not as easy to talk to as me.')]],
    give: 'cellkey' },
};
const fort2 = {
  name: L('黑風寨大堂', 'Hall of the Fort'), theme: 'fort', music: 'dungeon', floor: 'o', enc: 'fort', rate: 1 / 20,
  rows: [
    'hhhhhhhhhhhhhhhhhhhhhh',
    'h.ooo.h.....&ooooo&ooh',
    'h.oSo.g....oooozoooooh',
    'h.....y....mmmmmmmmmoh',
    'hhhhhhh....mmmmmmmmmoh',
    'h..........mmmmmmmmmoh',
    'h.c...t....mmmmmmmmmoh',
    'h.....t.......mm....oh',
    'h&....hhhhhh..mm..c.oh',
    'h1....h....h..mm....oh',
    'hhhhhhhhhhhhhhhhhhhhhh',
  ],
  notes: { '6,3': L('門邊的木牌：「牢房。肉票關這裡，鑰匙找刀疤。」', 'A board by the door: "CELLS. Hostages in here. Key: ask Scar."') },
  chests: [{ item: 'herb' }, { gold: 120 }],
  links: { 1: ['fort1', 1] },
  boss: { id: 'heixiong', flag: 'fortDone', s: 'heixiong',
    pre: [['heixiong', L('哈哈哈！龍門的小子，你弟弟踢球踢碎了我三個酒罈！', 'Ha ha ha! Longmen boy, your brother kicked his ball through three of my wine jars!')],
          ['heixiong', L('來，讓黑熊看看你的刀有幾斤重！', 'Come! Let the Black Bear see how heavy your blade is!')]],
    post: [['heixiong', L('痛快！老子輸了。', 'What a fight! I lose.')],
           ['heixiong', L('實話告訴你：是一個戴鬼面的人出錢要那小子，說是幽冥教要的。那人一直問他的球。', 'The truth: a man in a ghost mask paid us to take the boy. Said the Netherworld Sect wanted him. He kept asking about the ball.')],
           ['heixiong', L('河上的渡口，也是鬼面人要我們封的。好漢不做虧心事——渡口，老子這就讓人撤了。', 'He also had us close the ferry. A real man pays his debts: I\'ll call my boys off the river now.')]] },
  // the cell (S marks 奕碩) opens with the cell key
  people: {
    S: P('yishuo', async (S) => {
      if (S.flag('shuoFree')) return;
      await S.say('yishuo', L('哥！我就知道你會來！', 'Brother! I knew you\'d come!'));
      await S.say('yishuo', L('他們一直要我的球，我死都不給！……我們回家吧。', 'They kept wanting my ball. I\'d never give it to them! ...Let\'s go home.'));
      S.set('shuoFree'); S.follow('yishuo');
      await S.say(null, L('奕碩跟在你身後。帶他回龍門鎮吧。', 'Yi Shuo follows you. Take him home to Longmen Town.'));
    }, { notFlag: 'shuoFree' }),
  },
  gates: { 'cellkey': 1 },
};

// 水月洞 Moonwater Cave: a wet cave on the lake
const sy1 = {
  name: L('水月洞', 'Moonwater Cave'), theme: 'sea', music: 'dungeon', floor: '.', enc: 'shuiyue', rate: 1 / 16,
  rows: [
    '##########################',
    '#....~~~~....#.....#....1#',
    '#.c..~~~~....#..#..#.##..#',
    '#....~~~~.##.#..#.....#..#',
    '#.##.eeee.#......####.#..#',
    '#.#.......#.~~~..#....#..#',
    '#.#.####..#.~~~..#.####..#',
    '#...#..#....~~~..........#',
    '###.#..####.eee.#####.####',
    '#...#.......~~~.....#.~~~#',
    '#.###.~~~~..~~~..c..#..~~#',
    '#.....~~~~..........#....#',
    '###########y..############',
    '           #..#           ',
  ],
  start: [12, 13],
  notes: { '11,12': L('漁民刻在石上的字：「洞分兩層，往深處的路在東北角。東南深潭住著江蛟，莫去惹牠。」', 'Words a fisherman cut in the stone: "Two levels. The way down is the north-east corner. A river jiao lives in the deep pool to the south-east: leave it alone."') },
  chests: [{ item: 'antidote' }, { item: 'herb' }],
  links: { 1: ['sy2', 1] },
  beasts: [{ id: 'bx_jiao', flag: 'jiaoDone', x: 22, y: 10, give: 'a3',
    pre: [[null, L('潭水翻起白浪，一條青鱗長鬚的江蛟昂起了頭。', 'The pool churns white. A green-scaled river jiao with long whiskers lifts its head.')]],
    ask: L('要和江蛟交手嗎？', 'Fight the river jiao?'),
    post: [[null, L('江蛟長嘯一聲，沉回潭底。水面上浮起一副鐵鱗甲。', 'The jiao gives a long cry and sinks back into the pool. An iron-scale coat floats up to the surface.')]] }],
};
const sy2 = {
  name: L('水月洞深處', 'Moonwater Grotto'), theme: 'sea', music: 'dungeon', floor: '.', enc: 'shuiyue', rate: 1 / 16,
  rows: [
    '######################',
    '#~~~~~~~~~~~~~~~~~~~~#',
    '#~~~~~~~..z..~~~~~~~~#',
    '#~~~~~~~.....~~~~~~~~#',
    '#~~~~~~~~eee~~~~~~~~~#',
    '#..c.....:::.......c.#',
    '#.####.#.:::.#.####..#',
    '#.#....#.....#....#..#',
    '#.#.####.###.####.#..#',
    '#1...................#',
    '######################',
  ],
  chests: [{ item: 'a2' }, { gold: 200 }],
  links: { 1: ['sy1', 1] },
  boss: { id: 'b_yaoji', flag: 'yaojiDone', art: 'bx_fox',
    pre: [[null, L('洞裡傳來幽幽的歌聲……一個白衣女子從水面升起。', 'A faint song echoes through the cave... a woman in white rises from the water.')],
          [null, L('「又一個……來陪我的人……」', '"Another one... come to keep me company..."')],
          [null, L('水面映出的不是女子的影子——是一隻九條尾巴的金毛狐狸！', 'The reflection on the water is no woman\'s: it is a golden fox with nine tails!')]],
    post: [[null, L('九尾狐化作一陣水霧，散了。洞裡的歌聲停了。', 'The nine-tailed fox dissolves into mist. The singing stops.')]] },
};

// 千佛塔 Thousand Buddha Tower: five small floors; the Golden Arhat at the top
const T = (rows, extra = {}) => ({ name: L('千佛塔', 'Thousand Buddha Tower'), theme: 'tower', music: 'tower', floor: ':', enc: 'tower', rate: 1 / 16, rows, ...extra });
const t1 = T([
  '###############',
  '#u:::::::::::u#',
  '#:###:###:###:#',
  '#:#c:::#:::#:1#',
  '#:#:###:###:#:#',
  '#:::#:::::#:::#',
  '###:#:#u#:#:###',
  '#:::::#:#:::::#',
  '#:#####:#####:#',
  '#:::::::::::::#',
  '#####y:::######',
  '     #:::#     ',
], { start: [7, 11], chests: [{ item: 'herb' }], links: { 1: ['t2', 1] },
  notes: { '5,10': L('寺中石碑：「塔分五層，梯分東西，層層相間。頂層金身羅漢，護持天符。」', 'A temple stele: "Five floors; the stairs alternate east and west. On the top, the Golden Arhat guards the Heaven Seal."') } });
const t2 = T([
  '###############',
  '#2:::#:::::#::#',
  '#:##:#:###:#:##',
  '#:#::::#c#::::#',
  '#:#:##:#:#:##:#',
  '#:::#::::::#::#',
  '###:#:####:#:##',
  '#:::#:::::::::#',
  '#:#####:#####:#',
  '#:::::::::::::1',
  '###############',
], { chests: [{ item: 'qipill' }], links: { 1: ['t1', 1], 2: ['t3', 2] } });
const t3 = T([
  '###############',
  '#2::::::#:::::#',
  '###:###:#:###:#',
  '#:::#c#:::#:::#',
  '#:###:#####:###',
  '#:::::::::::::#',
  '###:###:###:#:#',
  '#:::#:::#:::#:#',
  '#:###:###:###:#',
  '#:::::::::::::3',
  '###############',
], { enc: 'tower2', chests: [{ item: 'c3' }], links: { 2: ['t2', 2], 3: ['t4', 3] } });
const t4 = T([
  '###############',
  '#4::::#:::::::#',
  '#:###:#:#####:#',
  '#:#:::#:#:::#:#',
  '#:#:###:#:#:#:#',
  '#:#:::::#:#:::#',
  '#:#####:#:###:#',
  '#:::::#:::#c#:#',
  '#####:#####:#:#',
  '#:::::::::::::3',
  '###############',
], { enc: 'tower2', chests: [{ gold: 300 }], links: { 3: ['t3', 3], 4: ['t5', 4] },
  beasts: [{ id: 'bx_lion', flag: 'lionDone', x: 11, y: 8, give: 'c4',
    pre: [[null, L('寶箱前蹲著一隻長滿青苔的石獅。你一走近，牠的眼睛亮起了紅光。', 'A moss-grown stone lion crouches before the chest. As you come near, its eyes glow red.')]],
    ask: L('要和石獅交手嗎？', 'Fight the stone lion?'),
    post: [[null, L('石獅的紅光熄了，口中的石珠滾落下來——裡面裹著一副金絲護腕。', 'The red light in the lion\'s eyes dies; the stone ball rolls from its mouth, and inside is a gold-thread bracer.')]] }] });
const t5 = T([
  '###############',
  '#u:::::::::::u#',
  '#:::::&z&:::::#',
  '#:::::::::::::#',
  '#u::i:::::i::u#',
  '#:::::mmm:::::#',
  '#:::::mmm:::::#',
  '#u::i:mmm:i::u#',
  '#:::::mmm::::4#',
  '###############',
], { enc: null, links: { 4: ['t4', 4] },
  boss: { id: 'b_luohan', flag: 'luohanDone', art: 'b_luohan',
    pre: [[null, L('塔頂的金色佛像緩緩睜開了眼睛。', 'The golden statue at the top of the tower slowly opens its eyes.')],
          [null, L('「欲取天符，先過此關。」', '"Who would take the Heaven Seal must first pass me."')]],
    post: [[null, L('金身羅漢合十退回蓮座。你在蓮座前取得了天符。', 'The Golden Arhat bows and returns to its lotus throne. Before it, you find the Heaven Seal.')]],
    give: 'tian' } });

// 沙海古墓 Sand Sea Tomb: dark (needs the lantern) and full of locked doors
const TB = (rows, extra = {}) => ({ name: L('沙海古墓', 'Sand Sea Tomb'), theme: 'tomb', music: 'dungeon', floor: '.', enc: 'tomb', rate: 1 / 15, dark: 1, rows, ...extra });
const tb1 = TB([
  '#########################',
  '#.....#.......d......#..1#',
  '#.q.q.#.#####.#.####.#.#.#',
  '#.....d.#...#.#.#..#...#.#',
  '#.q.q.#.#.c.#...#..#####.#',
  '#######.#...#####.......#.',
  '#.......#.....#...#####.#.#',
  '#.#####.#####.#.#.#...#.#.#',
  '#.#...#.......#.#...#.#...#',
  '#.#.c.###d#####.#####.###.#',
  '#.#.......#.....#.........#',
  '#.#########.###.#.#######.#',
  '#...........#.....#.......#',
  '###########y...############',
  '           #...#           ',
], { start: [13, 14], chests: [{ item: 'key' }, { gold: 250 }], links: { 1: ['tb2', 1] },
  notes: { '11,13': [L('盜墓賊用炭寫在牆上：「墓有三層。下樓的梯：先東北角，再東南角。主墓道不必開鎖，鎖著的是耳室。」', 'A grave robber\'s charcoal on the wall: "Three levels. Stairs down: first the north-east corner, then the south-east. The main way needs no key; the locks are on the side chambers."'),
    L('底下還有一行小字：「將軍……會跳。帶解毒草。」', 'Below, smaller: "The general... hops. Bring antidotes."')] } });
const tb2 = TB([
  '#########################',
  '#1....#.......#.........#',
  '#.###.#.#####.#.#######.#',
  '#.#...#.#q..#...#.....#.#',
  '#.#.###.d...#####.###.#.#',
  '#.#...d.#.c.#...d.#c#.#.#',
  '#.###.#.#####.#.#.#.#.#.#',
  '#...#.#.......#.#...#...#',
  '###.#.#########.#########',
  '#...#.........#.........#',
  '#.#########.#.#.#######.#',
  '#.#q.q.q.q#.#...#.c...d.#',
  '#.#.......d.#####.....#2#',
  '#.......................#',
  '#########################',
], { chests: [{ item: 'key' }, { item: 'a5' }, { item: 'herb' }], links: { 1: ['tb1', 1], 2: ['tb3', 2] } });
const tb3 = TB([
  '###################',
  '#q.q.q.q.q.q.q.q.q#',
  '#.................#',
  '#..i...&.z.&...i..#',
  '#........m........#',
  '#..i.....m.....i..#',
  '#........m........#',
  '#.q......m......q.#',
  '#..i.....m.....i..#',
  '##d######m######d##',
  '#.c.#....m....#.c.#',
  '#...#....m....#...#',
  '#########2#########',
], { enc: 'tomb', chests: [{ item: 'qipill' }, { gold: 500 }], links: { 2: ['tb2', 2] },
  boss: { id: 'b_jiangjun', flag: 'jiangjunDone', art: 'bx_jiangshi',
    pre: [[null, L('石棺蓋轟然落地。一具穿紫色官服、額貼黃符的殭屍直挺挺地跳了出來！', 'A coffin lid crashes to the floor. A corpse in purple court robes, a yellow talisman on its brow, springs upright!')],
          [null, L('「……擅闖……將軍墓者……死……」', '"...Who trespasses... in the general\'s tomb... dies..."')]],
    post: [[null, L('殭屍將軍倒下，再也沒有起來。它的手中緊握著地符。', 'The Jiangshi General falls and does not rise. In its fist is the Earth Seal.')]],
    give: 'di' } });

// 龍脊洞 Dragonspine Caves and the peak where 冷笑天 waits
const lj1 = {
  name: L('龍脊洞', 'Dragonspine Caves'), theme: 'ice', music: 'dungeon', floor: 'n', enc: 'longji', rate: 1 / 15,
  rows: [
    '#########################',
    '#nnnn#nnnnnnnnn#nnnnnnn1#',
    '#n##n#n#######n#n#####n##',
    '#n#nnnn#^^^^^#nnn#nnn#nn#',
    '#n#####n#^^^^#####n#n#nn#',
    '#nnnnn#n#^^c^#nnnnn#n#nn#',
    '#####n#n#^^^^#n#####n#nn#',
    '#nnnnn#nnnnnnnnnnnnnn#nn#',
    '#n#############n#n#####n#',
    '#nnnnnnncnnnnnnnnnnnnnnn#',
    '########ynn###############',
    '        #nn#             ',
  ],
  start: [10, 11],
  notes: { '8,10': L('獵人刻的記號：「洞兩層，出口都在東邊。冰面滑，冰窟裡藏著寶箱。上頭的人脾氣壞，別空手上去。」', 'A hunter\'s marks: "Two levels, both exits on the east. The ice is slick; there are chests in the ice hollows. The man up top has a foul temper: don\'t go up unprepared."') },
  chests: [{ item: 'qipill' }, { item: 'herb' }],
  links: { 1: ['lj2', 1] },
};
const lj2 = {
  name: L('龍脊洞上層', 'Upper Caves'), theme: 'ice', music: 'dungeon', floor: 'n', enc: 'longji', rate: 1 / 15,
  rows: [
    '#######################',
    '#1nnnnnn#nnnnnnnn#nnnn#',
    '#######n#n######n#n##n#',
    '#nnnnnnn#n#^^^^#nnn#nn#',
    '#n#######n^^^c^#####nn#',
    '#nnnnnnnnn#^^^^#nnnnnn#',
    '#########n######n######',
    '#nnncnnnnnnnnnnnnnnnn2#',
    '#######################',
  ],
  chests: [{ item: 'c5' }, { gold: 600 }],
  links: { 1: ['lj1', 1], 2: ['peak', 2] },
};
const peak = {
  name: L('龍脊峰頂', 'Dragonspine Summit'), theme: 'snowpeak', music: 'dungeon', floor: 'n', enc: null,
  rows: [
    'vvvvvvvvvvvvvvvvvvv',
    'vvvvvvnnnnnnnvvvvvv',
    'vvvvnnnnnznnnnnvvvv',
    'vvvnnnrnnnnnrnnnvvv',
    'vvnnnnnnnnnnnnnnnvv',
    'vvnnrnnnnnnnnnrnnvv',
    'vvvnnnnnnnnnnnnnvvv',
    'vvvvnnnnnnn2nnnvvvv',
    'vvvvvvvvvvvvvvvvvvv',
  ],
  links: { 2: ['lj2', 2] },
  boss: { id: 'xiaotian', flag: 'xiaotianDone', s: 'xiaotian',
    pre: [['xiaotian', L('嘿……嘿……哈哈哈！龍門刀莊的小子，爬到這裡來送死？', 'Heh... heh... ha ha ha! A pup of the Longmen Saber Manor, climbing all this way to die?')],
          ['xiaotian', L('人符？在我這裡。想要，就從冷笑天手上拿。', 'The Mortal Seal? I have it. If you want it, take it from Leng Xiaotian\'s hand.')]],
    post: [['xiaotian', L('……哼。你這一刀，有點意思。', '...Hmph. That cut of yours is worth something.')],
           ['xiaotian', L('符，拿去。幽冥教那群裝神弄鬼的東西，我也看不順眼。', 'Take the seal. I can\'t stand those ghost-mask charlatans either.')],
           ['xiaotian', L('別死在那裡——我還要找你，再打一場。', 'Don\'t die over there. I mean to fight you again.')]],
    give: 'ren' },
};

// 藏劍窟 Hidden Blade Grotto (optional, in the south-west forest)
const cangjian = {
  name: L('藏劍窟', 'Hidden Blade Grotto'), theme: 'cave', music: 'dungeon', floor: '.', enc: 'cangjian', rate: 1 / 15,
  rows: [
    '#######################',
    '#...#.......#.....#...#',
    '#.#.#.#####.#.###.#.#.#',
    '#.#...#...#...#c#...#.#',
    '#.#####.#.#####.#####.#',
    '#.......#.....u.....#.#',
    '#.#####.#####.###.#.#.#',
    '#.#c..#.....#...#.#...#',
    '#.#...#####.###.#.#####',
    '#.....#.........#.....#',
    '##########...##########',
    '         #...#         ',
  ],
  start: [11, 11],
  chests: [{ item: 'w6' }, { item: 'c2' }],
  people: {},
  beasts: [{ id: 'bx_ape', flag: 'apeDone', x: 5, y: 7, give: 'fruit',
    pre: [[null, L('石室裡蹲著一隻白毛長臂的大猿，懷裡護著一顆紅通通的果子。', 'In the chamber squats a great long-armed white ape, guarding a bright red fruit.')]],
    ask: L('要向白猿討教嗎？', 'Challenge the white ape?'),
    post: [[null, L('白猿收了手，打量你半晌，把朱果遞了過來。', 'The ape lowers its arms, studies you a long while, and hands you the crimson fruit.')]] }],
  tablet: L('石壁上刻著：「刀藏於鞘，鋒藏於心。」', 'Carved in the rock: "The blade hides in its sheath; the edge hides in the heart."'),
};

// 幽冥殿 Netherworld Hall: the lair on the isle
const LR = (rows, extra = {}) => ({ name: L('幽冥殿', 'Netherworld Hall'), theme: 'lair', music: 'lair', floor: '.', enc: 'lair', rate: 1 / 14, rows, ...extra });
const l1 = LR([
  '#########################',
  '#&.....#.....1.....#....&#',
  '#.###..#..i.....i..#..#..#',
  '#.#c#..#...........#..#..#',
  '#.#.####..i.....i..####..#',
  '#...........mmm..........#',
  '####.#####..mmm..#####.###',
  '#....#...#..mmm..#...#...#',
  '#.####.#.#..mmm..#.#.###.#',
  '#......#....mmm....#....c#',
  '##########y.mmm.##########',
  '          #.mmm.#         ',
], { start: [13, 11], chests: [{ item: 'herb' }, { item: 'qipill' }], links: { 1: ['l2', 1] },
  notes: { '10,10': L('幽冥教的黑石碑：「四重殿。一殿北上，二殿東北，三殿護法，四殿教主。擅入者死。」', 'A black stele of the sect: "Four halls. North from the first, north-east from the second; the warden in the third, the master in the fourth. Trespassers die."') } });
const l2 = LR([
  '#########################',
  '#1....#...........#....2#',
  '#####.#.#########.#.#####',
  '#.....#.#.......#.#.....#',
  '#.#####.#.##c##.#.#####.#',
  '#.#.....#.#...#.#.....#.#',
  '#.#.#####.#.u.#.#####.#.#',
  '#.#.......#...#.......#.#',
  '#.#########.d.#########.#',
  '#.......................#',
  '#########################',
], { chests: [{ item: 'w5' }], links: { 1: ['l1', 1], 2: ['l3', 2] } });
const l3 = LR([
  '#####################',
  '#2..&.........&....3#',
  '#.#################.#',
  '#.#&.....mmm.....&#.#',
  '#.#......mmm......#.#',
  '#.#..i...mzm...i..#.#',
  '#.#......mmm......#.#',
  '#.#####..mmm..#####.#',
  '#........c.c........#',
  '#####################',
], { chests: [{ item: 'herb' }, { item: 'qipill' }], links: { 2: ['l2', 2], 3: ['l4', 3] },
  boss: { id: 'b_hufa', flag: 'hufaDone', s: 'guimian', guard: 1,
    pre: [[null, L('一個戴著鬼面的高大身影擋在路中央。', 'A tall figure in a ghost mask blocks the way.')],
          ['guimian', L('教主有令：龍門的人，一個也不許過去。', 'The master\'s orders: no one from Longmen passes.')]],
    post: [[null, L('鬼面護法跪倒在地，面具裂成兩半。', 'The warden falls to his knees; his mask splits in two.')]] } });
const l4 = LR([
  '###################',
  '#&...i...&...i...&#',
  '#.................#',
  '#....mmmmmmmmm....#',
  '#....mmmmzmmmm....#',
  '#....mmmmmmmmm....#',
  '#i...mmmmmmmmm...i#',
  '#.......mmm.......#',
  '#&......mmm......&#',
  '#.......mmm......3#',
  '###################',
], { enc: null, music: 'lair', links: { 3: ['l3', 3] },
  boss: { id: 'tuqianqiu', flag: 'tuDone', s: 'tuqianqiu', final: 1,
    pre: [['tuqianqiu', L('龍門刀莊的後人……三十年了，江湖還是只會派孩子來送死。', 'An heir of the Longmen Saber Manor... thirty years, and the jianghu still sends children to die.')],
          ['tuqianqiu', L('你弟弟那顆球裡藏著什麼，你知道嗎？……不，你什麼都不知道。', 'Do you know what hides inside your brother\'s ball? ...No. You know nothing.')],
          ['tuqianqiu', L('也好。帶著你的無知，到幽冥去吧。', 'Good. Take your ignorance with you into the dark.')]],
    post: [['tuqianqiu', L('……好一把……龍門刀……', '...What a... Longmen blade...')],
           [null, L('屠千秋的身影化作黑霧。整座幽冥殿開始搖晃——', 'Tu Qianqiu\'s form dissolves into black mist. The whole hall begins to shake...')]] } });

export const MAPS = { longmen, qingshi, linjiang, nanling, hanjiang, qianfo, chisha, wanghai,
  hfl1, hfl2, fort1, fort2, sy1, sy2, t1, t2, t3, t4, t5, tb1, tb2, tb3, lj1, lj2, peak, cangjian, l1, l2, l3, l4 };

// overworld places: which map each opens, and its look on the world map
export const PLACES = {
  longmen:    { map: 'longmen', look: 'town', name: longmen.name },
  qingshi:    { map: 'qingshi', look: 'village', name: qingshi.name },
  heifenglin: { map: 'hfl1', look: 'grove', name: hfl1.name },
  fort:       { map: 'fort1', look: 'fort', name: fort1.name },
  linjiang:   { map: 'linjiang', look: 'village', name: linjiang.name },
  nanling:    { map: 'nanling', look: 'city', name: nanling.name },
  hanjiang:   { map: 'hanjiang', look: 'pavilion', name: hanjiang.name },
  shuiyue:    { map: 'sy1', look: 'cave', name: sy1.name },
  qianfo:     { map: 'qianfo', look: 'temple', name: qianfo.name },
  tower:      { map: 't1', look: 'tower', name: L('千佛塔', 'Thousand Buddha Tower') },
  chisha:     { map: 'chisha', look: 'desertfort', name: chisha.name },
  tomb:       { map: 'tb1', look: 'tomb', name: L('沙海古墓', 'Sand Sea Tomb') },
  longji:     { map: 'lj1', look: 'cave', name: lj1.name },
  wanghai:    { map: 'wanghai', look: 'village', name: wanghai.name },
  lair:       { map: 'l1', look: 'lair', name: L('幽冥殿', 'Netherworld Hall') },
  cangjian:   { map: 'cangjian', look: 'cave', name: cangjian.name },
};
// the first floor of each dungeon knows its place (so leaving puts you back outside)
for (const [pid, p] of Object.entries(PLACES)) MAPS[p.map].place = pid;
const FLOORS = { hfl2: 'heifenglin', fort2: 'fort', sy2: 'shuiyue', t2: 'tower', t3: 'tower', t4: 'tower', t5: 'tower', tb2: 'tomb', tb3: 'tomb', lj2: 'longji', peak: 'longji', l2: 'lair', l3: 'lair', l4: 'lair' };
for (const [m, pid] of Object.entries(FLOORS)) MAPS[m].place = pid;
// rows typed a little ragged are padded to the widest row with the row's own first character
for (const m of Object.values(MAPS)) { const w = Math.max(...m.rows.map((r) => r.length)); m.rows = m.rows.map((r) => r.padEnd(w, r[0] === ' ' ? ' ' : r[0])); m.w = w; m.h = m.rows.length; }
export const TOWNS = ['longmen', 'qingshi', 'linjiang', 'nanling', 'hanjiang', 'qianfo', 'chisha', 'wanghai'];
for (const t of TOWNS) MAPS[t].town = 1;
