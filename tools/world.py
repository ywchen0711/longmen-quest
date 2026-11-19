"""Builds the overworld of 龍門刀客傳 as text rows (js/world_map.js).

    python -P tools/world.py

The world is painted from simple shapes (ellipses, strokes, rectangles) in a fixed order, so it is the same every
time. Legend (one character per 16x16 tile):
  ~ sea / river (blocked)     . grass        f forest      h hills       M mountain (blocked)
  s desert sand               w swamp        n snow        N snow peak (blocked)
  = road                      B bridge       v chasm (blocked)            X rope bridge (needs the rope)
  D ferry dock                G bandit barricade (needs the fort token)   c sunken causeway (needs the three talismans)
Places (towns, caves, towers) stand on top of these and are listed in js/maps.js (PLACES).
"""
import os
import random

W, H = 112, 80
g = [['~'] * W for _ in range(H)]


def put(x, y, c):
    if 0 <= x < W and 0 <= y < H:
        g[y][x] = c


def ell(cx, cy, rx, ry, c, rough=0.0, seed=1, only=None):
    r = random.Random(seed)
    for y in range(int(cy - ry - 2), int(cy + ry + 3)):
        for x in range(int(cx - rx - 2), int(cx + rx + 3)):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1 + (r.random() - 0.5) * rough:
                if 0 <= x < W and 0 <= y < H and (only is None or g[y][x] in only):
                    g[y][x] = c


def rect(x0, y0, x1, y1, c, only=None):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= x < W and 0 <= y < H and (only is None or g[y][x] in only):
                g[y][x] = c


def stroke(pts, c, w=1, only=None):
    """A line through points (a river, a road); w = width in tiles."""
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            x = round(x0 + (x1 - x0) * i / n)
            y = round(y0 + (y1 - y0) * i / n)
            for dy in range(w):
                for dx in range(w):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H and (only is None or g[yy][xx] in only):
                        g[yy][xx] = c


def scatter(x0, y0, x1, y1, c, p, seed, only='.'):
    r = random.Random(seed)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if g[y][x] in only and r.random() < p:
                g[y][x] = c


# ---------------------------------------------------------------- land
ell(48, 40, 46, 37, '.', rough=0.25, seed=3)          # the main continent
ell(20, 66, 14, 9, '.', rough=0.3, seed=5)             # south-west peninsula
ell(84, 66, 14, 11, '.', rough=0.2, seed=7)            # south-east (desert later)
ell(86, 14, 14, 11, '.', rough=0.2, seed=9)            # north-east (snow later)
ell(104, 42, 7, 10, '.', rough=0.25, seed=11)          # 幽冥島 the Netherworld Isle
rect(95, 41, 99, 47, '~')                               # a strait between the cape and the isle
ell(10, 40, 6, 9, '.', rough=0.3, seed=13)              # west coast bulge
ell(30, 8, 22, 6, '.', rough=0.2, seed=15)              # north coast


def smooth(times=2):
    for _ in range(times):
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                n = sum(g[y + dy][x + dx] != '~' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                if g[y][x] != '~' and n <= 1:
                    g[y][x] = '~'
                elif g[y][x] == '~' and n >= 3:
                    g[y][x] = '.'


smooth(3)
rect(0, 0, W - 1, 1, '~'); rect(0, H - 2, W - 1, H - 1, '~'); rect(0, 0, 1, H - 1, '~'); rect(W - 2, 0, W - 1, H - 1, '~')

# ---------------------------------------------------------------- the northern range and the bandit basin
ell(30, 8, 23, 7, 'M', rough=0.35, seed=21, only='.')
rect(8, 2, 47, 6, 'M', only='.')                        # the range runs into the north sea
ell(36, 9, 9, 5.5, 'M', seed=24)                        # a solid wall round the basin
ell(36, 9, 6, 3.2, '.', seed=22)                        # the basin where 黑風寨 stands
stroke([(31, 12), (31, 16)], '.', 2)                    # the pass up from 黑風林
put(31, 14, 'G'); put(32, 14, 'G')                      # the barricade
ell(12, 18, 6, 5, 'M', rough=0.4, seed=23)
# ---------------------------------------------------------------- the river 青龍河: north to south, then east, then south to the sea
stroke([(48, 0), (48, 20), (47, 34), (48, 47), (48, 60), (49, 80)], '~', 2)
# ---------------------------------------------------------------- west: forest of 黑風林, hills, swamp
ell(24, 21, 9, 6, 'f', rough=0.35, seed=31, only='.')
ell(16, 34, 5, 4, 'f', rough=0.4, seed=32, only='.')
ell(36, 30, 4, 3, 'f', rough=0.4, seed=33, only='.')
ell(36, 56, 7, 4, 'h', rough=0.4, seed=34, only='.')
ell(14, 52, 4, 3, 'w', rough=0.5, seed=35, only='.')
ell(20, 66, 10, 6, 'f', rough=0.5, seed=36, only='.')
ell(40, 64, 4, 3, 'M', rough=0.5, seed=37, only='.')
scatter(6, 26, 46, 60, 'h', 0.04, 41)
scatter(6, 26, 46, 60, 'f', 0.05, 42)
# ---------------------------------------------------------------- east bank: plains, the lake of 寒江閣, south hills
ell(76, 34, 6, 4, '~', rough=0.2, seed=51)              # 寒江 lake
ell(66, 46, 5, 3, 'f', rough=0.4, seed=52, only='.')
ell(54, 32, 4, 6, 'h', rough=0.4, seed=53, only='.')
ell(70, 52, 6, 2.5, 'M', rough=0.4, seed=54, only='.')  # ridge between the plains and the desert
scatter(50, 24, 92, 50, 'f', 0.05, 55)
scatter(50, 24, 92, 50, 'h', 0.04, 56)
# the chasm that cuts off the north (Thousand Buddha mountains)
stroke([(49, 22), (60, 23), (70, 22), (80, 23), (93, 22)], 'v', 2, only='.fhM')
rect(64, 21, 64, 25, 'X', only='v')
ell(62, 12, 9, 7, 'h', rough=0.4, seed=61, only='.')
ell(56, 6, 6, 3, 'M', rough=0.4, seed=62, only='.h')
ell(62, 16, 3, 2, 'f', rough=0.4, seed=63, only='.h')
rect(50, 0, 74, 2, '~')
# north-east snow
ell(86, 12, 12, 9, 'n', rough=0.3, seed=71, only='.fh')
ell(90, 8, 7, 5, 'N', rough=0.4, seed=72, only='n')
ell(80, 18, 3, 2, 'N', rough=0.4, seed=73, only='n')
# south-east desert
ell(82, 64, 13, 9, 's', rough=0.3, seed=81, only='.fh')
ell(90, 70, 3, 2, 'M', rough=0.5, seed=82, only='s')
scatter(70, 56, 95, 74, 'h', 0.03, 83, only='s')
# east coast swamp near the fishing village
ell(84, 46, 5, 3, 'w', rough=0.4, seed=91, only='.fh')
# the isle: dead forest, then the hall
ell(104, 42, 5, 7, 'w', rough=0.5, seed=95, only='.')
ell(104, 38, 3, 2, 'M', rough=0.5, seed=96, only='.w')

# ---------------------------------------------------------------- roads, bridges, docks, the causeway
ROADS = [
    [(26, 44), (26, 40), (18, 34), (14, 31)],            # 龍門 - 青石
    [(26, 44), (34, 46), (47, 46)],                      # 龍門 - 臨江渡 - the dock
    [(18, 30), (22, 26)],                                # 青石 - 黑風林
    [(50, 46), (56, 52), (57, 56), (58, 62)],            # east dock - 南陵
    [(50, 46), (60, 44), (69, 40)],                      # east dock - 寒江閣
    [(60, 44), (64, 30), (64, 24)],                      # to the rope bridge
    [(64, 21), (61, 15)],                                # rope bridge - 千佛寺
    [(58, 62), (66, 61), (74, 60)],                      # 南陵 - 赤沙堡
    [(69, 40), (80, 41), (89, 40)],                      # 寒江閣 - 望海村
]
for pts in ROADS:
    stroke(pts, '=', 1, only='.fh')
put(48, 46, 'D'); put(49, 46, 'D')                       # ferry: stepping on a dock crosses the river (once allowed)
rect(96, 44, 98, 44, 'c')                                # the sunken causeway
rect(92, 44, 95, 44, '=')
put(99, 44, '.')

# ---------------------------------------------------------------- keep the places clear (towns stand on grass)
PLACES = {
    'longmen': (26, 44), 'qingshi': (14, 30), 'heifenglin': (22, 25), 'fort': (36, 8), 'linjiang': (44, 45),
    'nanling': (58, 63), 'hanjiang': (70, 40), 'shuiyue': (78, 30), 'qianfo': (60, 14), 'tower': (68, 8),
    'chisha': (74, 60), 'tomb': (88, 67), 'longji': (84, 17), 'wanghai': (90, 40), 'lair': (105, 44), 'cangjian': (20, 70),
}
for k, (x, y) in PLACES.items():
    keep = g[y][x]
    if keep in '~vMNG':
        g[y][x] = '.'
    # make the tile in front (south) walkable
    if g[y + 1][x] in '~vMN':
        g[y + 1][x] = '.'
g[14][31] = 'G'; g[14][32] = 'G'
# the lake cave sits on the lake's north shore
g[30][78] = '.'; g[31][78] = '.'
# the tower stands on a ledge reached from the temple
stroke([(61, 14), (66, 10), (68, 9)], '=', 1, only='.fhM')
# snow cave entrance path
stroke([(66, 18), (76, 18), (84, 18)], '=', 1, only='.fhnN')
# the hall gate
stroke([(99, 44), (104, 45)], '=', 1, only='.wM')


# ---------------------------------------------------------------- reachability by stage
def reach(open_):
    from collections import deque
    sx, sy = PLACES['longmen']
    seen = {(sx, sy)}
    q = deque([(sx, sy)])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and (g[ny][nx] not in '~vMNXDGc' or g[ny][nx] in open_):
                seen.add((nx, ny)); q.append((nx, ny))
    return seen


STAGES = [('', ['longmen', 'qingshi', 'heifenglin', 'linjiang', 'cangjian']), ('G', ['fort']), ('GD', ['nanling', 'hanjiang', 'shuiyue', 'chisha', 'tomb', 'wanghai']),
          ('GDX', ['qianfo', 'tower', 'longji']), ('GDXc', ['lair'])]
prev = set()
for open_, names in STAGES:
    r = reach(open_)
    for n in names:
        x, y = PLACES[n]
        assert (x, y) in r, ('cannot reach', n, 'with', open_)
        assert (x, y) not in prev, ('reached too early', n, open_)
    prev = r
print('reachability ok')
rows = [''.join(r) for r in g]
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'js', 'world_map.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('// Generated by tools/world.py - do not edit by hand.\n')
    f.write('export const WORLD_W = %d, WORLD_H = %d;\n' % (W, H))
    f.write('export const WORLD = [\n')
    for r in rows:
        f.write("  '%s',\n" % r)
    f.write('];\n')
    f.write('export const PLACE_AT = {%s};\n' % ', '.join('%s: [%d, %d]' % (k, x, y) for k, (x, y) in PLACES.items()))
print('\n'.join(rows))
