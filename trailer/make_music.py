"""Komponiert die Trailer-Musik als MIDI (mido) und rendert sie mit fluidsynth + GM-Soundfont.
Aufbau folgt timeline.py: Einstieg (Klavier) -> Konflikt (Bass, Ride) -> Eskalation (Ostinato,
Pauke, Crescendo) -> STILLE -> Schluss-Hit auf die Titelkarte -> leise Pointe."""
import os
import subprocess

import mido
import numpy as np
from scipy.io import wavfile

import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "music")
SF2 = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
TPB = 480
SR = 48000

NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"])}
NOTE.update({"Db": 1, "D#": 3, "Gb": 6, "G#": 8, "A#": 10})


def n(name):
    """'D4' -> MIDI-Nummer"""
    p, o = name[:-1], int(name[-1])
    return 12 * (o + 1) + NOTE[p]


def beat(t):
    """Sekunden -> Beats"""
    return t / T.BEAT


def bar(b):
    """Takt (1-basiert) -> Beat"""
    return (b - 1) * 4


CH = dict(piano=0, bass=1, strings=2, pad=3, timp=4, brass=5, sax=6, horn=7, guitar=8, drums=9)
PROG = dict(piano=0, bass=32, strings=48, pad=49, timp=47, brass=61, sax=66, horn=60, guitar=30)

events = []  # (beat, type, ch, note, vel)


def note(inst, pitch, start, dur, vel):
    ch = CH[inst]
    p = n(pitch) if isinstance(pitch, str) else pitch
    events.append((start, 1, ch, p, int(max(1, min(127, vel)))))
    events.append((start + dur, 0, ch, p, 0))


def chord(inst, pitches, start, dur, vel, roll=0.0):
    for i, p in enumerate(pitches):
        note(inst, p, start + i * roll, dur - i * roll, vel)


def drum(key, start, vel):
    note("drums", key, start, 0.25, vel)


CHORDS = {
    "Dm9": ("D2", ["F3", "A3", "C4", "E4"]),
    "Bbmaj7": ("Bb1", ["A3", "D4", "F4"]),
    "Gm7": ("G2", ["Bb3", "D4", "F4"]),
    "A7b9": ("A1", ["C#4", "G4", "Bb4"]),
}
PROGRESSION = ["Dm9", "Bbmaj7", "Gm7", "A7b9"]
MOTIF = [  # pro Takt: (beat, note, dauer)
    [(0.0, "A4", 1.5), (1.5, "D5", 0.5), (2.0, "C5", 1.0), (3.0, "A4", 1.0)],
    [(0.0, "F4", 2.0), (2.0, "G4", 0.5), (2.5, "A4", 1.5)],
    [(0.0, "Bb4", 1.5), (1.5, "A4", 0.5), (2.0, "G4", 1.0), (3.0, "F4", 1.0)],
    [(0.0, "E4", 2.0), (2.0, "C#5", 0.5), (2.5, "Bb4", 1.5)],
]
WALK = {  # Walking Bass pro Akkord
    "Dm9": ["D2", "F2", "A2", "C3"], "Bbmaj7": ["Bb1", "D2", "F2", "A2"],
    "Gm7": ["G1", "Bb1", "D2", "E2"], "A7b9": ["A1", "C#2", "E2", "G2"],
}


def compose():
    # ---------- EINSTIEG: Takte 1-6 (0-18 s) ----------
    for b in range(1, 7):
        name = PROGRESSION[(b - 1) % 4]
        root, voicing = CHORDS[name]
        s = bar(b)
        if b == 6:  # Klavier hält Akkord unter der Tafel "Er hatte keinen Plan"
            chord("piano", ["A1", "A2"] + voicing, s, 4, 72, roll=0.08)
            chord("pad", ["A2", "E3", "G3"], s, 4, 58)
            note("bass", "E2", s + 3, 0.5, 80)
            note("bass", "G#2", s + 3.5, 0.5, 85)
            drum(51, s + 3, 45)
            continue
        chord("piano", [root] + voicing, s, 4, 62 + b * 2, roll=0.06)
        for (off, p, d) in MOTIF[(b - 1) % 4]:
            note("piano", p, s + off, d, 80 + b * 2)
        if b >= 3:
            chord("pad", [root.replace("1", "2")] + voicing[:2], s, 4, 60 + b * 3)

    # ---------- KONFLIKT: Takte 7-12 (18-36 s) ----------
    swing = 2 / 3
    for b in range(7, 13):
        name = PROGRESSION[(b - 7) % 4]
        root, voicing = CHORDS[name]
        s = bar(b)
        grow = (b - 7) * 4
        for i, p in enumerate(WALK[name]):
            note("bass", p, s + i, 0.95, 78 + grow)
        # Ride (Swing) + HiHat-Pedal auf 2 und 4
        for q in range(4):
            drum(51, s + q, 50 + grow)
            if q in (1, 3):
                drum(51, s + q + swing, 38 + grow)
                drum(44, s + q, 45 + grow)
        # Klavier-Comping auf den Offbeats
        chord("piano", voicing, s + 1 + swing, 0.4, 50 + grow)
        chord("piano", voicing, s + 3 + swing, 0.4, 46 + grow)
        chord("pad", [root.replace("1", "2")] + voicing, s, 4, 45 + grow)
    # Paukenwirbel Crescendo in Takt 12
    for k in range(16):
        note("timp", "A1", bar(12) + k * 0.25, 0.25, 40 + k * 4)

    # ---------- ESKALATION: Takte 13-18 (36-54 s) ----------
    esc = [("D2", "D3", "F3", "A3"), ("D2", "D3", "F3", "A3"), ("Bb1", "Bb2", "D3", "F3"),
           ("C2", "C3", "E3", "G3"), ("C#2", "C#3", "F3", "Ab3"), ("A1", "A2", "C#3", "E3")]
    for i, b in enumerate(range(13, 19)):
        low, r, third, fifth = esc[i]
        s = bar(b)
        grow = i * 8
        # Streicher-Ostinato in Achteln
        for k in range(8):
            if b == 18 and 3 <= k <= 6:  # Stop-Time-Break unter "Katzeklo."
                continue
            p = [r, fifth, r, third][k % 4]
            note("strings", p, s + k * 0.5, 0.45, 70 + grow + (8 if k % 2 == 0 else 0))
            note("strings", n(p) + 12, s + k * 0.5, 0.45, 55 + grow)
        note("bass", low, s, 4, 90 + grow // 2)
        note("timp", low, s, 1, 85 + grow)
        note("timp", fifth.replace("3", "2"), s + 2, 1, 70 + grow)
        chord("horn", [third, fifth], s, 4, 55 + grow)
        if i >= 2:
            drum(36, s, 80 + grow)
            drum(36, s + 2, 75 + grow)
    # Cards: KLAVIER (37.5) / SAXOFON (39.0)
    pb = beat(37.5)
    for k, p in enumerate(["D4", "F4", "A4", "D5", "F5", "A5"]):
        note("piano", p, pb + k * 0.25, 0.3 if k < 5 else 1.0, 110)
        note("piano", n(p) - 12, pb + k * 0.25, 0.3 if k < 5 else 1.0, 100)
    chord("piano", ["D2", "A2", "D3", "F3"], beat(38.25), 1.0, 118)
    # SCHLAGZEUG (40.5) / GITARRE (42.0)
    sb = beat(39.0)
    for off, p, d in [(0, "D4", 0.25), (0.25, "F4", 0.25), (0.5, "A4", 0.25), (0.75, "C5", 0.5), (1.25, "Bb4", 0.75)]:
        note("sax", p, sb + off, d, 105)
    db = beat(40.5)
    for k, key in enumerate([50, 50, 48, 48, 47, 45, 43, 41]):
        drum(key, db + k * 0.25, 90 + k * 4)
    chord("guitar", ["D3", "A3", "D4"], beat(42.0), 1.8, 110)
    chord("brass", ["D3", "A3", "D4"], beat(42.0), 1.0, 90)
    for k in range(6):
        drum(38, beat(46.5) + k * 0.25, 70 + k * 6)
    chord("brass", ["C3", "G3", "C4"], beat(46.5), 1.5, 80)
    # "Und dann ..." (48.0) Streicher-Anstieg chromatisch bis 54.0
    for k in range(16):
        note("pad", n("A3") + k // 2, beat(48.0) + k * 0.5, 0.5, 60 + k * 3)
    # Snare-Anstieg nach dem Break
    for k in range(6):
        drum(38, beat(52.5) + k * 0.25, 80 + k * 8)

    # ---------- Takt 19: Tom-Wirbel 54.0-55.5, dann STILLE ----------
    toms = [50, 48, 47, 45, 43, 41]
    b0 = beat(54.0)
    for k in range(8):  # 16tel über 2 Beats
        drum(toms[k % len(toms)], b0 + k * 0.25, 110 + k * 2)
        note("strings", "A3", b0 + k * 0.25, 0.25, 105 + k * 3)
        note("strings", "A4", b0 + k * 0.25, 0.25, 100 + k * 3)
        if k >= 4:
            drum(49, b0 + k * 0.25, 70 + (k - 4) * 15)
    note("timp", "A1", b0, 2, 110)

    # ---------- SCHLUSS-HIT auf die Titelkarte (57.0) ----------
    h = beat(T.TITLE_HIT)
    chord("brass", ["D3", "A3", "D4", "F4", "A4"], h, 5, 127)
    chord("horn", ["D3", "F3", "A3"], h, 6, 127)
    chord("strings", ["D2", "D3", "A3", "D4", "F4", "D5"], h, 7, 127)
    chord("piano", ["D1", "D2", "A2"], h, 7, 127)
    note("bass", "D1", h, 7, 127)
    note("timp", "D2", h, 2, 127)
    note("timp", "D1", h, 2, 127)
    drum(49, h, 127)
    drum(57, h, 127)
    drum(36, h, 127)
    drum(36, h + 0.02, 127)

    # ---------- POINTE: 63-75 s ----------
    p0 = beat(63.0)
    for off, p, d, v in [(0, "A5", 1, 72), (1, "F5", 1, 68), (2, "D5", 2, 66), (4, "E5", 1, 64), (5, "C#5", 1.5, 60)]:
        note("piano", p, p0 + off, d, v)
    chord("piano", ["D3", "A3", "F4"], p0, 5, 50)
    # Stille um das "Nee.", dann schiefer Klavierton auf den Schnitt zur Endtafel
    chord("piano", ["D2", "D4", "Eb4"], beat(T.PLONK), 3.5, 95)


def write_midi(path):
    mid = mido.MidiFile(ticks_per_beat=TPB)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tr.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(T.BPM), time=0))
    for inst, ch in CH.items():
        if inst != "drums":
            tr.append(mido.Message("program_change", channel=ch, program=PROG[inst], time=0))
        tr.append(mido.Message("control_change", channel=ch, control=91, value=70, time=0))  # Hall
    evs = sorted(events, key=lambda e: (e[0], e[1]))
    last = 0
    for (b, typ, ch, p, v) in evs:
        tick = int(round(b * TPB))
        msg = "note_on" if typ else "note_off"
        tr.append(mido.Message(msg, channel=ch, note=p, velocity=v, time=tick - last))
        last = tick
    mid.save(path)


def render(midi_path, wav_path):
    raw = wav_path.replace(".wav", "_raw.wav")
    subprocess.run(["fluidsynth", "-ni", "-q", "-g", "0.5", "-r", str(SR), "-F", raw, SF2, midi_path], check=True)
    sr, x = wavfile.read(raw)
    x = x.astype(np.float32) / 32768.0
    total = int(T.DURATION * SR)
    x = x[:total] if len(x) >= total else np.pad(x, ((0, total - len(x)), (0, 0)))
    # harte Stille vor dem Höhepunkt (schneidet auch die Hallfahne)
    env = np.ones(total, np.float32)
    a, b = int(T.SILENCE[0] * SR), int(T.SILENCE[1] * SR)
    fade = int(0.02 * SR)
    env[a:b] = 0
    env[a:a + fade] = np.linspace(1, 0, fade)
    # Stille in der Pointe
    c, d = int(T.PUNCH_SILENCE[0] * SR), int(T.PUNCH_SILENCE[1] * SR)
    env[c:d] = np.minimum(env[c:d], np.concatenate([np.linspace(1, 0, int(0.6 * SR)), np.zeros(d - c - int(0.6 * SR))]))
    # Pegel-Automation (dB), damit leise Teile hörbar bleiben; Hit-Ausklang bis 63 s ausblenden
    pts = [(0, 8), (5.9, 8), (6.0, 2), (17.9, 2), (18.0, 4), (36.0, 4), (45.0, 5), (51.3, 5), (51.4, -8), (52.45, -8), (52.5, 5),
           (54.0, 6), (55.45, 7), (57.0, 0), (61.5, 0), (62.95, -60), (63.0, 12), (75, 12)]
    ts = np.arange(total) / SR
    env *= 10 ** (np.interp(ts, [p[0] for p in pts], [p[1] for p in pts]) / 20)
    # Ausklang
    e = int((T.DURATION - 1.0) * SR)
    env[e:] = np.linspace(1, 0, total - e)
    x *= env[:, None]
    x /= max(1e-6, np.abs(x).max()) / 0.89
    wavfile.write(wav_path, SR, (x * 32767).astype(np.int16))
    os.remove(raw)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    compose()
    write_midi(os.path.join(OUT, "score.mid"))
    render(os.path.join(OUT, "score.mid"), os.path.join(OUT, "music.wav"))
    print("ok music/score.mid music/music.wav")
