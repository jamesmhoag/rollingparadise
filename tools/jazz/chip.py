# The chiptune band: plays a tune's MIDI (the same notes, swing, ritards and bends the band renders from) on
# 8-bit voices, the way an old console's sound chip would, instead of through a soundfont.
#   pulse waves   the tune (25% duty, with a soft echo) and its answer (12.5% duty), vibrato on long notes
#   arpeggios     anything that plays chords (piano, guitar, organ, strings, harp, horn sections): a chord becomes
#                 one pulse voice cycling through its notes every frame, the chip's way of playing a chord
#   triangle      the bass (and timpani), stepped like a 4-bit chip's
#   noise         the drums: kick (a falling triangle with a click), snare, hats, cymbals, toms, shakers
# Envelopes and vibrato move in 60 Hz frames and volumes in 16 steps, as on the hardware; pulse edges are
# band-limited (PolyBLEP) so the highs stay clean. Each drum hit uses the same noise every time, so a loop
# rendered three times round repeats sample for sample.
import mido
import numpy as np

SR, FRAME = 44100, 44100 // 60
BASS = set(range(32, 40)) | {47, 58}  # basses, timpani, tuba
TRI_STEPS = 16


def events(path):
    """A MIDI file as per-channel notes in seconds: {ch: {'prog', 'vol', 'notes': [(start, end, pitch, vel)], 'bends': [(t, semis)], 'expr': [(t, 0-1)]}}."""
    mid = mido.MidiFile(path); tempo = 500000; t = 0.0; chans = {}; held = {}
    for m in mido.merge_tracks(mid.tracks):
        t += mido.tick2second(m.time, mid.ticks_per_beat, tempo)
        if m.type == 'set_tempo': tempo = m.tempo; continue
        if not hasattr(m, 'channel'): continue
        c = chans.setdefault(m.channel, {'prog': 0, 'vol': 100, 'notes': [], 'bends': [(0, 0)], 'expr': [(0, 1)]})
        if m.type == 'program_change': c['prog'] = m.program
        elif m.type == 'control_change' and m.control == 7: c['vol'] = m.value
        elif m.type == 'control_change' and m.control == 11: c['expr'].append((t, m.value / 127))
        elif m.type == 'pitchwheel': c['bends'].append((t, m.pitch / 8192 * 2))
        elif m.type == 'note_on' and m.velocity: held[(m.channel, m.note)] = (t, m.velocity)
        elif m.type in ('note_off', 'note_on'):
            if (m.channel, m.note) in held:
                s, v = held.pop((m.channel, m.note)); c['notes'].append((s, max(t, s + .02), m.note, v))
    return chans, t


def hz(p): return 440 * 2 ** ((p - 69) / 12)


def blep(ph, dt):  # PolyBLEP correction for a step at phase 0
    out = np.zeros_like(ph)
    a = ph < dt; x = ph[a] / dt[a]; out[a] = x + x - x * x - 1
    b = ph > 1 - dt; x = (ph[b] - 1) / dt[b]; out[b] = x * x + x + x + 1
    return out


def pulse(freq, duty):
    """A band-limited pulse wave following a per-sample frequency array."""
    dt = freq / SR; ph = np.cumsum(dt) % 1
    sq = np.where(ph < duty, 1.0, -1.0)
    return sq + blep(ph, dt) - blep((ph - duty) % 1, dt)


def triangle(freq):
    ph = np.cumsum(freq / SR) % 1
    tri = 1 - 4 * np.abs(ph - .5)
    return np.round((tri + 1) / 2 * (TRI_STEPS - 1)) / (TRI_STEPS - 1) * 2 - 1  # the chip's stepped triangle


def stepped(env):  # an envelope moved in 60 Hz frames and 16 volume steps, as the chip does
    n = len(env); f = env[::FRAME]; f = np.round(f * 15) / 15
    return np.repeat(f, FRAME)[:n]


def lookup(points, t):  # the value of a stepwise controller (bends, expression) at times t
    ts = np.array([p[0] for p in points]); vs = np.array([p[1] for p in points])
    return vs[np.clip(np.searchsorted(ts, t, side='right') - 1, 0, len(vs) - 1)]


def voice_note(kind, s, e, p, v, ch):
    """One note on a melodic voice: returns (start sample, mono signal)."""
    dur = e - s; n = int((dur + (.06 if kind != 'tri' else .02)) * SR)
    tt = s + np.arange(n) / SR; k = np.arange(n) / SR
    semis = lookup(ch['bends'], tt) if len(ch['bends']) > 1 else 0
    if kind in ('lead', 'answer') and dur > .45:  # vibrato after a beat's breath, stepped per frame
        vib = .16 * np.clip((k - .28) / .3, 0, 1) * np.sin(2 * np.pi * 5.6 * np.floor(k * 60) / 60)
        semis = semis + vib
    f = hz(p) * 2 ** (semis / 12) * np.ones(n)
    if kind == 'tri': sig = triangle(f)
    else: sig = pulse(f, {'lead': .25, 'answer': .125}.get(kind, .5))
    # envelope: instant attack, a short decay to the sustain, then a quick release after the note ends
    sus = {'lead': .72, 'answer': .6, 'tri': 1.0}.get(kind, .5)
    env = np.where(k < dur, sus + (1 - sus) * np.exp(-k / .08), 0.0)
    rel = k >= dur; env[rel] = sus * np.exp(-(k[rel] - dur) / .02) if kind != 'tri' else 0
    if kind != 'tri': env *= lookup(ch['expr'], tt) ** .7 if len(ch['expr']) > 1 else 1
    return int(round(s * SR)), sig * stepped(env) * (v / 127) ** 1.2


def arpeggio(chord, ch):
    """A chord on one pulse voice: its notes in turn, one per 60 Hz frame (single notes just play)."""
    s = min(c[0] for c in chord); e = max(c[1] for c in chord); ps = sorted({c[2] for c in chord}); v = max(c[3] for c in chord)
    n = int((e - s + .05) * SR); k = np.arange(n) / SR
    idx = (np.floor(k * 60).astype(int)) % len(ps)
    f = np.array([hz(x) for x in ps])[idx]
    sig = pulse(f, .5)
    dur = e - s; env = np.where(k < dur, .5 + .5 * np.exp(-k / .12), 0.0); rel = k >= dur; env[rel] = .5 * np.exp(-(k[rel] - dur) / .02)
    return int(round(s * SR)), sig * stepped(env) * (v / 127) ** 1.2


_NOISE = {}
def noise(name, n, hold):
    """The same noise every time a drum is hit (so loops repeat exactly); `hold` samples per value (lower = brighter)."""
    key = (name, n, hold)
    if key not in _NOISE:
        r = np.random.default_rng(sum(map(ord, name)))
        _NOISE[key] = np.repeat(r.choice([-1.0, 1.0], size=n // hold + 1), hold)[:n]
    return _NOISE[key]


def drum(note, v):
    """A drum hit: (signal). Kicks and toms are falling triangles; everything else is shaped noise."""
    a = (v / 127) ** 1.1
    def env(secs, n): k = np.arange(n) / SR; return np.exp(-k / secs)
    if note in (35, 36):  # kick: a triangle diving from 160 Hz, with a click
        n = int(.16 * SR); k = np.arange(n) / SR
        f = 50 + 110 * np.exp(-k / .025); sig = triangle(f) * env(.06, n) + .35 * noise('kick', n, 6) * env(.008, n)
        return sig * a * 1.1
    if note in (41, 43, 45, 47, 48, 50):  # toms: shorter dives from their own pitch
        base = {41: 90, 43: 105, 45: 125, 47: 145, 48: 165, 50: 190}[note]
        n = int(.2 * SR); k = np.arange(n) / SR; f = base * (1 + .5 * np.exp(-k / .03))
        return (triangle(f) * env(.09, n) + .2 * noise('tom', n, 5) * env(.02, n)) * a
    spec = {38: ('snare', .14, .1, 2), 40: ('snare', .14, .1, 2), 37: ('rim', .03, .012, 1), 39: ('clap', .12, .045, 2),
            42: ('hat', .05, .018, 1), 44: ('hat', .05, .02, 1), 46: ('ohat', .25, .12, 1), 49: ('crash', .9, .4, 1),
            51: ('ride', .3, .09, 1), 53: ('bell', .25, .08, 1), 54: ('tamb', .08, .03, 1), 70: ('shaker', .05, .015, 1)}
    name, length, decay, hold = spec.get(note, ('hat', .05, .02, 1))
    n = int(length * SR); sig = noise(name, n, hold) * env(decay, n)
    if name in ('hat', 'ohat', 'ride', 'bell', 'crash', 'tamb', 'shaker'): sig = sig - np.convolve(sig, np.ones(3) / 3, 'same')  # thinner, metallic
    gain = {'snare': .9, 'rim': .6, 'clap': .8, 'hat': .55, 'ohat': .45, 'crash': .5, 'ride': .4, 'bell': .45, 'tamb': .4, 'shaker': .35}[name]
    return sig * a * gain


def render(path, lead=0, answer=3):
    """Render a MIDI file on the chip voices. Returns a stereo float array (samples, 2)."""
    chans, total = events(path)
    n = int((total + 1.5) * SR); out = np.zeros((n, 2))
    def add(start, sig, pan, gain):
        if start >= n: return
        sig = sig[:n - start]; l = np.cos(pan * np.pi / 2); r = np.sin(pan * np.pi / 2)
        out[start:start + len(sig), 0] += sig * gain * l * 1.41; out[start:start + len(sig), 1] += sig * gain * r * 1.41
    for c, ch in chans.items():
        vol = (ch['vol'] / 127) ** 1.5
        if c == 9:
            for s, e, p, v in ch['notes']: add(int(round(s * SR)), drum(p, v), .5, .65 * vol)
            continue
        kind = 'lead' if c == lead else 'answer' if c == answer else 'tri' if ch['prog'] in BASS else 'arp'
        if kind == 'arp':  # chords: notes that start together become one arpeggio
            notes = sorted(ch['notes']); i = 0
            while i < len(notes):
                j = i + 1
                while j < len(notes) and notes[j][0] - notes[i][0] < .03: j += 1
                st, sig = arpeggio(notes[i:j], ch); add(st, sig, .5 + (.12 if c % 2 else -.12), .4 * vol); i = j
            continue
        pan, gain = {'lead': (.42, .34), 'answer': (.6, .36), 'tri': (.5, .38)}[kind]
        for s, e, p, v in ch['notes']:
            st, sig = voice_note(kind, s, e, p, v, ch); add(st, sig, pan, gain * vol)
            if kind == 'lead':  # the chip echo: the same note again, later and softer, on the other side
                add(st + int(.16 * SR), sig * .3, .72, gain * vol)
    out = out[:, :] - np.mean(out, axis=0)
    return out
