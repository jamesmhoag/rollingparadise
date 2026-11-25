# Renders the chiptune versions of the music (chip.py): every lounge tune to assets/music/chip/ and every bout loop's
# four layers to assets/music/chip/loops/, from the same arrangements the band plays (setlist.py, loops.py).
#   run: python3 tools/jazz/chiptune.py [slug ...]   (everything if none named; needs python3 with mido and numpy, ffmpeg)
# The game finds them by name: content/music.js and content/loops.js carry each one's chip paths.
import os, sys, random, subprocess
from multiprocessing import Pool
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import chip
from setlist import SET, arrange
from loops import LOOPS, build, beat_us, PAD, BARS

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'music', 'chip')
TMP = os.environ.get('TMPDIR', '/tmp')
SR = chip.SR


def encode(x, mp3, norm=None):
    raw = mp3 + '.f32'; x.astype('<f4').tofile(raw)
    af = ['-af', 'silenceremove=start_periods=1:start_threshold=-60dB,areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse,'
          'acompressor=threshold=-16dB:ratio=2:attack=10:release=150,loudnorm=I=-20:TP=-2'] if norm else []
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, *af,
                    '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '96k', mp3], check=True)
    os.remove(raw)


def lufs(x):
    raw = os.path.join(TMP, 'chip-measure.f32'); x.astype('<f4').tofile(raw)
    o = subprocess.run(['ffmpeg', '-hide_banner', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float([l for l in o.splitlines() if l.strip().startswith('I:')][-1].split()[1])


def tune(job):
    i, row = job; slug = row[0]
    band, _, _ = arrange(*row, random.Random(2000 + i))
    mid = os.path.join(TMP, f'chip-{slug}.mid'); band.write(mid)
    encode(chip.render(mid), os.path.join(OUT, slug + '.mp3'), norm=True)
    return f'{slug}: chip'


def loop(L):
    b, layers = build(L); secs = BARS * 4 * beat_us(L) / 1e6; out = {}
    a, z = int(round((secs - PAD) * SR)), int(round((2 * secs + PAD) * SR))
    for layer, chans in layers.items():
        mid = os.path.join(TMP, f'chip-{L["slug"]}-{layer}.mid'); b.write(mid, chans, {12: 9, 13: 9})
        x = chip.render(mid); x = np.vstack([x, np.zeros((max(0, z - len(x)), 2))]); out[layer] = x[a:z]
    full = sum(out.values()); gain = 10 ** ((-18 - lufs(full)) / 20); gain = min(gain, .89 / np.abs(full).max())  # one gain for all four layers
    os.makedirs(os.path.join(OUT, 'loops'), exist_ok=True)
    for layer, x in out.items(): encode(x * gain, os.path.join(OUT, 'loops', f'{L["slug"]}-{layer}.mp3'))
    return f'{L["slug"]}: chip, four layers'


if __name__ == '__main__':
    want = set(sys.argv[1:]); os.makedirs(OUT, exist_ok=True)
    tunes = [(i, row) for i, row in enumerate(SET) if not want or row[0] in want]
    loops = [L for L in LOOPS if not want or L['slug'] in want]
    with Pool(os.cpu_count() or 1) as pool:
        for line in pool.imap(tune, tunes): print(line, flush=True)
        for line in pool.imap(loop, loops): print(line, flush=True)
