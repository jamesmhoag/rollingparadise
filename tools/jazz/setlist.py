# The lounge's set list: eight corners of Vegas jazz, three tunes in each. Every tune is composed by story.py as a
# conversation between two voices over a chord chart, with the rhythm section from engine.py under it. A tune is
# a genre, one of the genre's charts, a key, a tempo and the voices that talk (the genre's lead and answer, picked
# per tune), and is repeatable: its seed is fixed.
import random
from engine import Band
from story import Story, transpose

# General MIDI programs (FluidR3): real instrument patches only; no vibraphone or xylophone leads
PIANO, EPIANO, DXPIANO, ORGAN, PERC_ORGAN = 0, 4, 5, 16, 17
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
                  charts=[{'A': 'Cmaj7 A7 | Dm7 G7 | Em7 A7 | Dm7 G7 | Cmaj7 C7 | Fmaj7 Fm6 | Em7 A7 | Dm7 G7', 'B': 'E7 | E7 | A7 | A7 | D7 | D7 | Dm7 | G7'},
                          {'A': 'C6 | Am7 | Dm7 | G7 | Em7 A7 | Dm7 G7 | Cmaj7 A7 | Dm7 G7', 'B': 'Fmaj7 | Fm6 | Em7 | A7 | Dm7 | G7 | Em7 A7 | Dm7 G7'},
                          {'A': 'Cmaj7 | Gm7 C7 | Fmaj7 | Fm7 Bb7 | Em7 | A7 | Dm7 | G7', 'B': 'Gm7 | C7 | Fmaj7 | Fmaj7 | Am7 | D7 | Dm7 | G7'}],
                  form=['A', 'A', 'B', 'A'], talk=['A', 'A', 'B', 'A'], out=['B', 'A']),
    'bossa': dict(era='1960s bossa nova', swing=.5, feel='latin', comp=('gtr', NYLON, 'bossa'), bass='bossa', drums=('bossa', BRUSH_KIT, 'bossa'), pad=(SLOW_STRINGS, 30),
                  leads=[(FLUTE, 'flute', 67, 88), (TENOR, 'tenor sax', 55, 76), (CLARINET, 'clarinet', 62, 84)],
                  answers=[(TENOR, 'tenor sax', 52, 72), (NYLON, 'nylon guitar', 55, 76), (FLUTE, 'flute', 67, 86)],
                  charts=[{'A': 'Cmaj7 | Cmaj7 | D7 | D7 | Dm7 | G7 | Cmaj7 | Dm7 G7', 'B': 'Fmaj7 | Bb7 | Em7 | A7 | Dm7 | G7 | Cmaj7 | Dm7 G7'},
                          {'A': 'Cmaj7 | Bm7b5 E7 | Am7 | D7 | Dm7 | G7 | Em7 A7 | Dm7 G7', 'B': 'Ebmaj7 | Ab7 | Dbmaj7 | Dm7 G7 | Cmaj7 | Am7 | Dm7 | G7'},
                          {'A': 'Am7 | D7 | Gm7 | C7 | Fmaj7 | Fm6 | Em7 A7 | Dm7 G7', 'B': 'Fmaj7 | Fm6 | Cmaj7 | A7 | Dm7 | G7 | Cmaj7 | Dm7 G7'}],
                  form=['A', 'A', 'B', 'A'], talk=['A', 'B', 'A'], out=['B', 'A']),
    'bigband': dict(era='1960s showroom big band', swing=.6, feel='swing', comp=('piano', PIANO, 'swing'), bass='walk', drums=('bigband', JAZZ_KIT, 'swing'), section=True,
                    leads=[(TRUMPET, 'trumpets', 64, 84), (ALTO, 'saxes', 60, 80), (TRUMPET, 'trumpets', 62, 82)],
                    answers=[(TROMBONE, 'trombones', 48, 68), (TENOR, 'tenor saxes', 50, 70), (FRENCH_HORN, 'horns', 50, 70)],
                    charts=[{'A': 'C6 | Dm7 G7 | C6 | Gm7 C7 | Fmaj7 | Fm6 | Em7 A7 | Dm7 G7', 'B': 'Am7 | D7 | Dm7 | G7 | Em7 | A7 | Dm7 | G7'},
                            {'A': 'Cmaj7 | A7 | Dm7 | G7 | Cmaj7 | C7 | Fmaj7 Fm6 | Dm7 G7', 'B': 'Em7 | A7 | Dm7 | G7 | Cm7 | F7 | Dm7 | G7'},
                            {'A': 'C6 | Ebdim | Dm7 | G7 | Em7 | Am7 | Dm7 | G7', 'B': 'Fmaj7 | Bb7 | Em7 | A7 | Dm7 | G7 | C6 | Dm7 G7'}],
                    form=['A', 'A', 'B', 'A'], talk=['A', 'A', 'B', 'A'], out=['B', 'A']),
    'ballad': dict(era='late-1950s ballad', swing=.66, feel='ballad', comp=('piano', PIANO, 'ballad'), bass='two', drums=('brush', BRUSH_KIT, 'brush'), pad=(STRINGS, 26), susp=.5,
                   leads=[(TENOR, 'tenor sax', 55, 76), (ALTO, 'alto sax', 58, 79), (TRUMPET, 'trumpet', 58, 79)],
                   answers=[(PIANO, 'piano', 60, 82), (CLARINET, 'clarinet', 55, 76), (CLEAN_GTR, 'guitar', 55, 76)],
                   charts=[{'A': 'Cmaj7 Am7 | Dm7 G7 | Em7 A7 | Dm7 G7 | Cmaj7 C7 | Fmaj7 Fm6 | Em7 A7 | Dm7 G7', 'B': 'Fmaj7 | Bb7 | Em7 | A7 | Dm7 | G7 | Em7 A7 | Dm7 G7'},
                           {'A': 'Cmaj7 | Bm7b5 E7 | Am7 | Gm7 C7 | Fmaj7 | Fm6 | Em7 A7 | Dm7 G7', 'B': 'Am7 | D7 | Gmaj7 | Gm7 C7 | Fmaj7 | Fm6 | Dm7 | G7'},
                           {'A': 'Am7 | Am7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7', 'B': 'Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7 | Am7 | E7'}],
                   form=['A', 'A', 'B', 'A'], talk=['A', 'A'], out=['A']),
    'funk': dict(era='1970s jazz-funk', swing=.5, feel='funk', comp=('rhodes', EPIANO, 'funk'), comp2=('gtr', MUTED_GTR, 'chank'), bass='funk', drums=('funk', STANDARD_KIT, 'funk'),
                 leads=[(ALTO, 'alto sax', 60, 80), (FLUTE, 'flute', 67, 88), (TENOR, 'tenor sax', 55, 75)],
                 answers=[(TRUMPET, 'trumpet', 58, 78), (CLEAN_GTR, 'guitar', 55, 76), (EPIANO, 'Rhodes', 60, 80)],
                 charts=[{'A': 'Cm7 | F7 | Cm7 | F7 | Cm7 | F7 | Abmaj7 | G7sus', 'B': 'Abmaj7 | Gm7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7sus'},
                         {'A': 'Dm7 | Dm7 | Em7 | Em7 | Dm7 | Dm7 | Fmaj7 | Em7', 'B': 'Bbmaj7 | Am7 | Gm7 | C7 | Fmaj7 | Bbmaj7 | Em7 | A7sus'},
                         {'A': 'Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Dm7b5 | G7sus', 'B': 'Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7 | Cm7 | G7sus'}],
                 form=['A', 'B'], talk=['A', 'A', 'B'], out=['A', 'B']),
    'jump': dict(era='1940s jump blues', swing=.66, feel='blues', comp=('piano', PIANO, 'swing'), bass='walk', drums=('shuffle', JAZZ_KIT, 'shuffle'),
                 leads=[(TENOR, 'tenor sax', 52, 74), (ALTO, 'alto sax', 58, 80), (TRUMPET, 'trumpet', 60, 80)],
                 answers=[(TRUMPET, 'trumpet', 58, 78), (TROMBONE, 'trombone', 46, 66), (JAZZ_GTR, 'jazz guitar', 52, 74)],
                 charts=[{'A': 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | A7 | Dm7 | G7 | C7 A7 | Dm7 G7'},
                         {'A': 'C7 | C7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | G7'},
                         {'A': 'C7 | F7 | C7 | Gm7 C7 | F7 | Fdim7 | C7 | A7 | Dm7 | G7 | Em7 A7 | Dm7 G7'}],
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
                          {'A': 'Cm7 | Fm7 | Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Ab7 | G7 | Cm7 | G7'},
                          {'A': 'C7 | F7 | C7 | Gm7 C7 | F7 | F7 | C7 | Em7 A7 | Dm7 | G7 | C7 A7 | Dm7 G7'}],
                  form=['A', 'A'], talk=['A', 'A', 'A'], out=['A']),
}
ENDING = 'Cmaj7 | Cmaj7'
ENDING_MINOR = 'Cm6 | Cm6'

# (slug, title, genre, chart, key, tempo, lead, answer)
SET = [
    ('neon-strip', 'Neon Strip', 'swing', 0, 5, 132, 0, 0), ('loose-change', 'Loose Change', 'swing', 1, 10, 144, 1, 2), ('side-bet', 'Side Bet', 'swing', 2, 3, 124, 2, 1),
    ('velvet-rope', 'Velvet Rope', 'bossa', 0, 7, 128, 0, 0), ('pool-light', 'Pool Light', 'bossa', 1, 2, 120, 1, 1), ('desert-moon', 'Desert Moon', 'bossa', 2, 9, 132, 2, 2),
    ('high-roller', 'High Roller', 'bigband', 0, 10, 168, 0, 0), ('marquee', 'Marquee', 'bigband', 1, 3, 156, 1, 1), ('double-down', 'Double Down', 'bigband', 2, 8, 176, 2, 2),
    ('last-call', 'Last Call', 'ballad', 0, 3, 64, 0, 0), ('house-lights', 'House Lights', 'ballad', 1, 8, 60, 1, 1), ('two-a-m', '2 A.M.', 'ballad', 2, 5, 66, 2, 2),
    ('velour', 'Velour', 'funk', 0, 7, 100, 0, 0), ('fresh-felt', 'Fresh Felt', 'funk', 1, 0, 104, 1, 1), ('pit-boss', 'Pit Boss', 'funk', 2, 2, 96, 2, 2),
    ('lucky-streak', 'Lucky Streak', 'jump', 0, 10, 144, 0, 0), ('comp-ticket', 'Comp Ticket', 'jump', 1, 7, 152, 1, 1), ('cash-out', 'Cash Out', 'jump', 2, 0, 138, 2, 2),
    ('satin-dice', 'Satin Dice', 'smooth', 0, 5, 92, 0, 0), ('valet', 'Valet', 'smooth', 1, 2, 88, 1, 1), ('chrome', 'Chrome', 'smooth', 2, 10, 96, 2, 2),
    ('hammond-hour', 'Hammond Hour', 'organ', 0, 5, 116, 0, 0), ('back-room', 'Back Room', 'organ', 1, 0, 108, 1, 1), ('after-hours', 'After Hours', 'organ', 2, 7, 120, 2, 2),
]


def arrange(slug, title, genre, ci, key, bpm, li, ai, rng):
    g = G[genre]; chart = g['charts'][ci]; b = Band(title, bpm, g['swing'], rng)
    lead, answer = g['leads'][li], g['answers'][ai]
    if answer[0] == lead[0]: answer = g['answers'][(ai + 1) % len(g['answers'])]
    b.chan('lead', 0, lead[0], 104, 76, 50); b.chan('answer', 3, answer[0], 98, 46, 50)
    cname, cprog, cstyle = g['comp']; b.chan(cname, 1, cprog, 82, 56, 40, 20)
    b.chan('bass', 2, {'funk': FINGER, 'smooth': FRETLESS}.get(g['bass'], UPRIGHT), 110, 62, 25)
    dstyle, dkit, _ = g['drums']; b.chan('drums', 9, dkit, 92, 64, 35)
    if g.get('comp2'): b.chan(g['comp2'][0], 4, g['comp2'][1], 66, 92, 30)
    if g.get('pad'): b.chan('pad', 5, g['pad'][0], 52, 64, 80)
    if g.get('section'): b.chan('lead2', 6, lead[0], 86, 88, 50); b.chan('answer2', 7, answer[0], 86, 36, 50)
    minor = chart['A'].split()[0].startswith('Cm')
    S = {k: transpose(v, key) for k, v in chart.items()}
    S['I'] = transpose(' | '.join(chart['A'].split('|')[-4:]), key); S['Z'] = transpose(ENDING_MINOR if minor else ENDING, key)
    order = ['I'] + g['form'] + g['talk'] + g['out'] + ['Z']
    starts = []
    for name in order: starts.append(len(b.chart.bars)); b.chart.add(S[name])
    n = len(b.chart.bars); lens = [(starts[i + 1] if i + 1 < len(starts) else n) - starts[i] for i in range(len(starts))]
    segs = list(zip(starts, lens, order))
    nf, nt = len(g['form']), len(g['talk'])
    head, talk, out = segs[1:1 + nf], segs[1 + nf:1 + nf + nt], segs[1 + nf + nt:-1]
    # the rhythm section
    b.comp(cname, 0, n - 2, cstyle, 50, 70, 56); b.comp(cname, n - 2, n, 'ballad' if cstyle != 'organ' else 'organ', 50, 70, 50)
    if g.get('comp2'): b.comp(g['comp2'][0], starts[1], n - 2, g['comp2'][2], vel=52)
    if g.get('pad'): b.comp('pad', starts[1], n, 'pad', 55, 72, g['pad'][1])
    bass = g['bass']
    if bass == 'walk': b.bass(0, starts[1], 'two'); b.bass(starts[1], n - 2, 'walk', vel=88); b.bass(n - 2, n, 'two')
    elif bass == 'two': b.bass(0, n, 'two', vel=84)
    else: b.bass(0, n - 2, bass, vel=90); b.bass(n - 2, n, 'two' if bass != 'funk' else 'two', vel=84)
    sect = {s for s in starts[1:-1]}
    b.drums(starts[1] if dstyle == 'brush' else 0, n - 2, dstyle, 74, fills={s - 1 for s in sect}, crash={talk[0][0], out[0][0]} if dstyle not in ('brush', 'bossa') else set())
    # the story
    st = Story(b, g['feel'], key, rng)
    voices = ('lead', 'answer'); lo_hi = {'lead': lead[2:], 'answer': answer[2:]}
    st.horn = {'lead': lead[0] >= 56 and lead[0] <= 79, 'answer': answer[0] >= 56 and answer[0] <= 79}
    st.rng_lo = {'lead': lead[2] - 7, 'answer': answer[2] - 7}
    vel = {'lead': 92, 'answer': 84}
    susp = g.get('susp', .3)
    st.converse(voices, head, lo_hi, vel, 'head')
    arc = lambda x: .25 + .75 * (x / .66 if x < .66 else 1 - (x - .66) / .34 * .7)
    st.converse(voices, talk, lo_hi, vel, 'talk', arc)
    st.converse(voices, out, lo_hi, vel, 'out')
    st.coda(voices, n - 2, lo_hi, vel)
    if g.get('section'):  # big band: each lead line doubled by its section a 3rd/6th under, in close harmony
        for (ch, t, dur, p, v, ns) in [x for x in b.notes if x[0] in (b.chans['lead'], b.chans['answer'])]:
            name = 'lead2' if ch == b.chans['lead'] else 'answer2'; cur = b.chart.at(t)
            from story import strong_pcs
            good = strong_pcs(cur)
            for gap in (3, 4, 8, 9, 5):
                if (p - gap) % 12 in good: b.notes.append((b.chans[name], t, dur, p - gap, max(1, v - 14), ns)); break
    st.clear_bass()
    st.clear_comp([cname] + ([g['comp2'][0]] if g.get('comp2') else []) + (['pad'] if g.get('pad') else []))
    t = b.ending(n - 2, None)
    root = 24 + (key % 12) + (12 if key % 12 < 4 else 0)
    b.note('bass', t, 7, root, 88)
    if dkit != BRUSH_KIT: b.note('drums', t, 6, 49, 70)
    else: b.note('drums', t, 6, 38, 40)
    return b, f"{g['era']}: {lead[1]} and {answer[1]}", key
