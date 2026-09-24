# HELGE – Fan-Trailer (Biopic, 75 s)

Fan-Projekt. Szenen und Dialoge sind fiktiv und nicht autorisiert. Alle Bilder, die Musik und die Stimmen sind synthetisch erzeugt: keine Fotos, keine Originalmusik, keine Stimmklone.

## Ergebnis
- `final/trailer_final.mp4`: 1080p, 25 fps, kompakte Kopie (~2,8 Mbit/s)
- `final/skript.md`, `final/shotlist.md`
- `CHANGELOG.md`: Änderungen pro Review-Runde (v1 bis v4)
- `versions/vN/`: Timeline, Partitur (MIDI), Skript und Shotlist jeder Version. Die Master-MP4s (~8 Mbit/s) sind nicht im Repo, sie lassen sich neu rendern.

## Pipeline (alles lokal, kostenlos)
| Schritt | Skript | Werkzeug |
|---|---|---|
| Timeline (Shots, VO, Tempo) | `timeline.py` | – |
| Bilder und Texttafeln | `make_images.py` | Pillow, prozedural, 4K |
| Musik | `make_music.py` | mido + fluidsynth + FluidR3_GM |
| Stimmen | `make_voice.py` | espeak-ng + MBROLA (de2/de5/de6/de7/de4) |
| Schnitt | `render.py` | ffmpeg: zoompan, drawtext, sidechaincompress, loudnorm |
| Review-Material | `review_kit.py` | ffmpeg, numpy |

```
apt-get install ffmpeg fluidsynth fluid-soundfont-gm espeak-ng mbrola mbrola-de2 mbrola-de4 mbrola-de5 mbrola-de6 mbrola-de7
pip install numpy scipy pillow mido
python3 make_images.py && python3 make_music.py && python3 make_voice.py && python3 render.py
```

Schriften: Bebas Neue, Playfair Display (SIL Open Font License, `assets/fonts/`).
