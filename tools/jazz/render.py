# Renders the lounge's set list (setlist.py) to assets/music, and writes the list the game plays from
# (js/content/music.js: title, style, file, and the key, so the table's sounds can play in the tune's key).
#   needs: python3 with mido and numpy; fluidsynth; ffmpeg with libmp3lame; a General MIDI soundfont: GeneralUser GS
#          (S. Christian Collins, free for any music: github.com/mrbumpy409/GeneralUser-GS, put GeneralUser-GS.sf2 in
#          /usr/share/sounds/sf2/ or point SF2 at it), else FluidR3 (apt-get install fluidsynth fluid-soundfont-gm)
#   run:   python3 tools/jazz/render.py [slug ...]   (all tunes if none named)
# Each tune is composed with a fixed seed, so a render is repeatable.
#
# The band plays in one small lounge. Each tune is rendered as stems: the band (rhythm section and the lead),
# the horns and reeds, and the organ. The horns are set further back in the room and darkened a little; the organ
# goes through a rotating-speaker (Leslie) effect; the drum kit is brightened (a soundfont's cymbals and brushes are
# dull); then all of it is put in the same room (a convolution with a small club's response), given a little room
# tone, and levelled: a light compressor, then one gain for the whole tune to -20 LUFS, so the band's own dynamics
# (the build through the solos, the shout chorus, the quiet coda) are still there.
import os, subprocess, sys, random, json
from multiprocessing import Pool
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from setlist import SET, arrange

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SF2 = os.environ.get('SF2') or next((p for p in ('/usr/share/sounds/sf2/GeneralUser-GS.sf2', '/usr/share/sounds/sf2/FluidR3_GM.sf2') if os.path.exists(p)), '')
OUT = os.path.join(ROOT, 'assets', 'music')
TMP = os.environ.get('TMPDIR', '/tmp')
SR = 44100
WIND = range(56, 80)  # brass, reeds and pipes
ORGAN = range(16, 24)
# the last of the chain, for tunes and loops alike: the rumble under the bass's lowest note taken out (two filters:
# 24 dB an octave), the bass's bottom octave eased (a soundfont bass is nearly all fundamental, which small speakers
# cannot play and headphones overplay), and a little air on top
MASTER = 'highpass=f=40,highpass=f=40,lowshelf=g=-3:f=65,treble=g=2:f=7000'


def room(path, rt_low=.85, rt_high=.35, seed=7):
    """A small lounge's impulse response (stereo): early reflections off near walls, then a tail that dies away
    faster in the treble (soft furnishings) than in the bass."""
    rng = np.random.default_rng(seed); n = int(SR * 1.5); t = np.arange(n) / SR; ir = np.zeros((n, 2))
    for c in range(2):
        for _ in range(14):  # early reflections, 3-45 ms
            d = rng.uniform(.003, .045); ir[int(d * SR), c] += rng.choice([-1, 1]) * .55 * np.exp(-d / .025)
        noise = rng.standard_normal(n)
        spec = np.fft.rfft(noise); f = np.fft.rfftfreq(n, 1 / SR)
        lo = np.fft.irfft(spec * (f < 2500), n); hi = np.fft.irfft(spec * (f >= 2500) * np.exp(-f / 9000), n)
        tail = lo * np.exp(-6.9 * t / rt_low) + .7 * hi * np.exp(-6.9 * t / rt_high)
        tail *= np.clip((t - .012) / .025, 0, 1)  # the tail builds after the first reflections
        ir[:, c] += .2 * tail / np.sqrt(np.mean(tail[:SR // 2] ** 2))
    ir /= np.sqrt((ir ** 2).sum(axis=0)).max()
    import wave
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(ir * .5, -1, 1) * 32767).astype('<i2').tobytes())


def synth(mid, wav, chorus=0.4, reverb=0.12):
    subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.5', '-r', str(SR), '-F', wav,
                    '-o', 'synth.reverb.room-size=0.3', '-o', f'synth.reverb.level={reverb}', '-o', 'synth.reverb.width=0.6', '-o', f'synth.reverb.active={int(reverb > 0)}',
                    '-o', f'synth.chorus.level={chorus}', '-o', f'synth.chorus.active={int(chorus > 0)}', SF2, mid], check=True)


def level(pre, mp3, target=-20):
    """Encode a tune at `target` LUFS with one gain for the whole of it (a limiter catches the odd peak), so loud and
    quiet passages keep their distance."""
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', pre, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    lufs = float([l for l in meas.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', pre,
                    '-af', f'volume={target - lufs:.2f}dB,alimiter=limit=0.8:level=false:attack=5:release=80',
                    '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '96k', mp3], check=True)
    os.remove(pre)


def render(job):
    slug, band, ir = job
    chans = set(band.progs)
    stems = {'kit': {9} & chans,
             'band': {c for c in chans if c != 9 and band.progs[c] not in WIND and band.progs[c] not in ORGAN},
             'horns': {c for c in chans if c != 9 and band.progs[c] in WIND},
             'organ': {c for c in chans if c != 9 and band.progs[c] in ORGAN}}
    ins, graph, outs, k = [], [], [], 0
    for name, keep in stems.items():
        if not keep or not any(n[0] in keep for n in band.notes): continue
        mid, wav = os.path.join(TMP, f'{slug}-{name}.mid'), os.path.join(TMP, f'{slug}-{name}.wav')
        band.write(mid, keep); synth(mid, wav); ins += ['-i', wav]; outs.append((name, k)); k += 1
    ins += ['-i', ir]; irn = k
    graph.append(f'[{irn}:a]asplit={len(outs)}' + ''.join(f'[ir{i}]' for i in range(len(outs))))
    # each stem: its own treatment, then dry + room, weighted by how far back it sits
    treat = {'kit': ('treble=g=5:f=6000', 1.0, .30), 'band': ('anull', 1.0, .30),
             'horns': ('highpass=f=140,equalizer=f=2800:t=q:w=1.4:g=-3.5,treble=g=-4:f=7000', .8, .55),
             'organ': ('volume=1.5,asoftclip=type=tanh,volume=0.62,apulsator=mode=sine:hz=6.1:amount=0.38:offset_l=0:offset_r=0.5,'
                       'vibrato=f=6.1:d=0.15,lowpass=f=6500', .9, .34)}
    mixed = []
    for i, (name, k) in enumerate(outs):
        fx, dry, wet = treat[name]
        graph.append(f'[{k}:a]{fx},asplit[{name}d][{name}w]')
        graph.append(f'[{name}w][ir{i}]afir=gtype=none[{name}r]')
        graph.append(f'[{name}d][{name}r]amix=inputs=2:weights={dry} {wet}:normalize=0[{name}m]'); mixed.append(f'[{name}m]')
    graph.append(''.join(mixed) + f'amix=inputs={len(mixed)}:normalize=0:duration=longest,'
                 'silenceremove=start_periods=1:start_threshold=-60dB,areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse[mix]')
    graph.append(f'anoisesrc=color=pink:amplitude=0.0012:sample_rate={SR},lowpass=f=2500[tone]')
    graph.append(f'[mix][tone]amix=inputs=2:weights=1 1:normalize=0:duration=first,{MASTER},'
                 'acompressor=threshold=-15dB:ratio=1.5:attack=20:release=300[out]')
    pre = os.path.join(TMP, slug + '.f32'); mp3 = os.path.join(OUT, slug + '.mp3')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *ins, '-filter_complex', ';'.join(graph),
                    '-map', '[out]', '-ar', str(SR), '-ac', '2', '-f', 'f32le', pre], check=True)
    level(pre, mp3)
    return f'{slug}: {"+".join(n for n, _ in outs)} -> {os.path.getsize(mp3) // 1024} KB'


if __name__ == '__main__':
    want = set(sys.argv[1:]); listing, jobs = [], []
    ir = os.path.join(TMP, 'lounge-room.wav'); room(ir)
    for i, (slug, title, genre, ci, key, bpm, li, ai) in enumerate(SET):
        band, style, k = arrange(slug, title, genre, ci, key, bpm, li, ai, random.Random(2000 + i))
        listing.append({'title': title, 'by': style, 'genre': genre, 'key': k, 'src': f'assets/music/{slug}.mp3', 'chip': f'assets/music/chip/{slug}.mp3'})
        if not want or slug in want: jobs.append((slug, band, ir))
    with Pool(int(os.environ.get('JOBS', os.cpu_count() or 1))) as pool:
        for line in pool.imap(render, jobs): print(line, flush=True)
    with open(os.path.join(ROOT, 'js', 'content', 'music.js'), 'w') as f:
        f.write('// The lounge band\'s set list, written by tools/jazz/render.py (edit setlist.py and render, not this file).\n'
                '// key: the tune\'s key (0 = C ... 11 = B), so the table\'s sounds can play in it.\n')
        f.write('export const MUSIC = [\n' + ''.join(f'  {json.dumps(x, ensure_ascii=False)},\n' for x in listing) + '];\n')
