# The bout music: a loop for the tables and one for the High Roller on each floor, and two for the Ascent.
#   run: python3 tools/jazz/loops.py [slug ...]   (all loops if none named; needs what render.py needs)
#
# Each loop is 16 bars, written out by hand (the chart, the two tunes, the riffs) rather than generated, and is played
# in six layers that the game mixes live as a bout goes (js/ui/music.js):
#   base   the groove: bass, comping, light drums (always on)
#   theme  the tune, on piano, vibraphone or guitar
#   alt    a second tune over the same changes, on another instrument. The game plays one of the two each time
#          round, or neither (the band vamps), so a long bout does not hear one melody over and over
#   drive  the full kit, the horn section (backgrounds that answer in the tune's gaps, or hits), a second rhythm
#          part (fades in as either Roller's Worth runs down)
#   peril  floor toms and a snare roll into the top, tremolo strings climbing through the chord a step a bar, a low
#          pulse, brass stabs (fades in when YOU are close to broke)
#   surge  handclaps and tambourine, a crash every four bars, the brass section riffing (fades in when your OPPONENT
#          is close to broke: the band smells a win)
# Every layer is rendered three times round and the middle pass is cut out, with half a second either side, so the
# room's tail and the next bar's pickup are already in it: the game loops between `start` and `start + length`, and
# an encoder's lead-in shifts every layer alike, so the seam stays clean and the layers stay together.
# The layers are levelled against the groove (balance): the two tunes alike, the drive and the surge a few LU under it.
import os, sys, json, random, subprocess, zlib
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from engine import Band, Q, voicings, tones, nearest
from story import strong_pcs
from render import room, synth, SR, WIND, MASTER

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'music', 'loops')
TMP = os.environ.get('TMPDIR', '/tmp')
PAD, BARS = .5, 16
LAYERS = ('base', 'theme', 'alt', 'drive', 'peril', 'surge')
DRUMS = (9, 12, 13, 20)  # the kit's parts: one per layer that has drums
REMAP = {12: 9, 13: 9, 20: 9, 16: 0, 17: 7, 18: 8}  # each layer is written to its own file, so its parts can share real channels
PIANO, EPIANO, VIBES, NYLON, JAZZ_GTR, CLEAN_GTR, MUTED_GTR = 0, 4, 11, 24, 26, 27, 28
UPRIGHT, FINGER, STRINGS, SLOW_STRINGS, TREM_STRINGS, HARP, TIMPANI = 32, 33, 48, 49, 44, 46, 47
TRUMPET, TROMBONE, MUTED_TPT, FRENCH_HORN, ALTO, TENOR = 56, 57, 59, 60, 65, 66
JAZZ_KIT, BRUSH_KIT, STANDARD_KIT = 32, 40, 0
NAMES = {'C': 0, 'Db': 1, 'C#': 1, 'D': 2, 'Eb': 3, 'D#': 3, 'E': 4, 'F': 5, 'Gb': 6, 'F#': 6, 'G': 7, 'Ab': 8, 'G#': 8, 'A': 9, 'Bb': 10, 'A#': 10, 'B': 11}

# bass riffs: (beat, semitones over the chord's root, or 'T' for its 3rd, length)
RIFF_STOMP = [(0, 0, .75), (1, 0, .45), (1.5, 7, .45), (2, 10, .45), (3, 12, .45), (3.5, 10, .45)]
RIFF_SPY = [(0, 0, .45), (.5, 0, .45), (1, 7, .45), (1.5, 0, .45), (2, 8, .45), (2.5, 7, .45), (3, 5, .45), (3.5, 'T', .45)]
RIFF_HOUSE = [(0, 0, .6), (.75, 0, .2), (1.5, 10, .4), (2, 12, .2), (2.5, 7, .4), (3, 10, .4), (3.5, 3, .4)]

LOOPS = [
    dict(slug='basement-bout', title='Basement Boogie', floor=1, kind='bout', key=7, bpm=138, swing=.66, groove='shuffle', kit=JAZZ_KIT,
         chart='G7 | C7 | G7 | G7 | C7 | C7 | G7 | E7 | Am7 | D7 | G7 E7 | Am7 D7 | G7 | C7 | G7 | D7',
         bass='two', boogie=True, lead=PIANO,
         theme='r:.5 Bb4:.5 B4:.5 D5:1 G5:.5 F5:.5 D5:.5 | r:.5 Bb4:.5 C5:.5 E5:1 G5:.5 E5:.5 C5:.5 | D5:1.5 Bb4:.5 B4:1 G4:1 | r:2 F5:.5 E5:.5 D5:.5 B4:.5 |'
               'r:.5 Eb5:.5 E5:.5 G5:1 Bb5:.5 A5:.5 G5:.5 | E5:2 C5:.5 Bb4:.5 G4:1 | r:.5 Bb4:.5 B4:.5 D5:1 G5:.5 F5:.5 D5:.5 | E5:1 D5:.5 B4:.5 G#4:1 B4:1 |'
               'A4:.5 C5:.5 E5:.5 G5:1.5 F#5:.5 E5:.5 | D5:1 C5:.5 A4:.5 F#4:1 A4:1 | G4:.5 B4:.5 D5:.5 G5:.5 F5:.5 E5:.5 D5:.5 B4:.5 | C5:1 A4:.5 E5:.5 D5:1 C5:.5 A4:.5 |'
               'r:.5 Bb4:.5 B4:.5 D5:1 G5:.5 F5:.5 D5:.5 | E5:1.5 C5:.5 Bb4:1 G4:1 | D5:3 r:1 | r:1 A4:.5 C5:.5 Eb5:.5 F#5:.5 A5:.5 C6:.5',
         horns=(TENOR, ALTO), hstyle='stabs', hits=[(1, .35), (2.5, .9)], extra='chank', stab=TRUMPET, pulse='piano',
         alt=(JAZZ_GTR, 'r:1 D5:.5 E5:.5 G5:1 E5:.5 D5:.5 | Eb5:.5 E5:.5 r:1 Bb4:.5 C5:.5 E5:1 | r:1 D5:.5 E5:.5 G5:1 E5:.5 D5:.5 | B4:1 G4:1 r:1 F5:.5 E5:.5 |'
                   'Eb5:.5 E5:.5 G5:1 Bb5:1.5 G5:.5 | E5:.5 C5:.5 Bb4:1 r:2 | r:1 D5:.5 E5:.5 G5:1 E5:.5 D5:.5 | B4:1 G#4:1 E5:1 D5:.5 B4:.5 |'
                   'C5:1.5 A4:.5 r:1 E5:.5 G5:.5 | F#5:1.5 D5:.5 r:1 C5:.5 A4:.5 | B4:.5 D5:.5 G5:1 G#5:.5 E5:.5 D5:.5 B4:.5 | C5:.5 E5:.5 A5:1 F#5:.5 D5:.5 C5:.5 A4:.5 |'
                   'r:1 D5:.5 E5:.5 G5:1 E5:.5 D5:.5 | Eb5:.5 E5:.5 r:1 Bb4:.5 C5:.5 E5:1 | D5:.5 B4:.5 G4:2 r:1 | r:2.5 D5:.5 F#5:.5 A5:.5')),
    dict(slug='basement-boss', title='Cellar Stomp', floor=1, kind='boss', key=4, bpm=112, swing=.64, groove='shuffle', kit=JAZZ_KIT,
         chart='Em7 | Em7 | Em7 | Em7 | Am7 | Am7 | Em7 | Em7 | C7 | B7 | Em7 | B7 | Em7 | C7 | Em7 | B7#9',
         bass='riff', riff=RIFF_STOMP, doubled=True, comp=(PIANO, 'swing'), lead=JAZZ_GTR,
         theme='r:1 G4:.5 A4:.5 B4:1.5 D5:.5 | E5:2 D5:.5 B4:.5 A4:.5 G4:.5 | B4:3 r:1 | r:2 G4:.5 A4:.5 Bb4:.5 B4:.5 |'
               'C5:.5 D5:.5 E5:1.5 G5:.5 E5:1 | D5:.5 C5:.5 A4:2 r:1 | r:.5 E5:.5 G5:.5 E5:.5 D5:.5 B4:.5 A4:.5 G4:.5 | E4:3 r:1 |'
               'E5:1 G5:.5 Bb5:1.5 G5:1 | A5:.5 F#5:.5 D#5:2 B4:1 | E5:2 r:.5 D5:.5 B4:1 | D#5:1 F#5:1 A5:2 |'
               'G5:1.5 E5:.5 D5:.5 B4:.5 A4:1 | G4:.5 Bb4:.5 C5:.5 E5:1.5 r:1 | B4:1 G4:.5 E4:2.5 | r:1 D5:.5 D#5:.5 F#5:.5 A5:.5 B5:1',
         horns=(TENOR, TROMBONE), hstyle='stabs', hits=[(0, .6), (1.5, .4)], stab=TROMBONE, pulse='piano',
         alt=(PIANO, 'r:2 B4:.5 D5:.5 E5:1 | G5:1.5 E5:.5 D5:.5 E5:.5 r:1 | r:2 B4:.5 D5:.5 E5:1 | Bb5:.5 A5:.5 G5:.5 E5:.5 D5:1 B4:1 |'
                   'r:2 C5:.5 E5:.5 G5:1 | A5:1.5 G5:.5 E5:.5 C5:.5 r:1 | r:2 B4:.5 D5:.5 E5:1 | E5:.5 D5:.5 B4:.5 G4:.5 E4:2 |'
                   'r:1 E5:.5 G5:.5 Bb5:1 G5:.5 E5:.5 | D#5:1 F#5:.5 A5:1.5 F#5:1 | G5:.5 E5:.5 r:1 B4:.5 D5:.5 E5:1 | F#5:1 D#5:1 B4:1 A4:1 |'
                   'G4:.5 B4:.5 E5:2 r:1 | r:1 Bb4:.5 C5:.5 E5:1 G5:1 | E5:1.5 D5:.5 B4:.5 G4:.5 E4:1 | r:2 B4:.5 D5:.5 D#5:.5 F#5:.5', True)),
    dict(slug='haven-bout', title='Haven Hustle', floor=2, kind='bout', key=0, bpm=172, swing=.6, groove='swing', kit=JAZZ_KIT,
         chart='Cm7 | Cm7 | Fm7 | Fm7 | Dm7b5 | G7b9 | Cm7 | Cm7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7b9 | Cm7 | Ab7 | Dm7b5 | G7b9',
         bass='walk', comp=(PIANO, 'swing'), lead=VIBES,
         theme='G4:1 C5:.5 Eb5:.5 G5:1.5 F5:.5 | Eb5:.5 D5:.5 C5:.5 Bb4:.5 G4:2 | Ab4:1 C5:.5 Eb5:.5 F5:1.5 Eb5:.5 | C5:2 r:1 Ab4:.5 Bb4:.5 |'
               'C5:.5 D5:.5 F5:.5 Ab5:1.5 G5:.5 F5:.5 | Eb5:.5 D5:.5 B4:.5 Ab4:.5 G4:1 F4:1 | Eb4:1 G4:.5 C5:.5 D5:1.5 Eb5:.5 | C5:3 r:1 |'
               'G5:1 F5:.5 Eb5:.5 D5:1 Bb4:1 | C5:1.5 Eb5:.5 G5:2 | F5:.5 Eb5:.5 D5:.5 C5:.5 Ab4:1 F4:1 | G4:.5 B4:.5 D5:.5 F5:.5 Ab5:1 G5:1 |'
               'Eb5:1.5 C5:.5 G4:2 | r:.5 Gb5:.5 Eb5:.5 C5:.5 Ab4:1 C5:1 | D5:1 F5:1 Ab5:1 C6:1 | B5:.5 Ab5:.5 F5:.5 D5:.5 B4:1 G4:1',
         horns=(TENOR, TRUMPET), hstyle='pads', stab=TRUMPET, pulse='piano',
         alt=(JAZZ_GTR, 'Eb5:2.5 D5:.5 C5:1 | G4:3 r:.5 C5:.5 | F5:2.5 Eb5:.5 C5:1 | Ab4:3 r:1 |'
                   'r:.5 D5:.5 F5:.5 Ab5:1.5 G5:1 | F5:.5 D5:.5 B4:1 Ab4:1.5 G4:.5 | C5:1 Eb5:1 G5:2 | r:2.5 Bb4:.5 C5:.5 D5:.5 |'
                   'Eb5:1.5 G5:.5 Bb5:2 | Ab5:1.5 G5:.5 Eb5:1 C5:1 | D5:1.5 F5:.5 Ab5:2 | B4:1 D5:1 F5:1 Ab5:1 |'
                   'G5:2.5 Eb5:.5 C5:1 | C5:1.5 Eb5:.5 Gb5:2 | F5:1.5 D5:.5 C5:1 Ab4:1 | G4:2 r:.5 G4:.5 B4:.5 D5:.5')),
    dict(slug='haven-boss', title='Haven Heat', floor=2, kind='boss', key=2, bpm=176, swing=.58, groove='swing', kit=JAZZ_KIT,
         chart='Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Ebm7 | Ebm7 | Dm7 | Dm7 | Dm7 | Dm7 | Bbmaj7 | A7#9 | Dm7 | A7#9',
         bass='walk', comp=(PIANO, 'swing'), lead=PIANO, octaves=True,
         theme='A4:.5 C5:.5 D5:.5 F5:.5 G5:1 F5:.5 D5:.5 | C5:1.5 A4:.5 G4:2 | r:.5 D5:.5 F5:.5 G5:.5 A5:1 C6:1 | A5:.5 G5:.5 F5:.5 D5:.5 E5:2 |'
               'D5:1 A4:1 C5:.5 D5:.5 F5:1 | E5:3 r:1 | Bb4:.5 Db5:.5 Eb5:.5 Gb5:.5 Ab5:1 Gb5:.5 Eb5:.5 | Db5:1.5 Bb4:.5 Ab4:2 |'
               'A4:.5 C5:.5 D5:.5 F5:.5 G5:1 F5:.5 D5:.5 | C6:1.5 A5:.5 G5:2 | F5:.5 E5:.5 D5:.5 C5:.5 A4:1 G4:1 | A4:3 r:1 |'
               'D5:1 F5:1 A5:1.5 G5:.5 | C6:1 A5:.5 G5:.5 E5:1 C#5:1 | D5:2 F5:.5 E5:.5 D5:1 | r:.5 E5:.5 G5:.5 Bb5:.5 C6:.5 C#6:.5 E6:1',
         horns=(TENOR, TROMBONE), hstyle='pads', stab=TRUMPET, pulse='piano',
         alt=(VIBES, 'r:2 E5:1.5 D5:.5 | r:2 A5:1.5 G5:.5 | r:1 D5:.5 F5:.5 G5:.5 A5:.5 C6:1 | A5:1.5 G5:.5 E5:2 |'
                   'r:2 E5:1.5 D5:.5 | r:1.5 C5:.5 D5:.5 F5:.5 G5:1 | r:2 F5:1.5 Eb5:.5 | r:1 Bb5:1.5 Ab5:.5 Gb5:1 |'
                   'r:2 E5:1.5 D5:.5 | r:2 A5:1.5 G5:.5 | C6:1 A5:.5 G5:.5 F5:.5 D5:.5 C5:1 | D5:3 r:1 |'
                   'F5:1.5 D5:.5 A5:2 | G5:1 E5:1 C#5:1 C5:1 | D5:1.5 F5:.5 A5:2 | r:1 C6:1 Bb5:.5 G5:.5 E5:.5 C#5:.5')),
    dict(slug='suite-bout', title='Suite Intrigue', floor=3, kind='bout', key=9, bpm=116, swing=.5, groove='spy', kit=JAZZ_KIT,
         chart='Am7 | Am7 | Am7 | Am7 | Dm7 | Dm7 | Am7 | Am7 | Fmaj7 | E7b9 | Am7 | Am7 | Dm7 | E7b9 | Am7 | E7#9',
         bass='riff', riff=RIFF_SPY, bass_prog=FINGER, comp=(EPIANO, 'smooth'), lead=CLEAN_GTR,
         theme='E4:1.5 A4:.5 C5:1 B4:1 | A4:.5 G4:.5 E4:3 | E4:1.5 A4:.5 C5:1 E5:1 | Eb5:.5 D5:.5 C5:.5 B4:.5 A4:2 |'
               'F4:1.5 A4:.5 D5:1 C5:1 | A4:.5 G4:.5 F4:3 | E5:1 C5:.5 A4:.5 G4:1 A4:1 | r:4 |'
               'A4:1 C5:1 E5:1.5 F5:.5 | E5:.5 D5:.5 C5:.5 B4:.5 G#4:1 F4:1 | A4:3 r:1 | r:2 C5:.5 B4:.5 A4:.5 G#4:.5 |'
               'A4:1 D5:1 F5:1.5 E5:.5 | D5:.5 C5:.5 B4:.5 G#4:.5 F4:1 E4:1 | A4:2 E4:1 G4:1 | G#4:.5 B4:.5 D5:.5 G5:1.5 G#5:1',
         answer=(VIBES, 'r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:.5 E5:.5 G5:.5 B5:.5 A5:2 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4'),
         horns=(MUTED_TPT, TROMBONE), hstyle='stabs', hits=[(0, .3), (1.5, .3)], stab=TRUMPET, pulse='piano',
         alt=(VIBES, 'r:1 A4:.5 C5:.5 E5:1.5 D#5:.5 | E5:1 C5:1 A4:2 | r:1 A4:.5 C5:.5 E5:1.5 G5:.5 | F#5:.5 G5:.5 E5:1 C5:2 |'
                   'r:1 D5:.5 F5:.5 A5:1.5 G#5:.5 | A5:1 F5:1 D5:2 | r:1 C5:.5 E5:.5 G5:1 E5:.5 C5:.5 | A4:2 r:2 |'
                   'A5:1.5 G5:.5 E5:1 C5:1 | B4:1 D5:.5 F5:1.5 E5:1 | r:1 A4:.5 C5:.5 E5:1.5 D#5:.5 | E5:3 r:1 |'
                   'F5:1 A5:.5 C6:1.5 A5:1 | G#5:.5 F5:.5 D5:.5 B4:.5 G#4:2 | A4:1 C5:1 E5:1 A5:1 | G5:1.5 E5:.5 D5:.5 B4:.5 G#4:1')),
    dict(slug='suite-boss', title='Showroom Showdown', floor=3, kind='boss', key=10, bpm=152, swing=.6, groove='swing', kit=JAZZ_KIT,
         chart='Bbm7 | Bbm7 | Ebm7 | Ebm7 | Bbm7 | Bbm7 | Gb7 | F7#9 | Bbm7 | Bbm7 | Ebm7 | Ab7 | Dbmaj7 | Gb7 | Cm7b5 | F7b9',
         bass='walk', comp=(JAZZ_GTR, 'swing'), lead=PIANO, octaves=True,
         theme='F4:.5 Ab4:.5 Bb4:.5 Db5:.5 F5:1.5 Eb5:.5 | Db5:.5 C5:.5 Bb4:1 F4:2 | Gb4:.5 Bb4:.5 Db5:.5 Eb5:.5 Gb5:1.5 F5:.5 | Eb5:1 Db5:.5 Bb4:.5 Gb4:2 |'
               'Bb4:1 Db5:1 F5:1 Ab5:1 | G5:.5 F5:.5 Db5:.5 Bb4:.5 Ab4:2 | Bb4:.5 Db5:.5 E5:.5 Gb5:.5 Eb5:1 Db5:1 | A4:.5 C5:.5 Eb5:.5 Ab5:1.5 A5:1 |'
               'Bb5:1.5 F5:.5 Db5:1 Bb4:1 | C5:.5 Db5:.5 C5:.5 Bb4:.5 F4:2 | Gb4:.5 Bb4:.5 Eb5:.5 Gb5:.5 Bb5:1 Ab5:1 | Gb5:.5 Eb5:.5 C5:.5 Ab4:.5 Gb4:2 |'
               'F4:1 Ab4:1 C5:1.5 Db5:.5 | Bb4:.5 Db5:.5 E5:1 Db5:1 Bb4:1 | Eb5:.5 Gb5:.5 Bb5:.5 C6:.5 Bb5:1 Gb5:1 | A5:.5 Gb5:.5 Eb5:.5 C5:.5 A4:1 F4:1',
         horns=(TRUMPET, TROMBONE), hstyle='stabs', hits=[(0, .6), (2.5, .9)], sections=True, stab=TRUMPET, pulse='piano',
         alt=(VIBES, 'r:1 F5:1 Db5:.5 Bb4:.5 r:1 | r:1 F5:1 Db5:.5 Bb4:.5 C5:.5 Db5:.5 | r:1 Gb5:1 Eb5:.5 Bb4:.5 r:1 | r:1 Gb5:1 Eb5:.5 Db5:.5 Bb4:1 |'
                   'Db5:.5 F5:.5 Ab5:2 F5:1 | Db5:1.5 Bb4:.5 F4:2 | r:.5 Bb4:.5 Db5:.5 E5:.5 Gb5:1.5 E5:.5 | Eb5:1 C5:1 A4:1 Ab4:1 |'
                   'r:1 F5:1 Db5:.5 Bb4:.5 r:1 | r:1 Ab5:1 F5:.5 Db5:.5 Bb4:1 | Gb5:1.5 Eb5:.5 Bb4:1 Db5:1 | C5:1 Eb5:.5 Gb5:1.5 Eb5:1 |'
                   'F5:2.5 Ab5:.5 C6:1 | Bb5:1 Ab5:.5 Gb5:.5 E5:1 Db5:1 | Eb5:1.5 C5:.5 Gb4:2 | r:1 A4:.5 C5:.5 Eb5:.5 Gb5:.5 A5:1')),
    dict(slug='paradise-bout', title='Royal Velvet', floor=4, kind='bout', key=1, bpm=100, swing=.5, groove='bossa', kit=BRUSH_KIT,
         chart='Dbmaj7 | Bbm7 | Ebm7 | Ab7 | Dbmaj7 | Gb7 | Fm7 | Bb7b9 | Ebm7 | Ab7 | Fm7 | Bbm7 | Ebm7 | Ab7 | Dbmaj7 | Ab7',
         bass='bossa', comp=(NYLON, 'bossa'), pad=SLOW_STRINGS, lead=VIBES,
         theme='F5:2 Eb5:1 Db5:1 | C5:1.5 Db5:.5 F5:2 | Gb5:2 F5:1 Eb5:1 | C5:3 r:1 |'
               'Ab5:2 F5:1 Db5:1 | E5:1.5 Db5:.5 Bb4:2 | Ab4:1 C5:1 Eb5:1 F5:1 | D5:1.5 B4:.5 Ab4:2 |'
               'Gb4:1 Bb4:1 Db5:1.5 Eb5:.5 | F5:2 Eb5:1 C5:1 | Eb5:1.5 C5:.5 Ab4:2 | Db5:2 F5:1 Ab5:1 |'
               'Gb5:1.5 F5:.5 Eb5:1 Db5:1 | C5:1 Eb5:1 Gb5:2 | F5:3 r:1 | r:1 Eb5:1 C5:1 Bb4:1',
         extra='harp', stab=TROMBONE, pulse='piano',
         alt=(PIANO, 'r:.5 Ab4:.5 C5:.5 F5:1.5 Eb5:1 | Db5:1.5 Bb4:2 r:.5 | r:.5 Bb4:.5 Db5:.5 Gb5:1.5 F5:1 | Eb5:1.5 C5:2 r:.5 |'
                   'r:.5 Ab5:.5 F5:.5 Eb5:1.5 Db5:1 | E5:1.5 Db5:.5 Bb4:1.5 Ab4:.5 | Ab4:.5 C5:.5 Eb5:1.5 F5:1.5 | Ab5:1 F5:.5 D5:.5 B4:2 |'
                   'r:.5 Bb4:.5 Eb5:.5 Gb5:1.5 Bb5:1 | Ab5:1.5 Gb5:.5 Eb5:1 C5:1 | C5:.5 Eb5:.5 Ab5:2 F5:1 | Db5:.5 F5:.5 Ab5:1.5 F5:1.5 |'
                   'Gb5:1 F5:.5 Eb5:.5 Db5:1 Bb4:1 | C5:.5 Eb5:.5 Gb5:1.5 Bb5:1.5 | Ab5:3 r:1 | r:1 Gb5:.5 Eb5:.5 C5:1 Ab4:1')),
    dict(slug='paradise-boss', title='Royal Decree', floor=4, kind='boss', key=7, bpm=108, swing=.5, groove='bolero', kit=JAZZ_KIT,
         chart='Gm7 | Gm7 | Cm7 | Cm7 | Ebmaj7 | Ebmaj7 | Am7b5 | D7b9 | Gm7 | Gm7 | Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7b9',
         bass='two', arp=HARP, pad=STRINGS, lead=PIANO, octaves=True,
         theme='D5:2 Bb4:1 G4:1 | A4:1.5 Bb4:.5 D5:2 | Eb5:2 D5:1 C5:1 | G5:3 r:1 |'
               'G5:1.5 F5:.5 Eb5:1 D5:1 | Bb4:2 G4:1 Bb4:1 | C5:1 Eb5:1 G5:1.5 F5:.5 | Eb5:1.5 C5:.5 F#4:2 |'
               'G4:1 Bb4:1 D5:1.5 F5:.5 | G5:2 A5:1 Bb5:1 | G5:1 Eb5:1 C5:1.5 D5:.5 | Eb5:2 C5:1 A4:1 |'
               'D5:1.5 F5:.5 A5:2 | G5:1.5 Bb5:.5 G5:1 Eb5:1 | Eb5:1 C5:1 A4:1 G4:1 | F#4:1 A4:1 C5:1 Eb5:1',
         horns=(FRENCH_HORN, TROMBONE), hstyle='pads', stab=TRUMPET, pulse='timpani',
         alt=(NYLON, 'G4:1 Bb4:.5 D5:.5 G5:2 | F5:.5 Eb5:.5 D5:1 Bb4:2 | C5:1 Eb5:.5 G5:.5 C6:2 | Bb5:.5 Ab5:.5 G5:1 Eb5:2 |'
                   'r:1 G5:1 Bb5:1.5 G5:.5 | F5:.5 Eb5:.5 D5:1 Bb4:1 G4:1 | A4:1 C5:.5 Eb5:.5 G5:2 | F#5:1 Eb5:1 C5:1 A4:1 |'
                   'Bb4:.5 D5:.5 G5:1.5 A5:.5 Bb5:1 | A5:.5 G5:.5 D5:3 | Eb5:.5 G5:.5 C6:1.5 Bb5:.5 G5:1 | A5:1 F5:1 Eb5:1 C5:1 |'
                   'Bb4:.5 D5:.5 F5:1 A5:2 | G5:1 Bb5:1 D6:1.5 Bb5:.5 | C6:.5 A5:.5 G5:.5 Eb5:.5 C5:2 | D5:1 F#5:1 A5:1 C6:1')),
    dict(slug='ascent-bout', title='The Climb', floor=5, kind='bout', key=2, bpm=120, swing=.5, groove='funk', kit=STANDARD_KIT,
         chart='Dm7 | Dm7 | Dm7 | Dm7 | G7 | G7 | Dm7 | Dm7 | Bbmaj7 | A7#9 | Dm7 | Dm7 | Ebmaj7 | Ebmaj7 | Dm7 | A7#9',
         bass='funk', bass_prog=FINGER, comp=(EPIANO, 'funk'), lead=VIBES,
         theme='A4:.75 C5:.25 D5:.5 F5:1 E5:.5 D5:.5 C5:.5 | D5:2 r:1 A4:.5 C5:.5 | D5:.5 F5:.5 G5:.75 A5:.25 C6:1 A5:1 | G5:.5 F5:.5 D5:3 |'
               'B4:.75 D5:.25 F5:.5 G5:1 F5:.5 D5:.5 B4:.5 | C5:2 r:1 G4:.5 B4:.5 | A4:1 F5:.5 E5:.5 D5:1 C5:1 | D5:3 r:1 |'
               'D5:.75 F5:.25 A5:1 G5:.5 F5:.5 D5:1 | C#5:.5 E5:.5 G5:.5 C6:1.5 Bb5:1 | A5:2 F5:1 D5:1 | r:2 E5:.5 F5:.5 G5:.5 A5:.5 |'
               'G5:1 Bb5:.5 D6:1.5 Bb5:1 | G5:.5 F5:.5 Eb5:.5 D5:.5 Bb4:2 | A4:.75 C5:.25 D5:.5 F5:1 E5:.5 D5:.5 C5:.5 | C#5:1 E5:1 G5:1 C6:1',
         horns=(TENOR, TRUMPET), hstyle='stabs', hits=[(.75, .25), (2.5, .5)], extra='chank', stab=TRUMPET, pulse='piano',
         alt=(CLEAN_GTR, 'r:.5 D5:.25 D5:.25 F5:.5 G5:.5 r:.5 A5:.5 G5:.5 F5:.5 | D5:1 r:1.5 C5:.5 D5:1 | r:.5 D5:.25 D5:.25 F5:.5 G5:.5 r:.5 A5:.5 C6:.5 A5:.5 | G5:.5 F5:.5 D5:1 r:2 |'
                   'r:.5 D5:.25 D5:.25 F5:.5 G5:.5 r:.5 B5:.5 A5:.5 G5:.5 | F5:1 D5:.5 B4:.5 r:2 | A4:.5 C5:.5 D5:.75 F5:.25 G5:1 F5:.5 D5:.5 | C5:.5 D5:1.5 r:2 |'
                   'r:.5 F5:.5 A5:.5 D6:1 C6:.5 A5:1 | G5:.5 E5:.5 C#5:.5 C5:1 A4:1.5 | r:.5 D5:.25 D5:.25 F5:.5 G5:.5 r:.5 A5:.5 G5:.5 F5:.5 | D5:1 r:1 F5:.5 G5:.5 A5:1 |'
                   'Bb5:1.5 G5:.5 D5:1 Bb4:1 | r:.5 Eb5:.5 G5:.5 Bb5:.5 D6:2 | C6:.5 A5:.5 G5:.5 F5:.5 D5:2 | r:2 A4:.5 C5:.5 C#5:.5 E5:.5')),
    dict(slug='ascent-boss', title='The House', floor=5, kind='boss', key=4, bpm=130, swing=.5, groove='funk', kit=STANDARD_KIT,
         chart='E7#9 | E7#9 | E7#9 | E7#9 | A7 | A7 | E7#9 | E7#9 | C7 | B7#9 | E7#9 | E7#9 | F7 | F7 | E7#9 | B7#9',
         bass='riff', riff=RIFF_HOUSE, bass_prog=FINGER, comp=(EPIANO, 'funk'), lead=CLEAN_GTR,
         theme='E4:.5 G4:.5 A4:.5 B4:.5 D5:1 B4:.5 G4:.5 | A4:.5 G4:.5 E4:3 | r:.5 B4:.5 D5:.5 E5:.5 G5:1 E5:1 | D5:.5 B4:.5 G4:1 G#4:2 |'
               'C#5:1 E5:.5 G5:1.5 E5:1 | C5:.5 A4:.5 G4:3 | E5:.5 G5:.5 E5:.5 D5:.5 B4:1 G4:1 | G#4:3 r:1 |'
               'E5:1 G5:1 Bb5:1.5 G5:.5 | A5:.5 F#5:.5 D5:.5 D#5:.5 B4:2 | E5:2 G5:1 E5:1 | r:1 D5:.5 E5:.5 G5:.5 A5:.5 B5:1 |'
               'A5:1 C6:1 Eb6:1.5 C6:.5 | A5:.5 F5:.5 Eb5:.5 C5:.5 A4:2 | G#4:.5 B4:.5 D5:.5 G5:1.5 G#5:1 | D6:.5 B5:.5 A5:.5 F#5:.5 D#5:1 D5:1',
         horns=(TENOR, TROMBONE), hstyle='stabs', hits=[(0, .3), (1.5, .25), (1.75, .5)], extra='chank', stab=TRUMPET, pulse='timpani',
         alt=(PIANO, 'E5:.5 r:.5 G5:.5 G#5:1 r:.5 D5:.5 E5:.5 | r:2 B4:.5 D5:.5 E5:1 | E5:.5 r:.5 G5:.5 G#5:1 r:.5 B5:.5 A5:.5 | G5:.5 E5:.5 D5:1 r:2 |'
                   'A5:.5 r:.5 C6:.5 C#6:1 r:.5 G5:.5 A5:.5 | r:2 E5:.5 G5:.5 A5:1 | B5:1 G#5:.5 E5:.5 D5:1 B4:1 | E5:3 r:1 |'
                   'r:.5 E5:.5 G5:.5 Bb5:1.5 G5:1 | F#5:.5 D#5:.5 D5:.5 B4:.5 A4:2 | E5:.5 r:.5 G5:.5 G#5:1 r:.5 D5:.5 E5:.5 | r:1 E5:.5 G5:.5 B5:1 D6:1 |'
                   'Eb6:1.5 C6:.5 A5:1 F5:1 | r:.5 A5:.5 C6:.5 Eb6:.5 F6:2 | E6:.5 D6:.5 B5:.5 G#5:.5 E5:2 | r:2 B4:.5 D5:.5 D#5:.5 F#5:.5', True)),
]


def beat_us(L):
    """The beat's length in microseconds, a whole number of 10 ms: then 16 bars come to a whole number of FluidSynth's
    64-sample blocks at 44.1 kHz, so every pass lands on the blocks alike and the loop repeats sample for sample."""
    return round(60e6 / L['bpm'] / 10000) * 10000


def bpm_of(L): return 60e6 / beat_us(L)


def pitch(s):
    return 12 * (int(s[-1]) + 1) + NAMES[s[:-1]]


def parse(text):
    """'G4:1 Bb4:.5 r:.5 | ...' -> [(beat, length, pitch)], every bar checked to add up to four beats."""
    out = []
    for bar, cell in enumerate(text.split('|')):
        t = bar * 4
        for tok in cell.split():
            p, d = tok.split(':'); d = float(d)
            if p != 'r': out.append((t, d, pitch(p)))
            t += d
        assert abs(t - (bar + 1) * 4) < 1e-6, f'bar {bar + 1} adds up to {t - bar * 4} beats: {cell}'
    assert bar == BARS - 1, f'{bar + 1} bars'
    return out


def guide(ch):  # a chord's 3rd and 7th
    r, q = ch; d = Q[q][0]; return [(r + d[3]) % 12, (r + d[7]) % 12]


def near(pc, p, lo, hi):
    return min((x for x in range(lo, hi + 1) if x % 12 == pc), key=lambda x: abs(x - p))


def voicing(ch, lo, hi):
    vs = voicings([ch[0] + i for i in Q[ch[1]][1]], lo, hi)
    return min(vs, key=lambda v: abs(sum(v) / len(v) - (lo + hi) / 2))


def build(L):
    rng = random.Random(zlib.crc32(L['slug'].encode()))
    b = Band(L['title'], bpm_of(L), L['swing'], rng); b.period = BARS * 4
    b.chart.add(L['chart']); b.chart.add(L['chart'])  # twice, so lines that look ahead see the top of the loop
    cells = lambda bar: [(st, ch, 4 / len(b.chart.bars[bar])) for st, ch in b.chart.bars[bar]]
    layers = {k: set() for k in LAYERS}
    tune, tune2 = parse(L['theme']), parse(L['alt'][1])
    def chan(name, layer, ch, prog, vol, pan, rev=40, cho=0): b.chan(name, ch, prog, vol, pan, rev, cho); layers[layer].add(ch)
    d = lambda name, t, p, v, tri=False: b.note(name, t, .1, p, max(1, min(127, v + rng.randint(-5, 5))), tri)
    g, kit = L['groove'], L['kit']

    # ---- base: bass, comping, the time
    chan('bass', 'base', 2, L.get('bass_prog', UPRIGHT), 108, 62, 25)
    if L['bass'] == 'riff':
        if L.get('doubled'): chan('lh', 'base', 4, PIANO, 84, 58, 35)  # the piano's left hand doubles the riff an octave up
        for bar in range(BARS):
            for st, ch, ln in cells(bar):
                r = near(ch[0], 38, 31, 42)
                for o, iv, du in L['riff']:
                    if o >= ln: continue
                    p = r + (Q[ch[1]][0][3] if iv == 'T' else iv)
                    b.note('bass', bar * 4 + st + o, du, p, 96 + (8 if o == 0 else 0) + rng.randint(-5, 5))
                    if L.get('doubled'): b.note('lh', bar * 4 + st + o, du, p + 12, 70 + rng.randint(-5, 5))
    else: b.bass(0, BARS, L['bass'], vel=88)
    if L.get('boogie'):  # the boogie piano's left hand, in octaves
        chan('lh', 'base', 4, PIANO, 84, 58, 35); n0 = len(b.notes)
        b.bass(0, BARS, 'boogie', lo=38, hi=58, vel=72, name='lh')
        b.notes += [(c, t, du, p + 12, max(1, v - 16), ns) for c, t, du, p, v, ns in b.notes[n0:]]
    if L.get('comp'): chan('comp', 'base', 1, L['comp'][0], 76, 54, 40, 20); b.comp('comp', 0, BARS, L['comp'][1], 50, 70, 52)
    if L.get('pad'): chan('pad', 'base', 5, L['pad'], 50, 64, 80); b.comp('pad', 0, BARS, 'pad', 55, 74, 50)
    if L.get('arp'):  # a harp (or piano) rolling the chord in eighths
        chan('arp', 'base', 10, L['arp'], 78, 72, 55)
        for bar in range(BARS):
            for st, ch, ln in cells(bar):
                ts = sorted(x for x in range(48, 72) if x % 12 in tones(ch))[:4]; seq = ts + [ts[0] + 12] + ts[:0:-1]
                for k in range(int(ln * 2)): b.note('arp', bar * 4 + st + k / 2, .9, seq[k % len(seq)], 58 + (10 if k == 0 else 0) + rng.randint(-5, 5))
    chan('drums', 'base', 9, kit, 92, 64, 35)
    for bar in range(BARS):
        t0 = bar * 4
        for k in range(4):
            t = t0 + k
            if g == 'swing':
                d('drums', t, 51, 62 if k % 2 else 54)
                if k % 2: d('drums', t + .5, 51, 46); d('drums', t, 44, 50)
            elif g == 'shuffle':
                d('drums', t, 51, 58); d('drums', t + 2 / 3, 51, 40, True)
                if k % 2: d('drums', t, 44, 52)
            elif g == 'funk':
                for s in range(4): d('drums', t + s / 4, 42, 52 if s == 0 else 40 if s == 2 else 26)
            elif g == 'spy':
                d('drums', t, 42, 50); d('drums', t + .5, 42, 34)
                if k % 2: d('drums', t, 37, 50)
            elif g == 'bossa':
                d('drums', t, 42, 34); d('drums', t + .5, 42, 24)
            elif g == 'bolero':
                d('drums', t, 42, 36); d('drums', t + .5, 42, 26)
                if k % 2: d('drums', t, 37, 52)
                else: d('drums', t, 36, 50)
        if g == 'bossa':
            for st in ([0, 1.5, 3] if bar % 2 == 0 else [1, 2.5]): d('drums', t0 + st, 37, 54)
            for st in (0, 1.5, 2, 3.5): d('drums', t0 + st, 36, 44)
        if g == 'funk':
            for st in (0, 2.5): d('drums', t0 + st, 36, 58)

    # ---- theme: the tune, phrased (in-between notes ghosted, long notes leaned on)
    chan('lead', 'theme', 0, L['lead'], 100, 74, 40)
    for t, du, p in tune:
        v = 84 - (8 if t % 1 and du <= .5 else 0) + (5 if du >= 1.5 else 0)
        b.play('lead', t, du, p, v, horn=False)
        if L.get('octaves'): b.note('lead', t, du * .95, p - 12, v - 16)
    # ---- alt: the second tune, on another instrument from the other side of the room (part 16, written as channel 0)
    chan('alt', 'alt', 16, L['alt'][0], 100, 52, 40)
    for t, du, p in tune2:
        v = 84 - (8 if t % 1 and du <= .5 else 0) + (5 if du >= 1.5 else 0)
        b.play('alt', t, du, p, v, horn=False)
        if len(L['alt']) > 2: b.note('alt', t, du * .95, p - 12, v - 16)
    if L.get('answer'):
        chan('answer', 'theme', 3, L['answer'][0], 86, 46, 50)
        for t, du, p in parse(L['answer'][1]): b.play('answer', t, du, p, 76 - (6 if t % 1 else 0), horn=False)
    # each tune is one player's line; in swing a quarter note inside a line is played short
    b.articulate(['lead', 'alt', 'answer'], detach=.68 if L['swing'] > .5 else 0)

    # ---- drive: the full kit, the horns, a second rhythm part
    chan('drums2', 'drive', 12, kit, 92, 64, 35)
    for bar in range(BARS):
        t0, fill, top = bar * 4, bar % 4 == 3, bar % 8 == 0
        if top and g not in ('bossa',): d('drums2', t0, 49, 84)
        if g == 'swing':  # the kick feathered, a cross-stick on four, the snare talking, a kick dropped in every other bar
            for k in range(4): d('drums2', t0 + k, 36, 52)
            d('drums2', t0 + 3, 37, 70)
            for _ in range(2): d('drums2', t0 + rng.choice([.5, 1.5, 2.5, 3.5, 1, 3]), 38, 68)
            if bar % 2: d('drums2', t0 + rng.choice([1.5, 2.5, 3.5]), 36, 78)
        elif g == 'shuffle':
            for k in range(4):
                d('drums2', t0 + k, 36 if k % 2 == 0 else 38, 74 if k % 2 == 0 else 80)
                d('drums2', t0 + k + 2 / 3, 38, 26, True)
        elif g in ('funk', 'spy'):
            for st in ((0, .75, 2.5) if bar % 2 == 0 else (0, 1.75, 2.25)) if g == 'funk' else (0, 2.5): d('drums2', t0 + st, 36, 88)
            d('drums2', t0 + 1, 38, 86); d('drums2', t0 + 3, 38, 86)
            if g == 'funk':
                for st in (1.75, 3.25): d('drums2', t0 + st, 38, 30)
                d('drums2', t0 + 3.5, 46, 56)
            else:
                for k in range(8): d('drums2', t0 + k / 2, 54, 44 if k % 2 == 0 else 30)
        elif g == 'bossa':
            for k in range(16): d('drums2', t0 + k / 4, 70, 30 + (12 if k % 4 == 2 else 0))
            for st in (0, 2): d('drums2', t0 + st, 36, 60)
        elif g == 'bolero':  # the bolero's snare: a triplet into beats one and three
            for st in (0, 2):
                for k, v in enumerate((60, 48, 52)): d('drums2', t0 + st + k / 3, 38, v, True)
                d('drums2', t0 + st + 1, 38, 66, True)
            d('drums2', t0, 36, 80); d('drums2', t0 + 2, 36, 70)
        if fill and g not in ('bossa',):
            for k, p in enumerate((38, 38, 45, 43)): d('drums2', t0 + 3 + k / 4 if g in ('funk', 'spy', 'bolero') else t0 + 2.5 + k / 2, p, 70 + k * 4, g in ('shuffle',))
    if L.get('extra') == 'chank':
        chan('chank', 'drive', 6, JAZZ_GTR if L['swing'] > .5 else MUTED_GTR, 70, 92, 30); b.comp('chank', 0, BARS, 'chank', vel=56)
    if L.get('extra') == 'harp':
        chan('harp', 'drive', 6, HARP, 74, 84, 60)
        for bar in range(BARS):
            for st, ch, ln in cells(bar):
                ts = sorted(x for x in range(55, 84) if x % 12 in tones(ch, (1, 3, 5, 7, 9)))
                for k in range(int(ln * 4)): b.note('harp', bar * 4 + st + k / 4, .6, ts[(k if (bar // 2) % 2 == 0 else len(ts) - 1 - k) % len(ts)], 46 + rng.randint(-5, 5), True)
    if L.get('horns'):
        hA, hB = L['horns']; chan('hornA', 'drive', 7, hA, 96, 40, 55); chan('hornB', 'drive', 8, hB, 92, 88, 55)
        prev = {'hornA': 67, 'hornB': 58}
        # where neither tune moves in the back half of a bar, the backgrounds answer: a short note, then one that
        # pushes into the next bar's chord
        gap = {bar for bar in range(BARS) if not any(bar * 4 + 2.4 <= t < bar * 4 + 4 for t, _, _ in tune + tune2)}
        late = (2.5, 3.5) if L['swing'] > .5 or g in ('bossa', 'bolero') else (2.75, 3.5)
        for bar in range(BARS):
            for st, ch, ln in cells(bar):
                gt = guide(ch); ans = L['hstyle'] == 'pads' and bar in gap
                for name, pc, (lo, hi) in (('hornA', gt[1], (60, 74)), ('hornB', gt[0], (50, 64))):
                    p = near(pc, prev[name], lo, hi); prev[name] = p
                    if L['hstyle'] == 'pads':  # backgrounds: the guide tones held, breathing
                        end = min(ln, 2.3 - st) if ans else ln
                        if end > .5: b.play(name, bar * 4 + st, end - .1, p, 84, horn=True)
                    else:  # hits in the riff's rhythm
                        for o, du in L['hits']:
                            if o < ln: b.play(name, bar * 4 + st + o, du, p, 92, horn=True)
            if L['hstyle'] == 'pads' and bar in gap:
                nx = guide(b.chart.at(bar * 4 + 4))
                for name, (now_pc, next_pc), (lo, hi) in (('hornA', (guide(b.chart.at(bar * 4 + 3))[1], nx[1]), (60, 74)), ('hornB', (guide(b.chart.at(bar * 4 + 3))[0], nx[0]), (50, 64))):
                    b.play(name, bar * 4 + late[0], .3, near(now_pc, prev[name], lo, hi), 90, horn=True)
                    p = near(next_pc, prev[name], lo, hi); prev[name] = p
                    b.play(name, bar * 4 + late[1], .45, p, 96, horn=True)
        if L.get('sections'):  # a third voice under each, a big band section's close harmony
            chan('hornC', 'drive', 11, hB, 74, 64, 55)
            for c, t, du, p, v, ns in [x for x in b.notes if x[0] == 8]:
                below = [x for x in range(p - 12, p - 2) if x % 12 in tones(b.chart.at(t)) and x % 12 != p % 12]
                if below: b.notes.append((11, t, du, max(below), v - 8, ns))

    # ---- peril: toms and a roll into the top, strings climbing, a low pulse, brass stabs
    chan('drums3', 'peril', 13, kit, 96, 64, 35)
    for bar in range(BARS):
        t0 = bar * 4
        if bar % 4 == 0: d('drums3', t0, 49, 96)
        if bar == BARS - 1:  # a snare roll into the top
            for k in range(16): d('drums3', t0 + k / 4, 38, 40 + k * 4, True)
            continue
        for k in range(4):
            d('drums3', t0 + k, 41 if k % 2 == 0 else 43, 84 if k == 0 else 70); d('drums3', t0 + k + .5, 45, 50)
            d('drums3', t0 + k, 53, 60)
    chan('trem', 'peril', 11 if not L.get('sections') else 10, TREM_STRINGS, 74, 70, 60)
    held = [(t, p) for t, du, p in tune + tune2 if du >= 1]  # the tunes' long notes, for the strings to keep clear of
    for bar in range(BARS):
        ch = b.chart.at(bar * 4); k = bar % 4
        if k == 0: top = near((ch[0] + Q[ch[1]][0][5]) % 12, 76, 72, 84)
        else:  # a step higher each bar: the next note up that sits in this bar's chord (and is not a half step off a long note of the tune)
            fits = [x for x in range(top + 1, top + 8) if x % 12 in strong_pcs(ch)]
            clear = [x for x in fits if not any(bar * 4 <= t < bar * 4 + 4 and (p - x) % 12 in (1, 11) for t, p in held)]
            top = (clear or fits or [top + 2])[0]
        lo = near(guide(ch)[0], 64, 60, 71)
        for p, v in ((top, 50 + k * 9), (lo, 44 + k * 6)): b.note('trem', bar * 4, 3.95, p, v, True)
    chan('pulse', 'peril', 14, TIMPANI if L['pulse'] == 'timpani' else PIANO, 96, 60, 35)
    for bar in range(BARS):
        ch = b.chart.at(bar * 4); r = near(ch[0], 38, 33, 44)
        if L['pulse'] == 'timpani':  # a timpani roll swelling through each bar
            for k in range(16): b.note('pulse', bar * 4 + k / 4, .3, r, 40 + k * 3, True)
        else:  # a heartbeat: the root low in octaves, twice
            for st, v in ((0, 92), (1, 70)): b.note('pulse', bar * 4 + st, .6, r, v, True); b.note('pulse', bar * 4 + st, .6, r - 12, v - 10, True)
    chan('stab', 'peril', 15, L['stab'], 82, 54, 50)
    for bar in range(0, BARS, 2):  # a brass stab pushing into every other bar
        nxt = b.chart.at(((bar + 2) % BARS) * 4)
        for p in voicing(nxt, 58, 76): b.note('stab', bar * 4 + 7.5, .4, p, 92, False)
        if bar % 4 == 0:
            for p in voicing(b.chart.at(bar * 4), 58, 76): b.note('stab', bar * 4, .3, p, 84, True)

    # ---- surge: the other Roller is on the ropes. Handclaps on two and four, a tambourine, a crash every four bars,
    # and the brass section riffing: three parts in close harmony, the top one climbing through each four bars
    chan('drums4', 'surge', 20, kit, 92, 64, 35)
    for bar in range(BARS):
        t0 = bar * 4
        if bar % 4 == 0: d('drums4', t0, 57, 90); d('drums4', t0, 36, 86)
        for k in (1, 3): d('drums4', t0 + k, 39, 82)
        for k in range(8): d('drums4', t0 + k / 2, 54, 54 if k % 2 == 0 else 40)
    chan('brassA', 'surge', 17, TRUMPET, 100, 44, 50); chan('brassB', 'surge', 18, TROMBONE, 96, 86, 50)
    riff = ([(0, .9), (1.5, .35), (2.5, .35), (3.5, 1.3)], [(2, .35), (3, .35), (3.5, 1.3)]) if L['swing'] > .5 else \
           ([(0, 1.4), (1.5, .45), (3, .9)], [(1, .45), (2.5, 1.4)]) if g in ('bossa', 'bolero') else \
           ([(0, .3), (.75, .25), (1.5, .9), (3, .25), (3.5, .9)], [(1, .25), (1.75, .5), (2.5, .9), (3.75, .6)])
    for bar in range(BARS):
        for o, du in riff[bar % 2]:
            t = bar * 4 + o; ch = b.chart.at(t + .51) if o % 1 > .49 else b.chart.at(t)  # an offbeat hit plays the chord it pushes into
            pcs = tones(ch, (1, 3, 5, 7, 9)); x = nearest(pcs, 72 + (2, 5, 7, 4)[bar % 4], 67, 84); v = 96 if du >= .9 else 88
            for part, dv in (('brassA', 0), ('brassA', -6), ('brassB', -4)):
                b.note(part, t, du, x, v + dv + rng.randint(-4, 4))
                x -= 1
                while x % 12 not in pcs: x -= 1

    # three passes, so the middle one has the room's tail and the next pickup round it
    span = BARS * 4; setup = lambda c: c[1] in (-0.01, -0.005)  # the channel set-up, sent once before anything plays
    one = [n for n in b.notes if 0 <= n[1] < span]; ccs = [c for c in b.ccs if not setup(c) and c[1] < span]
    b.notes = [(c, t + k * span, du, p, v, ns) for k in range(3) for c, t, du, p, v, ns in one]
    b.ccs = [c for c in b.ccs if setup(c)] + [(c, t + k * span, kd, v) for k in range(3) for c, t, kd, v in ccs]
    b.lean = {0: 8 if L['swing'] > .5 else 4, 16: 8 if L['swing'] > .5 else 4, 3: 10, 7: 10, 8: 12, 11: 12, 17: 6, 18: 8}
    return b, layers


def raw(path):
    return np.fromfile(path, dtype='<f4').reshape(-1, 2)


def mode_of(L):
    """A loop's mode, from its first chord, for the sound effects (which 3rd and 7th fit): minor, blues (a dominant
    tonic: major 3rd, flat 7th) or major."""
    q = L['chart'].split('|')[0].split()[0].lstrip('ABCDEFG#b')
    return 'minor' if q.startswith('m') and not q.startswith('maj') else 'blues' if q.startswith('7') else 'major'


def lufs_of(x):
    """A stereo float array's integrated loudness (EBU R128), in LUFS."""
    f = os.path.join(TMP, f'lufs-{os.getpid()}.f32'); x.astype('<f4').tofile(f)
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    os.remove(f)
    return float([l for l in meas.splitlines() if l.strip().startswith('I:')][-1].split()[1])


def balance(out, lufs=lufs_of):
    """Level a loop's layers against its groove: the second tune as loud as the first (and neither buried under a
    heavy riff), the drive and the surge 3.5 LU under the groove (each loud enough to hear arrive). Then one gain for every layer, so the groove,
    the tune, the drive and the peril together sit at -18 LUFS and nothing the game can mix clips.
    Returns the layers and that mix's loudness before the gain."""
    db = lambda x: 10 ** (x / 20); lv = {k: lufs(v) for k, v in out.items()}; out = dict(out)
    out['alt'] = out['alt'] * db(lv['theme'] - lv['alt'])
    lift = min(db(4), max(1, db(lv['base'] - 4.5 - lv['theme'])))  # a tune is never more than 4.5 LU under its groove
    out['theme'] = out['theme'] * lift; out['alt'] = out['alt'] * lift
    out['drive'] = out['drive'] * min(5, max(1, db(lv['base'] - 4.5 - lv['drive'])))
    out['surge'] = out['surge'] * min(4, max(.4, db(lv['base'] - 3.5 - lv['surge'])))
    ref = out['base'] + out['theme'] + out['drive'] + out['peril']; was = lufs(ref)
    peak = max(np.abs(ref + out['surge']).max(), np.abs(ref - out['theme'] + out['alt'] + out['surge']).max())
    gain = min(db(-18 - was), .89 / max(1e-6, peak))
    return {k: v * gain for k, v in out.items()}, was


def render_loop(L, ir):
    b, layers = build(L)
    secs = BARS * 4 * beat_us(L) / 1e6
    out = {}
    # each layer in stems: the kit (brightened: a soundfont's cymbals are dull), the band, and the horns (set back in the room)
    treat = {'kit': ('treble=g=5:f=6000', 1.0, .36), 'band': ('anull', 1.0, .36), 'horns': ('highpass=f=140,equalizer=f=2800:t=q:w=1.4:g=-3.5,treble=g=-4:f=7000', .8, .62)}
    for layer, chans in layers.items():
        wind = lambda c: b.progs.get(c, 0) in WIND
        stems = {'kit': {c for c in chans if c in DRUMS}, 'band': {c for c in chans if c not in DRUMS and not wind(c)}, 'horns': {c for c in chans if c not in DRUMS and wind(c)}}
        ins, graph, mixed = [], [], []
        for name, keep in stems.items():
            if not keep: continue
            mid, wav = os.path.join(TMP, f'{L["slug"]}-{layer}-{name}.mid'), os.path.join(TMP, f'{L["slug"]}-{layer}-{name}.wav')
            # no synth chorus or reverb: their modulation never repeats with the loop (the room does that work)
            b.write(mid, keep, REMAP); synth(mid, wav, chorus=0, reverb=0); ins += ['-i', wav]
            k = len(mixed); fx, dry, wet = treat[name]
            graph.append(f'[{k}:a]{fx},asplit[{name}d][{name}w]')
            mixed.append((name, dry, wet))
        ins += ['-i', ir]; graph.append(f'[{len(mixed)}:a]asplit={len(mixed)}' + ''.join(f'[ir{i}]' for i in range(len(mixed))))
        for i, (name, dry, wet) in enumerate(mixed):
            graph.append(f'[{name}w][ir{i}]afir=gtype=none[{name}r]')
            graph.append(f'[{name}d][{name}r]amix=inputs=2:weights={dry} {wet}:normalize=0[{name}m]')
        graph.append(''.join(f'[{n}m]' for n, _, _ in mixed) + f'amix=inputs={len(mixed)}:normalize=0:duration=longest,'
                     f'{MASTER},atrim=start={secs - PAD:.6f}:duration={secs + 2 * PAD:.6f},asetpts=N/SR/TB[out]')
        dst = os.path.join(TMP, f'{L["slug"]}-{layer}.f32')
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *ins, '-filter_complex', ';'.join(graph), '-map', '[out]',
                        '-ar', str(SR), '-ac', '2', '-f', 'f32le', dst], check=True)
        out[layer] = raw(dst)
    n = min(len(x) for x in out.values()); out, lufs = balance({k: x[:n] for k, x in out.items()})
    os.makedirs(OUT, exist_ok=True); entry = {'slug': L['slug'], 'title': L['title'], 'floor': L['floor'], 'kind': L['kind'], 'key': L['key'], 'mode': mode_of(L), 'bpm': round(bpm_of(L), 2),
                                              'start': PAD, 'length': round(secs, 6), 'layers': {},
                                              'chip': {k: f'assets/music/chip/loops/{L["slug"]}-{k}.mp3' for k in LAYERS}}
    for layer, x in out.items():
        src = os.path.join(TMP, f'{L["slug"]}-{layer}.g32'); x.astype('<f4').tofile(src)
        mp3 = os.path.join(OUT, f'{L["slug"]}-{layer}.mp3')
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', src,
                        '-c:a', 'libmp3lame', '-b:a', '96k', mp3], check=True)
        entry['layers'][layer] = f'assets/music/loops/{L["slug"]}-{layer}.mp3'
    return entry, lufs


if __name__ == '__main__':
    want = set(sys.argv[1:]); ir = os.path.join(TMP, 'lounge-room.wav'); room(ir)
    path = os.path.join(ROOT, 'js', 'content', 'loops.js'); done = {}
    for L in LOOPS:
        for text in (L['theme'], L['alt'][1]) + ((L['answer'][1],) if L.get('answer') else ()): parse(text)
        if want and L['slug'] not in want: continue
        entry, lufs = render_loop(L, ir); done[L['slug']] = entry
        print(f"{L['slug']}: {L['title']} ({BARS} bars, {entry['length']:.1f}s) full mix {lufs:.1f} LUFS before gain", flush=True)
    old = {}
    if want and os.path.exists(path):
        txt = open(path).read(); old = {e['slug']: e for e in json.loads(txt[txt.index('['):txt.rindex(']') + 1])}
    listing = [done.get(L['slug']) or old.get(L['slug']) for L in LOOPS]
    for L, e in zip(LOOPS, listing):
        if e: e['mode'] = mode_of(L)  # (a listing kept from an earlier render gets its mode too)
    with open(path, 'w') as f:
        f.write("// The bout music, written by tools/jazz/loops.py (edit loops.py and render, not this file): a loop for each floor's\n"
                "// tables and one for its High Roller (floor 5 is the Ascent), each in six layers the game mixes: the groove, two\n"
                "// tunes it takes in turn, the drive, the peril (you are close to broke) and the surge (your opponent is).\n"
                "// start/length: the loop's span in each file, in seconds. key: its tonic (0 = C ... 11 = B); mode: minor, blues or major.\n")
        f.write('export const LOOPS = ' + json.dumps([x for x in listing if x], indent=1) + ';\n')
