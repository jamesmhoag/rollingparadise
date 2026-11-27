"""Build the title sign from its drawn pieces (assets/title/*.svg, exported from the design file) into
js/content/titlesign.js: one entry per tube that lights on its own, in the order they light.

    python3 tools/title-sign.py

Each piece is one SVG with its own origin; AT places it on the page (the design's page coordinates, read from the
splash export). A piece's `-glow` twin is the same path blurred: only its blur radius is read (the game blurs the
path itself). The pieces are cut into tubes here:
  rolling   one tube set per letter (its subpaths, grouped by the gaps between letters)
  paradise  one per run of joined script (P, ar, a, di, e: outlines that touch light together)
  s         the s, which is one tube with the swash under the word and the palm's trunk (palm), joined by `joint`
  palm      the trunk and swash (with the s), then each frond; palm-back is the dark board behind the palm
  die1/2    a dark body with lit edges; the glow fills the body when lit
Edit a piece, or AT / the groups below, and run this again.
"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'title')
AT = {'rolling': (284.805, 198.855), 'paradise': (343.96, 257.95), 's': (614.277, 289.744), 'palm': (172.664, 179.546), 'palm-back': (178.149, 182.48),
      'die1': (699.273, 268.543), 'die1-glow': (683.273, 252.543), 'die2': (725.13, 299.269), 'die2-glow': (708.549, 269.336), 'joint': (612, 340)}
VIEW = (150, 158, 664, 236)  # the page area the sign takes, glow included

def read(name): return open(os.path.join(SRC, name + '.svg')).read()
def paths(name): return [(m.group(1), m.group(0)) for m in re.finditer(r'<path d="([^"]*)"[^>]*>', read(name))]
def attr(tag, k, d=None): m = re.search(r'\b%s="([^"]*)"' % k, tag); return m.group(1) if m else d
def blur(name): return float(re.search(r'stdDeviation="([^"]*)"', read(name)).group(1))
def subs(d): return [p.strip() for p in re.findall(r'M[^M]*', d)]
def box(p):
    t = re.findall(r'[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?', p); xs, ys, i, cmd, x, y = [], [], 0, None, 0, 0
    while i < len(t):
        if t[i].isalpha(): cmd = t[i]; i += 1; continue
        if cmd == 'H': x = float(t[i]); i += 1
        elif cmd == 'V': y = float(t[i]); i += 1
        else: x, y = float(t[i]), float(t[i + 1]); i += 2
        xs.append(x); ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)
def place(name, d): x, y = AT[name]; return {'d': d, 'x': x, 'y': y}

parts = []
# ROLLING: letters are sets of nested tubes; a gap of more than 4.5 between them starts the next letter
d, tag = paths('rolling')[0]; cyan = attr(tag, 'fill'); letters = []
for p in sorted(subs(d), key=lambda p: box(p)[0]):
    b = box(p)
    if letters and b[0] <= letters[-1]['x1'] + 4.5: letters[-1]['d'].append(p); letters[-1]['x1'] = max(letters[-1]['x1'], b[2])
    else: letters.append({'d': [p], 'x1': b[2]})
assert len(letters) == 7, len(letters)
for name, L in zip(['R', 'O', 'L1', 'L2', 'I', 'N', 'G'], letters):
    parts.append({'id': name, 'tone': 'cyan', 'z': 1, 'blur': blur('rolling-glow'), 'fill': [place('rolling', ' '.join(L['d']))], 'color': cyan})
# the dice: body, edges, and the glow that fills the body
for k in ('die1', 'die2'):
    (body, btag), (edges, etag) = paths(k); (gfill, gtag), (gedge, getag) = paths(k + '-glow')
    parts.append({'id': k, 'tone': 'cyan', 'z': 5, 'blur': blur(k + '-glow'), 'body': [place(k, body)], 'bodyColor': attr(btag, 'fill'),
                  'stroke': [place(k, edges)], 'color': attr(etag, 'stroke'), 'width': float(attr(etag, 'stroke-width')),
                  'lit': [place(k + '-glow', gfill)], 'litColor': attr(gtag, 'fill'), 'litStroke': [place(k + '-glow', gedge)], 'litStrokeColor': attr(getag, 'stroke')})
# Paradise: outlines by where they sit; joined script lights together
d, tag = paths('paradise')[0]; pink = attr(tag, 'fill'); S = subs(d); bx = [box(p) for p in S]
def script(x0, x1): return ' '.join(p for p, b in zip(S, bx) if b[0] >= x0 - .5 and b[2] <= x1 + .5)
runs = [('P', 0, 39.4), ('ar', 38.4, 135.5), ('a', 136.3, 181.6), ('di', 182.4, 268.1), ('e', 308.1, 352.6)]
assert sum(len(subs(script(a, b))) for _, a, b in runs) == len(S)
pb = blur('paradise-glow')
word = {k: {'id': k, 'tone': 'pink', 'z': 4, 'blur': pb, 'fill': [place('paradise', script(a, b))], 'color': pink} for k, a, b in runs}
# the palm: its long stroke (trunk and swash) and the short strokes at the crown light with the s; the fronds one by one
d, tag = paths('palm')[0]; P = subs(d); pbx = [box(p) for p in P]; w = float(attr(tag, 'stroke-width')); pc = attr(tag, 'stroke')
size = lambda b: max(b[2] - b[0], b[3] - b[1])
long = [p for p, b in zip(P, pbx) if size(b) > 200]; crown = [p for p, b in zip(P, pbx) if size(b) < 20]
fronds = [(p, b) for p, b in zip(P, pbx) if 20 <= size(b) <= 200]
import math
hub = (68.5, 59.4)  # where the fronds meet: they light in a sweep from the low left one round to the low right
def angle(b):
    cx, cy = (b[0] + b[2]) / 2 - hub[0], (b[1] + b[3]) / 2 - hub[1]; a = math.degrees(math.atan2(-cy, -cx)); return a if a > -60 else a + 360
fronds.sort(key=lambda pb_: angle(pb_[1]))
assert len(long) == 1 and len(fronds) == 7, (len(long), len(fronds))
sd, stag = paths('s')[0]; jd, jtag = paths('joint')[0]
tail = {'id': 's', 'tone': 'pink', 'z': 4, 'blur': blur('s-glow'), 'fill': [place('s', sd), place('joint', jd)], 'color': pink,
        'stroke': [place('palm', ' '.join(long + crown))], 'width': w, 'strokeColor': pc, 'long': True}
parts += [word['P'], word['ar'], word['a'], word['di'], tail, word['e']]
for i, (p, b) in enumerate(fronds): parts.append({'id': 'leaf%d' % (i + 1), 'tone': 'pink', 'z': 3, 'blur': blur('palm-glow'), 'stroke': [place('palm', p)], 'width': w, 'strokeColor': pc})
back = [place('palm-back', paths('palm-back')[0][0])]

out = os.path.join(ROOT, 'js', 'content', 'titlesign.js')
with open(out, 'w') as f:
    f.write('// The title sign, tube by tube, in the order they light. Written by tools/title-sign.py from assets/title/*.svg:\n// edit a piece there and run the tool; do not edit this file by hand.\n')
    f.write('export const TITLE_SIGN = ' + json.dumps({'view': VIEW, 'back': back, 'parts': parts}, separators=(',', ':')).replace('},{"id"', '},\n{"id"') + ';\n')
print('wrote', os.path.relpath(out, ROOT), len(parts), 'tubes')
