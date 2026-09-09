#!/usr/bin/env python3
"""Cut the sixteen cats out of tools/sushimeow-cats.jpg into public/sushi.

    python3 tools/cut-cats.py            # from the repo root
    python3 tools/cut-cats.py --check    # compare against what is committed

Needs Pillow, and nothing else: it is run when the artwork changes, not by the
build, so it is deliberately not a dependency of the app.

The sheet is on white, which is what makes this possible at all: the ground is
flooded from each cell's border rather than keyed by colour, because the rice
and the cats' collars are the same white as the paper and keying white
globally punches straight through both. Whatever the flood cannot reach stays
part of the piece — the whites of an eye, the rice under a scallop.

Nothing is matted into the files. The rim the cats carry on the belt is a
filter on the route, so it can be recoloured, thinned or switched off without
coming back here; see components/kaiten-rim.

The cell bounds below are the white gutters of this particular sheet, found by
scanning for rows and columns that are white the whole way across. A new sheet
laid out the same way will want them measured again.
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / 'tools' / 'sushimeow-cats.jpg'
OUT = ROOT / 'public' / 'sushi'

ROWS = [(48, 223), (261, 439), (476, 652), (679, 855)]
COLS = [(87, 336), (364, 612), (637, 886), (900, 1159)]

#: Row-major, the order they sit on the sheet — and the order they come past on
#: the belt. lib/kaiten-pieces has to agree with this, and carries the prices.
NAMES = [
    'sake', 'akami', 'tamago', 'ikura',
    'unagi', 'hotate', 'kani', 'amaebi',
    'saba', 'tako', 'hamachi', 'negitoro',
    'ebi', 'gyu', 'kappamaki', 'tekkamaki',
]

#: Room for the flood to start in, outside the cell's own bounds.
PAD = 6
#: How far from white still counts as ground. The sheet is a JPEG, so the
#: paper is not one value; below this the ink of an outline is safe.
TOLERANCE = 30
#: 82 holds the watercolour without banding it. The whole set is under 200KB.
QUALITY = 82


def cut(cell: Image.Image) -> Image.Image:
    """One cell, matted to its piece and trimmed to it."""
    w, h = cell.size
    px = cell.load()
    ground = bytearray(w * h)

    # Four-connected, from every border pixel inwards. It never crosses an ink
    # line, which is what leaves the enclosed whites alone.
    queue: deque[tuple[int, int]] = deque()
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        if not (0 <= x < w and 0 <= y < h) or ground[y * w + x]:
            continue
        if 255 - min(px[x, y]) > TOLERANCE:
            continue
        ground[y * w + x] = 1
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    mask = Image.frombytes('L', (w, h), bytes(255 - v * 255 for v in ground))
    # Close the pinholes the JPEG leaves along an outline, then give the edge
    # back: a dilation on its own fattens every whisker by a pixel.
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    mask = mask.filter(ImageFilter.GaussianBlur(0.7))

    piece = cell.convert('RGBA')
    piece.putalpha(mask)
    return piece.crop(piece.getchannel('A').getbbox())


def main(check: bool) -> int:
    sheet = Image.open(SHEET).convert('RGB')
    stale = []

    for index, name in enumerate(NAMES):
        x0, x1 = COLS[index % 4]
        y0, y1 = ROWS[index // 4]
        piece = cut(sheet.crop((x0 - PAD, y0 - PAD, x1 + PAD, y1 + PAD)))
        path = OUT / f'{name}.webp'

        if check:
            committed = Image.open(path)
            if committed.size != piece.size:
                stale.append(f'{name}: {committed.size} committed, {piece.size} cut')
            continue

        piece.save(path, quality=QUALITY, method=6)
        print(f'{name:10} {piece.width}x{piece.height}  {path.stat().st_size // 1024}KB')

    if stale:
        print('\n'.join(['stale:', *stale]), file=sys.stderr)
        return 1
    if check:
        print(f'{len(NAMES)} pieces, all the size they are cut at')
    return 0


if __name__ == '__main__':
    raise SystemExit(main('--check' in sys.argv[1:]))
