# Credits

龍門刀客傳 Longmen Quest is an original game. Its story, characters, maps, dialogue, battle system, art, music and code were made for it. It is a genre take on 8-bit console RPGs and uses none of their names, monsters, music, text or interface art.

## Art (original)
- **People:** the ten 龍門武林 characters (奕叡, 奕碩, 白先生, 柳寒煙, 苦禪, 冷笑天, 黑熊, 刀疤, 瘦猴, 屠千秋) come from the Character Gallery (ywchen0711/character-gallery), `nes` style. They are original hand-typed 8-bit pixel art in the manner of Famicom portraits.
- **Townsfolk, the hero's back view and the 40 enemies and boss variants:** hand-typed NES-palette pixel grids, written for this game (`tools/people.py`, `tools/enemies.py`).
- **Map textures, trees, props and the 3D place models:** drawn in code from NES palette colours (`js/tiles.js`, `js/view.js`).

## Music and sound (original)
- **Soundtrack:** composed for this game and rendered by an NES-style synth in `tools/music.py` (two pulse channels, a triangle and noise). The tracks are:
  - 龍門刀客傳 · Ballad of the Longmen Blade
  - 客棧炊煙 · Cookfire Smoke over the Inn Street
  - 千里關山 · A Thousand Li of Mountain Passes
  - 幽谷迷蹤 · Lost Trail in the Dark Vale
  - 千佛塔鐘 · Bells of the Thousand-Buddha Tower
  - 刀光劍影 · Flash of Blade and Sword
  - 魔頭現身 · The Demon Chief Appears
  - 幽冥殿 · Hall of the Netherworld
  - 天魔決戰 · Duel with the Heavenly Demon
  - 江湖路遠 · Long Is the Road of the Jianghu
  - six jingles
- **Sound effects:** synthesised in the browser with Web Audio.

## Third-party
- **Cubic 11 (俐方體11號)** by ACh-K and contributors, SIL Open Font License 1.1 (`fonts/Cubic_11-LICENSE.txt`). It includes glyphs from JF Dot M+H 12 and the M+ bitmap fonts.
- **three.js r160** and its post-processing examples (EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass), © three.js authors, MIT License.
