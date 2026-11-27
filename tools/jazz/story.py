# The lounge band, telling a story. engine.py lays the rhythm section (comping, bass, drums) under a chord chart;
# this composes the tunes on top of it as a conversation between two voices:
#
#   - a tune grows from one 2-bar motif (a rhythm and a contour). Everything the voices play is that motif,
#     answered, sequenced, inverted, fragmented, augmented: nothing is a random walk
#   - the head: the lead states the motif, the second voice answers it (inverted, in its own register, starting
#     where the lead left off), the lead takes it up a step, and both close the phrase together in harmony
#   - the middle chorus is the conversation: the voices trade phrases, each one picking up the tail of the last,
#     and the story builds (more notes, higher, louder) to a peak about two thirds through, then settles
#   - the last head is played in harmony, and the coda lets the motif out slowly over the tonic
#   - phrases breathe the way players do: a motif may start with a pickup before its bar or late in it, and may end
#     pushed over the barline (a long note on an offbeat belongs to the chord it pushes into)
#   - an improvised chorus grows out of the tune (Story.solo): it opens on the head's motif, develops it, runs lines
#     over the changes (aimed at the chords' guide tones, reached by an enclosure or a half step, with an arpeggio now
#     and then) as it climbs to a peak two thirds through, and comes home on the motif
#   - the big band has a shout chorus (Story.shout): the ensemble on the motif, in block harmony
#
# Consonance rules every voice keeps: notes on strong beats are chord tones (no 4th over a major or dominant chord,
# no b6 over a minor one); notes between them are scale steps that lead to the next chord tone; a harmony voice sits
# a 3rd or 6th under the lead; the comping steps out of the way of the melody (no voice a half step under it, none
# above it). The dissonance that is left is deliberate: a suspension held over a chord change that resolves down a
# step, and the b9 of a dominant on its way home.
import math
from engine import Band, Q, PC, tones, scale, nearest, step

NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
# chord tones that may sit on a strong beat, by quality (semitones over the root)
STRONG = {'6': {0, 4, 7, 9, 2}, 'maj7': {0, 4, 7, 11, 2, 9}, 'm7': {0, 3, 7, 10, 2, 5}, 'm6': {0, 3, 7, 9, 2},
          '7': {0, 4, 7, 10, 2, 9}, '7b9': {0, 4, 7, 10}, '7#9': {0, 4, 10}, 'sus': {0, 5, 7, 10, 2},
          'm7b5': {0, 3, 6, 10, 5}, 'dim7': {0, 3, 6, 9}}
LAND = {'6': {4, 7, 2, 9}, 'maj7': {4, 7, 2}, 'm7': {3, 7, 10}, 'm6': {3, 7}, '7': {4, 10, 9}, '7b9': {4, 10},
        '7#9': {4, 10}, 'sus': {5, 7, 2}, 'm7b5': {3, 6}, 'dim7': {3, 6}}


def transpose(text, k):
    out = []
    for cell in text.split('|'):
        syms = []
        for s in cell.split():
            if s == '%': syms.append(s); continue
            r = s[:2] if len(s) > 1 and s[1] in 'b#' else s[:1]
            syms.append(NAMES[(PC[r] + k) % 12] + s[len(r):])
        out.append(' '.join(syms))
    return ' | '.join(out)


def strong_pcs(ch): r, q = ch; return {(r + i) % 12 for i in STRONG[q]}
def land_pcs(ch): r, q = ch; return {(r + i) % 12 for i in LAND[q]}


def fit(x, lo, hi):
    while x > hi: x -= 12
    while x < lo: x += 12
    return x


class Motif:
    """A rhythm (onset, length in beats, accent) and a contour (scale steps from the last note), 2 bars long."""
    def __init__(self, rhythm, contour):
        self.rhythm, self.contour = rhythm, contour

    def inverted(self): return Motif(self.rhythm, [-c for c in self.contour])
    def fragment(self, n=None):
        n = n or max(2, len(self.rhythm) // 2)
        r = self.rhythm[:n]; last = r[-1]
        # the fragment's last note is held to fill its bar
        end = 4 if last[0] < 4 else 8
        r = r[:-1] + [(last[0], max(last[1], end - last[0] - .5), last[2])]
        return Motif(r, self.contour[:n])

    def augmented(self):
        return Motif([(o * 2, d * 2, a) for o, d, a in self.rhythm if o * 2 < 8], self.contour[:len([1 for o, _, _ in self.rhythm if o * 2 < 8])])

    def busier(self, rng):
        # fill some long notes with a passing eighth: the same line, more talk
        rh, co = [], []
        for (o, d, a), c in zip(self.rhythm, self.contour):
            if d >= 1.5 and rng.random() < .6:
                rh += [(o, d - .5, a), (o + d - .5, .5, False)]; co += [c, 1 if c <= 0 else -1]
            else: rh.append((o, d, a)); co.append(c)
        return Motif(rh, co)

    def tail(self, n=3):
        return Motif([(o - self.rhythm[-n][0], d, a) for o, d, a in self.rhythm[-n:]], self.contour[-n:])


# 2-bar rhythm cells by feel: (onset, length, accented). A cell is not boxed into its two bars: an onset before 0 is a
# pickup played at the end of the bar before, and a last note may start on the 'and' of four and ring over the barline.
RHYTHMS = {
    'swing': [[(0, 1.5, 1), (1.5, .5, 0), (2, .5, 0), (2.5, 1.5, 1), (4.5, .5, 0), (5, .5, 0), (5.5, 2, 1)],
              [(-1, .5, 0), (-.5, .5, 0), (0, 1, 1), (1, .5, 0), (1.5, 1.5, 1), (3.5, .5, 0), (4, 1, 1), (5, .5, 0), (5.5, 1.5, 1)],
              [(1.5, .5, 0), (2, .5, 0), (2.5, 1, 1), (3.5, 1.5, 1), (5.5, .5, 0), (6, .5, 0), (6.5, .5, 0), (7, .5, 0), (7.5, 1.5, 1)],
              [(0, 1, 1), (1, 1, 0), (2, .5, 0), (2.5, 2, 1), (5, 1, 0), (6, 2, 1)],
              [(-.5, .5, 0), (0, .5, 0), (.5, 1, 1), (1.5, .5, 0), (2, 2, 1), (4.5, .5, 0), (5, .5, 0), (5.5, .5, 0), (6, 1.5, 1)],
              [(0, .5, 0), (.5, .5, 0), (1, .5, 0), (1.5, 1, 1), (2.5, .5, 0), (3, 1, 1), (4.5, .5, 0), (5, .5, 0), (5.5, .5, 0), (6, .5, 0), (6.5, 1.5, 1)],
              [(1, .5, 0), (1.5, 1.5, 1), (3.5, .5, 0), (4, 1, 1), (5, .5, 0), (5.5, 1, 1), (7.5, 1.5, 1)],
              [(-1.5, .5, 0), (-1, .5, 0), (-.5, .5, 0), (0, 2, 1), (2.5, .5, 0), (3, .5, 0), (3.5, 1.5, 1), (5.5, .5, 0), (6, .5, 1)]],
    'ballad': [[(0, 1, 1), (1, .5, 0), (1.5, .5, 0), (2, 2, 1), (4, 1.5, 1), (5.5, .5, 0), (6, 2, 1)],
               [(-1, .5, 0), (-.5, .5, 0), (0, 2, 1), (2, 1, 0), (3, 1, 0), (4, 3, 1)],
               [(0, 2, 1), (2, 1, 0), (3, 1, 0), (4, 3, 1)],
               [(.5, .5, 0), (1, .5, 0), (1.5, 2, 1), (3.5, .5, 0), (4, 1, 1), (5, .5, 0), (5.5, 1.5, 1), (7.5, 1.5, 1)]],
    'latin': [[(0, 1.5, 1), (1.5, 1, 0), (2.5, .5, 0), (3, 1, 1), (4, .5, 0), (4.5, 3, 1)],
              [(-.5, 1, 1), (.5, 1, 0), (1.5, 1, 1), (2.5, 1, 0), (3.5, 2, 1), (5.5, .5, 0), (6, 1.5, 1)],
              [(0, .5, 0), (.5, 1, 1), (1.5, 1, 0), (2.5, 1.5, 1), (4.5, 1, 0), (5.5, 2, 1)],
              [(0, 2, 1), (2, 1, 0), (3, 1, 0), (4.5, 1.5, 1), (6, 2, 1)],
              [(1, 1, 1), (2, .5, 0), (2.5, 1, 0), (3.5, 1.5, 1), (5, .5, 0), (5.5, 1, 0), (6.5, 1, 0), (7.5, 1.5, 1)],
              [(-1, .5, 0), (-.5, .5, 0), (0, 1.5, 1), (1.5, .5, 0), (2, 1.5, 1), (3.5, 2.5, 1), (6, 1, 0)]],
    'funk': [[(0, .5, 1), (.75, .25, 0), (1, .5, 0), (1.5, 1, 1), (2.75, .25, 0), (3, 1, 1), (4.5, .5, 0), (5, .5, 0), (5.5, 2, 1)],
             [(-.5, .25, 0), (-.25, .25, 0), (0, .5, 1), (.75, .25, 0), (1, .5, 0), (1.5, 1, 1), (2.75, .25, 0), (3, 1, 1), (4.5, .5, 0), (5, .5, 0), (5.5, 1.5, 1)],
             [(0, 1, 1), (1.5, .5, 0), (2, .5, 0), (2.5, 1.5, 1), (4.5, .5, 0), (5, 1, 0), (6, 2, 1)],
             [(0, .25, 0), (.25, .5, 1), (1, .25, 0), (1.25, .25, 0), (1.5, 1, 1), (3, .5, 1), (3.5, .25, 0), (3.75, .25, 0), (4, 1, 1), (5.5, .5, 0), (6, 1.5, 1)],
             [(.5, .5, 0), (1, .5, 1), (1.75, .75, 0), (2.5, 1, 1), (3.75, 1.25, 1), (5.5, .25, 0), (5.75, .25, 0), (6, .5, 1), (6.75, 1, 1)]],
    'blues': [[(0, .5, 0), (.5, 1.5, 1), (2, .5, 0), (2.5, 1.5, 1), (4.5, .5, 0), (5, 1, 0), (6, 2, 1)],
              [(-1, .5, 0), (-.5, .5, 0), (0, 1, 1), (1, .5, 0), (1.5, .5, 0), (2, 2, 1), (4, .5, 0), (4.5, .5, 0), (5, 2, 1)],
              [(0, .5, 1), (.5, .5, 0), (1, 1, 1), (2.5, .5, 0), (3, 1, 1), (4, .5, 1), (4.5, .5, 0), (5, 1, 1), (6.5, 1.5, 1)],
              [(.5, .5, 0), (1, 1.5, 1), (3, .5, 0), (3.5, 1.5, 1), (5.5, .5, 0), (6, .5, 0), (6.5, .5, 0), (7.5, 1.5, 1)],
              [(0, .5, 0), (.5, .5, 0), (1, 1, 1), (2.5, .5, 0), (3, .5, 0), (3.5, 1, 1), (5, .5, 0), (5.5, .5, 0), (6, 1.5, 1)],
              [(-.5, .5, 0), (0, 2, 1), (2, .5, 0), (2.5, .5, 0), (3, 1, 1), (4.5, .5, 0), (5, .5, 0), (5.5, 1.5, 1)]],
}
CONTOURS = [[0, 1, 1, 1, -2, -1, -1, 1, 1], [0, 2, -1, -1, 2, 1, -1, -2, 1], [0, -1, -1, 2, 1, 1, -1, -1, 1],
            [0, 1, 2, -1, -1, 1, -2, 1, 1], [0, 2, 1, -1, -2, 1, 1, -1, -1], [0, -1, 2, 1, -2, 1, -1, 1, 1],
            # leaps: a 5th up and a step back, a falling 6th, an arpeggio, a riff that jumps and returns
            [0, 4, -1, -1, -1, 3, -1, -2, 1, -1, 1], [0, -2, 5, -1, -2, -1, 2, -1, -1, 1, 1],
            [0, 2, 2, 2, -1, -3, 1, 1, -2, 1, -1], [0, 3, -3, 3, -1, -2, 0, 3, -1, -1, 1]]
USED = set()  # (feel, rhythm, contour) motifs already given to a tune in this set, so no two tunes share one


class Story:
    def __init__(self, band, feel, key, rng):
        self.b, self.feel, self.key, self.rng = band, feel, key, rng
        self.mel = []  # (t, dur, pitch) of every melody note, for the comping to step round
        R = RHYTHMS[feel]
        pairs = [(r, c) for r in range(len(R)) for c in range(len(CONTOURS)) if (feel, r, c) not in USED and not (feel == 'ballad' and c == 9)]  # (the jumping riff is no ballad)
        fresh = [(r, c) for r, c in pairs if not any(u[0] == feel and u[2] == c for u in USED)]
        new = [(r, c) for r, c in fresh if not any(u[0] == feel and u[1] == r for u in USED)]  # a rhythm cell no tune of this feel has yet
        r, c = rng.choice(new or fresh or pairs); USED.add((feel, r, c))
        self.motif = Motif(R[r], CONTOURS[c])
        self.horn, self.rng_lo = {}, {}  # voices that bend into long notes like a horn; the lowest a harmony may go
        self.bend = {}  # voices that can bend a note (horns, guitars), for blue notes
        self.home = {key % 12, (key + 4) % 12, (key + 7) % 12}  # the tonic chord's tones, where a cadence lands
        self.chrom = .35 if feel in ('swing', 'blues', 'funk') else .2 if feel == 'ballad' else .15  # chromatic approach rate

    # ---- one phrase: a motif realised over the chords from a starting pitch
    def realise(self, voice, t0, m, lo, hi, prev, vel, cadence=False, harm=None, susp=.0, home=None):
        b, rng = self.b, self.rng; out = []
        n = len(m.rhythm)
        for i, ((on, dur, acc), c) in enumerate(zip(m.rhythm, m.contour + (m.contour[1:] or [1]) * n)):  # a rhythm longer than its contour takes the contour round again
            t = t0 + on; ch = b.chart.at(t + .51) if (on % 1) > .49 and dur >= 1 else b.chart.at(t)  # a long note on an offbeat belongs to the chord it pushes into
            pcs = set(scale(ch)); strong = (on % 1 == 0 and on % 2 == 0) or dur >= 1.5 or acc
            sp = self.strong(ch)
            if self.blue_i(ch): pcs |= {(self.key + 3) % 12, (self.key + 6) % 12}  # the blues scale over the tonic
            p = step(prev, c, pcs, lo, hi) if c else nearest(sp, prev, lo, hi)
            if i == 0 and home is not None: p = nearest(sp, home, lo, hi)
            last = i == n - 1
            if last: p = nearest((self.home & strong_pcs(ch)) or land_pcs(ch), p, lo, hi) if cadence else nearest(land_pcs(ch), p, lo, hi)
            elif strong and p % 12 not in sp: p = nearest(sp, p, lo, hi, 1 if c >= 0 else -1)
            elif not strong and i + 1 < n:  # a passing note leads by step to where the next strong note will be
                nt = t0 + m.rhythm[i + 1][0]; nxt = nearest(self.strong(b.chart.at(nt)), p, lo, hi)
                if abs(nxt - p) > 4: p = step(nxt, 1 if p > nxt else -1, set(scale(b.chart.at(t))), lo, hi)
            if p % 12 not in pcs: p = nearest(pcs, p, lo, hi)
            # a suspension: over a new chord on the downbeat, the last note is held a moment and resolves down a step
            changes = any(abs(st + math.floor(t / 4) * 4 - t) < 1e-6 for st, _ in b.chart.bars[min(len(b.chart.bars) - 1, int(t // 4))])
            if susp and out and dur >= 1 and on % 1 == 0 and changes and rng.random() < susp:
                q = out[-1][2]; res = nearest(strong_pcs(ch), q - 1, lo, hi, -1)
                if 1 <= q - res <= 2 and q % 12 not in strong_pcs(ch):
                    out.append((t, min(1, dur / 2), q, vel - 2)); out.append((t + min(1, dur / 2), dur - min(1, dur / 2), res, vel - 6)); prev = res; continue
            out.append((t, dur, p, vel + (6 if acc else 0) - (4 if last and not cadence else 0)))
            prev = p
        # chromatic approach: a short note just before a long one slides into it from a half step away
        for i in range(1, len(out) - 1):
            t, d, p, v = out[i]; t2, d2, p2, v2 = out[i + 1]
            if d <= .55 and d2 >= .9 and 1 <= abs(p2 - p) <= 4 and abs(t + d - t2) < .3 and rng.random() < self.chrom:
                q = p2 - 1 if p < p2 or rng.random() < .3 else p2 + 1
                if lo <= q <= hi and q != out[i - 1][2]: out[i] = (t, d, q, v - 4)
        # phrase dynamics: the in-between eighths ghosted, the phrase's peak leaned on
        if out:
            peak = max(o[2] for o in out)
            out = [(t, d, p, v - (7 if (t % 1) > .01 and d <= .55 else 0) + (5 if p == peak else 0)) for t, d, p, v in out]
        for j, (t, dur, p, v) in enumerate(out):
            if self.bend.get(voice) and self.feel == 'blues' and p % 12 == (self.key + 4) % 12 and dur >= .5 and rng.random() < .55:
                # a blue note: start a half step flat and bend up into the major 3rd
                b.play(voice, t, dur, p, v + rng.randint(-3, 3), horn=False); ch_ = b.chans[voice]
                b.ccs += [(ch_, t - .01, 'bend', -4096), (ch_, t + .18, 'bend', -1800), (ch_, t + .34, 'bend', 0)]
            else: b.play(voice, t, dur, p, v + rng.randint(-3, 3), horn=self.horn.get(voice, True), fall=j == len(out) - 1 and not cadence and dur >= 1)
            self.mel.append((t, dur, p))
            if harm: self.harmony(harm, t, dur, p, v - 10)
        return prev

    def blue_i(self, ch):  # the tonic (or a I7 in the blues): where the blue 3rd and 5th belong
        return self.feel == 'blues' and (ch[0] - self.key) % 12 == 0 and ch[1] in ('7', '7#9')

    def strong(self, ch):  # chord tones fit for a strong beat; in the blues the b3 (a #9) may sit on the tonic
        return strong_pcs(ch) | ({(self.key + 3) % 12} if self.blue_i(ch) else set())

    # ---- an improvised chorus that grows out of the tune: it opens by quoting the head's motif, develops it (answered,
    # extended from its own tail, busier), runs lines over the changes as it climbs to a peak about two thirds through
    # (louder and higher as it goes), and comes home on the motif's fragment
    def solo(self, voice, seg, lo, hi, vel, density):
        rng = self.rng; st, nb, _ = seg; slots = max(2, nb // 2)
        peak = max(1, min(slots - 2, round((slots - 1) * .66))); prev = (lo + hi) // 2 - 2
        for i in range(slots):
            t0 = (st + 2 * i) * 4; x = i / max(1, slots - 1)
            lvl = .45 + .55 * (x / .66 if x < .66 else 1 - (x - .66) / .34 * .5)
            v = vel - 10 + int(18 * lvl); home = (lo + hi) // 2 - 4 + int((hi - lo) * .32 * lvl)
            if i == 0: prev = self.realise(voice, t0, self.motif, lo, hi, prev, v, home=home)
            elif i == slots - 1: prev = self.realise(voice, t0, self.motif.fragment(), lo, hi, prev, v, cadence=True)
            elif i == peak or rng.random() < density + .2 * lvl: prev = self.line(voice, t0, lo, hi, prev, v, lvl, peak=i == peak)
            else:
                m = rng.choice([self.motif.inverted(), self.motif.busier(rng), self.motif.inverted().busier(rng)])
                prev = self.realise(voice, t0, m, lo, hi, prev, v, home=home)

    # a soloist's running line over two bars: eighths that aim at the guide tones of the chords ahead and reach them by
    # an enclosure (the note above, the half step below, then the note) or a half step, an arpeggio up or down a chord
    # now and then, a breath in the middle when the chorus is still quiet, and a long note to end (held high at the peak)
    def line(self, voice, t0, lo, hi, prev, vel, lvl, peak=False):
        b, rng = self.b, self.rng
        start = rng.choice([0, .5]) if peak else rng.choice([.5, 1, 1.5])
        stop = min(7, math.floor((4.5 + 2.5 * lvl) * 2) / 2)  # where the last, long note starts
        pos = [start + k * .5 for k in range(int(round((stop - start) * 2)))]
        held = set()
        if lvl < .78 and len(pos) >= 8 and rng.random() < .65:  # a breath: the note before it is a quarter, then a rest
            g = len(pos) // 2 + rng.choice([-1, 0]); held.add(pos[g - 1]); pos = pos[:g] + pos[g + 2:]
        d = 1 if peak or prev < (lo + hi) / 2 else -1; p = prev; queue = []; out = []
        for i, u in enumerate(pos):
            t = t0 + u; ch = b.chart.at(t); pcs = set(scale(ch))
            if self.blue_i(ch): pcs |= {(self.key + 3) % 12, (self.key + 6) % 12}
            run = lambda k: i + k < len(pos) and abs(pos[i + k] - u - k * .5) < 1e-6  # the line runs on unbroken for k more eighths
            if queue: q = queue.pop(0)
            else:
                if p >= hi - 3: d = -1
                elif p <= lo + 3: d = 1
                elif rng.random() < .15: d = -d
                if run(2) and pos[i + 2] % 2 == 0 and rng.random() < self.chrom + .2:  # an enclosure of the guide tone two eighths on
                    tch = b.chart.at(t0 + pos[i + 2]); tgt = nearest(land_pcs(tch), p + d * 2, lo + 1, hi - 1, d)
                    q = step(tgt, 1, set(scale(tch)), lo, hi + 2); queue = [tgt - 1, tgt]
                elif run(1) and pos[i + 1] % 2 == 0:  # the next eighth is a strong beat: lead into its guide tone
                    tch = b.chart.at(t0 + pos[i + 1]); tgt = nearest(land_pcs(tch), p + d, lo + 1, hi - 1, d)
                    q = tgt - 1 if tgt > p or rng.random() < .3 else step(tgt, 1, set(scale(tch)), lo, hi + 2)
                    queue = [tgt]
                elif u % 2 == 0 and run(3) and rng.random() < .3:  # an arpeggio through the chord, then turn round
                    ct = tones(ch, (1, 3, 5, 7, 9)); q = nearest(ct, p, lo, hi); x = q
                    for _ in range(3): x = step(x, d, ct, lo, hi); queue.append(x)
                    if abs(queue[-1] - q) > 12: queue = []  # it wrapped round the range: walk instead
                    d = -d
                else: q = step(p, d, pcs, lo, hi)
            if out and q == out[-1][2]: q = step(q, d, pcs, lo, hi)
            p = fit(q, lo, hi); out.append((t, 1 if u in held else .5, p))
        # the long note that ends it: a guide tone, reached high at the peak; it may ring over the barline
        t = t0 + stop; ch = b.chart.at(t + .51) if stop % 1 else b.chart.at(t)
        p = nearest(land_pcs(ch), max(p, hi - 5) if peak else p + d, lo, hi)
        if out and p == out[-1][2]: p = nearest(land_pcs(ch) - {p % 12} or land_pcs(ch), p + (2 if peak else -2), lo, hi)
        out.append((t, 2 if peak else rng.choice([1.5, 2]) if stop <= 6 else 1.5, p))
        top = max(o[2] for o in out)
        for j, (t, dur, q) in enumerate(out):
            last = j == len(out) - 1; off = (t % 1) > .01
            v = vel + (5 if off else 0) + (5 if q == top else 0) - (14 if off and not last and rng.random() < .12 else 0) + ((4 if peak else -4) if last else 0)
            b.play(voice, t, dur, q, v + rng.randint(-3, 3), horn=self.horn.get(voice, True), fall=last)
            self.mel.append((t, dur, q))
        return p

    # ---- the big band's shout chorus: one voice (the lead trumpet) on the motif, loud; the band voices the section under it
    def shout(self, voice, seg, lo, hi, vel):
        st, nb, _ = seg; prev = (lo + hi) // 2 + 2
        for k in range(0, nb, 2):
            slot = k // 2 % 4; t0 = (st + k) * 4
            m = self.motif.busier(self.rng) if slot in (0, 2) else self.motif.inverted() if slot == 1 else self.motif.fragment()
            prev = self.realise(voice, t0, m, lo, hi, prev, vel + (4 if slot == 2 else 0), cadence=slot == 3, home=prev + 3 if slot == 2 else None)
        return prev

    # a harmony voice: a 3rd or a 6th under the lead, on a chord tone (a 4th or 5th only if nothing else fits)
    def harmony(self, voice, t, dur, p, vel):
        ch = self.b.chart.at(t); good = strong_pcs(ch)
        for gap in (3, 4, 8, 9, 5, 7):
            x = p - gap
            if x % 12 in good and x >= self.rng_lo.get(voice, 40):
                self.b.play(voice, t, dur, x, vel, horn=self.horn.get(voice, True)); self.mel.append((t, dur, x)); return

    # ---- the plan
    def converse(self, voices, segs, lo_hi, vel, phase, intensity=None):
        """Lay the melody over a run of sections. phase: 'head', 'talk' (the conversation) or 'out' (in harmony)."""
        rng, b = self.rng, self.b; L, A = voices; (llo, lhi), (alo, ahi) = lo_hi[L], lo_hi[A]
        prev = {L: (llo + lhi) // 2 + 2, A: (alo + ahi) // 2}
        last = self.motif; slots = []
        for st, nb, sec in segs:  # (first bar, bars, section name)
            for k in range(0, nb, 2): slots.append((st + k, k, nb, sec))
        total = len(slots)
        for i, (bar, k, nb, sec) in enumerate(slots):
            t0 = bar * 4; x = i / max(1, total - 1); end_of_sec = k + 2 >= nb
            if k == 0: seen = sum(1 for s2 in slots[:i] if s2[1] == 0 and s2[3] == sec)  # how many times this section has come round
            if phase == 'head':
                if sec.startswith('B'):  # the bridge develops: a fragment rising, answered
                    who = L if (k // 2) % 2 == 0 else A
                    m = self.motif.fragment() if who == L else self.motif.fragment().inverted()
                    h = prev[who] + (2 * (k // 2) if who == L else 0)
                    prev[who] = self.realise(who, t0, m, *lo_hi[who], prev[who], vel[who], susp=.5 if end_of_sec else .2, home=h)
                    continue
                slot = k // 2 % 4
                if slot == 0: prev[L] = self.realise(L, t0, self.motif, llo, lhi, prev[L], vel[L])
                elif slot == 1: prev[A] = self.realise(A, t0, self.motif.inverted() if seen % 2 == 0 else self.motif.inverted().busier(rng), alo, ahi, prev[A], vel[A], home=prev[L] - 12 if prev[L] - 12 >= alo else prev[L])
                elif slot == 2: prev[L] = self.realise(L, t0, self.motif, llo, lhi, prev[L], vel[L], home=prev[L] + 2)
                else:
                    prev[L] = self.realise(L, t0, self.motif.fragment(), llo, lhi, prev[L], vel[L], cadence=True, harm=A, susp=.35)
                    # and the answer has the last word: the motif's tail, quietly, leading back to the top
                    prev[A] = self.realise(A, t0 + 5, self.motif.tail(3).inverted() if seen % 2 else self.motif.tail(2), alo, ahi, prev[A], vel[A] - 10)
            elif phase == 'talk':
                lvl = intensity(x) if intensity else .5
                who = L if i % 2 == 0 else A
                if lvl > .8 and i < total - 1 and rng.random() < .5:  # near the peak a voice lets go and runs a line
                    prev[who] = self.line(who, t0, *lo_hi[who], prev[who], vel[who] - 8 + int(16 * lvl), lvl, peak=lvl > .97); continue
                base = last.tail() if rng.random() < .55 and i else self.motif
                # pick up the last phrase's tail, then carry on in the motif's rhythm
                off = base.rhythm[-1][0] + base.rhythm[-1][1] + .5; ext = [(o + off, d, a) for o, d, a in self.motif.rhythm]
                keep = [k for k, (o, d, a) in enumerate(ext) if base.rhythm[-1][0] + .25 < o < 7.5]  # (a pickup may lean back onto the tail's last note)
                co = self.motif.contour if who == L else self.motif.inverted().contour
                m = Motif(base.rhythm + [ext[k] for k in keep], base.contour + [co[k] if k < len(co) else 0 for k in keep])
                m.rhythm = [r for r in m.rhythm if r[0] < 7.5]; m.contour = m.contour[:len(m.rhythm)]
                if lvl > .55: m = m.busier(rng)
                lo, hi = lo_hi[who]; lift = int((hi - lo) * .35 * lvl)
                home = (lo + hi) // 2 - 3 + lift if i == 0 else None
                v = vel[who] - 8 + int(16 * lvl)
                prev[who] = self.realise(who, t0, m, lo, hi, prev[who] if home is None else home, v, susp=.25 if end_of_sec else 0, cadence=end_of_sec and i == total - 1)
                last = m
            else:  # 'out': the head again, the voices together
                slot = k // 2 % 4
                m = self.motif if slot in (0, 2) else self.motif.inverted() if slot == 1 else self.motif.fragment()
                if sec.startswith('B'): m = self.motif.fragment() if (k // 2) % 2 == 0 else self.motif.fragment().inverted()
                prev[L] = self.realise(L, t0, m, llo, lhi, prev[L], vel[L], harm=A, cadence=slot == 3 or end_of_sec, susp=.3 if end_of_sec else 0)
        return prev

    def coda(self, voices, bar, lo_hi, vel, slow=True):
        L, A = voices; m = self.motif.fragment().augmented() if slow else self.motif.fragment()
        p = self.realise(L, bar * 4, m, *lo_hi[L], (lo_hi[L][0] + lo_hi[L][1]) // 2, vel[L] - 8, cadence=True, harm=A)
        return p

    # ---- the comping steps out of the melody's way
    def clear_comp(self, comp_names):
        chans = {self.b.chans[n] for n in comp_names}; mel = sorted(self.mel)
        keep = []
        for nt in self.b.notes:
            ch, t, dur, p, vel, ns = nt
            if ch in chans:
                over = [m for m in mel if m[0] < t + dur - .05 and m[0] + m[1] > t + .05]
                if over:
                    top = min(m[2] for m in over)
                    if p > top - 2:
                        p2 = p - 12
                        if p2 < 40 or any((m[2] - p2) % 12 in (1, 11) for m in over): continue
                        nt = (ch, t, dur, p2, vel, ns); p = p2
                    if any(((m[2] - p) % 12 == 1 or (p - m[2]) % 12 == 1) and m[1] > .6 for m in over): continue
            keep.append(nt)
        self.b.notes = keep

    # the bass walks round a held melody note: a passing bass note a half step (or a major 7th) from a long melody
    # note is moved to the nearest chord tone, so the only rubs left are short and on the way somewhere
    def clear_bass(self, name='bass'):
        ch_b = self.b.chans[name]; mel = [m for m in self.mel if m[1] >= .9]; out = []
        for nt in self.b.notes:
            ch, t, dur, p, vel, ns = nt
            if ch == ch_b:
                over = [m for m in mel if m[0] < t + dur - .1 and m[0] + m[1] > t + .1]
                if any((m[2] - p) % 12 in (1, 11) for m in over):
                    pcs = tones(self.b.chart.at(t)); cands = [x for x in range(p - 4, p + 5) if x % 12 in pcs and not any((m[2] - x) % 12 in (1, 11) for m in over)]
                    if cands: nt = (ch, t, dur, min(cands, key=lambda x: abs(x - p)), vel, ns)
            out.append(nt)
        self.b.notes = out
