"""Schneidet den Trailer mit ffmpeg: Ken Burns (zoompan), Texttafeln, Beat-Schnitte,
Letterbox/Grain/Vignette, Audio-Ducking (sidechaincompress), Loudness-Normalisierung.
Aufruf: python3 render.py  -> versions/<VERSION>/trailer_<VERSION>.mp4"""
import json
import math
import os
import shutil
import subprocess

import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "assets", "images")
BUILD = os.path.join(HERE, "build")
FPS = 25
BEBAS = os.path.join(HERE, "assets", "fonts", "BebasNeue-Regular.ttf")


def fr(t):
    return int(math.floor(t * FPS + 0.5))


def run(cmd):
    subprocess.run(cmd, check=True)


def clip(shot, path):
    n = fr(shot["start"] + shot["dur"]) - fr(shot["start"])
    src = os.path.join(IMG, ("card_" + shot["card"]) if "card" in shot else shot["img"]) + ".png"
    z0, z1, cx0, cy0, cx1, cy1 = shot.get("kb", (1, 1, 0.5, 0.5, 0.5, 0.5))
    p = f"(on/{max(1, n - 1)})"
    zp = (f"zoompan=z='{z0}+({z1 - z0})*{p}'"
          f":x='(iw-iw/zoom)*({cx0}+({cx1 - cx0})*{p})'"
          f":y='(ih-ih/zoom)*({cy0}+({cy1 - cy0})*{p})'"
          f":d={n}:s=1920x1080:fps={FPS}")
    vf = [zp]
    if shot.get("lower"):
        # Texteinblendung: 1,0 s bis Shot-Ende, weich ein-/ausgeblendet
        t_in, t_out = 1.0, shot["dur"] - 0.6
        alpha = f"if(lt(t,{t_in}),0,if(lt(t,{t_in + 0.8}),(t-{t_in})/0.8,if(lt(t,{t_out}),1,max(0,({t_out + 0.5}-t)/0.5))))"
        vf.append(f"drawtext=fontfile={BEBAS}:text='{shot['lower']}':fontsize=54:fontcolor=0xE8E0D0"
                  f":x=(w-text_w)/2:y=h-138-110:alpha='{alpha}'")
    if shot.get("fade_in"):
        vf.append(f"fade=t=in:st=0:d={shot['fade_in']}")
    if shot.get("fade_out"):
        vf.append(f"fade=t=out:st={n / FPS - shot['fade_out']}:d={shot['fade_out']}")
    vf.append("format=yuv420p")
    run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", src, "-vf", ",".join(vf),
         "-frames:v", str(n), "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-r", str(FPS), path])
    return n


def video(out):
    os.makedirs(os.path.join(BUILD, "clips"), exist_ok=True)
    lst = os.path.join(BUILD, "clips.txt")
    total = 0
    with open(lst, "w") as f:
        for s in sorted(T.SHOTS, key=lambda s: s["start"]):
            p = os.path.join(BUILD, "clips", s["id"] + ".mp4")
            total += clip(s, p) if not os.environ.get("REUSE_CLIPS") else fr(s["start"] + s["dur"]) - fr(s["start"])
            f.write(f"file '{p}'\n")
    assert total == fr(T.DURATION), (total, fr(T.DURATION))
    raw = os.path.join(BUILD, "video_raw.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", raw])
    # Look: Letterbox 2.39:1, Vignette, Filmkorn
    look = ("vignette=angle=PI/5,noise=alls=5:allf=t,"
            "drawbox=x=0:y=0:w=iw:h=138:color=black:t=fill,"
            "drawbox=x=0:y=ih-138:w=iw:h=138:color=black:t=fill,format=yuv420p")
    run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-vf", look, "-c:v", "libx264", "-preset", "medium",
         "-crf", "20", "-maxrate", "8M", "-bufsize", "16M", "-r", str(FPS), out])


def audio(out):
    inputs = ["-i", os.path.join(HERE, "music", "music.wav")]
    parts = []
    for i, l in enumerate(T.VO, start=1):
        inputs += ["-i", os.path.join(HERE, "voice", l["id"] + ".wav")]
        ms = int(l["t"] * 1000)
        parts.append(f"[{i}:a]adelay={ms}|{ms},aformat=channel_layouts=stereo[v{i}]")
    n = len(T.VO)
    fc = ";".join(parts)
    fc += ";" + "".join(f"[v{i}]" for i in range(1, n + 1)) + f"amix=inputs={n}:normalize=0,apad=whole_dur={T.DURATION},volume=0.75[vo]"
    fc += ";[vo]asplit=2[vo_mix][vo_sc]"
    # Ducking: Musik wird unter dem Voiceover abgesenkt
    fc += ";[0:a]volume=0.8[mus];[mus][vo_sc]sidechaincompress=threshold=0.02:ratio=6:attack=15:release=350:makeup=1[duck]"
    fc += f";[duck][vo_mix]amix=inputs=2:normalize=0,atrim=0:{T.DURATION}[out]"
    mix = out.replace(".wav", "_mix.wav")
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[out]", "-ar", "48000", mix])
    # Loudness 2-Pass, linear (erhält die Dynamik: Hit bleibt lauter als Dialog)
    ln = "loudnorm=I=-16:TP=-1.0:LRA=20"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", mix, "-af", ln + ":print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, check=True)
    m = json.loads(r.stderr[r.stderr.rindex("{"):])
    ln2 = (f"{ln}:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
           f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}")
    run(["ffmpeg", "-v", "error", "-y", "-i", mix, "-af", ln2, "-ar", "48000", out])


def docs(folder):
    """Shotlist und Skript aus der Timeline erzeugen."""
    dur = json.load(open(os.path.join(HERE, "voice", "durations.json")))
    vo_by_shot = {}
    shots = sorted(T.SHOTS, key=lambda s: s["start"])
    for l in T.VO:
        shot = max((s for s in shots if s["start"] <= l["t"] + 1e-6), key=lambda s: s["start"])
        vo_by_shot.setdefault(shot["id"], []).append(l)
    clean = lambda t: t.replace("[p:", "(Pause ").replace("]", " ms)")
    rows = ["| Shot | Akt | Zeit (s) | Dauer | Bild | Voiceover / Dialog | Musikstimmung |", "|---|---|---|---|---|---|---|"]
    for s in shots:
        bild = ("Tafel: " + s["card"]) if "card" in s else s["img"]
        if s.get("kb") and "img" in s:
            z0, z1 = s["kb"][:2]
            bild += f" (Ken Burns {z0:.2f}→{z1:.2f})"
        if s.get("lower"):
            bild += f"; Einblendung „{s['lower']}“"
        vo = "<br>".join(f"**{l['who']}** ({l['t']:.2f}s): {clean(l['text'])}" for l in vo_by_shot.get(s["id"], [])) or "–"
        rows.append(f"| {s['id']} | {s['act']} | {s['start']:.2f}–{s['start'] + s['dur']:.2f} | {s['dur']:.2f} | {bild} | {vo} | {s['mood']} |")
    head = (f"# Shotlist – HELGE ({T.VERSION})\n\nTempo {T.BPM} BPM, Beat {T.BEAT:.2f} s, Takt {T.BAR:.1f} s. "
            f"Alle Schnitte auf dem Beat-Raster. Stille {T.SILENCE[0]}–{T.SILENCE[1]} s, Schluss-Hit bei {T.TITLE_HIT} s.\n\n")
    open(os.path.join(folder, "shotlist.md"), "w").write(head + "\n".join(rows) + "\n")
    lines = [f"# Skript – HELGE ({T.VERSION})\n", "Fan-Trailer, fiktive Szenen. Stimmen: espeak-ng + MBROLA (synthetisch, keine Stimmklone).\n",
             "| Sprecher | Stimme |", "|---|---|"]
    lines += [f"| {k} | {v['voice']}, Tempo {v['speed']}, Tonhöhe {v['pitch']}, Pitch-Shift {v['shift']} |" for k, v in T.SPEAKERS.items()]
    lines.append("")
    act = None
    for l in sorted(T.VO, key=lambda l: l["t"]):
        shot = max((s for s in shots if s["start"] <= l["t"] + 1e-6), key=lambda s: s["start"])
        if shot["act"] != act:
            act = shot["act"]
            lines.append(f"\n## {act}\n")
        lines.append(f"**{l['who']}** `{l['t']:.2f}–{l['t'] + dur[l['id']] - 0.25:.2f}s`  \n{clean(l['text'])}\n")
    lines.append("\n## Texttafeln\n")
    lines += [f"- {s['start']:.2f}s: {s['card']}" for s in shots if "card" in s]
    open(os.path.join(folder, "skript.md"), "w").write("\n".join(lines) + "\n")


if __name__ == "__main__":
    folder = os.path.join(HERE, "versions", T.VERSION)
    os.makedirs(folder, exist_ok=True)
    v = os.path.join(BUILD, "video.mp4")
    a = os.path.join(BUILD, "audio.wav")
    video(v)
    audio(a)
    out = os.path.join(folder, f"trailer_{T.VERSION}.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-i", v, "-i", a, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
         "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-shortest", out])
    shutil.copy(os.path.join(HERE, "timeline.py"), os.path.join(folder, "timeline.py"))
    shutil.copy(os.path.join(HERE, "music", "score.mid"), os.path.join(folder, "score.mid"))
    docs(folder)
    print("ok", out)
