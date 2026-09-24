"""Material für die Review-Agenten: Standbilder pro Shot, Kontaktbogen, Pegelkurve, Wellenform.
Ausgabe: build/review/<VERSION>/"""
import os
import subprocess

import numpy as np

import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    out = os.path.join(HERE, "build", "review", T.VERSION)
    os.makedirs(out, exist_ok=True)
    mp4 = os.path.join(HERE, "versions", T.VERSION, f"trailer_{T.VERSION}.mp4")
    for s in T.SHOTS:
        t = s["start"] + s["dur"] * 0.6
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", mp4, "-frames:v", "1",
                        "-vf", "scale=640:-1", os.path.join(out, f"{s['id']}.jpg")], check=True)
    # Kontaktbogen: ein Bild pro Beat (0,75 s)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-vf",
                    f"fps=1/{T.BEAT},scale=320:-1,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
                    ":text='%{pts\\:hms}':fontsize=18:fontcolor=yellow:x=5:y=5,tile=10x10",
                    "-frames:v", "1", os.path.join(out, "contact_beats.jpg")], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-filter_complex",
                    "showwavespic=s=1800x300:split_channels=0:colors=white", "-frames:v", "1",
                    os.path.join(out, "waveform.png")], check=True)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-f", "f32le", "-ac", "1", "-ar", "8000", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    lines = ["Zeit(s)  RMS(dBFS)  (Gesamtmix, 0,25-s-Fenster)"]
    step = 2000
    for i in range(0, len(x), step):
        seg = x[i:i + step]
        db = 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)
        lines.append(f"{i / 8000:6.2f}  {db:6.1f}  " + "#" * max(0, int((db + 60) / 2)))
    open(os.path.join(out, "levels.txt"), "w").write("\n".join(lines) + "\n")
    print("ok", out)


if __name__ == "__main__":
    main()
