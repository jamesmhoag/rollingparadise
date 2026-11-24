# Renders the table's instrument samples (assets/sfx) from the FluidR3 General MIDI soundfont: one short note or hit
# per instrument, which js/ui/sfx.js plays (pitched to the band's key) for every step of play.
#   needs: python3 with mido; fluidsynth and fluid-soundfont-gm; ffmpeg with libmp3lame
#   run:   python3 tools/sfx/render.py
import os, subprocess
import mido

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
OUT = os.path.join(ROOT, 'assets', 'sfx'); TMP = os.environ.get('TMPDIR', '/tmp')
# name: (program, note, seconds held, velocity, channel 9 for percussion; bank kit program for drums)
S = {
    'piano': (0, 60, .9, 84, 0), 'rhodes': (4, 60, .9, 88, 0), 'nylon': (24, 60, .7, 90, 0), 'guitar': (26, 60, .6, 92, 0),
    'bass': (32, 48, .5, 100, 0), 'muted': (59, 60, .28, 92, 0), 'flute': (73, 72, .3, 84, 0), 'horn': (60, 60, .45, 80, 0),
    'strings': (48, 60, .8, 70, 0), 'harp': (46, 60, .8, 92, 0),
    'ride': (32, 51, .1, 90, 9), 'brush': (40, 38, .1, 96, 9), 'swish': (40, 40, .1, 90, 9), 'rim': (32, 37, .1, 90, 9), 'castanet': (32, 85, .1, 100, 9),
    'block_hi': (32, 76, .1, 96, 9), 'block_lo': (32, 77, .1, 100, 9), 'shaker': (32, 70, .1, 90, 9), 'triangle': (32, 81, .1, 84, 9),
    'claves': (32, 75, .1, 96, 9), 'kick': (32, 36, .1, 100, 9), 'tamb': (32, 54, .1, 80, 9), 'crash': (32, 49, .1, 70, 9), 'cabasa': (32, 69, .1, 96, 9),
    'conga': (32, 63, .1, 96, 9), 'bongo': (32, 60, .1, 96, 9), 'chimes': (32, 84, .1, 80, 9),
}
for name, (prog, note, held, vel, ch) in S.items():
    mid = mido.MidiFile(ticks_per_beat=480); tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=500000))
    tr.append(mido.Message('program_change', channel=ch, program=prog))
    tr.append(mido.Message('control_change', channel=ch, control=91, value=20))
    tr.append(mido.Message('note_on', channel=ch, note=note, velocity=vel, time=10))
    tr.append(mido.Message('note_off', channel=ch, note=note, velocity=0, time=int(held * 960)))
    tr.append(mido.MetaMessage('end_of_track', time=960))
    m, w = os.path.join(TMP, f'sfx-{name}.mid'), os.path.join(TMP, f'sfx-{name}.wav')
    mid.save(m)
    subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.8', '-r', '44100', '-F', w, '-o', 'synth.reverb.level=0.25', '-o', 'synth.chorus.active=0', SF2, m], check=True)
    out = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', w, '-ac', '1',
                    '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse,afade=t=out:st=1.6:d=0.3,atrim=0:1.9,loudnorm=I=-16:TP=-1.5',
                    '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', out], check=True)
    print(name, os.path.getsize(out) // 1024, 'KB')
