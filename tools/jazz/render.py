# Renders the lounge's set list (tunes.py) to assets/music.
#   needs: python3 with mido; fluidsynth and the FluidR3 General MIDI soundfont (MIT licence:
#          apt-get install fluidsynth fluid-soundfont-gm); ffmpeg with libmp3lame
#   run:   python3 tools/jazz/render.py [slug ...]   (all tunes if none named)
# Each tune is composed with a fixed seed, so a render is repeatable.
import os, subprocess, sys, random
sys.path.insert(0, os.path.dirname(__file__))
from tunes import SET

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
OUT = os.path.join(ROOT, 'assets', 'music')
TMP = os.environ.get('TMPDIR', '/tmp')

want = set(sys.argv[1:])
for i, (slug, title, era, fn) in enumerate(SET):
    if want and slug not in want: continue
    band = fn(random.Random(1000 + i))
    mid, wav = os.path.join(TMP, slug + '.mid'), os.path.join(TMP, slug + '.wav')
    secs = band.write(mid)
    subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.5', '-r', '44100', '-F', wav,
                    '-o', 'synth.reverb.room-size=0.55', '-o', 'synth.reverb.level=0.6', '-o', 'synth.reverb.width=0.8',
                    '-o', 'synth.chorus.level=1.2', SF2, mid], check=True)
    mp3 = os.path.join(OUT, slug + '.mp3')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', wav,
                    '-af', 'silenceremove=start_periods=1:start_threshold=-60dB,areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse,'
                           'acompressor=threshold=-18dB:ratio=2.5:attack=15:release=200,loudnorm=I=-20:TP=-2',
                    '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', mp3], check=True)
    print(f'{slug}: {title} ({era}) {secs:.0f}s -> {os.path.getsize(mp3) // 1024} KB')
