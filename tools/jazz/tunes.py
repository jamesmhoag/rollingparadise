# The lounge's set list: eight original tunes for Rolling Paradise, one per corner of Vegas jazz from the
# 1940s to the 1980s. Each is a chord chart in 8-bar sections, a head written as 2-bar motifs (onset, length,
# note: 'c3' = the chord's 3rd nearest the last note, 'k3' = that many semitones over the key, a number = steps
# along the chord's scale from the last note), and an arrangement. engine.py writes the band around it.
import random
from engine import Band

# General MIDI programs
PIANO, EPIANO, DXPIANO, VIBES, ORGAN, PERC_ORGAN = 0, 4, 5, 11, 16, 17
NYLON, JAZZ_GTR, MUTED_GTR = 24, 26, 28
UPRIGHT, FINGER, FRETLESS = 32, 33, 35
TRUMPET, TROMBONE, MUTED_TPT = 56, 57, 59
SOPRANO, ALTO, TENOR, BARI, FLUTE = 64, 65, 66, 67, 73
STRINGS, WARM_PAD = 48, 89
JAZZ_KIT, BRUSH_KIT, STANDARD_KIT, ROOM_KIT = 32, 40, 0, 8


def build(band, sections, order):
    """Lay the chart: returns the first bar of each entry in order."""
    starts = []
    for name in order:
        starts.append(len(band.chart.bars)); band.chart.add(sections[name])
    return starts


def head(band, name, starts, order, motifs, lo, hi, vel, prev, **kw):
    for st, sec in zip(starts, order):
        for k, m in enumerate(motifs[sec]):
            if m: prev = band.phrase(name, (st + 2 * k) * 4, m, lo, hi, vel, prev, **kw)
    return prev


# ---------------------------------------------------------------- 1. Neon Strip: 1950s lounge swing, muted trumpet
def neon_strip(rng):
    b = Band('Neon Strip', 132, .64, rng)
    b.chan('lead', 0, MUTED_TPT, 104, 74, 50); b.chan('piano', 1, PIANO, 84, 50, 40); b.chan('bass', 2, UPRIGHT, 112, 60, 25)
    b.chan('drums', 9, JAZZ_KIT, 92, 64, 35); b.chan('vibes', 3, VIBES, 96, 82, 55)
    S = {'I': 'Gm7 C7 | Am7 D7b9 | Gm7 C7 | F6 C7',
         'A1': 'Fmaj7 D7b9 | Gm7 C7 | Am7 D7 | Gm7 C7 | Fmaj7 Bb7 | Am7 D7 | Gm7 C7 | F6 C7',
         'A2': 'Fmaj7 D7b9 | Gm7 C7 | Am7 D7 | Gm7 C7 | Fmaj7 Bb7 | Am7 D7 | Gm7 C7 | F6',
         'B': 'Cm7 | F7 | Bbmaj7 | Bbm6 Eb7 | Am7 | D7 | G7 | Gm7 C7', 'E': 'Fmaj7 | Fmaj7'}
    a1 = [(0, 1.5, 'c3'), (1.5, .5, 1), (2, .5, 1), (2.5, 1.5, 'c5'), (4.5, .5, -1), (5, .5, -1), (5.5, 2, 'c3')]
    a3 = [(0, .5, 'c5'), (.5, .5, 1), (1, .5, 1), (1.5, 1.5, 'c9'), (3, 1, 'c7'), (4, .5, -1), (4.5, .5, -1), (5, .5, -1), (5.5, 1.5, 'c3')]
    c1 = [(0, .5, 'c9'), (.5, .5, -1), (1, 1, 'c5'), (2, .5, 'c3'), (2.5, 1, -1), (4, 3, 'c1')]
    b1 = [(.5, 1, 'c5'), (1.5, .5, 1), (2, 2, 'c7'), (4, .5, 'c3'), (4.5, .5, -1), (5, 3, 'c5')]
    b3 = [(0, 1, 'c9'), (1, 1, 'c7'), (2, 1, 'c5'), (3, 1, 'c3'), (4, .5, 'c7'), (4.5, .5, -1), (5, .5, -1), (5.5, 2, 'c3')]
    M = {'A1': [a1, a1, a3, c1], 'A2': [a1, a1, a3, c1], 'B': [b1, b1, b1, b3]}
    form = ['A1', 'A1', 'B', 'A2']
    order = ['I'] + form + form + form[2:] + ['E']
    st = build(b, S, order); n = len(b.chart.bars)
    b.comp('piano', 0, n - 2, 'swing'); b.comp('piano', n - 2, n, 'ballad')
    b.bass(0, st[3], 'two'); b.bass(st[3], n - 2, 'walk'); b.bass(n - 2, n, 'two')
    b.drums(0, n - 2, 'swing', 76, fills={s - 1 for s in st[1:]}, crash=set(st[1:]))
    head(b, 'lead', st[1:5], form, M, 60, 79, 96, 69)
    b.solo('vibes', st[5], st[9], 62, 86, 84, density=.62, horn=False)
    head(b, 'lead', st[9:11], form[2:], M, 60, 79, 96, 69)
    t = b.ending(n - 2, None)
    b.play('lead', t, 7, 74, 90); b.note('bass', t, 7, 29, 96); b.note('drums', t, 6, 49, 80)
    return b


# ---------------------------------------------------------------- 2. Velvet Rope: 1960s bossa nova, flute and vibes
def velvet_rope(rng):
    b = Band('Velvet Rope', 128, .5, rng)
    b.chan('lead', 0, FLUTE, 100, 70, 60); b.chan('gtr', 1, NYLON, 96, 48, 45); b.chan('bass', 2, UPRIGHT, 108, 62, 25)
    b.chan('drums', 9, BRUSH_KIT, 88, 64, 40); b.chan('vibes', 3, VIBES, 94, 84, 60); b.chan('pad', 4, STRINGS, 56, 64, 80)
    S = {'I': 'Gmaj7 | Am7 D7 | Gmaj7 | Am7 D7',
         'A1': 'Gmaj7 | Gmaj7 | A7 | A7 | Am7 | D7 | Gmaj7 | Am7 D7',
         'A2': 'Gmaj7 | Gmaj7 | A7 | A7 | Am7 | D7 | Gmaj7 | Gmaj7',
         'B': 'Cmaj7 | Cm6 F7 | Bm7 | E7b9 | Am7 | D7 | Gmaj7 | Am7 D7', 'E': 'Gmaj7 | Gmaj7'}
    a1 = [(0, 1.5, 'c5'), (1.5, 1, 'c3'), (2.5, .5, 1), (3, 1, 'c5'), (4, .5, 'c9'), (4.5, 3.5, 'c7')]
    a3 = [(0, .5, 'c3'), (.5, .5, 1), (1, .5, 1), (1.5, 1, 'c7'), (2.5, 1.5, -1), (4, .5, 'c3'), (4.5, .5, -1), (5, 3, 'c9')]
    c1 = [(0, 2, 'c9'), (2, 1, 'c7'), (3, 1, 'c5'), (4.5, 1.5, 'c3'), (6, 2, 'c9')]
    c2 = [(0, 2, 'c9'), (2, 1, 'c7'), (3, 1, 'c5'), (4, 4, 'c3')]
    b1 = [(0, .5, 'c7'), (.5, .5, -1), (1, .5, -1), (1.5, 2.5, 'c5'), (4, .5, 'c3'), (4.5, 1, 1), (5.5, 2.5, 'c7')]
    b4 = [(0, 1, 'c3'), (1, 1, 'c5'), (2, 2, 'c7'), (4, 4, 'c9')]
    M = {'A1': [a1, a1, a3, c1], 'A2': [a1, a1, a3, c2], 'B': [b1, b1, a3, b4]}
    form = ['A1', 'A1', 'B', 'A2']
    order = ['I'] + form + form + form[2:] + ['E']
    st = build(b, S, order); n = len(b.chart.bars)
    b.comp('gtr', 0, n - 2, 'bossa', 52, 70, 60); b.comp('gtr', n - 2, n, 'ballad', 52, 70, 56)
    b.comp('pad', st[1], st[5], 'pad', 55, 74, 34); b.comp('pad', st[9], n, 'pad', 55, 74, 34)
    b.bass(0, n - 2, 'bossa', 31, 50)
    b.drums(0, n - 2, 'bossa', 74, fills={s - 1 for s in st[1:]})
    head(b, 'lead', st[1:5], form, M, 67, 88, 88, 76)
    b.solo('vibes', st[5], st[9], 62, 86, 82, density=.55, horn=False, tri_rate=.04)
    head(b, 'lead', st[9:11], form[2:], M, 67, 88, 88, 76)
    t = b.ending(n - 2, None)
    b.play('lead', t, 7, 78, 80); b.note('bass', t, 7, 31, 90)
    return b


# ---------------------------------------------------------------- 3. Last Call: late-1950s ballad, tenor sax and brushes
def last_call(rng):
    b = Band('Last Call', 64, .66, rng)
    b.chan('lead', 0, TENOR, 100, 70, 60); b.chan('piano', 1, PIANO, 86, 52, 50); b.chan('bass', 2, UPRIGHT, 106, 62, 30)
    b.chan('drums', 9, BRUSH_KIT, 82, 64, 45)
    S = {'I': 'Fm7 Bb7 | Gm7 C7b9 | Fm7 Bb7 | Ebmaj7 Bb7',
         'A1': 'Ebmaj7 Cm7 | Fm7 Bb7 | Gm7 C7b9 | Fm7 Bb7 | Ebmaj7 Eb7 | Abmaj7 Db7 | Gm7 C7 | Fm7 Bb7',
         'A2': 'Ebmaj7 Cm7 | Fm7 Bb7 | Gm7 C7b9 | Fm7 Bb7 | Ebmaj7 Eb7 | Abmaj7 Db7 | Fm7 Bb7 | Eb6',
         'B': 'Bbm7 Eb7 | Abmaj7 | Am7 D7 | Gmaj7 | Gm7 C7 | Fm7 | F7 | Fm7 Bb7', 'E': 'Ebmaj7 | Ebmaj7'}
    a1 = [(0, 1, 'c5'), (1, .5, 1), (1.5, .5, 1), (2, 2, 'c3'), (4, 1.5, 'c3'), (5.5, .5, -1), (6, 2, 'c7')]
    a3 = [(0, .5, 'c1'), (.5, .5, 1), (1, .5, 1), (1.5, .5, 1), (2, 2, 'c7'), (4, 2, 'c3'), (6, 1, 'c9'), (7, 1, -1)]
    c1 = [(0, 1, 'c5'), (1, 1, 'c3'), (2, 1, 'c9'), (3, 1, 'c7'), (4, 4, 'c3')]
    c2 = [(0, 1, 'c3'), (1, 1 / 3, 'c5'), (4 / 3, 1 / 3, 1), (5 / 3, 1 / 3, 1), (2, 2, 'c9'), (4, 4, 'c1')]
    b1 = [(0, .5, 'c5'), (.5, .5, -1), (1, 1, 'c3'), (2, 2, 'c9'), (4, 3, 'c3')]
    b3 = [(0, .5, 'c3'), (.5, .5, 1), (1, .5, 1), (1.5, 1.5, 'c7'), (3, 1, -1), (4, 3, 'c5')]
    b4 = [(0, 2, 'c3'), (2, 1, 'c5'), (3, 1, 'c7'), (4, 2, 'c5'), (6, 2, 'c3')]
    M = {'A1': [a1, a1, a3, c1], 'A2': [a1, a1, a3, c2], 'B': [b1, b1, b3, b4]}
    order = ['I', 'A1', 'A1', 'B', 'A2', 'A1', 'A1', 'B', 'A2', 'E']
    st = build(b, S, order); n = len(b.chart.bars)
    b.comp('piano', 0, st[5], 'ballad', 50, 72, 54); b.comp('piano', st[7], n, 'ballad', 50, 72, 54)
    b.bass(0, st[2], 'two'); b.bass(st[2], n - 2, 'walk', vel=84); b.bass(n - 2, n, 'two')
    b.drums(st[1], n - 2, 'brush', 70, fills={s - 1 for s in st[2:]})
    head(b, 'lead', st[1:5], order[1:5], M, 55, 76, 82, 63)
    b.comp('piano', st[5], st[7], 'ballad', 46, 64, 50)
    b.solo('piano', st[5], st[7], 64, 86, 72, density=.5, horn=False, tri_rate=.15)
    head(b, 'lead', st[7:9], order[7:9], M, 55, 76, 82, 63)
    t = b.ending(n - 2, None)
    b.play('lead', t, 7, 65, 76); b.note('bass', t, 7, 27, 84)
    return b


# ---------------------------------------------------------------- 4. High Roller: 1960s showroom big band
def high_roller(rng):
    b = Band('High Roller', 168, .6, rng)
    b.chan('tpt', 0, TRUMPET, 100, 72, 50); b.chan('tbn', 1, TROMBONE, 96, 52, 50); b.chan('sax', 3, ALTO, 82, 38, 50)
    b.chan('tenor', 4, TENOR, 104, 80, 45); b.chan('piano', 5, PIANO, 74, 46, 35); b.chan('bass', 2, UPRIGHT, 112, 62, 25)
    b.chan('drums', 9, JAZZ_KIT, 98, 64, 35)
    S = {'I': 'Bb6 G7 | Cm7 F7 | Bb6 G7 | Cm7 F7',
         'A1': 'Bb6 G7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Ab7 | Dm7 G7 | Cm7 F7',
         'A2': 'Bb6 G7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Ab7 | Cm7 F7 | Bb6',
         'B': 'D7 | D7 | G7 | G7 | C7 | C7 | F7 | F7', 'E': 'Bb6 | Bb6'}
    a1 = [(.5, .5, 'c5'), (1, .5, 1), (1.5, .5, -1), (2, .5, -1), (2.5, 1, 'c3'), (4.5, .5, 'c5'), (5, .5, 1), (5.5, .5, -1), (6, 1.5, 'c5')]
    c1 = [(0, .5, 'c9'), (.5, .5, -1), (1, .5, -1), (1.5, .5, -1), (2, 1, 'c3'), (3, 1, 'c5'), (4, 2, 'c1')]
    b1 = [(0, 2, 'c3'), (2, 1, 'c5'), (3, 1, 'c7'), (4, 1, 'c9'), (5, 3, 'c7')]
    b4 = [(0, .5, 'c7'), (.5, .5, -1), (1, .5, -1), (1.5, .5, -1), (2, .5, -1), (2.5, 1.5, 'c3'), (4, 3, 'c5')]
    M = {'A1': [a1, a1, a1, c1], 'A2': [a1, a1, a1, c1], 'B': [b1, b1, b1, b4]}
    form = ['A1', 'A1', 'B', 'A2']
    order = ['I'] + form + form + ['B', 'A2'] + ['E']
    st = build(b, S, order); n = len(b.chart.bars)
    harm = [('tpt', 2, 0), ('tbn', 2, 12)]
    b.comp('piano', 0, n - 2, 'swing', 52, 72, 52)
    b.comp('sax', st[1], st[5], 'stabs', 55, 72, 50); b.comp('sax', st[9], n - 2, 'stabs', 55, 72, 56)
    b.bass(0, n - 2, 'walk', vel=96)
    b.drums(0, n - 2, 'bigband', 84, fills={s - 1 for s in st[1:]}, crash=set(st[1:]))
    head(b, 'tpt', st[1:5], form, M, 65, 84, 98, 72, harm=harm)
    b.solo('tenor', st[5], st[9], 52, 76, 92, density=.66)
    b.solo('tpt', st[9], st[10], 66, 86, 104, density=.45, harm=harm)  # the shout bridge
    head(b, 'tpt', st[10:11], ['A2'], M, 65, 84, 102, 72, harm=harm)
    t = b.ending(n - 2, None)
    for p, nm in ((82, 'tpt'), (77, 'tpt'), (74, 'tpt'), (65, 'tbn'), (58, 'tbn'), (62, 'sax'), (67, 'sax')): b.note(nm, t, 6, p, 100)
    b.note('bass', t, 6, 34, 100); b.note('drums', t, 5, 49, 100); b.note('drums', t, 1, 36, 100)
    return b


# ---------------------------------------------------------------- 5. Lucky Streak: 1940s jump blues, tenor and guitar
def lucky_streak(rng):
    b = Band('Lucky Streak', 144, .64, rng)
    b.chan('lead', 0, TENOR, 104, 74, 45); b.chan('gtr', 1, JAZZ_GTR, 96, 46, 40); b.chan('piano', 3, PIANO, 72, 56, 35)
    b.chan('bass', 2, UPRIGHT, 112, 62, 25); b.chan('drums', 9, JAZZ_KIT, 92, 64, 35)
    S = {'I': 'Bb7 | Eb7 | Bb7 G7b9 | Cm7 F7',
         'X': 'Bb7 | Eb7 | Bb7 | Fm7 Bb7 | Eb7 | Edim7 | Bb7 | G7b9 | Cm7 | F7 | Bb7 G7 | Cm7 F7',
         'E': 'Bb7 | Bb7'}
    riff = [(.5, .5, 'k3'), (1, .5, 'k4'), (1.5, .5, 'k7'), (2, 1, 'k9'), (3, .5, 'k7'), (3.5, .5, 'k3'), (4, 2, 'k0')]
    turn = [(0, .5, 'k7'), (.5, .5, 'k9'), (1, .5, 'k10'), (1.5, .5, 'k9'), (2, 1, 'k7'), (3, 1, 'k5'), (4, 2, 'k0')]
    M = {'X': [riff, None, riff, None, turn, None]}
    order = ['I'] + ['X'] * 8 + ['E']
    st = build(b, S, order); n = len(b.chart.bars)
    b.comp('piano', 0, n - 2, 'swing', 52, 70, 46); b.comp('gtr', 0, st[5], 'chank', vel=52); b.comp('gtr', st[7], n - 2, 'chank', vel=52)
    b.bass(0, n - 2, 'walk')
    b.drums(0, n - 2, 'blues', 78, fills={s - 1 for s in st[1:]}, crash=set(st[1:]))
    head(b, 'lead', st[1:3], order[1:3], M, 56, 77, 98, 65, mode='blues', key=10)
    for s in st[1:3]:  # guitar answers the riff
        for k in (1, 3, 5): b.solo('gtr', s + 2 * k, s + 2 * k + 2, 60, 79, 82, density=.7, horn=False, mode='blues', key=10)
    b.solo('lead', st[3], st[5], 52, 76, 96, density=.62, mode='blues', key=10)
    b.solo('gtr', st[5], st[7], 58, 82, 86, density=.66, horn=False, mode='blues', key=10)
    head(b, 'lead', st[7:9], order[7:9], M, 56, 77, 100, 65, mode='blues', key=10)
    t = b.ending(n - 2, None)
    b.play('lead', t, 7, 67, 90); b.note('bass', t, 7, 34, 96); b.note('drums', t, 6, 49, 84)
    for p in (62, 65, 68, 72): b.note('gtr', t, 6, p, 70)
    return b


# ---------------------------------------------------------------- 6. Velour: 1970s jazz-funk, alto, Rhodes, wah chanks
def velour(rng):
    b = Band('Velour', 100, .5, rng)
    b.chan('lead', 0, ALTO, 100, 70, 50, 20); b.chan('rhodes', 1, EPIANO, 96, 46, 45, 60); b.chan('bass', 2, FINGER, 112, 62, 15)
    b.chan('gtr', 3, MUTED_GTR, 70, 90, 30, 30); b.chan('drums', 9, STANDARD_KIT, 100, 64, 25)
    S = {'I': 'Dm9 | G13 | Dm9 | G13',
         'A': 'Dm9 | G13 | Dm9 | G13 | Dm9 | G13 | Bbmaj7 | A7#9',
         'B': 'Gm9 | C13 | Fmaj7 | Bbmaj7 | Em7b5 | A7#9 | Dm9 | A7#9', 'E': 'Dm9 | Dm9'}
    a1 = [(0, .75, 'c1'), (.75, .25, 1), (1, .5, 1), (1.75, 1.25, 'c5'), (3.5, .5, -1), (4, .5, 'c3'), (4.5, .25, 1), (4.75, 1.25, 'c5'), (6.5, .5, 'c7'), (7, .75, -1)]
    a3 = [(0, .25, 'c5'), (.25, .25, 1), (.5, .5, 'c7'), (1.25, .25, -1), (1.5, 1, 'c5'), (3, .5, 'c3'), (3.5, .5, -1), (4, 2, 'c1')]
    c1 = [(0, 1.5, 'c3'), (1.5, .5, 1), (2, 1, 'c5'), (3.25, .25, 'c7'), (3.5, .5, -1), (4, 3, 'c9')]
    b1 = [(.5, .5, 'c5'), (1, .25, 1), (1.25, 1.75, 'c7'), (3.5, .5, 'c3'), (4, .75, 'c5'), (4.75, 2.25, 'c9')]
    b4 = [(0, 1, 'c5'), (1, .5, 'c3'), (1.5, 1.5, 'c9'), (4, 3, 'c3')]
    M = {'A': [a1, a1, a3, c1], 'B': [b1, b1, a3, b4]}
    form = ['A', 'A', 'B', 'A']
    order = ['I'] + form + ['A', 'A', 'B'] + ['B', 'A'] + ['E']
    st = build(b, S, order); n = len(b.chart.bars)
    b.comp('rhodes', 0, st[5], 'funk', 50, 72, 58); b.comp('rhodes', st[8], n - 2, 'funk', 50, 72, 58)
    b.comp('gtr', st[1], n - 2, 'chank', vel=60)
    b.bass(0, n - 2, 'funk', 28, 52, 98)
    b.drums(0, n - 2, 'funk', 88, fills={s - 1 for s in st[1:]}, crash=set(st[1:]))
    head(b, 'lead', st[1:5], form, M, 62, 84, 92, 70)
    b.comp('rhodes', st[5], st[8], 'funk', 46, 62, 50)
    b.solo('rhodes', st[5], st[8], 62, 86, 84, density=.6, horn=False, tri_rate=.03)
    head(b, 'lead', st[8:10], order[8:10], M, 62, 84, 94, 70)
    t = b.ending(n - 2, None)
    b.play('lead', t, 7, 69, 88); b.note('bass', t, 7, 26, 100); b.note('drums', t, 6, 49, 90)
    for p in (53, 57, 60, 64, 65): b.note('rhodes', t, 7, p, 70)
    return b


# ---------------------------------------------------------------- 7. Satin Dice: 1980s smooth jazz, soprano sax
def satin_dice(rng):
    b = Band('Satin Dice', 92, .5, rng)
    b.chan('lead', 0, SOPRANO, 96, 66, 70, 20); b.chan('ep', 1, DXPIANO, 88, 44, 55, 70); b.chan('pad', 3, WARM_PAD, 70, 64, 90, 60)
    b.chan('bass', 2, FRETLESS, 108, 62, 30); b.chan('drums', 9, ROOM_KIT, 90, 64, 45)
    S = {'I': 'Dbmaj9 | C7#9 | Fm9 | Ebm9 Ab13',
         'A1': 'Dbmaj9 | C7#9 | Fm9 | Bbm9 Eb13 | Dbmaj9 | C7#9 | Fm9 | Ebm9 Ab13',
         'B': 'Gbmaj9 | Fm9 | Ebm9 | Ab13sus | Gbmaj9 | Fm7 Bb7b9 | Ebm9 | Ab13sus', 'E': 'Dbmaj9 | Dbmaj9'}
    a1 = [(0, .5, 'c9'), (.5, .5, -1), (1, 1.5, 'c5'), (2.5, .5, 1), (3, 1, 'c7'), (4, 3.5, 'c3')]
    a2 = [(.5, .5, 'c5'), (1, .5, 1), (1.5, .5, 1), (2, 2, 'c9'), (4, .75, 'c7'), (4.75, .25, -1), (5, 3, 'c5')]
    c1 = [(0, 1, 'c3'), (1, .5, 'c5'), (1.5, 1.5, 'c9'), (3, 1, 'c7'), (4, 2, 'c5'), (6, 1.5, 'c9')]
    b1 = [(0, 2.5, 'c7'), (2.5, .5, -1), (3, 1, 'c5'), (4, .5, 'c3'), (4.5, .5, 1), (5, 3, 'c9')]
    b4 = [(0, 1.5, 'c5'), (1.5, .5, 1), (2, 2, 'c9'), (4, 4, 'c5')]
    M = {'A1': [a1, a2, a1, c1], 'B': [b1, b1, b1, b4]}
    form = ['A1', 'A1', 'B', 'A1']
    order = ['I'] + form + ['A1', 'B'] + ['B', 'A1'] + ['E']
    st = build(b, S, order); n = len(b.chart.bars)
    b.comp('ep', 0, n, 'smooth', 54, 74, 54); b.comp('pad', 0, n, 'pad', 50, 70, 42)
    b.bass(0, n - 2, 'smooth', 26, 50, 92)
    b.drums(st[1], n - 2, 'smooth', 78, fills={s - 1 for s in st[2:]}, crash=set(st[1:]))
    head(b, 'lead', st[1:5], form, M, 64, 86, 86, 75)
    b.solo('lead', st[5], st[7], 62, 88, 86, density=.55, tri_rate=.03)
    head(b, 'lead', st[7:9], order[7:9], M, 64, 86, 88, 75)
    t = b.ending(n - 2, None)
    b.play('lead', t, 7, 75, 80); b.note('bass', t, 7, 25, 90)
    return b


# ---------------------------------------------------------------- 8. Hammond Hour: late-1960s soul-jazz organ trio
def hammond_hour(rng):
    b = Band('Hammond Hour', 116, .67, rng)
    b.chan('organ', 0, ORGAN, 96, 60, 45); b.chan('comp', 1, PERC_ORGAN, 74, 70, 45); b.chan('gtr', 3, JAZZ_GTR, 96, 40, 40)
    b.chan('bass', 2, FINGER, 104, 62, 20); b.chan('drums', 9, JAZZ_KIT, 96, 64, 35)
    S = {'I': 'Fm7 | Fm7 | Db7 | C7#9',
         'X': 'Fm7 | Bbm7 | Fm7 | Fm7 | Bbm7 | Bbm7 | Fm7 | Fm7 | Db7 | C7#9 | Fm7 Db7 | Gm7b5 C7#9',
         'E': 'Fm7 | Fm7'}
    riff = [(0, .5, 'k0'), (.5, .5, 'k3'), (1, .5, 'k5'), (1.5, 1, 'k7'), (2.5, .5, 'k10'), (3, 1, 'k7'), (4, .5, 'k5'), (4.5, .5, 'k3'), (5, 2, 'k0')]
    turn = [(0, 1, 'k8'), (1, .5, 'k7'), (1.5, .5, 'k5'), (2, 1, 'k4'), (3, 1, 'k7'), (4, 3, 'k0')]
    M = {'X': [riff, None, riff, None, turn, None]}
    order = ['I'] + ['X'] * 7 + ['E']
    st = build(b, S, order); n = len(b.chart.bars)
    b.comp('comp', 0, n - 2, 'organ', 53, 72, 56); b.comp('gtr', 0, st[4], 'chank', vel=56); b.comp('gtr', st[6], n - 2, 'chank', vel=56)
    b.bass(0, n - 2, 'walk', 29, 50, 90)
    b.drums(0, n - 2, 'shuffle', 82, fills={s - 1 for s in st[1:]}, crash=set(st[1:]))
    head(b, 'organ', st[1:3], order[1:3], M, 60, 82, 96, 68, mode='blues', key=5, horn=False)
    b.solo('organ', st[3], st[5], 60, 88, 92, density=.7, horn=False, mode='blues', key=5, tri_rate=.12)
    b.solo('gtr', st[4], st[6], 58, 82, 86, density=.64, horn=False, mode='blues', key=5)
    head(b, 'organ', st[6:8], order[6:8], M, 60, 82, 98, 68, mode='blues', key=5, horn=False)
    t = b.ending(n - 2, None)
    for p in (60, 63, 67, 70, 72): b.note('organ', t, 7, p, 92)
    b.note('bass', t, 7, 29, 96); b.note('drums', t, 6, 49, 88)
    return b


SET = [
    ('neon-strip', 'Neon Strip', '1950s lounge swing', neon_strip),
    ('velvet-rope', 'Velvet Rope', '1960s bossa nova', velvet_rope),
    ('high-roller', 'High Roller', '1960s showroom big band', high_roller),
    ('last-call', 'Last Call', 'late-1950s ballad', last_call),
    ('velour', 'Velour', '1970s jazz-funk', velour),
    ('lucky-streak', 'Lucky Streak', '1940s jump blues', lucky_streak),
    ('satin-dice', 'Satin Dice', '1980s smooth jazz', satin_dice),
    ('hammond-hour', 'Hammond Hour', '1960s soul-jazz organ', hammond_hour),
]
