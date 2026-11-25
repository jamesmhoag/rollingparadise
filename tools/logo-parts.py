"""Cut the title sign's three layers (assets/logo-{cyan,pink,dice}.png) into one PNG per part, for the title's
letter-by-letter strike (js/main.js, css .sign.parts). Every pixel of a layer, glow included, goes to exactly one
part: the bright tube pixels are labelled by letter, die, trunk or leaf, and each glow pixel joins the nearest tube.
Stacked together the parts give back the layer exactly.

    python3 tools/logo-parts.py            # writes assets/logo-parts/*.png
    python3 tools/logo-parts.py --preview  # also writes logo-parts-preview.png, each part in its own colour

Parts, in the order the title lights them (TITLE_PARTS in js/content/assets.js lists the same names):
  cyan  R O L L I N G             split at the gaps between the letters (and 'shade', the dark backing, put up last)
  dice  die1 die2                 split across the line between the two dice's centres
  pink  P a r a d i e             the script letters (the cursive r looks like an n), split at their thin joins
        trunk                     the s, the swash under the word and the palm's trunk: one stroke
        leaf1..leaf7              the palm's fronds, by angle round the crown, clockwise from the left
"""
import math, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'logo-parts')
CORE = 170  # brightness (luma times alpha) above which a pixel is the tube itself, not its glow

def load(name):
    a = np.array(Image.open(os.path.join(ROOT, 'assets', f'logo-{name}.png')).convert('RGBA'))
    lum = a[..., :3].astype(float).mean(-1) * a[..., 3] / 255
    return a, lum > CORE

def by_columns(core, cuts, names):
    lab = np.zeros(core.shape, int); xs = np.arange(core.shape[1])[None, :].repeat(core.shape[0], 0)
    edges = [-1, *cuts, 10 ** 6]
    for i in range(len(names)): lab[core & (xs > edges[i]) & (xs <= edges[i + 1])] = i + 1
    return lab

def spread(a, lab, names, layer, reach=None):
    # every visible pixel joins the nearest labelled tube pixel; with a reach, pixels further than that from any tube
    # (the cyan layer's dark shade of the palm and the script) are a part of their own, 'shade'
    dist, (iy, ix) = nd.distance_transform_edt(lab == 0, return_indices=True)
    full = lab[iy, ix]; full[a[..., 3] == 0] = 0
    if reach: names = [*names, 'shade']; full[(dist > reach) & (a[..., 3] > 0)] = len(names)
    os.makedirs(OUT, exist_ok=True); out = {}
    for i, n in enumerate(names, 1):
        part = a.copy(); part[full != i] = 0
        Image.fromarray(part).save(os.path.join(OUT, f'{layer}-{n}.png'), optimize=True); out[n] = full == i
    return out

def cyan():
    a, core = load('cyan'); names = ['R', 'O', 'L1', 'L2', 'I', 'N', 'G']
    return spread(a, by_columns(core, [214, 295, 351, 407, 438, 513], names), names, 'cyan', reach=16)

def dice():
    a, core = load('dice'); ys, xs = np.mgrid[:core.shape[0], :core.shape[1]]
    c1, c2 = np.array([580, 140]), np.array([612, 182])  # the two dice's centres (x, y)
    d1 = (xs - c1[0]) ** 2 + (ys - c1[1]) ** 2; d2 = (xs - c2[0]) ** 2 + (ys - c2[1]) ** 2
    lab = np.zeros(core.shape, int); lab[core & (d1 <= d2)] = 1; lab[core & (d1 > d2)] = 2
    return spread(a, lab, ['die1', 'die2'], 'dice')

def pink():
    a, core = load('pink'); H, W = core.shape
    comps, _ = nd.label(core); ys, xs = np.mgrid[:H, :W]
    tree = comps == np.bincount(comps.ravel())[1:].argmax() + 1  # the palm, its trunk, the swash and the s: the one long tube
    letters = ['P', 'a1', 'r', 'a2', 'd', 'i', 'e']
    lab = by_columns(core & ~tree, [233, 275, 330, 376, 420, 480], letters)
    cx, cy = 95, 85  # the crown, where the fronds meet
    r = np.hypot(xs - cx, ys - cy); ang = (np.degrees(np.arctan2(ys - cy, xs - cx)) + 360) % 360
    trunkband = (xs >= 72) & (xs <= 108) & (ys > 92)
    leafy = tree & (ys < 140) & (xs < 175) & ~trunkband
    lab[tree & ~leafy] = len(letters) + 1  # trunk
    # fronds by angle (0 is right, angles grow clockwise on screen), named clockwise from the drooping left one
    sectors = [(100, 175), (175, 218), (218, 262), (262, 305), (305, 340), (340, 385), (25, 100)]
    for k, (lo, hi) in enumerate(sectors):
        m = (ang >= lo) & (ang < hi) if hi <= 360 else (ang >= lo) | (ang < hi - 360)
        lab[leafy & m] = len(letters) + 2 + k
    names = letters + ['trunk'] + [f'leaf{k + 1}' for k in range(len(sectors))]
    return spread(a, lab, names, 'pink')

if __name__ == '__main__':
    parts = {'cyan': cyan(), 'dice': dice(), 'pink': pink()}
    for layer, ps in parts.items(): print(layer, ' '.join(ps))
    if '--preview' in sys.argv:
        H, W = next(iter(parts['cyan'].values())).shape; rng = np.random.default_rng(3); rows = []
        for layer in parts.values():  # one row per layer, each part in its own colour
            img = np.zeros((H, W, 3), np.uint8) + 12
            for m in layer.values(): img[m] = rng.integers(60, 255, 3)
            rows.append(img)
        Image.fromarray(np.vstack(rows)).save(os.path.join(ROOT, 'logo-parts-preview.png'))
