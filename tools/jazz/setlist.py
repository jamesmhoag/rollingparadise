# The lounge's set list: eight corners of Vegas jazz, three tunes in each. Every tune is composed by story.py as a
# conversation between two voices over a chord chart, with the rhythm section from engine.py under it. A tune is
# a genre, one of the genre's charts, a key, a tempo and the voices that talk (the genre's lead and answer, picked
# per tune), and is repeatable: its seed is fixed.
#
# How a tune is played: the head (in swing the bass plays 'in two' for its first half and walks from the bridge on), a
# chorus where each voice improvises on the tune's motif and then they trade, the head out, the ending. The rhythm
# section follows the story: under the head it sits back, it builds through the solos to the trading, and plays out
# on the last head. The showroom big band also has its section (trumpets and trombones) behind the tune: kicks
# that push into every fourth bar of the head, set up by the drums, and a shout chorus before the head out.
import random
from engine import Band
from story import Story, transpose

# General MIDI programs
PIANO, EPIANO, DXPIANO, VIBES, ORGAN, PERC_ORGAN = 0, 4, 5, 11, 16, 17
NYLON, JAZZ_GTR, CLEAN_GTR, MUTED_GTR = 24, 26, 27, 28
UPRIGHT, FINGER, FRETLESS = 32, 33, 35
STRINGS, SLOW_STRINGS, WARM_PAD = 48, 49, 89
TRUMPET, TROMBONE, MUTED_TPT, FRENCH_HORN = 56, 57, 59, 60
SOPRANO, ALTO, TENOR, BARI, CLARINET, FLUTE = 64, 65, 66, 67, 71, 73
JAZZ_KIT, BRUSH_KIT, STANDARD_KIT, ROOM_KIT = 32, 40, 0, 8

# Charts in C (transposed to each tune's key). 'A' sections end on a turnaround back to the top; 'Z' is the ending.
G = {
    'swing': dict(era='1950s lounge swing', swing=.64, feel='swing', comp=('piano', PIANO, 'swing'), bass='walk', drums=('swing', JAZZ_KIT, 'swing'),
                  leads=[(MUTED_TPT, 'muted trumpet', 60, 82), (CLARINET, 'clarinet', 62, 86), (TENOR, 'tenor sax', 52, 74)],
                  answers=[(TENOR, 'tenor sax', 50, 70), (TROMBONE, 'trombone', 46, 66), (JAZZ_GTR, 'jazz guitar', 52, 74)],
                  charts=[{'A': 'Cmaj7 A7 | Dm7 G7 | Em7 A7b9 | Dm7 G7 | Cmaj7 C7 | Fmaj7 Fm6 | Em7 A7b9 | Dm7 G7', 'B': 'E7 | E7 | A7 | A7 | D7 | D7 | Dm7 | G7'},
                          {'A': 'C6 | Am7 | Dm7 | G7 | Em7 A7 | Dm7 G7 | Cmaj7 A7 | Dm7 G7', 'B': 'Fmaj7 | Fm6 | Em7 | A7b9 | Dm7 | G7 | Em7 A7 | Dm7 G7'},
                          {'A': 'Cmaj7 | Gm7 C7 | Fmaj7 | Fm7 Bb7 | Em7 | A7b9 | Dm7 | G7', 'B': 'Gm7 | C7 | Fmaj7 | Fmaj7 | Am7 | D7 | Dm7 | G7'}],
                  form=['A', 'A', 'B', 'A'], talk=['A', 'A', 'B', 'A'], out=['B', 'A']),
    'bossa': dict(era='1960s bossa nova', swing=.5, feel='latin', comp=('gtr', NYLON, 'bossa'), bass='bossa', drums=('bossa', BRUSH_KIT, 'bossa'), pad=(SLOW_STRINGS, 30),
                  leads=[(FLUTE, 'flute', 67, 88), (TENOR, 'tenor sax', 55, 76), (CLARINET, 'clarinet', 62, 84)],
                  answers=[(TENOR, 'tenor sax', 52, 72), (NYLON, 'nylon guitar', 55, 76), (FLUTE, 'flute', 67, 86)],
                  charts=[{'A': 'Cmaj7 | Cmaj7 | D7 | D7 | Dm7 | G7 | Cmaj7 | Dm7 G7', 'B': 'Fmaj7 | Bb7 | Em7 | A7 | Dm7 | G7 | Cmaj7 | Dm7 G7'},
                          {'A': 'Cmaj7 | Bm7b5 E7b9 | Am7 | D7 | Dm7 | G7 | Em7 A7b9 | Dm7 G7', 'B': 'Ebmaj7 | Ab7 | Dbmaj7 | Dm7 G7 | Cmaj7 | Am7 | Dm7 | G7'},
                          {'A': 'Am7 | D7 | Gm7 | C7 | Fmaj7 | Fm6 | Em7 A7 | Dm7 G7', 'B': 'Fmaj7 | Fm6 | Cmaj7 | A7 | Dm7 | G7 | Cmaj7 | Dm7 G7'}],
                  form=['A', 'A', 'B', 'A'], talk=['A', 'B', 'A'], out=['B', 'A']),
    'bigband': dict(era='1960s showroom big band', swing=.6, feel='swing', comp=('piano', PIANO, 'swing'), bass='walk', drums=('bigband', JAZZ_KIT, 'swing'), section=True,
                    leads=[(TRUMPET, 'trumpets', 64, 84), (ALTO, 'saxes', 60, 80), (TRUMPET, 'trumpets', 62, 82)],
                    answers=[(TROMBONE, 'trombones', 48, 68), (TENOR, 'tenor saxes', 50, 70), (FRENCH_HORN, 'horns', 50, 70)],
                    charts=[{'A': 'C6 | Dm7 G7 | C6 | Gm7 C7 | Fmaj7 | Fm6 | Em7 A7 | Dm7 G7', 'B': 'Am7 | D7 | Dm7 | G7 | Em7 | A7 | Dm7 | G7'},
                            {'A': 'Cmaj7 | A7 | Dm7 | G7 | Cmaj7 | C7 | Fmaj7 Fm6 | Dm7 G7', 'B': 'Em7 | A7b9 | Dm7 | G7 | Cm7 | F7 | Dm7 | G7'},
                            {'A': 'C6 | Ebdim | Dm7 | G7 | Em7 | Am7 | Dm7 | G7', 'B': 'Fmaj7 | Bb7 | Em7 | A7b9 | Dm7 | G7 | C6 | Dm7 G7'}],
                    form=['A', 'A', 'B', 'A'], talk=['A', 'A', 'B', 'A'], out=['B', 'A']),
    'ballad': dict(era='late-1950s ballad', swing=.66, feel='ballad', comp=('piano', PIANO, 'ballad'), bass='two', drums=('brush', BRUSH_KIT, 'brush'), pad=(STRINGS, 26), susp=.5,
                   leads=[(TENOR, 'tenor sax', 55, 76), (ALTO, 'alto sax', 58, 79), (TRUMPET, 'trumpet', 58, 79)],
                   answers=[(PIANO, 'piano', 60, 82), (CLARINET, 'clarinet', 55, 76), (CLEAN_GTR, 'guitar', 55, 76)],
                   charts=[{'A': 'Cmaj7 Am7 | Dm7 G7 | Em7 A7 | Dm7 G7 | Cmaj7 C7 | Fmaj7 Fm6 | Em7 A7 | Dm7 G7', 'B': 'Fmaj7 | Bb7 | Em7 | A7b9 | Dm7 | G7 | Em7 A7 | Dm7 G7'},
                           {'A': 'Cmaj7 | Bm7b5 E7b9 | Am7 | Gm7 C7 | Fmaj7 | Fm6 | Em7 A7 | Dm7 G7', 'B': 'Am7 | D7 | Gmaj7 | Gm7 C7 | Fmaj7 | Fm6 | Dm7 | G7'},
                           {'A': 'Am7 | Am7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7b9', 'B': 'Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7b9 | Am7 | E7b9', 'Z': 'Am6 | Am6'}],
                   form=['A', 'A', 'B', 'A'], talk=['A', 'A'], out=['A']),
    'funk': dict(era='1970s jazz-funk', swing=.5, feel='funk', comp=('rhodes', EPIANO, 'funk'), comp2=('gtr', MUTED_GTR, 'chank'), bass='funk', drums=('funk', STANDARD_KIT, 'funk'),
                 leads=[(ALTO, 'alto sax', 60, 80), (FLUTE, 'flute', 67, 88), (TENOR, 'tenor sax', 55, 75)],
                 answers=[(TRUMPET, 'trumpet', 58, 78), (CLEAN_GTR, 'guitar', 55, 76), (EPIANO, 'Rhodes', 60, 80)],
                 charts=[{'A': 'Cm7 | F7 | Cm7 | F7 | Cm7 | F7 | Abmaj7 | G7sus', 'B': 'Abmaj7 | Gm7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7sus'},
                         {'A': 'Dm7 | Dm7 | Em7 | Em7 | Dm7 | Dm7 | Fmaj7 | Em7', 'B': 'Bbmaj7 | Am7 | Gm7 | C7 | Fmaj7 | Bbmaj7 | Em7 | A7sus', 'Z': 'Dm7 | Dm7'},
                         {'A': 'Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Dm7b5 | G7sus', 'B': 'Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7b9 | Cm7 | G7sus'}],
                 form=['A', 'B'], talk=['A', 'A', 'B'], out=['A', 'B']),
    'jump': dict(era='1940s jump blues', swing=.66, feel='blues', comp=('piano', PIANO, 'swing'), bass='boogie', drums=('shuffle', JAZZ_KIT, 'shuffle'),
                 leads=[(TENOR, 'tenor sax', 52, 74), (ALTO, 'alto sax', 58, 80), (TRUMPET, 'trumpet', 60, 80)],
                 answers=[(TRUMPET, 'trumpet', 58, 78), (TROMBONE, 'trombone', 46, 66), (JAZZ_GTR, 'jazz guitar', 52, 74)],
                 charts=[{'A': 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | A7 | Dm7 | G7 | C7 A7b9 | Dm7 G7'},
                         {'A': 'C7 | C7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | G7'},
                         {'A': 'C7 | F7 | C7 | Gm7 C7 | F7 | Fdim7 | C7 | A7 | Dm7 | G7 | Em7 A7b9 | Dm7 G7'}],
                 form=['A', 'A'], talk=['A', 'A', 'A'], out=['A']),
    'smooth': dict(era='1980s smooth jazz', swing=.5, feel='latin', comp=('ep', DXPIANO, 'smooth'), bass='smooth', drums=('smooth', ROOM_KIT, 'smooth'), pad=(WARM_PAD, 40),
                   leads=[(SOPRANO, 'soprano sax', 62, 84), (ALTO, 'alto sax', 60, 80), (CLEAN_GTR, 'guitar', 57, 79)],
                   answers=[(CLEAN_GTR, 'guitar', 55, 76), (FLUTE, 'flute', 67, 86), (SOPRANO, 'soprano sax', 62, 82)],
                   charts=[{'A': 'Cmaj7 | Bbmaj7 | Am7 | Fmaj7 | Dm7 | Em7 | Fmaj7 | G7sus', 'B': 'Abmaj7 | Bbmaj7 | Cmaj7 | Am7 | Fmaj7 | Em7 | Dm7 | G7sus'},
                           {'A': 'Fmaj7 | Em7 | Dm7 | Cmaj7 | Fmaj7 | Em7 | Am7 | G7sus', 'B': 'Dm7 | Em7 | Fmaj7 | G7sus | Am7 | Em7 | Fmaj7 | G7sus'},
                           {'A': 'Am7 | Fmaj7 | Cmaj7 | G7sus | Am7 | Fmaj7 | Dm7 | G7sus', 'B': 'Fmaj7 | G7sus | Em7 | Am7 | Dm7 | Em7 | Fmaj7 | G7sus'}],
                   form=['A', 'B'], talk=['A', 'B', 'A'], out=['B']),
    'organ': dict(era='1960s soul-jazz organ', swing=.67, feel='blues', comp=('organ', ORGAN, 'organ'), bass='walk', drums=('swing', JAZZ_KIT, 'swing'),
                  leads=[(JAZZ_GTR, 'jazz guitar', 55, 77), (TENOR, 'tenor sax', 52, 74), (PERC_ORGAN, 'organ', 60, 82)],
                  answers=[(TENOR, 'tenor sax', 50, 70), (JAZZ_GTR, 'jazz guitar', 55, 74), (TRUMPET, 'trumpet', 58, 78)],
                  charts=[{'A': 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | A7 | Dm7 | G7 | C7 | G7'},
                          {'A': 'Cm7 | Fm7 | Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Ab7 | G7#9 | Cm7 | G7#9'},
                          {'A': 'C7 | F7 | C7 | Gm7 C7 | F7 | F7 | C7 | Em7 A7 | Dm7 | G7 | C7 A7b9 | Dm7 G7'}],
                  form=['A', 'A'], talk=['A', 'A', 'A'], out=['A']),
}
# the last chord: the tonic as the style plays it (a 6 chord in swing, a 13th in the blues), the minor 6 for a minor tune
ENDING = {'swing': 'C6 | C6', 'bigband': 'C6 | C6', 'jump': 'C9 | C9', 'organ': 'C9 | C9'}
ENDING_MAJ = 'Cmaj7 | Cmaj7'
ENDING_MINOR = 'Cm6 | Cm6'
# how a style ends: a ritard into a held chord, or a 'button' (the band stops together on a hit, in tempo)
BUTTON = {'bigband', 'funk', 'jump'}
# how busy an improvised chorus is, by style
SOLO = {'swing': .62, 'bossa': .45, 'bigband': .6, 'ballad': .32, 'funk': .5, 'jump': .58, 'smooth': .42, 'organ': .58}

# Who carries each tune. Struck and plucked instruments (piano, vibraphone, guitar, Rhodes) sound real from samples,
# so they take the melodies and the improvised choruses; horns and reeds, which a soundfont can only imitate, answer
# from further back in the room, and the organ only comps.
VIB, PNO, GTR = (VIBES, 'vibraphone', 57, 84), (PIANO, 'piano', 60, 86), (JAZZ_GTR, 'jazz guitar', 55, 79)
CGTR, RHO, DX = (CLEAN_GTR, 'guitar', 57, 81), (EPIANO, 'Rhodes', 57, 84), (DXPIANO, 'electric piano', 60, 86)
MTPT, CLAR, TEN, FLU = (MUTED_TPT, 'muted trumpet', 58, 79), (CLARINET, 'clarinet', 55, 76), (TENOR, 'tenor sax', 50, 70), (FLUTE, 'flute', 67, 86)
ALT, SOP, TPT = (ALTO, 'alto sax', 58, 78), (SOPRANO, 'soprano sax', 62, 82), (TRUMPET, 'trumpet', 58, 78)
VOICES = {
    'neon-strip': (VIB, GTR), 'loose-change': (GTR, CLAR), 'side-bet': (PNO, MTPT),
    'velvet-rope': (PNO, FLU), 'pool-light': (VIB, TEN), 'desert-moon': (RHO, VIB),
    'high-roller': (PNO, (TRUMPET, 'trumpets', 60, 80)), 'marquee': (VIB, (ALTO, 'saxes', 58, 78)), 'double-down': (GTR, (TROMBONE, 'trombones', 46, 66)),
    'last-call': (PNO, TEN), 'house-lights': (VIB, CLAR), 'two-a-m': (GTR, MTPT),
    'velour': (CGTR, ALT), 'fresh-felt': (VIB, FLU), 'pit-boss': (RHO, TEN),
    'lucky-streak': (PNO, TEN), 'comp-ticket': (GTR, ALT), 'cash-out': (VIB, TPT),
    'satin-dice': (CGTR, SOP), 'valet': (DX, ALT), 'chrome': (VIB, CGTR),
    'hammond-hour': (GTR, TEN), 'back-room': (VIB, GTR), 'after-hours': (PNO, GTR),
}
# where the soloists sit on the time, in ticks (480 to the beat): + lays back behind the beat, - pushes ahead
LEAN = {'ballad': 26, 'swing': 9, 'bigband': 5, 'bossa': 6, 'smooth': 7, 'funk': 1, 'jump': -5, 'organ': 11}

# (slug, title, genre, chart, key, tempo, lead, answer)
SET = [
    ('neon-strip', 'Neon Strip', 'swing', 0, 5, 132, 0, 0), ('loose-change', 'Loose Change', 'swing', 1, 10, 144, 1, 2), ('side-bet', 'Side Bet', 'swing', 2, 3, 124, 2, 1),
    ('velvet-rope', 'Velvet Rope', 'bossa', 0, 7, 128, 0, 0), ('pool-light', 'Pool Light', 'bossa', 1, 2, 120, 1, 1), ('desert-moon', 'Desert Moon', 'bossa', 2, 9, 132, 2, 0),
    ('high-roller', 'High Roller', 'bigband', 0, 10, 168, 0, 0), ('marquee', 'Marquee', 'bigband', 1, 3, 156, 1, 1), ('double-down', 'Double Down', 'bigband', 2, 8, 176, 2, 2),
    ('last-call', 'Last Call', 'ballad', 0, 3, 64, 0, 0), ('house-lights', 'House Lights', 'ballad', 1, 8, 60, 1, 1), ('two-a-m', '2 A.M.', 'ballad', 2, 5, 66, 2, 2),
    ('velour', 'Velour', 'funk', 0, 7, 100, 0, 0), ('fresh-felt', 'Fresh Felt', 'funk', 1, 0, 104, 1, 1), ('pit-boss', 'Pit Boss', 'funk', 2, 2, 96, 2, 2),
    ('lucky-streak', 'Lucky Streak', 'jump', 0, 10, 144, 0, 0), ('comp-ticket', 'Comp Ticket', 'jump', 1, 7, 152, 1, 1), ('cash-out', 'Cash Out', 'jump', 2, 0, 138, 2, 2),
    ('satin-dice', 'Satin Dice', 'smooth', 0, 5, 92, 0, 0), ('valet', 'Valet', 'smooth', 1, 2, 88, 1, 0), ('chrome', 'Chrome', 'smooth', 2, 10, 96, 2, 2),
    ('hammond-hour', 'Hammond Hour', 'organ', 0, 5, 116, 0, 0), ('back-room', 'Back Room', 'organ', 1, 0, 108, 1, 1), ('after-hours', 'After Hours', 'organ', 2, 7, 120, 2, 2),
]


def arrange(slug, title, genre, ci, key, bpm, li, ai, rng):
    from engine import chord, tones
    from story import strong_pcs
    g = G[genre]; chart = g['charts'][ci]; b = Band(title, bpm, g['swing'], rng)
    fam = lambda prog: prog // 8  # GM family: pianos, organs, guitars, ...
    cname, cprog, cstyle = g['comp']
    wind = lambda prog: 56 <= prog <= 79
    if slug in VOICES: lead, answer = VOICES[slug]
    else:
        lead, answer = g['leads'][li], g['answers'][ai]
        for k in range(1, len(g['answers']) + 1):  # the answer is a different sound from the lead and from the comping
            if answer[0] != lead[0] and fam(answer[0]) != fam(cprog): break
            answer = g['answers'][(ai + k) % len(g['answers'])]
    if fam(lead[0]) == fam(cprog) and fam(lead[0]) != 0: cname, cprog, cstyle = 'gtr', JAZZ_GTR, 'swing'  # an organ lead: a guitar comps
    b.chan('lead', 0, lead[0], 96 if wind(lead[0]) else 102, 74, 40)
    b.chan('answer', 3, answer[0], 92 if wind(answer[0]) else 90, 48, 55)  # horns answer from further back
    b.chan(cname, 1, cprog, 72 if fam(cprog) == 2 else 82, 56, 40, 70 if fam(cprog) == 2 else 20)
    b.chan('bass', 2, {'funk': FINGER, 'smooth': FRETLESS}.get(g['bass'], UPRIGHT), 110, 62, 25)
    dstyle, dkit, _ = g['drums']; b.chan('drums', 9, dkit, 92, 64, 35)
    if g.get('comp2'): b.chan(g['comp2'][0], 4, g['comp2'][1], 66, 92, 30)
    if g.get('pad'): b.chan('pad', 5, g['pad'][0], 52, 64, 80)
    if g.get('section'):  # a horn line is voiced for its section; a piano, vibes or guitar line plays alone
        if wind(lead[0]): b.chan('lead2', 6, lead[0], 84, 88, 50); b.chan('lead3', 10, lead[0], 78, 98, 50)
        if wind(answer[0]): b.chan('answer2', 7, answer[0], 84, 36, 55); b.chan('answer3', 11, answer[0], 78, 26, 55)
        # the band behind them, for the kicks and the shout chorus: two trumpets and two trombones, a part each
        b.chan('brassA', 8, TRUMPET, 90, 34, 55); b.chan('brassA2', 12, TRUMPET, 82, 44, 55); b.chan('brassB', 13, TROMBONE, 86, 90, 55); b.chan('brassB2', 14, TROMBONE, 80, 100, 55)
    lean = LEAN[genre]
    b.lean = {0: lean, 3: lean + 4, 6: lean + 4, 7: lean + 6, 10: lean + 4, 11: lean + 6, 1: lean // 3, 4: 0, 5: lean // 2, 2: -3 if g['bass'] == 'walk' else 0,
              8: lean + 3, 12: lean + 4, 13: lean + 5, 14: lean + 6}
    first = chord(chart['A'].split('|')[0].split()[0])
    minor = first[0] == 0 and first[1] in ('m7', 'm6', 'm7b5')
    b.mode = 'minor' if minor else 'blues' if first[0] == 0 and first[1] in ('7', '7#9', '7b9') else 'major'  # for the sound effects: which 3rd and 7th fit the tune
    end = chart.get('Z') or (ENDING_MINOR if minor else ENDING.get(genre, ENDING_MAJ))
    S = {k: transpose(v, key) for k, v in chart.items()}
    S['I'] = transpose(' | '.join(chart['A'].split('|')[-4:]), key); S['Z'] = transpose(end, key)
    order = ['I'] + g['form'] + g['talk'] + g['out'] + ['Z']
    starts = []
    for name in order: starts.append(len(b.chart.bars)); b.chart.add(S[name])
    n = len(b.chart.bars); lens = [(starts[i + 1] if i + 1 < len(starts) else n) - starts[i] for i in range(len(starts))]
    segs = list(zip(starts, lens, order))
    nf, nt = len(g['form']), len(g['talk'])
    head, talk, out = segs[1:1 + nf], segs[1 + nf:1 + nf + nt], segs[1 + nf + nt:-1]
    button = genre in BUTTON
    stop = n - 1 if button else n - 2  # a button ending keeps the groove through the last chord's first bar
    # the rhythm section
    b.comp(cname, 0, stop, cstyle, 50, 70, 56)
    if not button: b.comp(cname, n - 2, n, 'ballad' if cstyle != 'organ' else 'organ', 50, 70, 50)
    if g.get('comp2'): b.comp(g['comp2'][0], starts[1], stop, g['comp2'][2], vel=52)
    if g.get('pad'): b.comp('pad', starts[1], n, 'pad', 55, 72, g['pad'][1])
    bass = g['bass']
    # a swing head is played 'in two' until the bridge, then the bass walks; a blues walks from the top
    walk_from = head[2][0] if bass == 'walk' and genre in ('swing', 'bigband') and len(head) >= 3 else starts[1]
    if bass == 'walk': b.bass(0, walk_from, 'two'); b.bass(walk_from, stop, 'walk', vel=88)
    elif bass == 'two': b.bass(0, stop, 'two', lo=33, vel=84)  # a ballad's long bass notes stay off the bottom of the instrument
    else: b.bass(0, stop, bass, vel=90)
    if not button and bass != 'two': b.bass(n - 2, n, 'two', vel=84)
    sect = {s for s in starts[1:-1]} | ({n - 2} if button else set())
    b.drums(starts[1] if dstyle == 'brush' else 0, stop, dstyle, 74, fills={s - 1 for s in sect}, crash={talk[0][0], out[0][0]} if dstyle not in ('brush', 'bossa') else set())
    # the story: the head, a chorus of real improvisation, the voices trading, the head out
    st = Story(b, g['feel'], key, rng)
    zc = b.chart.at((n - 1) * 4); st.home = tones(zc, (1, 3, 5))
    voices = ('lead', 'answer'); lo_hi = {'lead': lead[2:], 'answer': answer[2:]}
    st.horn = {'lead': wind(lead[0]), 'answer': wind(answer[0])}
    st.bend = {'lead': 24 <= lead[0] <= 31 or 56 <= lead[0] <= 79, 'answer': 24 <= answer[0] <= 31 or 56 <= answer[0] <= 79}
    st.rng_lo = {'lead': lead[2] - 7, 'answer': answer[2] - 7}
    vel = {'lead': 92, 'answer': 84}
    st.converse(voices, head, lo_hi, vel, 'head')
    st.solo('lead', talk[0], *lo_hi['lead'], vel['lead'] - 2, SOLO[genre])
    rest = talk[1:]
    if len(talk) >= 3: st.solo('answer', talk[1], *lo_hi['answer'], vel['answer'], SOLO[genre]); rest = talk[2:]
    shout = rest[-1] if g.get('section') and len(rest) >= 2 else None  # the big band: the last of the trading is the shout chorus
    if shout: rest = rest[:-1]
    arc = (lambda x: .5 + .5 * x) if shout else lambda x: .45 + .55 * (x / .66 if x < .66 else 1 - (x - .66) / .34 * .6)
    if rest: st.converse(voices, rest, lo_hi, vel, 'talk', arc)
    if shout:
        st.horn['brassA'] = st.bend['brassA'] = True
        st.shout('brassA', shout, 65, 84, 100)
    st.converse(voices, out, lo_hi, vel, 'out')
    st.coda(voices, n - 2, lo_hi, vel, slow=not button)
    # each line is one player's; in swing and the blues a quarter note inside a line is played short
    b.articulate(['lead', 'answer', 'brassA'], detach=.68 if g['feel'] in ('swing', 'blues') and bpm >= 90 else 0)
    if shout:  # the section under the lead trumpet, in block harmony: each part the next chord tone down
        for (ch, t, dur, p, v, ns) in [x for x in b.notes if x[0] == b.chans['brassA']]:
            cht = b.chart.at(t + .51) if (t % 1) > .49 and dur >= .6 else b.chart.at(t)
            good = strong_pcs(cht) | tones(cht); x = p
            for part in ('brassA2', 'brassB', 'brassB2'):
                x = next((x - gap for gap in (3, 4, 5, 2, 6) if (x - gap) % 12 in good), x - 4)
                b.notes.append((b.chans[part], t, dur, x, max(1, v - 8), ns))
        for k in range(0, shout[1], 2):  # the drums: a crash on each phrase, a fill into the next
            t0 = (shout[0] + k) * 4
            for d_, v_ in ((49, 96), (36, 100)): b.note('drums', t0, .5, d_, v_)
            for st_, d_ in ((6.5, 38), (7, 38), (7.5, 45)): b.note('drums', t0 + st_, .1, d_, 88 + rng.randint(-5, 5))
    if g.get('section'):  # kicks: the section pushes into every fourth bar of the head, the drums setting it up and catching it
        for s0, nb_, _ in head + out:
            for bar in range(s0 + 3, s0 + nb_, 4):
                t0 = bar * 4
                for st_, du, vv in ((2.5, .3, 84), (3.5, 1.0, 94)):
                    v4 = voicing(b.chart.at(t0 + st_ + .51), 55, 79)
                    for part, x in zip(('brassA', 'brassA2', 'brassB', 'brassB2'), v4[::-1]): b.note(part, t0 + st_, du, x, vv - 4 * ('brassA', 'brassA2', 'brassB', 'brassB2').index(part) + rng.randint(-3, 3))
                    for d_, v_ in ((38, 92), (36, 96)): b.note('drums', t0 + st_, .1, d_, v_)
                b.note('drums', t0 + 2, .1, 38, 70)  # the set-up
                if bar == s0 + nb_ - 1: b.note('drums', t0 + 3.5, .8, 49, 84)
    if g.get('section'):  # big band: each line voiced for its section, three parts in close harmony under the lead
        voiced = [c for c, two in ((b.chans['lead'], 'lead2'), (b.chans['answer'], 'answer2')) if two in b.chans]
        for (ch, t, dur, p, v, ns) in [x for x in b.notes if x[0] in voiced]:
            two, three = ('lead2', 'lead3') if ch == b.chans['lead'] else ('answer2', 'answer3')
            good = strong_pcs(b.chart.at(t)) | tones(b.chart.at(t))
            x1 = next((p - gap for gap in (3, 4, 8, 9, 5) if (p - gap) % 12 in good), None)
            if x1 is None: continue
            b.notes.append((b.chans[two], t, dur, x1, max(1, v - 12), ns))
            x2 = next((x1 - gap for gap in (3, 4, 5, 2) if (x1 - gap) % 12 in good and x1 - gap >= 43), None)
            if x2 is not None: b.notes.append((b.chans[three], t, dur, x2, max(1, v - 18), ns))
    st.clear_bass()
    st.clear_comp([cname] + ([g['comp2'][0]] if g.get('comp2') else []) + (['pad'] if g.get('pad') else []))
    # the rhythm section follows the story: back under the head, building through the solos to the trading (each solo
    # starts a little under where the last one left off), full for the shout chorus, and playing out on the last head
    t_a, t_z = talk[0][0], out[0][0]
    def dyn(t):
        bar = t / 4
        if bar < head[0][0]: return .86
        if bar < t_a: return .96 if bar >= head[-1][0] else .9
        if bar < t_z:
            if shout and bar >= shout[0]: return 1.2
            lvl = .84 + .3 * min(1, (bar - t_a) / max(1, t_z - t_a) / .75)
            return lvl - (.06 if any(0 <= bar - s0 < 2 for s0, _, _ in talk[:2]) else 0)
        return 1.08 if bar < n - 2 else .9
    soft = .5 if g['feel'] == 'ballad' else 1  # a ballad's swells are half as wide: it plays under the game, and its quiet must still be heard
    b.shape([cname, 'bass', 'drums'] + ([g['comp2'][0]] if g.get('comp2') else []), lambda t: 1 + (dyn(t) - 1) * soft)
    root = 24 + (zc[0] % 12) + (12 if zc[0] % 12 < 7 else 0)  # the last note: the tonic, no lower than the bass's G
    if button:  # the band stops together on beat one of the last bar
        th = (n - 1) * 4; kept = []
        for x in b.notes:
            if x[1] >= th - .01: continue
            if x[1] + x[2] > th - .05: x = (x[0], x[1], max(.1, th - .05 - x[1]), x[3], x[4], x[5])
            kept.append(x)
        b.notes = kept
        last = max((x for x in b.notes if x[0] == b.chans['lead']), key=lambda x: x[1])
        p = nearest_in(st.home, last[3], *lo_hi['lead'])
        for name in voices: b.note(name, th, .6, p if name == 'lead' else next((p - gp for gp in (3, 4, 8, 9, 5) if (p - gp) % 12 in st.home or (p - gp) % 12 in tones(zc)), p - 12), 104, tri=True)
        for x in voicing(zc): b.note(cname, th, .6, x, 84, tri=True)
        if g.get('comp2'):
            for x in voicing(zc, 62, 78)[-3:]: b.note(g['comp2'][0], th, .3, x, 80, tri=True)
        b.note('bass', th, .7, root + 12 if root < 36 else root, 104, tri=True)
        for d, v in ((49, 110), (36, 108), (38, 96)): b.note('drums', th, .5, d, v, tri=True)
        b.ending(n - 1, None, ritard=False)
    else:
        t = b.ending(n - 2, None)
        b.note('bass', t, 7, root, 88)
        if dkit != BRUSH_KIT: b.note('drums', t, 6, 49, 70)
        else: b.note('drums', t, 6, 38, 40)
    return b, f"{g['era']}: {lead[1]} and {answer[1]}", key


def nearest_in(pcs, p, lo, hi):
    return min((x for x in range(lo, hi + 1) if x % 12 in pcs), key=lambda x: abs(x - p), default=p)


def voicing(ch, lo=50, hi=72):  # the comping's rootless voicing for a chord, centred in its range
    from engine import Q, voicings
    vs = voicings([ch[0] + i for i in Q[ch[1]][1]], lo, hi)
    return min(vs, key=lambda v: abs(sum(v) / len(v) - (lo + hi) / 2))
