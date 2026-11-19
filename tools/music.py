# -*- coding: utf-8 -*-
"""
Longmen Quest (龍門刀客傳) - original chiptune soundtrack, rendered from code.

Synth: a small 2A03-like model - two pulse channels (12.5/25/50 % duty, 4-bit volume
envelopes, NES period-quantised pitch), a 4-bit stepped 32-step triangle for bass, and a
15-bit LFSR noise channel (long + short "metallic" mode) for drums, gongs and woodblocks.
Ornaments give the wuxia flavour: grace notes, erhu-style slides and vibrato, falls.

Score format (one string per channel, tokens separated by spaces):
  NOTE[:dur]   e.g.  A4:4   C#5:2   Bb3     (dur in 16th-note steps; sticky)
  r[:dur]      rest          -[:dur]  tie (extends the previous note)
  prefixes     ^ grace note from above   / slide up into the note   \\ fall at the end
               ~ strong vibrato          ! accent                    * staccato
  |            bar line - the parser checks that every bar is exactly one bar long
  [ ... ]*N    repeat
Drum strings: one character per 16th step: k kick  s snare  h hat  o open hat  c crash
  g gong  w woodblock high  v woodblock low  t tom  .  rest   (| and spaces ignored)

Run:  python tools/music.py            (renders every track into ../audio)
      python tools/music.py battle     (just one)
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from scipy.signal import butter, sosfilt

SR = 32000
CPU = 1789773.0
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'audio'))
TMP = os.environ.get('LQ_MUSIC_TMP', os.path.join(OUT, '_wav'))

NOTE_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi_of(name):
    m = re.fullmatch(r'([A-G])([#b]?)(-?\d)', name)
    if not m:
        raise ValueError('bad note ' + name)
    pc = NOTE_PC[m.group(1)] + (1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0)
    return 12 * (int(m.group(3)) + 1) + pc


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


# --------------------------------------------------------------------------- parsing
def expand(s):
    pat = re.compile(r'\[([^\[\]]*)\]\*(\d+)')
    while True:
        n = pat.sub(lambda mm: ' '.join([mm.group(1)] * int(mm.group(2))), s)
        if n == s:
            return s
        s = n


def parse(s, bar=16, name='?'):
    """-> (events [(step, dur, midi, orn)], total_steps)"""
    s = expand(s).replace('|', ' | ')
    ev, t, dur, last_bar, barno = [], 0.0, 4.0, 0.0, 0
    for tok in s.split():
        if tok == '|':
            barno += 1
            if abs((t - last_bar) - bar) > 1e-6:
                raise ValueError('%s: bar %d is %g steps' % (name, barno, t - last_bar))
            last_bar = t
            continue
        orn = ''
        while tok and tok[0] in '^/\\~!*':
            orn += tok[0]
            tok = tok[1:]
        if ':' in tok:
            tok, d = tok.split(':')
            dur = float(d)
        if tok == 'r':
            t += dur
            continue
        if tok == '-':
            st, d0, m0, o0 = ev[-1]
            ev[-1] = (st, d0 + dur, m0, o0)
            t += dur
            continue
        ev.append((t, dur, midi_of(tok), orn))
        t += dur
    return ev, t


def parse_drums(s):
    s = expand(s).replace('|', '').replace(' ', '')
    return [(i, c) for i, c in enumerate(s) if c != '.'], len(s)


# ----------------------------------------------------------------- chord helpers
QUAL = {'': (0, 4, 7), 'm': (0, 3, 7), 's2': (0, 2, 7), 's4': (0, 5, 7), 'p': (0, 7, 12),
        'q': (0, 5, 10), '6': (0, 4, 9), 'm7': (0, 3, 10)}


def chord_pcs(ch):
    m = re.fullmatch(r'([A-G][#b]?)(.*)', ch)
    root = NOTE_PC[m.group(1)[0]] + (1 if '#' in m.group(1) else -1 if 'b' in m.group(1)[1:] else 0)
    return root % 12, QUAL[m.group(2)]


def place(pc, lo, transpose):
    """midi number with pitch class pc whose transposed value lies in [lo, lo+12)."""
    m = pc
    while m + transpose < lo:
        m += 12
    while m + transpose >= lo + 12:
        m -= 12
    return m


def nn(m):
    names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    return '%s%d' % (names[m % 12], m // 12 - 1)


BASS = {  # R root, F fifth, O octave, r rest  (dur in steps)
    'drive': 'R:2 R:2 O:2 R:2 R:2 R:2 O:2 F:2',
    'gallop': 'R:3 R:1 R:2 F:2 O:3 R:1 F:2 R:2',
    'oompah': 'R:2 r:2 F:2 r:2 R:2 r:2 O:2 r:2',
    'walk': 'R:4 F:4 O:4 F:4',
    'stride': 'R:6 F:2 O:4 F:4',
    'heartbeat': 'R:2 R:3 r:11',
    'drone': 'R:16',
    'halfs': 'R:8 R:8',
    'pulse8': 'R:2 R:2 R:2 R:2 R:2 R:2 R:2 R:2',
    'toll': 'R:12 F:4',
}

ARP = {  # tone index 0..3 (root, mid, top, octave), r rest
    'up16': '0:1 1:1 2:1 3:1 0:1 1:1 2:1 3:1 0:1 1:1 2:1 3:1 0:1 1:1 2:1 3:1',
    'roll16': '0:1 2:1 3:1 2:1 1:1 2:1 3:1 2:1 0:1 2:1 3:1 2:1 1:1 2:1 3:1 2:1',
    'broken8': '0:2 1:2 2:2 3:2 2:2 1:2 2:2 1:2',
    'off': 'r:2 1:2 r:2 2:2 r:2 1:2 r:2 2:2',
    'hold': '1:8 2:8',
    'stab': '2:3 2:3 1:2 2:3 2:3 1:2',
    'pluck4': '0:4 2:4 3:4 1:4',
}


def bass_line(chords, style, transpose, lo=33):
    out = []
    for ch in chords:
        pc, q = chord_pcs(ch)
        R = place(pc, lo, transpose)
        tones = {'R': R, 'F': R + 7, 'O': R + 12}
        for tok in BASS[style].split():
            k, d = tok.split(':')
            out.append('r:' + d if k == 'r' else nn(tones[k]) + ':' + d)
        out.append('|')
    return ' '.join(out)


def arp_line(chords, style, transpose, lo=55):
    out = []
    for ch in chords:
        pc, q = chord_pcs(ch)
        R = place(pc, lo, transpose)
        tones = [R + q[0], R + q[1], R + q[2], R + 12]
        for tok in ARP[style].split():
            k, d = tok.split(':')
            out.append('r:' + d if k == 'r' else nn(tones[int(k)]) + ':' + d)
        out.append('|')
    return ' '.join(out)


# ------------------------------------------------------------------------ synth
def nes_pulse_hz(f):
    p = max(8, round(CPU / (16 * f)) - 1)
    return CPU / (16 * (p + 1))


def nes_tri_hz(f):
    p = max(2, round(CPU / (32 * f)) - 1)
    return CPU / (32 * (p + 1))


def q4(env):
    return np.round(np.clip(env, 0, 1) * 15) / 15.0


def freq_curve(f, n, orn, vib, dur_s):
    t = np.arange(n) / SR
    cents = np.zeros(n)
    if '^' in orn:                       # grace note: a whole step above, ~45 ms
        g = int(0.045 * SR)
        cents[:g] += 200
    if '/' in orn:                       # erhu slide up from a whole step below
        g = int(0.09 * SR)
        cents[:g] += -200 * (1 - np.arange(min(g, n)) / g)[:n] if g <= n else -200
    if '\\' in orn:                      # fall off the end
        s0 = int(n * 0.65)
        cents[s0:] -= 400 * ((np.arange(n - s0) / max(1, n - s0)) ** 2)
    if vib:
        depth = 40 if '~' in orn else vib
        if dur_s > 0.32 or '~' in orn:
            ramp = np.clip((t - 0.18) / 0.35, 0, 1)
            cents += depth * ramp * np.sin(2 * np.pi * 5.6 * t)
    return f * 2 ** (cents / 1200.0)


def envelope(kind, n, dur_s, gate):
    t = np.arange(n) / SR
    if kind == 'lead':
        env = 0.72 + 0.28 * np.exp(-t / 0.09)
    elif kind == 'pad':
        env = np.minimum(1, t / 0.07) * (0.8 + 0.2 * np.exp(-t / 0.3))
    elif kind == 'pluck':
        env = 0.08 + 0.92 * np.exp(-t / 0.13)
    elif kind == 'bell':
        env = np.exp(-t / 0.75)
    else:
        env = np.ones(n)
    g = int(n * gate)
    rel = int(0.02 * SR)
    env[g:] *= np.exp(-np.arange(n - g) / max(1, rel * 0.5))
    return env


def render_pulse(events, step_s, total_samples, duty=0.5, vol=1.0, kind='lead', vib=22,
                 transpose=0, gate=0.9, tail=2.0):
    buf = np.zeros(total_samples + int(tail * SR), dtype=np.float64)
    for st, d, m, orn in events:
        dur_s = d * step_s
        g = 0.5 if '*' in orn else gate
        extra = 0.03 if kind in ('lead', 'pad') else (1.2 if kind == 'bell' else 0.25)
        n = int((dur_s + extra) * SR)
        f = nes_pulse_hz(hz(m + transpose))
        fc = freq_curve(f, n, orn, vib if kind in ('lead', 'pad') else 0, dur_s)
        ph = np.cumsum(fc) / SR
        wave = np.where((ph % 1.0) < duty, 1.0, -1.0)
        nn_ = int(dur_s * SR)
        env = envelope(kind, n, dur_s, g * nn_ / n)
        a = (1.25 if '!' in orn else 1.0) * vol
        x = wave * q4(env) * a
        x[:16] *= np.linspace(0, 1, 16)
        x[-32:] *= np.linspace(1, 0, 32)
        s0 = int(round(st * step_s * SR))
        buf[s0:s0 + n] += x[:len(buf) - s0]
    return buf


TRI_TABLE = np.concatenate([np.arange(15, -1, -1), np.arange(0, 16)]) / 7.5 - 1.0


def render_tri(events, step_s, total_samples, vol=1.0, transpose=0, gate=0.88, tail=2.0):
    buf = np.zeros(total_samples + int(tail * SR))
    for st, d, m, orn in events:
        dur_s = d * step_s * (0.5 if '*' in orn else gate)
        n = int(dur_s * SR)
        f = nes_tri_hz(hz(m + transpose))
        fc = freq_curve(f, n, orn, 0, dur_s)
        ph = np.cumsum(fc) / SR
        x = TRI_TABLE[(np.floor(ph * 32).astype(np.int64)) % 32] * vol
        fade = min(64, n // 2)
        x[:fade] *= np.linspace(0, 1, fade)
        x[-fade:] *= np.linspace(1, 0, fade)
        s0 = int(round(st * step_s * SR))
        buf[s0:s0 + n] += x[:len(buf) - s0]
    return buf


def _lfsr(short):
    reg, out = 1, []
    tap = 6 if short else 1
    for _ in range(93 if short else 32767):
        fb = (reg & 1) ^ ((reg >> tap) & 1)
        reg = (reg >> 1) | (fb << 14)
        out.append(1.0 if reg & 1 else -1.0)
    return np.array(out)


NOISE_LONG = _lfsr(False)
NOISE_SHORT = _lfsr(True)
NOISE_PER = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068]


def noise(n, idx, short=False):
    rate = CPU / NOISE_PER[idx]
    tab = NOISE_SHORT if short else NOISE_LONG
    i = (np.arange(n) * rate / SR).astype(np.int64) % len(tab)
    return tab[i]


def tri_sweep(f0, f1, dur):
    n = int(dur * SR)
    f = f0 * (f1 / f0) ** (np.arange(n) / n)
    ph = np.cumsum(f) / SR
    return TRI_TABLE[(np.floor(ph * 32).astype(np.int64)) % 32]


def drum(c):
    def dec(n, tau):
        return q4(np.exp(-np.arange(n) / (tau * SR)))
    if c == 'k':
        a = tri_sweep(170, 45, 0.11) * 1.1
        b = noise(len(a), 11) * dec(len(a), 0.012) * 0.5
        return a + b
    if c == 's':
        n = int(0.16 * SR)
        x = noise(n, 5) * dec(n, 0.05) * 0.75
        x[:int(0.03 * SR)] += tri_sweep(240, 140, 0.03) * 0.6
        return x
    if c == 't':
        a = tri_sweep(220, 90, 0.16)
        return a * dec(len(a), 0.08) * 1.2
    if c == 'h':
        n = int(0.04 * SR)
        return noise(n, 0) * dec(n, 0.012) * 0.33
    if c == 'o':
        n = int(0.18 * SR)
        return noise(n, 1) * dec(n, 0.06) * 0.3
    if c == 'c':
        n = int(1.1 * SR)
        return noise(n, 2) * dec(n, 0.35) * 0.42
    if c == 'g':                          # gong: metallic short-mode noise + low pulse hum
        n = int(2.4 * SR)
        e = dec(n, 0.7)
        x = noise(n, 8, True) * e * 0.28 + noise(n, 11, True) * e * 0.22
        ph = np.arange(n) * 98.0 / SR
        x += np.where(ph % 1 < 0.25, 1, -1) * q4(np.exp(-np.arange(n) / (0.9 * SR))) * 0.12
        x[:int(0.02 * SR)] += noise(int(0.02 * SR), 3) * 0.4
        return x
    if c in 'wv':                         # woodblock / muyu: a short hollow pulse blip
        f = 1250.0 if c == 'w' else 820.0
        n = int(0.06 * SR)
        ph = np.arange(n) * f / SR
        return np.where(ph % 1 < 0.5, 1, -1) * dec(n, 0.014) * 0.55
    raise ValueError(c)


DRUM_CACHE = {}


def render_noise(hits, step_s, total_samples, vol=1.0, tail=2.5):
    buf = np.zeros(total_samples + int(tail * SR))
    for st, c in hits:
        if c not in DRUM_CACHE:
            DRUM_CACHE[c] = drum(c)
        x = DRUM_CACHE[c] * vol
        s0 = int(round(st * step_s * SR))
        buf[s0:s0 + len(x)] += x[:len(buf) - s0]
    return buf


# ---------------------------------------------------------------- track render
MIX = {'p1': 0.20, 'p2': 0.15, 'tri': 0.30, 'noise': 0.22}


def render_section(sec, loop):
    bar = sec.get('bar', 16)
    tr = sec.get('transpose', 0)
    step_s = 60.0 / sec['bpm'] / 4
    parts = {}
    lens = {}
    for ch in ('p1', 'p2', 'tri'):
        if isinstance(sec.get(ch), str) and sec[ch] != 'echo':
            parts[ch], lens[ch] = parse(sec[ch], bar, sec['name'] + '.' + ch)
    if 'noise' in sec:
        parts['noise'], lens['noise'] = parse_drums(sec['noise'])
    steps = sec.get('steps') or max(lens.values())
    if loop:
        for ch, L in lens.items():
            if abs(L - steps) > 1e-6:
                raise ValueError('%s.%s is %g steps, expected %g' % (sec['name'], ch, L, steps))
    total = int(round(steps * step_s * SR))
    if sec.get('p2') == 'echo':
        dly, ev = sec.get('echo_delay', 3), []
        for st, d, m, o in parts['p1']:
            s2 = st + dly
            if loop and s2 >= steps:
                s2 -= steps
            ev.append((s2, d, m, o.replace('!', '')))
        parts['p2'] = ev
    mix = np.zeros(total + int(3.0 * SR))
    p1 = sec.get('p1o', {})
    p2 = sec.get('p2o', {})
    if 'p1' in parts:
        x = render_pulse(parts['p1'], step_s, total, transpose=tr, tail=3.0,
                         **{'duty': 0.25, 'kind': 'lead', **p1})
        mix[:len(x)] += x * MIX['p1']
    if 'p2' in parts:
        x = render_pulse(parts['p2'], step_s, total, transpose=tr, tail=3.0,
                         **{'duty': 0.5, 'kind': 'pluck', 'vol': 0.8, **p2})
        mix[:len(x)] += x * MIX['p2']
    if 'tri' in parts:
        x = render_tri(parts['tri'], step_s, total, transpose=tr, tail=3.0, **sec.get('trio', {}))
        mix[:len(x)] += x * MIX['tri']
    if 'noise' in parts:
        x = render_noise(parts['noise'], step_s, total, tail=3.0, vol=sec.get('nvol', 1.0))
        mix[:len(x)] += x * MIX['noise']
    return mix, total


HP = butter(2, 38, 'highpass', fs=SR, output='sos')
LP = butter(2, 11500, 'lowpass', fs=SR, output='sos')


def nes_filter(x, loop):
    if loop:                                  # filter circularly so the loop seam is clean
        L = len(x)
        y = np.concatenate([x, x, x])
        y = sosfilt(LP, sosfilt(HP, y))
        return y[L:2 * L]
    return sosfilt(LP, sosfilt(HP, x))


def gated_rms(x):
    w = int(0.05 * SR)
    n = len(x) // w
    p = (x[:n * w].reshape(n, w) ** 2).mean(1)
    keep = p[p > p.max() * 0.01]
    return np.sqrt(keep.mean())


TARGET_RMS = 0.16
PEAK = 10 ** (-1.0 / 20)


def render_track(name, tr):
    loop = tr.get('loop', True)
    secs = tr['sections']
    if loop:
        mix, total = render_section({'name': name, **secs[0]}, True)
        y = mix[:total].copy()
        rest = mix[total:]
        k = 0
        while k < len(rest):                  # wrap the ringing tail onto the start
            seg = rest[k:k + total]
            y[:len(seg)] += seg
            k += total
    else:
        pieces, pos = [], 0
        for s in secs:
            m, total = render_section({'name': name, **s}, False)
            pieces.append((pos, m))
            pos += total
        y = np.zeros(pos + int(3.0 * SR))
        for p, m in pieces:
            y[p:p + len(m)] += m[:len(y) - p]
        nz = np.nonzero(np.abs(y) > 1e-4)[0]
        y = y[:nz[-1] + int(0.05 * SR)]
    y = nes_filter(y, loop)
    y -= y.mean()
    g = min(TARGET_RMS / gated_rms(y), PEAK / np.abs(y).max())
    y *= g
    f = int(0.003 * SR)                       # tiny fades: no click at the seam/ends
    y[:f] *= np.linspace(0, 1, f)
    fo = f if loop else int(0.08 * SR)
    y[-fo:] *= np.linspace(1, 0, fo)
    return y.astype(np.float32), loop


def write_wav(path, y):
    import wave
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def encode(wav, name):
    base = os.path.join(OUT, name)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-c:a', 'aac',
                    '-b:a', '64k', '-movflags', '+faststart', base + '.m4a'], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-c:a', 'libvorbis',
                    '-b:a', '64k', base + '.ogg'], check=True)


# =========================================================================== SCORES
# All melodies are original, written on Chinese pentatonic modes (gong C D E G A,
# yu A C D E G, shang D E G A C) and transposed per track.
T = {}

# ---- title: heroic call to adventure (D gong) -------------------------------------
_title_mel = '''
G4:2 C5:2 D5:2 G5:2 ~A5:8 | G5:2 E5:2 D5:2 C5:2 /D5:8 |
G4:3 A4:1 C5:4 D5:4 E5:4 | G5:6 E5:2 D5:4 C5:4 | ^D5:3 E5:1 D5:2 C5:2 A4:4 G4:4 | /A4:12 r:4 |
G4:3 A4:1 C5:4 D5:4 E5:4 | !A5:6 G5:2 E5:4 G5:4 | ^D5:3 E5:1 G5:2 E5:2 D5:4 C5:2 D5:2 | C5:12 r:4 |
E5:3 G5:1 A5:4 C6:4 A5:4 | G5:6 A5:2 G5:4 E5:4 | D5:3 E5:1 G5:2 E5:2 D5:4 C5:2 A4:2 | /D5:12 r:4 |
E5:3 G5:1 A5:4 C6:4 D6:4 | !E6:6 D6:2 C6:4 A5:4 | G5:3 A5:1 G5:2 E5:2 D5:2 E5:2 G5:4 | C6:12 r:4 |
A5:4 G5:2 E5:2 D5:4 E5:4 | C5:4 D5:2 E5:2 A4:8 | A5:4 G5:2 A5:2 C6:4 D6:4 | E6:8 D6:4 C6:2 D6:2 |
~E6:16 | D6:4 C6:4 A5:4 G5:4 |'''
_title_ch = ['C', 'G', 'C', 'Am', 'F', 'Am', 'C', 'F', 'G', 'C', 'C', 'C', 'G', 'G',
             'Am', 'C', 'G', 'C', 'Am', 'F', 'Am', 'G', 'C', 'G']
_title_dr = ('g...........ssss|k.......s.s.sss.|' +
             '[k.h.s.h.k.k.s.h.|k.h.s.h.k.k.s.hh|k.h.s.h.k.k.s.h.|k.h.s.h.k.s.ssss|]*4' +
             'c.h.s.h.k.k.s.h.|k.h.s.h.k.k.s.h.|k.h.s.h.k.k.s.h.|k.h.s.h.kkt.t.tt|' +
             'c.h.s.h.k.k.s.h.|k.h.s.h.s.ssssss|')
T['title'] = dict(loop=True, sections=[dict(
    bpm=116, transpose=2, p1=_title_mel,
    p2=arp_line(_title_ch, 'up16', 2), p2o=dict(duty=0.125, vol=0.75),
    tri=bass_line(_title_ch, 'gallop', 2), noise=_title_dr)])

# ---- town: warm market (F gong) ---------------------------------------------------
_town_a = '''
E5:2 G5:2 A5:2 G5:2 E5:4 D5:2 C5:2 | D5:2 E5:2 G5:2 E5:2 D5:8 |
C5:2 D5:2 E5:2 G5:2 A5:2 C6:2 A5:2 G5:2 | ^A5:6 G5:2 E5:8 |'''
_town_mel = (_town_a + '''
E5:2 G5:2 A5:2 G5:2 E5:4 D5:2 C5:2 | A4:2 C5:2 D5:2 E5:2 G5:4 E5:4 |
D5:2 E5:2 D5:2 C5:2 A4:4 D5:2 E5:2 | C5:12 r:4 |''' + _town_a + '''
G5:2 A5:2 C6:2 A5:2 G5:4 E5:2 G5:2 | A5:4 G5:2 E5:2 D5:4 C5:4 |
D5:2 E5:2 G5:2 E5:2 D5:2 C5:2 A4:2 D5:2 | C5:12 r:4 |
A4:4 C5:2 D5:2 E5:4 D5:2 C5:2 | /D5:6 E5:2 A4:8 | G4:4 A4:2 C5:2 D5:4 C5:2 A4:2 | C5:6 D5:2 G4:8 |
A4:4 C5:2 D5:2 E5:4 G5:2 A5:2 | ^C6:6 A5:2 G5:4 E5:4 | D5:2 E5:2 G5:2 A5:2 G5:2 E5:2 D5:2 E5:2 | G5:12 r:4 |''')
_town_ch = (['C', 'G', 'Am', 'C', 'C', 'Am', 'G', 'C'] + ['C', 'G', 'Am', 'C', 'C', 'F', 'G', 'C'] +
            ['Am', 'Dm', 'F', 'C', 'Am', 'F', 'G', 'G'])
_town_dr = ('[k.w.h.w.k.wvh.w.|k.w.h.w.k.w.hwhw|]*11' + 'k.w.h.w.k.wvh.w.|wvwvw.v.wvwvwwvv|')
T['town'] = dict(loop=True, sections=[dict(
    bpm=132, transpose=5, p1=_town_mel, p1o=dict(duty=0.5, vib=14),
    p2=arp_line(_town_ch, 'off', 5, lo=57), p2o=dict(duty=0.25, vol=0.7),
    tri=bass_line(_town_ch, 'oompah', 5), noise=_town_dr, nvol=0.8)])

# ---- field: striding journey (G gong) ---------------------------------------------
_field_mel = '''
C5:6 D5:2 E5:4 G5:4 | A5:8 G5:4 E5:4 | D5:6 E5:2 G5:4 E5:2 D5:2 | C5:4 A4:4 G4:8 |
C5:6 D5:2 E5:4 G5:4 | A5:6 C6:2 D6:4 C6:2 A5:2 | ^G5:6 E5:2 D5:4 E5:2 D5:2 | C5:16 |
E5:6 G5:2 A5:4 C6:4 | !D6:8 C6:4 A5:4 | G5:6 A5:2 G5:2 E5:2 D5:4 | E5:4 G5:4 A5:8 |
C6:6 A5:2 G5:4 E5:4 | D5:6 E5:2 G5:4 A5:4 | G5:4 E5:2 D5:2 C5:4 D5:4 | C5:16 |
A4:6 C5:2 /D5:8 | E5:4 D5:2 C5:2 A4:8 | G4:6 A4:2 C5:4 D5:4 | E5:12 r:4 |
A5:6 G5:2 E5:4 D5:4 | E5:4 G5:4 A5:8 | C6:4 A5:2 G5:2 E5:4 G5:4 | /D5:16 |
G5:3 A5:1 G5:4 E5:4 G5:4 | A5:3 C6:1 A5:4 G5:8 | E5:3 G5:1 E5:4 D5:4 E5:4 | G5:12 r:4 |
!C6:3 D6:1 C6:4 A5:4 G5:4 | A5:4 G5:4 E5:4 D5:4 | E5:4 G5:2 E5:2 D5:4 A4:2 C5:2 | C5:8 G4:4 A4:2 G4:2 |'''
_field_ch = (['C', 'Am', 'G', 'C', 'C', 'F', 'G', 'C'] + ['C', 'F', 'C', 'Am', 'Am', 'G', 'G', 'C'] +
             ['Am', 'Am', 'G', 'Em', 'F', 'Am', 'F', 'G'] + ['C', 'F', 'Am', 'C', 'F', 'Dm', 'Am', 'C'])
_field_dr = ('[k...h...s...h...|k...h...s...h.h.|k...h...s...h...|k...h...s.k.s.h.|]*6' +
             'c...h.k.s...h.k.|k...h.k.s...h.k.|k...h.k.s...h.k.|k.k.s.k.s.sss.ss|' +
             'c...h.k.s...h.k.|k...h.k.s...h.k.|k...h.k.s...h.k.|k...s...s.s.ssss|')
T['field'] = dict(loop=True, sections=[dict(
    bpm=104, transpose=7, p1=_field_mel, p1o=dict(duty=0.25, vib=24),
    p2=arp_line(_field_ch, 'broken8', 7, lo=52), p2o=dict(duty=0.5, vol=0.6),
    tri=bass_line(_field_ch, 'stride', 7, lo=31), noise=_field_dr, nvol=0.75)])

# ---- dungeon: tense, sparse, echoing (A yu) ---------------------------------------
_dun_mel = '''
A4:4 r:2 C5:2 D5:6 r:2 | E5:2 D5:2 C5:2 D5:2 /E5:8 | r:4 G5:2 E5:2 D5:4 C5:4 | ~D5:12 r:4 |
A4:4 r:2 C5:2 D5:6 r:2 | E5:2 G5:2 A5:2 G5:2 E5:8 | r:4 D5:2 C5:2 A4:4 G4:4 | A4:12 r:4 |
E5:6 r:2 G5:2 E5:2 D5:4 | C6:4 A5:2 G5:2 \\A5:8 | r:4 E5:2 G5:2 A5:4 C6:4 | ~D6:8 C6:4 A5:4 |
G5:6 E5:2 D5:4 E5:4 | C5:4 D5:2 C5:2 A4:8 | r:8 E4:4 G4:4 | /A4:12 r:4 |'''
_dun_bass = '''
[A2:2 A2:3 r:11 |]*2 F2:2 F2:3 r:11 | G2:2 G2:3 r:7 D2:4 |
[A2:2 A2:3 r:11 |]*2 F2:2 F2:3 r:11 | E2:2 E2:3 r:7 E2:4 |
A2:2 A2:3 r:11 | F2:2 F2:3 r:11 | C3:2 C3:3 r:11 | D3:2 D3:3 r:7 A2:4 |
G2:2 G2:3 r:11 | F2:2 F2:3 r:11 | E2:2 E2:3 r:7 E2:4 | A2:2 A2:3 r:7 G2:2 E2:2 |'''
_dun_dr = ('g.......v.......|....v.......v...|........v.....v.|....v.......v.vv|' * 2 +
           'g.......v.......|....v.......v...|g.......v.....v.|....v.......vvvv|' +
           'g.......v.......|....v.......v...|........v.......|v...v...v.v.v.v.|')
T['dungeon'] = dict(loop=True, sections=[dict(
    bpm=84, transpose=0, p1=_dun_mel, p1o=dict(duty=0.125, vib=26, vol=0.95),
    p2='echo', echo_delay=3, p2o=dict(duty=0.25, kind='lead', vol=0.42),
    tri=_dun_bass, noise=_dun_dr, nvol=0.8)])

# ---- tower: solemn bells, canon at a dotted eighth (D shang) ----------------------
_tow_mel = '''
D5:8 A4:4 C5:4 | D5:4 E5:4 G5:8 | A5:8 G5:4 E5:4 | D5:16 |
A5:8 C6:4 D6:4 | C6:4 A5:4 G5:8 | E5:4 G5:4 A5:4 G5:4 | E5:8 D5:8 |
G4:8 A4:4 C5:4 | D5:4 C5:4 A4:8 | !D6:8 C6:4 A5:4 | G5:8 E5:8 | D5:4 E5:4 G5:4 E5:4 | D5:16 |'''
_tow_ch = ['D', 'D', 'A', 'D', 'F', 'F', 'C', 'A', 'C', 'F', 'D', 'C', 'G', 'D']
_tow_dr = '[g...v...v...v...|w...v...v...v...|]*7'
T['tower'] = dict(loop=True, sections=[dict(
    bpm=72, transpose=0, p1=_tow_mel, p1o=dict(duty=0.125, kind='bell', vol=1.1),
    p2='echo', echo_delay=6, p2o=dict(duty=0.25, kind='bell', vol=0.5),
    tri=bass_line(_tow_ch, 'toll', 0, lo=33), noise=_tow_dr, nvol=0.7)])

# ---- battle: fast and punchy (E yu) -----------------------------------------------
_bat_mel = '''
!A4:2 A4:2 r:2 A4:2 r:2 A4:2 C5:2 D5:2 | !E5:2 E5:2 r:2 E5:2 G5:2 E5:2 D5:2 C5:2 |
!A5:6 G5:2 E5:4 D5:4 | E5:2 G5:2 A5:4 C6:4 A5:4 | ^G5:6 E5:2 D5:2 C5:2 D5:4 | E5:8 r:2 E5:2 G5:2 A5:2 |
!A5:6 G5:2 E5:4 D5:4 | C6:2 D6:2 E6:4 D6:4 C6:4 | A5:2 G5:2 E5:2 G5:2 A5:2 C6:2 D6:2 C6:2 | A5:12 r:4 |
D6:4 C6:2 A5:2 G5:4 A5:4 | E5:2 D5:2 E5:2 G5:2 A5:8 | C6:4 A5:2 G5:2 E5:4 G5:4 | D5:2 C5:2 D5:2 E5:2 G5:8 |
A5:2 A5:2 G5:2 A5:2 C6:2 C6:2 A5:2 C6:2 | D6:2 D6:2 C6:2 D6:2 E6:2 D6:2 C6:2 D6:2 |
!E6:6 D6:2 C6:4 A5:4 | G5:4 E5:4 D5:4 E5:4 |
A4:2 C5:2 D5:2 E5:2 G5:2 E5:2 D5:2 C5:2 | D5:2 E5:2 G5:2 A5:2 C6:2 A5:2 G5:2 E5:2 |
A5:2 G5:2 E5:2 D5:2 C5:2 D5:2 E5:2 G5:2 | A5:8 G5:4 E5:4 |
A4:2 A4:2 r:2 A4:2 r:2 A4:2 r:2 A4:2 | C5:2 C5:2 D5:2 D5:2 E5:2 E5:2 G5:2 G5:2 |'''
_bat_ch = (['Am', 'Am'] + ['Am', 'C', 'G', 'Em', 'Am', 'C', 'Am', 'Am'] +
           ['Dm', 'Am', 'C', 'G', 'Am', 'G', 'Am', 'Em'] + ['Am', 'F', 'C', 'Am', 'Am', 'G'])
_bat_dr = ('k.k.s.k.k.k.s.ss|k.k.s.k.s.s.ssss|' +
           '[c.hks.h.k.hks.h.|k.hks.h.k.hks.hh|k.hks.h.k.hks.h.|k.hks.h.k.s.ssss|]*3' +
           'c.hks.h.k.hks.h.|k.hks.h.k.hks.hh|k.hks.h.k.hks.h.|k.hks.h.s.ssc...|' +
           'k.h.s.h.k.h.s.h.|k.h.s.h.k.h.s.h.|k.h.s.h.k.h.s.h.|k.h.s.h.k.s.ssss|' +
           'k.k.s.k.k.k.s.k.|s.s.s.s.ssssssss|')
T['battle'] = dict(loop=True, sections=[dict(
    bpm=168, transpose=-5, p1=_bat_mel, p1o=dict(duty=0.5, vib=18),
    p2=arp_line(_bat_ch, 'up16', -5, lo=57), p2o=dict(duty=0.125, vol=0.7),
    tri=bass_line(_bat_ch, 'drive', -5), noise=_bat_dr)])

# ---- boss: heavier, more urgent (F yu, flat-second menace) ------------------------
_boss_ost = 'A4:1 A4:1 A5:2 A4:1 A4:1 G5:2 A4:1 A4:1 E5:2 A4:1 A4:1 Bb4:2 |'
_boss_mel = (_boss_ost * 2 + '''
!A5:8 Bb5:4 A5:4 | G5:4 E5:4 D5:4 E5:4 | A5:8 C6:4 D6:4 | !E6:8 D6:2 C6:2 Bb5:4 |
A5:8 Bb5:4 A5:4 | G5:4 E5:4 D5:4 C5:4 | D5:4 E5:4 G5:2 E5:2 D5:2 C5:2 | A4:12 r:4 |
!A5:3 A5:3 G5:2 E5:3 E5:3 D5:2 | E5:3 G5:3 A5:2 C6:8 | !D6:3 D6:3 C6:2 A5:3 A5:3 G5:2 | A5:3 C6:3 D6:2 E6:8 |
!F6:4 E6:4 D6:4 C6:4 | D6:4 C6:4 Bb5:4 A5:4 | G5:2 A5:2 Bb5:2 A5:2 G5:2 E5:2 D5:2 E5:2 | A5:12 r:4 |
E5:6 D5:2 E5:4 G5:4 | A5:6 G5:2 A5:4 C6:4 | Bb5:6 A5:2 G5:4 E5:4 | ~A5:16 |
!E6:6 D6:2 E6:4 G6:4 | A6:8 G6:4 E6:4 | D6:4 C6:2 Bb5:2 A5:4 G5:4 | A5:12 r:4 |''' + _boss_ost * 2)
_boss_ch = (['Am', 'Am'] + ['F', 'Em', 'F', 'Bb', 'Am', 'C', 'Dm', 'Am'] +
            ['Am', 'Am', 'Dm', 'C', 'F', 'Bb', 'G', 'Am'] + ['Am', 'F', 'Bb', 'Am', 'C', 'Am', 'Bb', 'Am'] +
            ['Am', 'Am'])
_boss_dr = ('k...k...k...k.ss|k...k...k...ssss|' +
            '[c.hks.hkk.hks.hk|k.hks.hkk.hks.hk|k.hks.hkk.hks.hk|k.hks.hkk.s.ssss|]*6' +
            'k...k...k...k.ss|k.k.k.k.ssssc...|')
T['boss'] = dict(loop=True, sections=[dict(
    bpm=152, transpose=-4, p1=_boss_mel, p1o=dict(duty=0.25, vib=22),
    p2=arp_line(_boss_ch, 'stab', -4, lo=55), p2o=dict(duty=0.5, vol=0.75, kind='pluck'),
    tri=bass_line(_boss_ch, 'pulse8', -4), noise=_boss_dr)])

# ---- lair: Netherworld Hall, ominous and grand (D yu) -----------------------------
_lair_mel = '''
A4:8 C5:4 Bb4:4 | A4:4 G4:4 E4:8 | A4:8 C5:4 D5:4 | ~E5:12 r:4 |
F5:8 E5:4 D5:4 | E5:4 D5:4 C5:4 Bb4:4 | A4:4 C5:4 E5:4 A5:4 | ~Bb5:12 r:4 |
!A5:8 G5:4 E5:4 | F5:8 E5:4 D5:4 | E5:6 D5:2 C5:4 D5:4 | A4:16 |
E5:4 E5:2 F5:2 E5:4 D5:4 | C5:4 D5:2 C5:2 Bb4:8 | A4:4 C5:4 D5:4 E5:4 | G5:4 F5:4 E5:4 D5:4 |
~E5:16 | r:16 |'''
_lair_ch = ['Am', 'G', 'F', 'Em', 'Dm', 'C', 'Am', 'Bb', 'F', 'Dm', 'C', 'Am',
            'C', 'Bb', 'Am', 'G', 'Em', 'Am']
_lair_dr = '[g.......k.......|k.......k...k...|k.......k.......|k.......k.k.t.tt|]*4' + \
           'g.......k.......|k.......t.t.tttt|'
T['lair'] = dict(loop=True, sections=[dict(
    bpm=92, transpose=-7, p1=_lair_mel, p1o=dict(duty=0.25, vib=26, kind='lead'),
    p2=arp_line(_lair_ch, 'hold', -7, lo=50), p2o=dict(duty=0.125, vol=0.7, kind='pad'),
    tri=bass_line(_lair_ch, 'halfs', -7, lo=28), noise=_lair_dr, nvol=0.85)])

# ---- final boss: the most intense (F# yu) -----------------------------------------
_fin_ost = ('A5:1 E5:1 A4:1 E5:1 Bb5:1 E5:1 A4:1 E5:1 C6:1 E5:1 A4:1 E5:1 Bb5:1 E5:1 A4:1 E5:1 |')
_fin_mel = (_fin_ost * 2 + '''
!A5:4 E6:4 D6:2 C6:2 Bb5:4 | A5:2 G5:2 A5:2 Bb5:2 A5:8 | !G5:4 D6:4 C6:2 Bb5:2 A5:4 | G5:2 F5:2 G5:2 A5:2 E5:8 |
!A5:4 E6:4 F6:4 E6:4 | D6:2 C6:2 D6:2 E6:2 A6:8 | G6:4 F6:4 E6:4 D6:4 | ~E6:12 r:4 |
!A5:3 C6:3 D6:2 E6:3 D6:3 C6:2 | D6:3 C6:3 A5:2 G5:8 | !A5:3 C6:3 D6:2 E6:3 G6:3 E6:2 | ~A6:16 |
G6:3 E6:3 D6:2 E6:3 D6:3 C6:2 | D6:3 C6:3 A5:2 Bb5:8 | A5:2 Bb5:2 C6:2 D6:2 E6:2 F6:2 G6:2 A6:2 | !Bb6:8 A6:8 |
A5:1 C6:1 D6:1 E6:1 G6:1 E6:1 D6:1 C6:1 A5:1 C6:1 D6:1 E6:1 G6:1 A6:1 G6:1 E6:1 |
D6:1 E6:1 G6:1 E6:1 D6:1 C6:1 A5:1 C6:1 D6:8 |
G5:1 A5:1 C6:1 D6:1 E6:1 D6:1 C6:1 A5:1 G5:1 A5:1 C6:1 D6:1 E6:1 G6:1 E6:1 D6:1 |
C6:1 D6:1 C6:1 A5:1 G5:1 A5:1 G5:1 E5:1 A5:8 |
F5:1 A5:1 C6:1 F6:1 E6:1 C6:1 A5:1 F5:1 G5:1 Bb5:1 D6:1 G6:1 F6:1 D6:1 Bb5:1 G5:1 |
A5:1 C6:1 E6:1 A6:1 G6:1 E6:1 C6:1 A5:1 E6:8 |
!F6:4 E6:4 D6:4 C6:4 | Bb5:4 A5:4 G5:4 E5:4 |
!A5:8 C6:8 | E6:8 D6:4 C6:4 | !D6:8 F6:8 | ~E6:16 | !A6:6 G6:2 E6:4 D6:4 | ~E6:12 r:4 |''' + _fin_ost * 2)
_fin_ch = (['Am', 'Am'] + ['Am', 'F', 'Gm', 'Am', 'Am', 'Dm', 'C', 'Em'] +
           ['Am', 'G', 'Am', 'F', 'C', 'Bb', 'F', 'Bb'] + ['Am', 'G', 'C', 'Am', 'F', 'Am', 'Dm', 'Ep'] +
           ['Am', 'C', 'Dm', 'Am', 'F', 'Ep'] + ['Am', 'Am'])
_fin_dr = ('k.s.k.s.k.s.k.ss|k.s.k.s.k.s.ssss|' +
           '[c.hsk.hsk.hsk.hs|k.hsk.hsk.hsk.hs|k.hsk.hsk.hsk.hs|k.hsk.hsk.s.ssss|]*2' +
           '[c.k.s.k.k.k.s.k.|k.k.s.k.k.k.s.kk|k.k.s.k.k.k.s.k.|k.k.s.k.s.ssssss|]*4' +
           'c...k...c...k...|k.k.s...k.k.s...|c...k...c...k...|k.k.s.k.s.ssssss|' +
           'c...k...c...k...|k.k.s.k.ssssc...|' +
           'k.s.k.s.k.s.k.ss|k.k.k.k.ssssssss|')
T['final'] = dict(loop=True, sections=[dict(
    bpm=176, transpose=-3, p1=_fin_mel, p1o=dict(duty=0.25, vib=20),
    p2=arp_line(_fin_ch, 'roll16', -3, lo=57), p2o=dict(duty=0.125, vol=0.72),
    tri=bass_line(_fin_ch, 'drive', -3), noise=_fin_dr)])

# ---- ending: title reprise in triumph, then gentle (D gong, no loop) --------------
_end_b = '''
E5:6 D5:2 C5:4 D5:4 | E5:4 G5:4 ~A5:8 | ^G5:6 E5:2 D5:4 C5:4 | A4:8 G4:8 |
C5:6 D5:2 E5:4 G5:4 | A5:6 G5:2 E5:4 D5:4 | E5:6 D5:2 C5:2 D5:2 A4:4 | ~C5:16 |'''
_end_b_ch = ['C', 'Am', 'C', 'F', 'Am', 'F', 'G', 'C']
_title_a_mel = '\n'.join(_title_mel.strip().split('\n')[:5])           # intro + A + A'
_title_a_ch = _title_ch[:18]
_slow_a = '\n'.join(_title_mel.strip().split('\n')[1:3])                # theme A only
T['ending'] = dict(loop=False, sections=[
    dict(bpm=112, transpose=2, p1=_title_a_mel,
         p2=arp_line(_title_a_ch, 'up16', 2), p2o=dict(duty=0.125, vol=0.75),
         tri=bass_line(_title_a_ch, 'gallop', 2),
         noise='g...........ssss|k.......s.s.sss.|' +
               '[c.h.s.h.k.k.s.h.|k.h.s.h.k.k.s.hh|k.h.s.h.k.k.s.h.|k.h.s.h.k.s.ssss|]*4'),
    dict(bpm=80, transpose=2, p1=_slow_a, p1o=dict(duty=0.5, vib=20, kind='pad', vol=0.95),
         p2=arp_line(_title_ch[2:10], 'broken8', 2, lo=50), p2o=dict(duty=0.25, vol=0.6),
         tri=bass_line(_title_ch[2:10], 'halfs', 2), noise='g' + '.' * 15 + '|' + '.' * 112),
    dict(bpm=80, transpose=2, p1=_end_b, p1o=dict(duty=0.5, vib=20, kind='pad', vol=0.95),
         p2=arp_line(_end_b_ch, 'pluck4', 2, lo=50), p2o=dict(duty=0.25, vol=0.6),
         tri=bass_line(_end_b_ch, 'halfs', 2),
         noise='[v.......w.......|]*7........v...v...'),
    dict(bpm=72, transpose=2, p1='G4:4 C5:4 D5:4 G5:4 | ~A5:16 | G5:8 E5:4 D5:4 | ~C5:16 | r:16 |',
         p1o=dict(duty=0.5, vib=20, kind='pad'),
         p2='E4:4 G4:4 A4:4 C5:4 | C5:16 | B4:8 G4:8 | E4:16 | r:16 |',
         p2o=dict(duty=0.25, kind='pad', vol=0.55),
         tri='C3:16 | F2:16 | G2:16 | C2:16 | r:16 |', trio=dict(gate=0.97),
         noise='g' + '.' * 47 + 'g' + '.' * 31),
])

# ---- jingles ----------------------------------------------------------------------
T['j_win'] = dict(loop=False, sections=[dict(
    bpm=150, transpose=2, p1='G4:2 C5:2 E5:2 G5:2 A5:2 G5:1 A5:1 ~C6:20',
    p2='E4:2 G4:2 C5:2 E5:2 E5:2 E5:1 E5:1 G5:20', p2o=dict(kind='pad', vol=0.7),
    tri='C3:8 G2:4 C3:20', noise='k.......s.ss')])
T['j_level'] = dict(loop=False, sections=[dict(
    bpm=160, transpose=2, p1='C5:1 D5:1 E5:1 G5:1 A5:1 C6:1 D6:1 E6:1 ~G6:16', p1o=dict(duty=0.5),
    p2='r:1 C5:1 D5:1 E5:1 G5:1 A5:1 C6:1 D6:1 E6:16', p2o=dict(duty=0.125, kind='lead', vol=0.6),
    tri='C3:4 G3:4 C3:16', noise='w.w.w.w.c')])
T['j_inn'] = dict(loop=False, sections=[dict(
    bpm=90, transpose=0, p1='E5:4 D5:2 C5:2 A4:4 G4:4 ~C5:8', p1o=dict(duty=0.5, kind='pad', vib=16),
    p2='C5:4 A4:4 E4:4 E4:4 E4:8', p2o=dict(duty=0.25, kind='pad', vol=0.55),
    tri='C3:8 F2:8 C3:8', noise='v...............g', nvol=0.6)])
T['j_item'] = dict(loop=False, sections=[dict(
    bpm=140, transpose=2, p1='!E5:2 E5:1 E5:1 G5:4 A5:2 G5:2 A5:2 C6:2 ~E6:16', p1o=dict(duty=0.5),
    p2='C5:2 C5:1 C5:1 E5:4 E5:2 E5:2 E5:2 G5:2 G5:16', p2o=dict(kind='pad', vol=0.65),
    tri='C3:4 C3:4 F2:8 C3:16', noise='k...s...k.s.s.s.c')])
T['j_over'] = dict(loop=False, sections=[dict(
    bpm=70, transpose=0, p1='E5:4 D5:4 C5:4 \\A4:8', p1o=dict(duty=0.5, kind='pad', vib=24),
    p2='C5:4 Bb4:4 A4:4 E4:8', p2o=dict(duty=0.25, kind='pad', vol=0.55),
    tri='A2:4 G2:4 F2:4 A1:8', noise='............g', nvol=0.8)])
T['j_save'] = dict(loop=False, sections=[dict(
    bpm=120, transpose=0, p1='A5:1 G5:1 E5:2 D5:2 C5:2 ~G5:10', p1o=dict(duty=0.25, kind='pluck'),
    p2='r:2 C5:2 A4:2 G4:2 E5:10', p2o=dict(duty=0.5, kind='pluck', vol=0.6),
    tri='C3:8 G2:10', noise='w.w.v.......v', nvol=0.8)])

NAMES = {
    'title': ('龍門刀客傳', 'Ballad of the Longmen Blade'),
    'town': ('客棧炊煙', 'Cookfire Smoke over the Inn Street'),
    'field': ('千里關山', 'A Thousand Li of Mountain Passes'),
    'dungeon': ('幽谷迷蹤', 'Lost Trail in the Dark Vale'),
    'tower': ('千佛塔鐘', 'Bells of the Thousand-Buddha Tower'),
    'battle': ('刀光劍影', 'Flash of Blade and Sword'),
    'boss': ('魔頭現身', 'The Demon Chief Appears'),
    'lair': ('幽冥殿', 'Hall of the Netherworld'),
    'final': ('天魔決戰', 'Duel with the Heavenly Demon'),
    'ending': ('江湖路遠', 'Long Is the Road of the Jianghu'),
    'j_win': ('旗開得勝', 'Victory at the First Banner'),
    'j_level': ('功力精進', 'Inner Strength Grows'),
    'j_inn': ('一夜好眠', "A Night's Good Rest"),
    'j_item': ('神兵到手', 'A Treasure in Hand'),
    'j_over': ('壯志未酬', 'Ambition Unfulfilled'),
    'j_save': ('說書記事', 'The Storyteller Writes It Down'),
}


def main(which):
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    meta_path = os.path.join(OUT, 'tracks.json')
    meta = {}
    if os.path.exists(meta_path):
        with open(meta_path, encoding='utf-8') as f:
            meta = json.load(f)
    for name in which:
        y, loop = render_track(name, T[name])
        wav = os.path.join(TMP, name + '.wav')
        write_wav(wav, y)
        encode(wav, name)
        dur = round(len(y) / SR, 3)
        zh, en = NAMES[name]
        meta[name] = {'zh': zh, 'en': en, 'loop': loop, 'dur': dur}
        pk = 20 * np.log10(np.abs(y).max())
        print('%-8s %6.2fs loop=%-5s peak %.2f dBFS rms %.1f dB dc %.1e' % (
            name, dur, loop, pk, 20 * np.log10(gated_rms(y)), y.mean()))
    meta = {k: meta[k] for k in NAMES if k in meta}
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:] or list(T))
