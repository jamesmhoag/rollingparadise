# The lounge band: a small arranging engine that turns a tune sheet (tools/jazz/tunes.py) into a MIDI file.
#
# A tune sheet gives a chord chart in 8-bar sections, the head as hand-written 2-bar motifs, and an arrangement
# (intro, head, solos, head out, ending). The engine writes the band around it:
#   - comping: rootless voicings, each voice-led to the one before, in the style's rhythm (swing hits, bossa
#     guitar, funk stabs, ballad pads, organ swells)
#   - bass: walking lines with chromatic approaches, a two-feel, bossa, funk and smooth-jazz patterns
#   - drums: swing ride, brushes, bossa rim, funk and shuffle grooves, with fills and crashes at section ends
#   - the head: each motif is fitted to the chords under it (steps through the chord's scale, long and strong
#     notes land on chord tones), so a motif repeated over new chords sequences the way a written tune does
#   - solos: phrased improvisation (call and response, chord tones on the beat, chromatic approaches, a held note
#     to end each phrase)
#   - horns get scoops into long notes and late vibrato; big-band brass harmonise the lead in close position
#   - the players listen: a comping chord or a bossa bass note on the 'and' before a change plays the chord it is
#     pushing into; a melody line is one player's (a note ends where the next begins) and in swing a quarter note
#     inside a line is played short; the rhythm section's dynamics follow the tune's shape (Band.shape)
import math, random, zlib
import mido

PPQ = 480
PC = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11}
ION, DOR, MIX = [0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 9, 10], [0, 2, 4, 5, 7, 9, 10]
# quality: (chord tones by degree, rootless voicing, scale)
Q = {
    '6':     ({1: 0, 3: 4, 5: 7, 7: 9, 9: 14, 13: 9}, [4, 7, 9, 14], ION),
    'maj7':  ({1: 0, 3: 4, 5: 7, 7: 11, 9: 14, 13: 9}, [4, 7, 11, 14], ION),
    'm7':    ({1: 0, 3: 3, 5: 7, 7: 10, 9: 14, 13: 9}, [3, 7, 10, 14], DOR),
    'm6':    ({1: 0, 3: 3, 5: 7, 7: 9, 9: 14, 13: 9}, [3, 7, 9, 14], [0, 2, 3, 5, 7, 9, 11]),
    '7':     ({1: 0, 3: 4, 5: 7, 7: 10, 9: 14, 13: 9}, [4, 9, 10, 14], MIX),
    '7b9':   ({1: 0, 3: 4, 5: 7, 7: 10, 9: 13, 13: 9}, [4, 9, 10, 13], [0, 1, 3, 4, 6, 7, 9, 10]),
    '7#9':   ({1: 0, 3: 4, 5: 8, 7: 10, 9: 15, 13: 8}, [4, 8, 10, 15], [0, 1, 3, 4, 6, 8, 10]),
    'sus':   ({1: 0, 3: 5, 5: 7, 7: 10, 9: 14, 13: 9}, [5, 9, 10, 14], MIX),
    'm7b5':  ({1: 0, 3: 3, 5: 6, 7: 10, 9: 14, 13: 8}, [0, 3, 6, 10], [0, 2, 3, 5, 6, 8, 10]),
    'dim7':  ({1: 0, 3: 3, 5: 6, 7: 9, 9: 14, 13: 11}, [0, 3, 6, 9], [0, 2, 3, 5, 6, 8, 9, 11]),
}
ALIAS = {'': '6', 'maj': '6', 'maj9': 'maj7', 'm': 'm7', 'm9': 'm7', 'm11': 'm7', '9': '7', '13': '7', '7alt': '7#9',
         '7sus': 'sus', '13sus': 'sus', 'dim': 'dim7', 'ø': 'm7b5'}


def chord(sym):
    r = sym[:2] if len(sym) > 1 and sym[1] in 'b#' else sym[:1]
    q = sym[len(r):]
    q = ALIAS.get(q, q)
    assert q in Q, sym
    return (PC[r], q)


class Chart:
    """The chord timeline: bars of (beat in bar, chord)."""
    def __init__(self):
        self.bars = []

    def add(self, text):
        for cell in text.split('|'):
            syms = cell.split()
            if not syms: continue
            if syms == ['%']: self.bars.append(list(self.bars[-1])); continue
            step = 4 / len(syms)
            self.bars.append([(i * step, chord(s)) for i, s in enumerate(syms)])

    def at(self, beat):
        b = min(len(self.bars) - 1, max(0, int(beat // 4)))
        inb = beat - b * 4
        cur = self.bars[b][0][1]
        for st, ch in self.bars[b]:
            if st <= inb + 1e-6: cur = ch
        return cur

    def changes(self):  # every (beat, chord) where the harmony moves
        out = []
        for b, bar in enumerate(self.bars):
            for st, ch in bar: out.append((b * 4 + st, ch))
        return out


def tones(ch, degs=(1, 3, 5, 7)):
    r, q = ch
    return {(r + Q[q][0][d]) % 12 for d in degs}


def scale(ch):
    r, q = ch
    return sorted({(r + i) % 12 for i in Q[ch[1]][2]})


def nearest(pcs, p, lo, hi, prefer=0):
    best = None
    for x in range(lo, hi + 1):
        if x % 12 in pcs:
            d = abs(x - p) + (0.4 if prefer and (x - p) * prefer < 0 else 0)
            if best is None or d < best[0]: best = (d, x)
    return best[1] if best else p


def step(p, n, pcs, lo, hi):
    x = p
    for _ in range(abs(n)):
        d = 1 if n > 0 else -1
        x += d
        while x % 12 not in pcs: x += d
    while x > hi: x -= 12
    while x < lo: x += 12
    return x


def voicings(pcs, lo, hi):
    pcs = sorted({p % 12 for p in pcs}); out = []
    for rot in range(len(pcs)):
        order = pcs[rot:] + pcs[:rot]
        for base in range(lo, hi + 1):
            if base % 12 != order[0]: continue
            v = [base]
            for pc in order[1:]:
                x = v[-1] + 1
                while x % 12 != pc: x += 1
                v.append(x)
            if v[-1] <= hi: out.append(v)
    return out


class Band:
    def __init__(self, title, bpm, swing, rng):
        self.title, self.bpm, self.swing, self.rng = title, bpm, swing, rng
        self.notes, self.ccs, self.chans, self.tempos = [], [], {}, [(0, bpm)]
        self.period = None  # a loop's length in beats: its timing feel then repeats with it
        self.lean, self.progs = {}, {}  # per channel: ticks behind (+) or ahead of (-) the beat; GM program
        self.chart = Chart()

    # ---- setup
    def chan(self, name, ch, prog, vol=100, pan=64, rev=40, cho=0, bank=0):
        self.chans[name] = ch
        for cc, v in ((0, bank), (7, vol), (10, pan), (91, rev), (93, cho), (11, 127)): self.ccs.append((ch, -0.01, 'cc', (cc, v)))
        self.ccs.append((ch, -0.005, 'prog', prog)); self.progs[ch] = prog

    def note(self, name, t, dur, p, vel, tri=False, swing=True):
        self.notes.append((self.chans[name], t, dur, int(p), max(1, min(127, int(vel))), tri or not swing))

    # ---- timing
    def sw(self, t, tri):
        r = self.swing
        if tri or r == 0.5: return t
        b = math.floor(t + 1e-9); f = t - b
        return b + (f / 0.5 * r if f <= 0.5 else r + (f - 0.5) / 0.5 * (1 - r))

    # ---- comping
    def comp(self, name, b0, b1, style, lo=50, hi=72, vel=58):
        rng, prev = self.rng, None
        def voice(ch, lo=lo, hi=hi):
            nonlocal prev
            r, q = ch
            vs = voicings([r + i for i in Q[q][1]], lo, hi)
            if prev is None: v = min(vs, key=lambda v: abs(sum(v) / len(v) - (lo + hi) / 2))
            else: v = min(vs, key=lambda v: sum(abs(a - b) for a, b in zip(v, prev)) + 0.2 * abs(sum(v) / len(v) - (lo + hi) / 2))
            prev = v; return v
        hit = lambda t, d, ch, vv=vel: [self.note(name, t, d, p, vv + rng.randint(-6, 6)) for p in voice(ch)]
        # the chord a hit plays: on an offbeat it is the one the hit pushes into (an anticipation), as a comper plays it
        at = lambda t: self.chart.at(t + .51) if (t % 1) > .49 else self.chart.at(t)
        for bar in range(b0, b1):
            t0 = bar * 4; cells = self.chart.bars[bar]
            if style == 'swing':
                pats = [[(0, .9)], [(1.5, .5), (3, .6)], [(0, .5), (1.5, 1.4)], [(2.5, 1.2)], [(1, .5), (2.5, .5)], [(0, .4), (2, .4), (3.5, .45)], [(.5, 1.2), (3, .5)]]
                if len(cells) > 1: pats = [[(0, .9), (2, .9)], [(0, .4), (1.5, .5), (2, .9)], [(.5, 1), (2.5, 1)]]
                for st, d in rng.choice(pats): hit(t0 + st, d, at(t0 + st))
            elif style == 'ballad':
                for st, ch in cells:
                    dur = 4 / len(cells)
                    vv = voice(ch)
                    for i, p in enumerate(vv): self.note(name, t0 + st + i * 0.06, dur - 0.1, p, vel - 4 + rng.randint(-5, 5), tri=True)
                    if dur == 4 and rng.random() < .5:
                        for i, p in enumerate(vv[::-1][:2]): self.note(name, t0 + 2.5 + i * .5, .5, p + 12, vel - 12, tri=True)
            elif style == 'bossa':
                pat = [0, 1.5, 3] if bar % 2 == 0 else [1, 2.5]
                for st in pat: hit(t0 + st, .45, at(t0 + st), vel - 4)
            elif style == 'funk':
                pat = rng.choice([[(0, .2), (.75, .2), (1.5, .45), (2.75, .2), (3.5, .3)], [(.5, .2), (1, .2), (1.75, .45), (3, .2), (3.75, .2)], [(0, .45), (1.75, .2), (2.5, .2), (3.25, .45)]])
                for st, d in pat: hit(t0 + st, d, at(t0 + st), vel + (6 if st % 1 else 0))
            elif style == 'pad':
                for st, ch in cells:
                    for p in voice(ch): self.note(name, t0 + st, 4 / len(cells) - .02, p, vel, tri=True)
            elif style == 'smooth':
                for st, ch in cells:
                    dur = 4 / len(cells); vv = voice(ch)
                    for p in vv: self.note(name, t0 + st, min(1.4, dur - .1), p, vel)
                    if dur == 4:
                        for p in vv[1:]: self.note(name, t0 + 2.5, .9, p, vel - 8)
            elif style == 'organ':
                for st, ch in cells:
                    dur = 4 / len(cells); vv = voice(ch)
                    if rng.random() < .55:
                        for p in vv: self.note(name, t0 + st, dur - .05, p, vel - 6)
                    else:
                        for s2, d2 in [(st + 1, .4), (st + 2.5, .9)] if dur == 4 else [(st + .5, .4), (st + 1, .9)]:
                            for p in vv: self.note(name, t0 + s2, d2, p, vel + 4)
            elif style == 'chank':  # funk / soul-jazz guitar: short high chords
                for st in ([1, 3] if self.swing > .5 else [.75, 1, 2.25, 2.75, 3.5]):
                    for p in voice(at(t0 + st), 62, 78)[-3:]: self.note(name, t0 + st, .12, p, vel + rng.randint(-8, 4))
            elif style == 'stabs':  # big-band saxes: held pads under the lead
                for st, ch in cells:
                    for p in voice(ch): self.note(name, t0 + st, 4 / len(cells) - .1, p, vel)

    # ---- bass
    def bass(self, b0, b1, style, lo=28, hi=52, vel=92, name='bass'):
        rng, prev = self.rng, None
        def root(ch, near=None):
            near = prev if near is None else near
            return nearest({ch[0]}, near if near else 38, lo, hi)
        for bar in range(b0, b1):
            t0 = bar * 4
            nxt = self.chart.at(t0 + 4) if bar + 1 < len(self.chart.bars) else self.chart.at(t0)
            if style in ('walk', 'two'):
                if style == 'two':
                    for st in (0, 2):
                        ch = self.chart.at(t0 + st); p = root(ch) if st == 0 or len(self.chart.bars[bar]) > 1 else nearest(tones(ch, (5,)), prev, lo, hi)
                        self.note(name, t0 + st, 1.85, p, vel); prev = p
                    continue
                for beat in range(4):
                    t = t0 + beat; ch = self.chart.at(t); is_change = any(abs(st - beat) < 1e-6 for st, _ in self.chart.bars[bar])
                    nch = self.chart.at(t + 1); target = root(nch)
                    if is_change: p = root(ch)
                    elif beat == 3 or any(abs(st - beat - 1) < 1e-6 for st, _ in self.chart.bars[bar]):
                        p = target + rng.choice([-1, 1, 1, -1, 7 - 12 if target - 5 >= lo else 1])
                        if p == prev: p = target + (1 if prev < target else -1)
                    else:
                        d = 1 if target > prev else -1
                        p = nearest(tones(ch), prev + d * 3, lo, hi, d) if rng.random() < .55 else step(prev, d, set(scale(ch)), lo, hi)
                        if p == prev: p = step(prev, d, set(scale(ch)), lo, hi)
                    self.note(name, t, .92, p, vel + (6 if beat == 0 else 0) + rng.randint(-5, 5)); prev = p
                    if beat == 2 and rng.random() < .08: self.note(name, t + 2 / 3, 1 / 3, p, vel - 30, tri=True)
            elif style == 'bossa':
                for st, ch in self.chart.bars[bar]:
                    r = root(ch, 41); f = nearest({(ch[0] + 7) % 12}, r - 5, lo, hi)  # (the last note of a bar pushes into the next chord)
                    if len(self.chart.bars[bar]) == 1:
                        for s2, p, d in ((0, r, 1.4), (1.5, f, .45), (2, f, 1.4), (3.5, root(nxt, 41), .45)): self.note(name, t0 + s2, d, p, vel - 4 + rng.randint(-4, 4))
                    else:
                        for s2, p, d in ((st, r, 1.4), (st + 1.5, f, .45)): self.note(name, t0 + s2, d, p, vel - 4)
                    prev = r
            elif style == 'funk':
                pat = [(0, 'R', .5), (.75, 'R', .2), (1.25, '7', .2), (1.5, 'O', .25), (2, '5', .45), (2.75, 'R', .2), (3.25, 'g', .15), (3.5, '7', .25), (3.75, '5', .2)]
                if bar % 2: pat = [(0, 'R', .4), (.5, 'g', .15), (.75, 'R', .2), (1.5, 'O', .3), (2.25, '5', .2), (2.5, '7', .45), (3, 'R', .2), (3.5, '3', .2), (3.75, '5', .2)]
                for st, k, d in pat:
                    ch = self.chart.at(t0 + st); r = root(ch, 33)
                    p = {'R': r, 'O': r + 12, '5': r + Q[ch[1]][0][5], '7': r + Q[ch[1]][0][7] - 12, '3': r + Q[ch[1]][0][3], 'g': r}[k]
                    while p > hi: p -= 12
                    self.note(name, t0 + st, d, p, (vel - 40 if k == 'g' else vel + (8 if st == 0 else 0)) + rng.randint(-5, 5)); prev = r
            elif style == 'boogie':  # jump blues: the shuffle bass line, up the chord and back (R 3 5 6 b7 6 5 3)
                cells = self.chart.bars[bar]
                for st, ch in cells:
                    r = root(ch, 36); q = Q[ch[1]][0]
                    up = [0, q[3], q[5], 9, q[7], 9, q[5], q[3]] if len(cells) == 1 else [0, q[3], q[5], 9]
                    for k, iv in enumerate(up):
                        p = r + iv
                        while p > hi: p -= 12
                        self.note(name, t0 + st + k * .5, .45, p, vel + (6 if k % 2 == 0 else -8) + rng.randint(-4, 4))
                    prev = r
            elif style == 'smooth':
                for st, ch in self.chart.bars[bar]:
                    r = root(ch, 38); dur = 4 / len(self.chart.bars[bar])
                    if dur == 4:
                        nr = root(nxt, r)
                        for s2, p, d in ((0, r, 1.6), (1.75, r + 7 if r + 7 <= hi else r - 5, .9), (3, r + 12 if r + 12 <= hi else r, .45), (3.5, nr + (1 if nr < r else -1) if nr != r else r + 7 - 12, .45)):
                            self.note(name, t0 + s2, d, p, vel + rng.randint(-5, 5))
                    else:
                        self.note(name, t0 + st, 1.4, r, vel); self.note(name, t0 + st + 1.5, .45, r + 7 if r + 7 <= hi else r - 5, vel - 8)
                    prev = r

    # ---- drums (GM channel 10; jazz kit 32, brush kit 40)
    def drums(self, b0, b1, style, vel=80, fills=(), crash=()):
        rng, n = self.rng, lambda t, p, v, d=.1, tri=False: self.note('drums', t, d, p, v + rng.randint(-6, 6), tri)
        for bar in range(b0, b1):
            t0 = bar * 4
            if bar in crash: n(t0, 49, vel + 5, 1)
            fill = bar in fills
            if style in ('swing', 'bigband', 'blues'):
                for b in range(4):
                    if not (bar in crash and b == 0): n(t0 + b, 51, vel - (8 if b % 2 == 0 else 0))
                    if b in (1, 3): n(t0 + b + .5, 51, vel - 18); n(t0 + b, 44, vel - 22)
                    n(t0 + b, 36, 34 if style != 'bigband' else 44)
                for _ in range(rng.choice([0, 1, 1, 2])): n(t0 + rng.choice([.5, 1.5, 2.5, 3.5]), 38, 36)
                if fill:
                    for st in (2.5, 3, 3.5): n(t0 + st, rng.choice([38, 45, 48]), vel - 10)
                    n(t0 + 3.5, 36, vel - 10)
            elif style == 'brush':
                for b in range(4):
                    for k in range(3): n(t0 + b + k / 3, 38, 22 + (8 if k == 0 else 0), .3, tri=True)
                    if b in (1, 3): n(t0 + b, 38, 44); n(t0 + b, 44, 30)
                    if b == 0: n(t0, 36, 30)
                if fill: n(t0 + 3.5, 38, 52)
            elif style == 'bossa':
                clave = [0, 1.5, 3] if bar % 2 == 0 else [1, 2.5]
                for st in clave: n(t0 + st, 37, vel - 18)
                for k in range(8): n(t0 + k / 2, 42 if k % 2 == 0 else 42, vel - (30 if k % 2 else 22))
                for st in (0, 1.5, 2, 3.5): n(t0 + st, 36, vel - 30 if st % 1 else vel - 22)
                if fill: n(t0 + 3.5, 38, vel - 10)
            elif style == 'funk':
                for k in range(16):
                    st = k / 4
                    if k == 14 and bar % 2: n(t0 + st, 46, vel - 14, .2)
                    else: n(t0 + st, 42, vel - (12 if k % 2 == 0 else 28))
                for st in (0, .75, 2.5) if bar % 2 == 0 else (0, 1.75, 2.25): n(t0 + st, 36, vel + 4)
                n(t0 + 1, 38, vel + 6); n(t0 + 3, 38, vel + 6)
                for st in (1.75, 3.25): n(t0 + st, 38, 30)
                for st, p in ((0, 63), (.5, 64), (1.5, 62), (2.5, 63), (3, 64), (3.5, 64)): n(t0 + st, p, vel - 26)
                if fill:
                    for k, p in enumerate((38, 38, 48, 45)): n(t0 + 3 + k / 4, p, vel)
            elif style == 'smooth':
                for k in range(16): n(t0 + k / 4, 70, 30 + (14 if k % 4 == 2 else 0))
                for k in range(8): n(t0 + k / 2, 42, vel - (16 if k % 2 == 0 else 30))
                for st in (0, 1.75, 2.5): n(t0 + st, 36, vel)
                for st in (1, 3): n(t0 + st, 38, vel + 2); n(t0 + st, 39, vel - 30)
                if fill:
                    for k, p in enumerate((48, 47, 45, 43)): n(t0 + 3 + k / 4, p, vel - 4)
            elif style == 'shuffle':
                for b in range(4):
                    n(t0 + b, 51, vel - 10); n(t0 + b + 2 / 3, 51, vel - 22, tri=True)
                    if b in (1, 3): n(t0 + b, 38, vel - 6); n(t0 + b, 44, vel - 30)
                    else: n(t0 + b, 36, vel - 8)
                    n(t0 + b + 2 / 3, 38, 24, tri=True)
                if fill:
                    for k in range(3): n(t0 + 3 + k / 3, 38, vel - 8, tri=True)

    # ---- melody: the head, fitted to the chords
    def phrase(self, name, t0, motif, lo, hi, vel, prev, mode=None, key=0, horn=True, harm=None):
        for (on, dur, tok) in motif:
            t = t0 + on; ch = self.chart.at(t)
            pcs = set(scale(ch)) if mode != 'blues' else {(key + i) % 12 for i in (0, 2, 3, 4, 5, 7, 9, 10)}
            if isinstance(tok, str) and tok[0] == 'c': p = nearest(tones(ch, (int(tok[1:]),)), prev, lo, hi)
            elif isinstance(tok, str) and tok[0] == 'k': p = nearest({(key + int(tok[1:])) % 12}, prev, lo, hi)
            elif isinstance(tok, str) and tok[0] == 'h': p = prev + int(tok[1:])
            else:
                p = step(prev, tok, pcs, lo, hi)
                strong = (abs(on % 1) < 1e-6 and dur >= 1) or dur >= 1.5
                if strong and p % 12 not in tones(ch, (1, 3, 5, 7, 9)) and mode != 'blues': p = nearest(tones(ch, (1, 3, 5, 7, 9)), p, lo, hi, 1 if tok > 0 else -1)
            self.play(name, t, dur, p, vel + (5 if on % 1 else 0), horn, harm)
            prev = p
        return prev

    def play(self, name, t, dur, p, vel, horn=True, harm=None, fall=False):
        rng, ch = self.rng, self.chans[name]
        self.note(name, t, dur * (.92 if dur < 1 else .97), p, vel + rng.randint(-5, 5))
        if horn: self.breathe(ch, t, dur, vel, fall)
        if harm:  # a section under the lead: close position chord tones below it
            pcs = tones(self.chart.at(t), (1, 3, 5, 7, 9)); x = p
            for i, (hname, n_voices, drop) in enumerate(harm):
                for _ in range(n_voices):
                    x -= 1
                    while x % 12 not in pcs: x -= 1
                    self.note(hname, t, dur * .9, x - drop, vel - 10 + rng.randint(-4, 4))

    # ---- a wind player's note: the breath (expression) swells in and eases off, a long note may be scooped,
    # vibrato comes in late at a rate and depth that drift, and a phrase may end with a fall-off
    def breathe(self, ch, t, dur, vel, fall=False):
        rng, cc = self.rng, self.ccs
        top = max(70, min(127, 60 + vel // 2 + rng.randint(-4, 4)))
        end = t + dur * (.92 if dur < 1 else .97) - .02
        cc.append((ch, t - .004, 'bend', 0))
        if dur < .75:  # a short note: a quick breath accent
            cc += [(ch, t - .003, 'cc', (11, top - 18)), (ch, t + min(.08, dur * .3), 'cc', (11, top))]
            return
        rise = min(.35, dur * .22) * rng.uniform(.7, 1.3)
        cc += [(ch, t - .003, 'cc', (11, int(top * .62))), (ch, t + rise * .5, 'cc', (11, int(top * .88))), (ch, t + rise, 'cc', (11, top))]
        if dur >= 1.5: cc += [(ch, t + dur * .55, 'cc', (11, int(top * .93))), (ch, end - .05, 'cc', (11, int(top * .8)))]
        if rng.random() < .3:  # a scoop up into the note
            cc += [(ch, t, 'bend', -900), (ch, t + .1, 'bend', -300), (ch, t + .18, 'bend', 0)]
        if fall and rng.random() < .5:  # a fall-off: the pitch drops away as the breath goes
            f0 = t + dur * .62
            for k in range(1, 7):
                cc.append((ch, f0 + (end - f0) * k / 6, 'bend', -int(8000 * (k / 6) ** 1.6)))
                cc.append((ch, f0 + (end - f0) * k / 6, 'cc', (11, int(top * (1 - .7 * k / 6)))))
            cc.append((ch, end + .02, 'bend', 0))
            return
        if dur >= 1.2:  # vibrato: pitch bend, coming in late, its rate and depth wandering a little
            secs = 60 / self.bpm; hz = rng.uniform(4.6, 5.8); step = 1 / (hz * secs) / 8
            v0 = t + dur * rng.uniform(.3, .45); x = v0; ph = 0
            while x < end - .03:
                k = (x - v0) / max(.1, end - v0); depth = 520 * min(1, k * 1.6) * rng.uniform(.85, 1.15)
                cc.append((ch, x, 'bend', int(depth * math.sin(ph))))
                x += step; ph += math.pi / 4
            cc.append((ch, end, 'bend', 0))

    # ---- solos: phrased improvisation over the changes
    def solo(self, name, b0, b1, lo, hi, vel, density=.6, horn=True, mode=None, key=0, tri_rate=.08, harm=None):
        rng = self.rng; t = b0 * 4 + rng.choice([.5, 1, 1.5]); end = b1 * 4 - .5
        p = (lo + hi) // 2 + rng.randint(-3, 3); last_rhythm = None
        while t < end - 1:
            length = min(end - t, rng.choice([3, 4, 5, 6, 7, 8]))
            if last_rhythm and rng.random() < .35: rhythm = last_rhythm
            else:
                rhythm, u = [], 0
                while u < length - 1:
                    r = rng.random()
                    if r < tri_rate and u % 1 == 0: rhythm += [(u + k / 3, 1 / 3, True) for k in range(3)]; u += 1
                    elif r < density: rhythm.append((u, .5, False)); u += .5
                    elif r < density + .2: rhythm.append((u, 1, False)); u += 1
                    else: rhythm.append((u, 1.5, False)); u += 1.5
                rhythm.append((u, rng.choice([1, 1.5, 2]), False)); last_rhythm = rhythm
            d = rng.choice([-1, 1])
            for i, (u, dur, tri) in enumerate(rhythm):
                tt = t + u
                if tt >= end: break
                ch = self.chart.at(tt)
                pcs = set(scale(ch)) if mode != 'blues' else {(key + k) % 12 for k in (0, 3, 5, 6, 7, 10)} | tones(ch, (3, 7))
                last = i == len(rhythm) - 1
                if p >= hi - 2: d = -1
                elif p <= lo + 2: d = 1
                elif rng.random() < .22: d = -d
                if last: p = nearest(tones(ch, (3, 5, 9)), p, lo, hi)
                elif rng.random() < .12: p = nearest(tones(ch), p + d * 5, lo, hi, d); d = -d
                elif abs(tt % 1) < 1e-6 and not tri: p = nearest(tones(ch, (1, 3, 5, 7, 9)), step(p, d, pcs, lo, hi), lo, hi, d)
                elif rng.random() < .15 and i + 1 < len(rhythm):
                    tgt = nearest(tones(self.chart.at(t + rhythm[i + 1][0]), (3, 5)), p + d * 2, lo, hi, d); p = tgt - d
                else: p = step(p, d, pcs, lo, hi)
                p = max(lo, min(hi, p))
                self.play(name, tt, dur, p, vel + (6 if (u % 1) else 0) - (8 if last else 0) + rng.randint(-4, 4), horn, harm, fall=last and dur >= 1)
            t += length + rng.choice([.5, 1, 1, 1.5, 2])
            t = math.floor(t * 2) / 2

    # ---- one player's line: a note ends where the next begins (a pickup cuts the note before it short), and in
    # swing a quarter note inside a line is played short and a lone eighth that ends a phrase is clipped and leaned on
    def articulate(self, names, detach=0):
        chans = {self.chans[n] for n in names if n in self.chans}
        for c in chans:
            idx = sorted((i for i, n in enumerate(self.notes) if n[0] == c), key=lambda i: self.notes[i][1])
            groups = []
            for i in idx:
                if groups and abs(self.notes[groups[-1][0]][1] - self.notes[i][1]) < 1e-6: groups[-1].append(i)
                else: groups.append([i])
            for g, nxt in zip(groups, groups[1:] + [None]):
                t = self.notes[g[0]][1]; t2 = self.notes[nxt[0]][1] if nxt else None
                for i in g:
                    ch, _, dur, p, vel, ns = self.notes[i]; gap = None if t2 is None else t2 - (t + dur)
                    if gap is not None and gap < .02: dur = max(.08, t2 - t - .02)
                    elif detach and gap is not None and gap < .6 and .9 <= dur <= 1.1 and abs(t % 1) < .01: dur *= detach
                    elif detach and dur <= .55 and (t % 1) > .4 and (gap is None or gap >= .5): dur = .34; vel = min(127, vel + 7)
                    self.notes[i] = (ch, t, dur, p, vel, ns)

    # ---- dynamics: the named parts play louder or softer through the tune, by fn(beat) (1 is as written)
    def shape(self, names, fn):
        chans = {self.chans[n] for n in names if n in self.chans}
        self.notes = [(c, t, d, p, max(1, min(127, round(v * fn(t)))) if c in chans else v, ns) for c, t, d, p, v, ns in self.notes]

    # ---- the end: a held tonic chord, a ritard into it
    def ending(self, bar, parts, bars=2, ritard=True):
        t = bar * 4
        if ritard: self.tempos += [(t - 4, self.bpm * .93), (t - 2, self.bpm * .85), (t, self.bpm * .78)]
        return t

    # ---- write
    def write(self, path, keep=None, remap=None):
        mid = mido.MidiFile(ticks_per_beat=PPQ); tr = mido.MidiTrack(); mid.tracks.append(tr)
        ev = []; rng = random.Random(zlib.crc32(self.title.encode()))
        # how a player sits on the time: a steady lean (self.lean, in ticks, + is behind the beat) and a slow drift
        waves = {ch: (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(5, 9), rng.uniform(2.5, 4)) for ch in range(32)}  # parts past 15 are remapped to a real channel
        remap = remap or {}; drum = {9} | {c for c, d in remap.items() if d == 9}
        def feel(ch, t):
            if self.period: t = t % self.period  # a loop's feel repeats exactly with it
            a, b, p1, p2 = waves[ch]; amp = 0 if ch in drum else 1
            return self.lean.get(ch, 0) + amp * (5 * math.sin(2 * math.pi * t / p1 + a) + 3 * math.sin(2 * math.pi * t / p2 + b))
        for (t, bpm) in self.tempos: ev.append((max(0, round(t * PPQ)), 0, mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm))))
        for ch, t, kind, v in self.ccs:
            if keep is not None and ch not in keep: continue
            tick = max(0, round(self.sw(max(t, 0), False) * PPQ + (feel(ch, t) if t >= 0 else 0))) if t >= 0 else 0
            out = remap.get(ch, ch)
            if kind == 'cc': ev.append((tick, 1, mido.Message('control_change', channel=out, control=v[0], value=v[1])))
            elif kind == 'prog': ev.append((tick, 1, mido.Message('program_change', channel=out, program=v)))
            elif kind == 'bend': ev.append((tick, 2, mido.Message('pitchwheel', channel=out, pitch=v)))
        for ch, t, dur, p, vel, noswing in self.notes:
            if keep is not None and ch not in keep: continue
            j = round(feel(ch, t)) + (0 if self.period else self.rng.randint(-2, 2))
            a = max(0, round(self.sw(t, noswing) * PPQ) + j); b = max(a + 20, round(self.sw(t + dur, noswing) * PPQ) + j)
            out = remap.get(ch, ch)
            ev.append((a, 4, mido.Message('note_on', channel=out, note=p, velocity=vel)))
            ev.append((b, 3, mido.Message('note_off', channel=out, note=p, velocity=0)))
        ev.sort(key=lambda e: (e[0], e[1]))
        tr.append(mido.MetaMessage('track_name', name=self.title))
        last = 0
        for tick, _, msg in ev: tr.append(msg.copy(time=tick - last)); last = tick
        mid.save(path)
        return mid.length
