"""Erzeugt alle Sprechzeilen lokal mit espeak-ng + MBROLA (kostenlos, keine Stimmklone).
Tempo/Pausen per SSML, Tiefe/Raum per ffmpeg. Ausgabe: voice/<ID>.wav + voice/durations.json"""
import json
import os
import re
import subprocess

import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "voice")


def ssml(text, rate):
    body = re.sub(r"\[p:(\d+)\]", r'<break time="\1ms"/>', text)
    return f'<speak><prosody rate="{rate}%">{body}</prosody></speak>'


def dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def sample_rate(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate",
                        "-of", "csv=p=0", path], capture_output=True, text=True, check=True)
    return int(r.stdout.strip())


TARGET_DB = -19.0


def mean_volume(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", "-"],
                       capture_output=True, text=True)
    return float(re.search(r"mean_volume: (-?[\d.]+) dB", r.stderr).group(1))


def make(line):
    sp = T.SPEAKERS[line["who"]]
    raw = os.path.join(OUT, line["id"] + "_raw.wav")
    out = os.path.join(OUT, line["id"] + ".wav")
    subprocess.run(["espeak-ng", "-m", "-v", sp["voice"], "-s", str(sp["speed"]), "-p", str(sp["pitch"]),
                    "-w", raw, ssml(line["text"], 100)], check=True, capture_output=True)
    sr = sample_rate(raw)
    f = [f"asetrate={int(sr * sp['shift'])}", "aresample=48000", f"atempo={1 / sp['shift']:.4f}",
         "highpass=f=70", "lowpass=f=7500",
         # Stille am Anfang/Ende abschneiden
         "silenceremove=start_periods=1:start_threshold=-45dB",
         "areverse", "silenceremove=start_periods=1:start_threshold=-45dB", "areverse"]
    if line["who"] == "ERZÄHLER":
        f += ["equalizer=f=110:t=q:w=1:g=5", "equalizer=f=3000:t=q:w=1:g=2",
              "acompressor=threshold=-20dB:ratio=4:attack=5:release=120",
              "aecho=0.8:0.6:45|90:0.18|0.10"]
    else:
        f += ["equalizer=f=2500:t=q:w=1:g=2", "acompressor=threshold=-20dB:ratio=3:attack=5:release=100",
              "aecho=0.8:0.5:20:0.08"]
    f += ["apad=pad_dur=0.25", "aformat=channel_layouts=mono"]
    tmp = os.path.join(OUT, line["id"] + "_tmp.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", ",".join(f), "-ar", "48000", tmp], check=True)
    # Pegel angleichen: jede Zeile auf gleiche Lautheit (auch kurze Wörter wie "Nee.")
    gain = TARGET_DB - mean_volume(tmp)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af",
                    f"volume={gain:.2f}dB,alimiter=limit=0.7:level=false", "-ar", "48000", out], check=True)
    os.remove(raw)
    os.remove(tmp)
    return dur(out)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    durations = {}
    for line in T.VO:
        durations[line["id"]] = round(make(line), 3)
    json.dump(durations, open(os.path.join(OUT, "durations.json"), "w"), indent=1)
    vo = sorted(T.VO, key=lambda l: l["t"])
    shots = sorted(T.SHOTS, key=lambda s: s["start"])
    for i, l in enumerate(vo):
        end = l["t"] + durations[l["id"]] - 0.25  # ohne Padding
        nxt = vo[i + 1]["t"] if i + 1 < len(vo) else T.DURATION
        shot = max((s for s in shots if s["start"] <= l["t"]), key=lambda s: s["start"])
        warn = "  <-- UEBERLAPPT" if end > nxt else ""
        warn += "  <-- IN DIE STILLE" if l["t"] < T.SILENCE[1] and end > T.SILENCE[0] else ""
        print(f'{l["id"]} {l["who"]:<13} {l["t"]:5.2f}-{end:5.2f}s  Shot {shot["id"]} bis {shot["start"] + shot["dur"]:.2f}{warn}')
