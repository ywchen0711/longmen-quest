# 龍門刀客傳 Longmen Quest

An original 8-bit wuxia role-playing game about the size of the first 8-bit console RPGs. It is a side story of 《龍門雙奕》 (the Longmen Twins).

- Characters, enemies and tiles are Famicom-style 8-bit art. Every sprite uses only NES (2C02) palette colours.
- It is played in a pop-up storybook (three.js). The world is a big open book lying on a wooden table:
  - The map is the open double page. The ground tiles are printed flat on cream paper, with paper grain, a soft shadow down the centre gutter, page edges, the stack of pages and the red cloth cover at the borders, and the table round it. Caves and dungeons are printed on dark card (charcoal, indigo, plum).
  - Everything that stands up is a cardboard pop-up: trees, rocks, mountains, waves, walls, houses (a facade with a roof flap), furniture (a face with a lid), signs, people and beasts. Each is a die-cut piece of the pixel art on a white paper border, with a visible card thickness, a little folded tab at its hinge and a soft shadow on the page.
  - Pieces near the edge of the view unfold up from flat as you come near (with a little overshoot) and fold down when you leave. People hop on their tab as they walk.
  - Going into a town, a cave or back out to the world turns the page: the pop-ups fold flat, the page lifts and turns over, and the new ones rise.
  - Water is printed blue with cut-out paper waves that bob. In dark places your lantern is a warm light.
  - A warm desk lamp lights the book from one side, with a light tilt-shift blur like a photo of a real pop-up book.
- The camera looks down on the open book from far enough to see a good stretch of the map round you.
- Battles are a pop-up spread: layered cut-out scenery, the foe's picture a card that rises from the bottom of the page on its hinge, and 奕叡 himself (his back-view sprite as a card) in the lower-left foreground. Every exchange shows who strikes and who is struck:
  - The target is boxed by blinking corner marks: yellow round the foe, red round 奕叡.
  - 奕叡 attacks: his card leans back, dashes in front of the foe, and swings his ring-pommel saber (a drawn blade with a smear behind its tip). On the hit, both cards freeze for a moment, the foe's card flashes white, rocks back on its hinge and rolls, and paper scraps fly off it. A critical hit glints first and cuts there and back. On a miss the foe sidesteps and the swing goes through the air. Then he hops back.
  - The foe attacks: its card rears back and lunges at him, and its claws, jaws, weapon, arrow, magic, poison, fire or lightning land on his card. His card flashes white, then red, and is knocked back. The status note flashes red too. When he dodges, he sidesteps and the cut whistles past. When he is guarded, he blocks with the saber.
  - Damage numbers are little paper tags over the card that was hit: cream for the foe, red for 奕叡.
  - Arts and items land on the right card: qi flies from his raised hands to the foe, the pressure-point strike darts in, and heals sparkle round him.
  - A beaten foe burns away. If 奕叡 falls, his card drops flat on its back.
- Menus and messages are paper notes with torn edges, a paper clip or a strip of tape, and dark ink text. Portraits are pasted-in photos.
- The title screen is the book's cover, which opens when you start.

Play: https://ywchen0711.github.io/longmen-quest/

## The story

Bandits of the Black Wind Fort carry off 奕碩. His elder brother 奕叡 sets out alone with his father's old ring-pommel saber.

The rescue leads to the Netherworld Sect (幽冥教), a sect thought destroyed thirty years ago. Its master 屠千秋 hides on a fog-bound isle in the eastern sea. Only the three seals (Heaven, Earth and Mortal) can part the fog.

Characters:
- 白先生, the storyteller of 聽雨樓. He gives hints and keeps your records, much like a king's save point.
- 柳寒煙 of the Cold River Pavilion.
- Abbot 苦禪 of the Thousand Buddha Temple, who teaches you an art.
- 冷笑天 on Dragonspine Peak, a proud rival who respects a good blade.
- The bandits 瘦猴, 刀疤 and 黑熊.
- 屠千秋, master of the Netherworld Sect, and his 鬼面護法 (Ghost-mask Warden).
- In the towns: 鐵無私 the constable and 錢萬里 the treasurer with his clerk 溫如玉 (Nanling), the one-armed fisherman (Linjiang Ferry), 小蓮 (Cold River Pavilion) and 厲寒山 of the Blood Saber Sect (Red Sand Fort).

## How it plays

**Exploring**
- One hero on one overworld: a continent and an isle.
- There are 8 towns and villages, and 7 dungeons (caves, a fort, a tower, a dark tomb, ice caves and a summit), plus the final lair.

**Progress is gated by danger and by items**
- the fort token
- the ferry, which opens after the fort falls
- the flying rope for the broken bridge
- a lantern for the dark tomb
- bronze keys for locked doors
- the three seals that raise the causeway

**Battles**
- Random encounters lead to front-view, one-on-one turn battles.
- The commands are 攻擊 (attack), 武功 (arts), 道具 (items) and 逃走 (run).
- Arts cost 內力 (inner strength, used like MP). You learn them as you level up (up to level 20), and one more from a mentor:
  - heal and big heal
  - qi blade and Sky River Blade
  - pressure point (puts the foe to sleep)
  - seal meridians (stops the foe using arts)
  - homeward and slip away (leave a dungeon)
  - ward (keeps weak monsters away)
  - Diamond Body (from the mentor)
- There are 50 regular enemies in five tiers (the Character Gallery's common foes), a rare stone toad full of silver, and 9 bosses. Their battle pictures are the gallery's 48x56 bust portraits in the 霸王之路 style (black NES panel, like the people bosses).
- Big beasts from the gallery: the nine-tailed fox is the Moonwater Siren's true form and the talisman jiangshi is the Jiangshi General. The tiger, the shanxiao, the fire crow and the venom toad sometimes appear in the wild instead of a common foe. The white ape (Hidden Blade Grotto), the river jiao (Moonwater Cave) and the stone lion (fourth floor of the tower) guard rewards as optional fights.
- 圖鑑 (Bestiary) in the field menu lists every foe met, with its picture, home and story, and what it can drop (？？？ until you have seen it drop once).
- Bosses follow the same rules as the hero. They are tough only through their stats, the arts any fighter can use, carried wound salves and a smarter AI. Enemies do not scale to your level.
- With the extra gear the bosses got more HP and attack, so the fights stay about as hard as before.

**Gear: seven places on the body**
- 兵器 weapon, 頭 head, 衣甲 armour, 披風 cloak, 護具 bracer, 佩飾 pendant and 靴 boots.
- Weapons are sabers (dao), swords, a spear, staves and a fan. Head pieces are headbands, a brow guard, bamboo hats, helmets and crowns.
- Gear gives attack, defence, agility, max HP or max MP. Some pieces also have a simple effect that works the same for anyone: a better chance of a critical hit, a chance to shrug off poison, pressure points or sealing, or MP coming back as you walk.
- Cheap pieces are sold in the first towns and better ones further on. Some pieces come only from chests, rare drops or bosses.
- 裝備 (Equip) shows the seven places beside a paper doll of 奕叡. Moving over a piece shows every number it would change (green up, red down) and the doll wearing it. Shops show the same preview. You can also take a piece off.
- The pack holds 16 kinds of items.

**Monster drops**
- Every foe has a drop table. Common foes drop materials (pelts, venom sacs, talisman paper, iron ore, pearls, tiger bone) and supplies (8-30%), and now and then a piece of gear (2-5%). Materials are sold to any shop for silver.
- Big beasts and bosses always leave their signature piece, for example Skinny Monkey's quick boots, Scar's Soul-cutter, Black Bear's mantle, the Siren's nine-tail fox cloak, the Arhat's prayer beads, Leng Xiaotian's Cold Moon pendant and the Warden's mantle.
- A drop pops up as a paper tag where the foe stood, with a chime and a line in the battle log. If your pack is full, you choose something to drop, or leave the new item behind.

**The paper doll (紙娃娃)**
- What 奕叡 wears changes how he looks everywhere: his field sprite (all four directions and both walk frames), his card in battle (seen from behind, with the weapon he swings), the status window (a big die-cut doll with the seven places round it, plus side and back views) and his portrait in conversations (headgear and the colour of his robe).
- The doll is put together at run time (`js/doll.js`) from his own 16x24 NES sprite and small 8-bit pieces in NES colours: armour recolours his robe with a pattern (chain, scale, trim), boots recolour his feet, a headband his band; hats, helmets, crowns, cloaks, pendants, bracers and weapons are small hand-typed pixel pieces for each view. Walk frame 2 keeps the same body; only the bottom 5 rows step.
- The sprites are rebuilt only when his gear changes, so walking around costs nothing extra.
- The doll's pieces and six outfits are also in the Character Gallery (`chars/yirui/doll/`).

**Saving**
- Save with 白先生 or at any inn, in 3 record slots.
- The game also autosaves on pagehide and every 30 s, and you can continue from that on the title screen.
- Records are version 2. Older records still load: the new gear places start empty and the pack is kept.

**Languages**
- 繁體中文 (default) or English, switched on the title screen or in 設定.

**Controls**
- Keyboard: arrows or WASD to move, Z, Enter or Space for A (talk, check, confirm), X, Esc or Backspace for B (menu, cancel).
- Gamepads work.
- On touch screens an on-screen d-pad and A/B buttons appear. They sit beside the picture in landscape and under it in portrait.
- iPhone and iPad:
  - safe areas and `100dvh`
  - audio unlocked by the first tap
  - `navigator.audioSession = 'playback'`
  - AAC (`.m4a`) music, with Ogg as a fallback
  - a fixed timestep
  - automatic graphics quality (low: no post effect), and a frame-rate watchdog that lowers the resolution, then drops the post effect, then the card edges and shadows

## Speed

All the pop-ups of a map are drawn in one instanced draw call (plus one for their card edges and one for their shadows) from one texture atlas. The ground is one quad with one baked texture. There are no shadow maps and no lights: the paper shading is done in the shaders. After the scene there is one full-screen pass (a light tilt-shift and the colour grade). The map is not drawn while a menu or message is up and nothing moves, standing still draws at 30 fps, the 3D view is never rendered taller than 720 pixels (680 on phones, at most 1.25 pixels per screen point), and a watchdog steps the quality down on slow devices.

## Files

- `index.html`, `style.css`
- `js/`:
  - `main.js`: boot, title, loop and layout
  - `game.js`: field, events, menus, shops, inns, saves and story beats
  - `battle.js`, `rules.js`
  - `data.js`: levels, arts, items, enemies, zones
  - `maps.js`: towns, dungeons, people and talk scripts
  - `world_map.js`: generated by `tools/world.py`
  - `view.js` (the three.js pop-up book: printed page, instanced pop-up cards, page turns), `tiles.js` (NES-palette textures and pop-up pieces) and `paper.js` (paper grain, wood, die-cut borders and the windows' paper, all drawn in code)
  - `ui.js`, `input.js`, `audio.js`
  - `doll.js`: the paper doll; `doll_base.js` (generated) holds 奕叡's own pixels
  - `enemy_art.js`, `people_art.js` (generated)
- `assets/enemies.png`: from `tools/gallery.py` (the Character Gallery's foes and beasts, plus the Golden Arhat from `tools/enemies.py`).
- `assets/people/`: from `tools/people.py`, plus copies of the Character Gallery's 龍門武林 cast.
- `audio/`: from `tools/music.py`.
- `lib/`: three.js r160 and its post-processing addons, vendored.
- `fonts/`: Cubic 11.

Tools (Python 3, Pillow, numpy, ffmpeg):
- `python -P tools/world.py` rebuilds the overworld and checks that each place is reachable only once its gates are open.
- `python -P tools/gallery.py` rebuilds the enemy atlas and `js/enemy_art.js` (art, names and bestiary text) from `C:\CharacterGallery`.
- `python -P tools/people.py` rebuilds the people sprites, then `python -P tools/doll.py` rebuilds `js/doll_base.js` from 奕叡's sprite and portrait.
- `python tools/music.py` re-renders the chiptune soundtrack.

New named characters in this game (黑熊, 刀疤, 瘦猴, 屠千秋) are also in the Character Gallery (`C:\CharacterGallery`, `nes` style).

See CREDITS.md. Code and original art © ywchen0711, CC BY 4.0.
