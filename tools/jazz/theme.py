# The game's theme, "Rolling Paradise": one tune, written by hand, played by the lounge band in each of its eight
# styles (and each again on 8-bit chips). The title screen plays it: a different style opens the game each time, and
# when one version ends the next style takes the same tune up (js/ui/music.js, THEME in js/content/theme.js).
#
#   python3 tools/jazz/theme.py            # every style, band and chip, and js/content/theme.js
#   python3 tools/jazz/theme.py swing funk # only these
#
# The tune is a 32-bar AABA in C (moved to each style's key). Its hook is the first bar: a three-note pickup up to the
# 3rd, a stop, then three notes back down ("da da da DAT ... da da DAAT"), answered a bar later by the blue note
# sliding into the next chord's 3rd; the second phrase is the same shape a step up. The bridge runs round the cycle
# of fifths (E7 A7 D7 G7), a bar of call and a bar of answer on each, and stops dead on the G7 for the pickup back.
#
# How it is arranged, so it lands as a theme and not as one more tune in the set:
#   - an intro where the answering voice calls the hook over a turnaround, the band coming in on a crash
#   - the head: the lead alone the first time; the second voice under its long notes the second time; the two
#     trading the bridge bar for bar; the whole of the last eight in harmony (a piano lead doubles itself in octaves)
#   - breaks: the band stops on beat one of the last bar of the second and last eights and of the bridge, and the
#     drums fill into what comes next; the big band's section kicks into every fourth bar
#   - where the style has the time for it, improvised choruses built on the hook (story.py), the big band's as a
#     shout chorus: the brass on the tune itself in four-part harmony
#   - the bridge and last eight again, a tag (the last two bars once more), and an ending in stop time: two hits on
#     the tune's accents and a last chord (in the swinging styles a short hit and a stinger; in the others a ritard)
import os, sys, json, random
from multiprocessing import Pool
from engine import Band, tones
from story import Story, Motif, transpose, strong_pcs
from setlist import (G, SOLO, LEAN, BUTTON, voicing, UPRIGHT, FINGER, FRETLESS, TRUMPET, TROMBONE, JAZZ_GTR, BRUSH_KIT,
                     VIB, PNO, GTR, CGTR, RHO, MTPT, TEN, FLU, SOP, TPT)
from loops import pitch

TITLE = 'Rolling Paradise'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# ---------- the tune, in C ----------
CHART = {
    'I': 'C6 A7 | Dm7 G7 | C6 A7 | Dm7 G7',
    'A1': 'C6 | A7 | Dm7 | G7 | C6 C7 | F6 Fm6 | C6 A7 | Dm7 G7',
    'A2': 'C6 | A7 | Dm7 | G7 | C6 C7 | F6 Fm6 | Dm7 G7 | C6',
    'B': 'E7 | E7 | A7 | A7 | D7 | D7 | G7 | G7',
    'T': 'Dm7 G7 | C6', 'Z': 'Dm7 G7 | C6',
}
PICKUP = 'r:2.5 G4:.5 A4:.5 C5:.5'  # the last bar before the tune starts
HOOK = ('E5:1 r:.5 E5:.5 D5:.5 C5:1 A4:.5 | C5:.5 C#5:2 r:.5 A4:.5 C#5:.5 | F5:1 r:.5 F5:.5 E5:.5 D5:1 A4:.5 | D5:.5 B4:2 r:.5 G4:.5 B4:.5 | '
        'E5:.5 G5:.5 C6:1.5 Bb5:.5 G5:.5 E5:.5 | A5:1.5 F5:.5 Ab5:1.5 F5:.5 | ')
CLOSE = 'F5:.5 A5:.5 r:.5 G5:1 r:.5 B4:.5 D5:.5 | '  # the last two bars' first: down to the cadence
TUNE = {
    'A1': HOOK + 'G5:1 E5:.5 C5:.5 C#5:.5 E5:.5 A5:1 | F5:.5 D5:.5 A4:.5 r:1 G4:.5 A4:.5 C5:.5',  # round again
    'A2': HOOK + CLOSE + 'C5:1 r:1.5 E5:.5 F#5:.5 G#5:.5',  # home, and the pickup up into the bridge
    'B': ('B5:1.5 G#5:.5 E5:1 D5:.5 E5:.5 | G#5:.5 B5:.5 D6:2 r:.5 C#6:.5 | A5:1.5 E5:.5 C#5:1 B4:.5 C#5:.5 | C#5:.5 E5:.5 G5:2 r:.5 F#5:.5 | '
          'A5:1.5 F#5:.5 D5:1 C5:.5 D5:.5 | F#5:.5 A5:.5 C6:2 r:.5 B5:.5 | D6:1 B5:.5 G5:.5 F5:1 D5:.5 B4:.5 | D5:1 r:1.5 G4:.5 A4:.5 C5:.5'),
    'A3': HOOK + CLOSE + 'C5:1 r:3',
    'T': CLOSE + 'C5:1 r:3', 'Z': CLOSE + 'r:4',
}
# the answering voice's call in the intro: the hook's bar, and a tail
CALL = 'E5:1 r:.5 E5:.5 D5:.5 C5:1 A4:.5 | D5:1.5 B4:.5 r:2 | E5:1 r:.5 E5:.5 D5:.5 C5:1 A4:.5 | D5:1 B4:1 r:2'
# the hook as a motif, for the improvised choruses to open on, develop and come home to
MOTIF = Motif([(-1.5, .5, 0), (-1, .5, 0), (-.5, .5, 0), (0, 1, 1), (1.5, .5, 0), (2, .5, 0), (2.5, 1, 1), (3.5, .5, 0), (4, .5, 0), (4.5, 2, 1)],
              [0, 1, 2, 2, 0, -1, -1, -2, 2, 0])

# ---------- the eight versions: (style, semitones up from C, tempo, lead, answer, the sections after the head) ----------
# 'S' a chorus improvised by the lead, 's' by the answer, '!' the big band's shout chorus; then what of the tune comes back
STYLES = [
    ('swing', -2, 152, PNO, MTPT, ['S', 's', 'B', 'A3']),
    ('bossa', -3, 132, VIB, FLU, ['S', 'B', 'A3']),
    ('bigband', 0, 176, PNO, (TRUMPET, 'trumpets', 60, 80), ['S', '!', 'B', 'A3']),
    ('ballad', -9, 72, GTR, TEN, []),
    ('funk', -8, 108, RHO, TPT, ['S', 'A3']),
    ('jump', -4, 160, PNO, TEN, ['S', 's', 'B', 'A3']),
    ('smooth', -5, 104, CGTR, SOP, ['S', 'A3']),
    ('organ', -7, 132, VIB, GTR, ['S', 'A3']),
]


def parse(text):
    """'G4:1 r:.5 | ...' -> [(beat, length, pitch)], every bar checked to add up to four beats."""
    out = []
    for bar, cell in enumerate(text.split('|')):
        t = bar * 4
        for tok in cell.split():
            p, d = tok.split(':'); d = float(d)
            if p != 'r': out.append((t, d, pitch(p)))
            t += d
        assert abs(t - (bar + 1) * 4) < 1e-6, f'bar {bar + 1} adds up to {t - bar * 4} beats: {cell}'
    return out


def build(genre, shift, bpm, lead, answer, after, rng):
    g = G[genre]; key = shift % 12; b = Band(f'{TITLE} ({genre})', bpm, g['swing'], rng); b.mode = 'major'
    wind = lambda prog: 56 <= prog <= 79
    fam = lambda prog: prog // 8
    cname, cprog, cstyle = g['comp']
    b.chan('lead', 0, lead[0], 96 if wind(lead[0]) else 104, 74, 40)
    b.chan('answer', 3, answer[0], 92 if wind(answer[0]) else 90, 48, 55)
    b.chan(cname, 1, cprog, 72 if fam(cprog) == 2 else 82, 56, 40, 70 if fam(cprog) == 2 else 20)
    b.chan('bass', 2, {'funk': FINGER, 'smooth': FRETLESS}.get(g['bass'], UPRIGHT), 110, 62, 25)
    dstyle, dkit, _ = g['drums']; b.chan('drums', 9, dkit, 96, 64, 35)
    comp2 = g['comp2'][0] if g.get('comp2') else None
    if comp2: b.chan(comp2, 4, g['comp2'][1], 66, 92, 30)
    if g.get('pad'): b.chan('pad', 5, g['pad'][0], 52, 64, 80)
    brass = ('brassA', 'brassA2', 'brassB', 'brassB2') if g.get('section') else ()
    if brass:
        b.chan('answer2', 7, answer[0], 84, 36, 55); b.chan('answer3', 11, answer[0], 78, 26, 55)
        b.chan('brassA', 8, TRUMPET, 92, 34, 55); b.chan('brassA2', 12, TRUMPET, 84, 44, 55); b.chan('brassB', 13, TROMBONE, 88, 90, 55); b.chan('brassB2', 14, TROMBONE, 82, 100, 55)
    lean = LEAN[genre]
    b.lean = {0: lean, 3: lean + 4, 7: lean + 6, 11: lean + 6, 1: lean // 3, 4: 0, 5: lean // 2, 2: -3 if g['bass'] == 'walk' else 0, 8: lean + 3, 12: lean + 4, 13: lean + 5, 14: lean + 6}
    rhythm = [cname, 'bass', 'drums'] + ([comp2] if comp2 else [])

    # ---- the form
    slow = genre == 'ballad'; button = genre in BUTTON or g['feel'] in ('swing', 'blues')
    order = ['I', 'A1', 'A2', 'B', 'A3'] + after + ['T', 'Z']
    text = {'I': ' | '.join(CHART['I'].split('|')[-2:]) if slow else CHART['I'], 'A1': CHART['A1'], 'A2': CHART['A2'], 'A3': CHART['A2'], 'B': CHART['B'],
            'S': CHART['A2'], 's': CHART['A2'], '!': CHART['A2'], 'T': CHART['T'], 'Z': CHART['Z']}
    segs = []
    for name in order: s0 = len(b.chart.bars); b.chart.add(transpose(text[name], key)); segs.append((s0, len(b.chart.bars) - s0, name))
    n = len(b.chart.bars); at = lambda name, k=0: [s for s in segs if s[2] == name][k]
    head0, tag0, z0 = segs[1][0], at('T')[0], at('Z')[0]
    solos = [s for s in segs if s[2] in ('S', 's', '!')]
    back0 = segs[5 + len(solos)][0]  # where the tune comes back after the choruses (or the tag, if it goes straight there)

    # ---- the rhythm section
    b.comp(cname, 0, z0, cstyle, 50, 70, 58)
    if comp2: b.comp(comp2, head0, z0, g['comp2'][2], vel=54)
    if g.get('pad'): b.comp('pad', head0, n, 'pad', 55, 72, g['pad'][1])
    bass = g['bass']; walk_from = at('B')[0] if bass == 'walk' and genre in ('swing', 'bigband') else head0
    if bass == 'walk': b.bass(0, walk_from, 'two'); b.bass(walk_from, z0, 'walk', vel=90)
    elif bass == 'two': b.bass(0, z0, 'two', lo=33, vel=84)
    else: b.bass(0, z0, bass, vel=92)
    tops = {s[0] for s in segs[1:]}
    b.drums(head0 if dstyle == 'brush' else 0, z0, dstyle, 78, fills={s - 1 for s in tops}, crash=({0} | {s[0] for s in segs if s[2] in ('A3', 'S', '!', 'T')}) if dstyle not in ('brush', 'bossa') else set())

    # ---- the tune
    st = Story(b, g['feel'], key, rng); st.motif = MOTIF
    zc = b.chart.at((n - 1) * 4); st.home = tones(zc, (1, 3, 5))
    st.horn = {'lead': wind(lead[0]), 'answer': wind(answer[0]), 'brassA': True}
    st.bend = {'lead': 24 <= lead[0] <= 31 or wind(lead[0]), 'answer': 24 <= answer[0] <= 31 or wind(answer[0]), 'brassA': True}
    st.rng_lo = {'lead': lead[2] - 7, 'answer': answer[2] - 7}
    octaves = lead[0] == PNO[0]  # a piano doubles its line an octave down when the whole band is in
    def fit(notes, lo, hi, up=shift):  # the octave that sits a line in a voice's range
        mid = sum(p for _, _, p in notes) / len(notes) + up
        return up + 12 * round(((lo + hi) / 2 - mid) / 12)
    def sing(voice, notes, t0, up, vel, harm=None, long=0, double=False):
        last = max(t for t, _, _ in notes)
        for t, du, p in notes:
            v = vel + (5 if du >= 1.5 else 0) - (6 if t % 1 and du <= .5 else 0)
            b.play(voice, t0 + t, du, p + up, v, horn=st.horn[voice], fall=t == last and du >= 1.5); st.mel.append((t0 + t, du, p + up))
            if harm and du >= long: st.harmony(harm, t0 + t, du, p + up, v - 12)
            if double: b.note(voice, t0 + t, du * .95, p + up - 12, v - 16)
    up = fit(parse(TUNE['A1']), lead[2], lead[3]); ans_up = fit(parse(TUNE['B']), answer[2], answer[3])
    def tune(seg, full):  # a section of the tune; full: the whole band is in (the last eight, and every time it comes back)
        s0, _, name = seg; t0 = s0 * 4; notes = parse(TUNE[name]); vel = 98 if full else 92
        if name == 'B':  # the bridge is traded: the lead calls a bar, the answer takes the next (the lead keeps its own pickups)
            mine = [x for x in notes if (x[0] // 4) % 2 == 0 or x[0] // 4 >= 6 or x[0] % 4 >= 3.4]
            sing('lead', mine, t0, up, vel, harm='answer' if full else None, long=1, double=octaves and full)
            sing('answer', [x for x in notes if x not in mine], t0, ans_up, vel - 6)
        else: sing('lead', notes, t0, up, vel, harm=None if name == 'A1' else 'answer', long=0 if full or name in 'TZ' else 1, double=octaves and (full or name in 'TZ'))
    if not slow: sing('answer', parse(CALL), 0, fit(parse(CALL), answer[2], answer[3]), 86)
    sing('lead', parse(PICKUP), (head0 - 1) * 4, up, 92)
    for seg in segs[1:5]: tune(seg, seg[2] == 'A3')
    # ---- the choruses
    lo_hi = {'lead': lead[2:], 'answer': answer[2:]}
    for seg in solos:
        if seg[2] == 'S': st.solo('lead', seg, *lo_hi['lead'], 92, SOLO[genre])
        elif seg[2] == 's': st.solo('answer', seg, *lo_hi['answer'], 86, SOLO[genre])
        else: sing('brassA', parse(TUNE['A3']), seg[0] * 4, fit(parse(TUNE['A3']), 62, 84), 102)  # the shout chorus: the brass on the tune
    # ---- the tune comes back, the tag, the ending
    for seg in segs[5 + len(solos):]:
        if seg[2] == 'B' and solos: sing('lead', parse('r:2.5 E5:.5 F#5:.5 G#5:.5'), (seg[0] - 1) * 4, up, 96)  # (the pickup into the bridge, over the chorus's last bar)
        if seg[2] == 'A3' and segs[segs.index(seg) - 1][2] in ('S', 's', '!'): sing('lead', parse(PICKUP), (seg[0] - 1) * 4, up, 96)
        tune(seg, True)
    b.articulate(['lead', 'answer', 'brassA'], detach=.68 if g['feel'] in ('swing', 'blues') and bpm >= 90 else 0)
    # the last chord: the lead on the tonic at the top of its range, the answer under it
    th = (n - 1) * 4; top = max(x for x in range(lead[2], lead[3] + 1) if x % 12 == key)
    under = next((top - gp for gp in (3, 4, 8, 9, 5) if (top - gp) % 12 in tones(zc)), top - 12)

    # ---- sections of horns: the shout chorus in block harmony, the answering section in three parts, the kicks
    def under_all(src, parts, gaps, drop=8):
        for (ch, t, dur, p, v, ns) in [x for x in b.notes if x[0] == b.chans[src]]:
            cht = b.chart.at(t + .51) if (t % 1) > .49 and dur >= .6 else b.chart.at(t)
            good = strong_pcs(cht) | tones(cht); x = p
            for part in parts:
                x = next((x - gap for gap in gaps if (x - gap) % 12 in good), x - 4)
                b.notes.append((b.chans[part], t, dur, x, max(1, v - drop), ns))
    if brass:
        under_all('brassA', brass[1:], (3, 4, 5, 2, 6)); under_all('answer', ('answer2', 'answer3'), (3, 4, 5, 8), 12)
        for s0, nb, name in segs[1:]:
            if name in ('S', 's', '!', 'T', 'Z'): continue
            for bar in range(s0 + 3, s0 + nb - 1, 4):  # into every fourth bar (the eighth is a break)
                t0 = bar * 4
                for o, du, vv in ((2.5, .3, 86), (3.5, 1.0, 96)):
                    for i, x in enumerate(voicing(b.chart.at(t0 + o + .51), 55, 79)[::-1]): b.note(brass[i], t0 + o, du, x, vv - 4 * i + rng.randint(-3, 3))
                    for d_, v_ in ((38, 92), (36, 96)): b.note('drums', t0 + o, .1, d_, v_)
                b.note('drums', t0 + 2, .1, 38, 70)
    st.clear_bass(); st.clear_comp([cname] + ([comp2] if comp2 else []) + (['pad'] if g.get('pad') else []))

    # ---- dynamics: the band grows through the head, sits under the first chorus, and plays out when the tune returns
    def dyn(t):
        bar = t / 4
        if bar < head0: return .9
        if bar < at('B')[0]: return .92 if bar < at('A2')[0] else .98
        if bar < segs[5][0]: return 1.02 if bar < at('A3')[0] else 1.1
        if bar < back0: return 1.2 if any(s[2] == '!' and s[0] <= bar for s in solos) else .9 + .22 * (bar - segs[5][0]) / max(1, back0 - segs[5][0])
        return 1.16
    soft = .5 if slow else 1
    b.shape(rhythm, lambda t: 1 + (dyn(t) - 1) * soft)

    # ---- breaks and stop time: the band stops together and the drums fill
    brushes = dkit == BRUSH_KIT
    def hit(t, dur=.5, vel=100, crash=True):
        ch = b.chart.at(t + .01)
        for x in voicing(ch): b.note(cname, t, dur, x, vel - 14, tri=True)
        if comp2:
            for x in voicing(ch, 62, 78)[-3:]: b.note(comp2, t, min(dur, .3), x, vel - 18, tri=True)
        r = 24 + ch[0] % 12; b.note('bass', t, dur + .1, r + 12 if r < 31 else r, vel, tri=True)
        for d_, v_ in ((36, vel), (38, vel - 10)) + (((49, vel - 4),) if crash and not brushes else ()): b.note('drums', t, .4, d_, v_ - (30 if brushes else 0), tri=True)
        for i, part in enumerate(brass):
            b.note(part, t, dur, voicing(ch, 55, 79)[::-1][i], vel - 6 - 4 * i, tri=True)
    def clear(bar, upto=4.0):  # the rhythm section lays out from just after beat one of a bar
        t0, t1 = bar * 4, bar * 4 + upto; chans = {b.chans[x] for x in rhythm}; kept = []
        for x in b.notes:
            if x[0] in chans and t0 - .01 <= x[1] < t1: continue
            if x[0] in chans and x[1] < t0 and x[1] + x[2] > t0 + .4: x = (x[0], x[1], t0 + .4 - x[1], *x[3:])
            kept.append(x)
        b.notes = kept
    def fill(bar, start=2.0):  # the drums back in: a run round the kit into the next bar
        steps = [start + k * .5 for k in range(int(round((4 - start) * 2)))]
        for i, o in enumerate(steps): b.note('drums', bar * 4 + o, .1, 38 if brushes or i < len(steps) - 2 else (45, 41)[i - len(steps) + 2], (52 if brushes else 78) + i * (4 if brushes else 6))
    for s0, nb, name in segs:
        if name in ('A2', 'A3', 'B', 'T', '!', 'S', 's'):
            clear(s0 + nb - 1); hit((s0 + nb - 1) * 4, crash=False); fill(s0 + nb - 1, 2.0 if name != 'B' else 1.0)
    # the ending: stop time under the tune's last phrase (hits on its accents), then the last chord
    clear(z0); hit(z0 * 4, .4); hit(z0 * 4 + 1.5, .8, 104); fill(z0, 3.0)
    clear(z0 + 1)
    if button:  # a short hit, and the stinger
        for t, du, v in ((th, .4, 106), (th + 2, 3.2, 112)):
            hit(t, du, v); b.note('lead', t, du, top, v, tri=True); b.note('answer', t, du, under, v - 8, tri=True)
            if octaves: b.note('lead', t, du, top - 12, v - 10, tri=True)
        b.ending(n - 1, None, ritard=False)
    else:  # a ritard through the last phrase into a chord that rings
        t = b.ending(n - 1, None)
        hit(t, 6, 92, crash=False); b.note('lead', t, 6, top, 96); b.note('answer', t, 6, under, 84)
        b.note('drums', t, 6, 49 if not brushes else 38, 70 if not brushes else 40)
    return b, f"{g['era']}: {lead[1]} and {answer[1]}", key


def version(i):
    genre, shift, bpm, lead, answer, after = STYLES[i]
    return build(genre, shift, bpm, lead, answer, after, random.Random(7000 + i))


def one(job):
    from render import render
    import chip, chiptune
    i, ir = job; genre = STYLES[i][0]; band, _, _ = version(i); slug = f'theme-{genre}'
    line = render((slug, band, ir))
    mid = os.path.join(chiptune.TMP, f'chip-{slug}.mid'); band.write(mid)
    chiptune.encode(chip.render(mid), os.path.join(chiptune.OUT, slug + '.mp3'), norm=True)
    return line + ', and chip'


if __name__ == '__main__':
    from render import room, TMP
    want = set(sys.argv[1:]); listing = []
    for text in list(TUNE.values()) + [PICKUP, CALL]: parse(text)
    ir = os.path.join(TMP, 'lounge-room.wav'); room(ir)
    for i, (genre, *_rest) in enumerate(STYLES):
        band, style, key = version(i)
        listing.append({'title': TITLE, 'by': style, 'genre': genre, 'key': key, 'mode': band.mode, 'src': f'assets/music/theme-{genre}.mp3', 'chip': f'assets/music/chip/theme-{genre}.mp3'})
    jobs = [(i, ir) for i, s in enumerate(STYLES) if not want or s[0] in want]
    with Pool(min(4, os.cpu_count() or 1)) as pool:
        for line in pool.imap(one, jobs): print(line, flush=True)
    with open(os.path.join(ROOT, 'js', 'content', 'theme.js'), 'w') as f:
        f.write("// The game's theme, \"Rolling Paradise\", in each of the lounge's eight styles (written by tools/jazz/theme.py: edit\n"
                "// theme.py and render, not this file). The title screen plays them in turn, a different one first each time.\n")
        f.write('export const THEME = [\n' + ''.join(f'  {json.dumps(x, ensure_ascii=False)},\n' for x in listing) + '];\n')
    print(f'{len(jobs)} versions of the theme rendered, {len(listing)} listed')
