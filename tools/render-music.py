# Renders the game's music (assets/music) from MIDI with a small upright-piano synth of its own.
#   1. MIDI: from the public-domain Mutopia Project LilyPond sources of Joplin's rags
#      (github.com/MutopiaProject/MutopiaProject, ftp/JoplinS/...), via `pip install lilypond` and
#      `lilypond -dno-print-pages -dmidi-extension=mid piece.ly`
#   2. Audio: python3 tools/render-music.py piece.mid out.wav  (needs numpy, scipy, mido)
#   3. MP3: ffmpeg -i out.wav -af loudnorm=I=-20:TP=-2 -ar 32000 -c:a libmp3lame -b:a 64k out.mp3
# A small upright-piano synth: every key is synthesised once (a pair of slightly detuned strings, inharmonic
# partials that die away at their own rates, a felt-hammer thump), then each MIDI note plays a slice of its key
# with a damper release, and the whole room gets a short plate-like reverb.
import sys, numpy as np, mido
from scipy.signal import fftconvolve, butter, sosfilt
SR = 32000
rng = np.random.default_rng(7)
KEY_LEN = 4.0
def key(p):
    f0 = 440 * 2 ** ((p - 69) / 12); n = int(SR * KEY_LEN); t = np.arange(n) / SR
    B = 0.00012 * (1 + (p - 21) / 60)  # inharmonicity grows up the keyboard
    out = np.zeros(n)
    for k in range(1, 14):
        fk = f0 * k * np.sqrt(1 + B * k * k)
        if fk > SR * 0.45: break
        amp = (1 / k ** 1.25) * (1.0 if k > 1 else 1.1) * np.exp(-((k - 1) * 0.08))
        dec = (0.9 + 0.012 * (p - 21) + 0.55 * k) * (1 + (p - 40) / 90)  # higher notes and partials die faster
        env = 0.72 * np.exp(-t * dec * 1.6) + 0.28 * np.exp(-t * dec * 0.35)  # prompt then after-sound
        det = 1 + 0.0011 * (1 if k % 2 else -1)  # honky-tonk: two strings a hair apart
        ph = rng.random() * 6.28
        out += amp * env * (np.sin(2 * np.pi * fk * t + ph) + 0.8 * np.sin(2 * np.pi * fk * det * t + ph * 1.3))
    thump = rng.normal(0, 1, int(SR * 0.025)) * np.exp(-np.arange(int(SR * 0.025)) / (SR * 0.004))
    sos = butter(2, min(0.45, 2 * f0 * 3 / SR), output='sos'); thump = sosfilt(sos, thump)
    out[:len(thump)] += thump * 0.6
    att = np.minimum(1, t / 0.003); out *= att
    return out / np.max(np.abs(out))
KEYS = {p: key(p) for p in range(21, 109)}

def render(mid_path, out_wav, tempo_scale=1.0):
    m = mido.MidiFile(mid_path); notes = []; on = {}; now = 0.0
    for msg in m:  # merged playback order, times in seconds
        now += msg.time * tempo_scale
        if msg.type == 'note_on' and msg.velocity > 0: on[(msg.channel, msg.note)] = (now, msg.velocity)
        elif msg.type in ('note_off', 'note_on'):
            s = on.pop((msg.channel, msg.note), None)
            if s: notes.append((s[0], now, msg.note, s[1]))
    end = max(n[1] for n in notes) + 3
    L = np.zeros(int(SR * end)); R = np.zeros(int(SR * end))
    for (t0, t1, p, v) in notes:
        p = min(108, max(21, p)); k = KEYS[p]; dur = max(0.08, t1 - t0) + 0.04
        n = min(len(k), int(SR * (dur + 0.25)))
        rel = np.ones(n); a = int(SR * dur)
        if a < n: rel[a:] = np.exp(-np.arange(n - a) / (SR * 0.06))  # the damper falls
        g = (v / 127) ** 1.4 * (1.0 - (p - 60) / 160)
        sig = k[:n] * rel * g; pan = 0.5 + (p - 64) / 110
        i = int(SR * t0); L[i:i + n] += sig * (1 - pan); R[i:i + n] += sig * pan
    # a small warm room
    ir_n = int(SR * 1.6); tt = np.arange(ir_n) / SR
    irL = rng.normal(0, 1, ir_n) * np.exp(-tt * 3.2); irR = rng.normal(0, 1, ir_n) * np.exp(-tt * 3.2)
    sos = butter(2, 0.22, output='sos'); irL = sosfilt(sos, irL); irR = sosfilt(sos, irR)
    wl = fftconvolve(L, irL)[:len(L)]; wr = fftconvolve(R, irR)[:len(R)]
    wl *= np.max(np.abs(L)) / max(1e-9, np.max(np.abs(wl))); wr *= np.max(np.abs(R)) / max(1e-9, np.max(np.abs(wr)))
    L2 = L + 0.22 * wl; R2 = R + 0.22 * wr
    sos = butter(1, 5200 / (SR / 2), output='sos'); L2 = sosfilt(sos, L2); R2 = sosfilt(sos, R2)  # an old room, not a studio
    peak = max(np.max(np.abs(L2)), np.max(np.abs(R2))); st = np.stack([L2, R2], 1) / peak * 0.85
    import wave
    with wave.open(out_wav, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
if __name__ == '__main__':
    render(sys.argv[1], sys.argv[2]); print('done', sys.argv[2])
