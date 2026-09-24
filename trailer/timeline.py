"""Single source of truth: Shots, Voiceover, Tempo. Alle Skripte lesen hier."""

VERSION = "v1"

BPM = 80
BEAT = 60 / BPM          # 0.75 s
BAR = 4 * BEAT           # 3.0 s
DURATION = 75.0
TITLE_HIT = 57.0         # Schluss-Hit auf die Titelkarte
SILENCE = (55.5, 57.0)   # Stille vor dem Höhepunkt

# kb = Ken Burns: (zoom_start, zoom_end, cx_start, cy_start, cx_end, cy_end)
#      cx/cy = 0..1 Position des Bildausschnitts
# card = Texttafel (siehe make_images.py CARDS)
# lower = Einblendung am unteren Rand (ffmpeg drawtext)
SHOTS = [
    # --- EINSTIEG ---
    dict(id="S01", act="Einstieg", start=0.0, dur=6.0, img="ruhr_dusk",
         kb=(1.00, 1.12, 0.5, 0.6, 0.5, 0.55), fade_in=1.5,
         lower="MÜLHEIM AN DER RUHR · 1955", mood="Solo-Klavier, Moll, leise"),
    dict(id="S02", act="Einstieg", start=6.0, dur=4.5, img="window_night",
         kb=(1.05, 1.18, 0.5, 0.5, 0.52, 0.45), mood="Klavier, erste Streicher-Fläche"),
    dict(id="S03", act="Einstieg", start=10.5, dur=4.5, img="piano_keys",
         kb=(1.15, 1.15, 0.2, 0.5, 0.8, 0.5), mood="Klavier-Motiv wiederholt"),
    dict(id="S04", act="Einstieg", start=15.0, dur=3.0, card="no_plan",
         mood="Klavier hält Akkord"),
    # --- KONFLIKT ---
    dict(id="S05", act="Konflikt", start=18.0, dur=4.5, img="stage_empty",
         kb=(1.00, 1.10, 0.5, 0.5, 0.5, 0.4), mood="Walking Bass setzt ein, Ride-Becken"),
    dict(id="S06", act="Konflikt", start=22.5, dur=4.5, img="mic_spot",
         kb=(1.10, 1.25, 0.5, 0.45, 0.5, 0.4), mood="Bass + Streicher"),
    dict(id="S07", act="Konflikt", start=27.0, dur=4.5, img="kitchen_night",
         kb=(1.05, 1.15, 0.45, 0.5, 0.55, 0.5), mood="Streicher dunkler"),
    dict(id="S08", act="Konflikt", start=31.5, dur=4.5, img="silhouette_piano",
         kb=(1.20, 1.00, 0.5, 0.45, 0.5, 0.5), mood="Übergang, Spannung steigt"),
    # --- ESKALATION ---
    dict(id="S09", act="Eskalation", start=36.0, dur=3.0, img="crowd",
         kb=(1.00, 1.08, 0.5, 0.5, 0.5, 0.5), mood="Streicher-Ostinato, Pauke"),
    dict(id="S10", act="Eskalation", start=39.0, dur=1.5, card="sax", mood="Ostinato + Tenorsax-Stoß"),
    dict(id="S11", act="Eskalation", start=40.5, dur=1.5, card="drums", mood="Ostinato + Toms"),
    dict(id="S12", act="Eskalation", start=42.0, dur=1.5, card="guitar", mood="Ostinato + Blech"),
    dict(id="S13", act="Eskalation", start=43.5, dur=3.0, img="crowd",
         kb=(1.15, 1.30, 0.5, 0.55, 0.5, 0.5), mood="Crescendo"),
    dict(id="S14", act="Eskalation", start=46.5, dur=1.5, img="stage_empty",
         kb=(1.30, 1.40, 0.5, 0.35, 0.5, 0.35), mood="Crescendo"),
    dict(id="S15", act="Eskalation", start=48.0, dur=3.0, card="and_then", mood="Streicher steigen chromatisch"),
    dict(id="S16", act="Eskalation", start=51.0, dur=3.0, img="cat",
         kb=(1.00, 1.15, 0.5, 0.5, 0.5, 0.45), mood="Höhepunkt der Steigerung"),
    dict(id="S17a", act="Eskalation", start=54.0, dur=0.375, img="piano_keys", kb=(1.3, 1.3, 0.5, 0.5, 0.5, 0.5), mood="Tom-Wirbel"),
    dict(id="S17b", act="Eskalation", start=54.375, dur=0.375, img="mic_spot", kb=(1.3, 1.3, 0.5, 0.4, 0.5, 0.4), mood="Tom-Wirbel"),
    dict(id="S17c", act="Eskalation", start=54.75, dur=0.375, img="crowd", kb=(1.3, 1.3, 0.5, 0.5, 0.5, 0.5), mood="Tom-Wirbel"),
    dict(id="S17d", act="Eskalation", start=55.125, dur=0.375, img="silhouette_piano", kb=(1.3, 1.3, 0.5, 0.45, 0.5, 0.45), mood="Tom-Wirbel"),
    dict(id="S18", act="Stille", start=55.5, dur=1.5, card="black", mood="STILLE"),
    # --- TITEL ---
    dict(id="S19", act="Titel", start=57.0, dur=6.0, card="title",
         kb=(1.00, 1.06, 0.5, 0.5, 0.5, 0.5), fade_out=0.75, mood="SCHLUSS-HIT: Blech, Pauke, Becken, ausklingend"),
    # --- POINTE ---
    dict(id="S20", act="Pointe", start=63.0, dur=7.5, img="interview",
         kb=(1.00, 1.20, 0.5, 0.5, 0.55, 0.5), fade_in=0.5, mood="Leises Klavier, bricht vor der Antwort ab"),
    dict(id="S21", act="Pointe", start=70.5, dur=4.5, card="end", fade_out=1.0,
         mood="Ein schiefer Klavierton, dann Ausklang"),
]

# Sprecher: espeak-ng + MBROLA (lokal, kostenlos). Keine Stimmimitation.
SPEAKERS = {
    "ERZÄHLER":      dict(voice="mb-de4", speed=118, pitch=22, shift=0.88, reverb=True),
    "HELGE":         dict(voice="mb-de6", speed=132, pitch=48, shift=1.00, reverb=False),
    "CLUBBESITZER":  dict(voice="mb-de2", speed=160, pitch=38, shift=0.97, reverb=False),
    "MUTTER":        dict(voice="mb-de7", speed=138, pitch=55, shift=1.00, reverb=False),
    "INTERVIEWERIN": dict(voice="mb-de5", speed=145, pitch=52, shift=1.00, reverb=False),
}

# t = Startzeit in Sekunden. [p:ms] = Pause.
VO = [
    dict(id="V01", t=1.2,  who="ERZÄHLER", text="Im Ruhrgebiet. [p:350] Wo die Männer unter Tage gingen [p:250]"),
    dict(id="V02", t=6.3,  who="ERZÄHLER", text="wollte ein Junge [p:200] nur eine Sache."),
    dict(id="V03", t=11.0, who="HELGE",    text="Musik. [p:500] Aber nicht die richtige."),
    dict(id="V04", t=18.3, who="CLUBBESITZER", text="Das ist kein Jazz. [p:300] Das ist [p:300] ich weiß nicht, was das ist."),
    dict(id="V05", t=23.2, who="HELGE",    text="Ich auch nicht. [p:250] Deswegen spiel ich's ja."),
    dict(id="V06", t=27.6, who="MUTTER",   text="Junge. [p:300] Lern doch was Anständiges."),
    dict(id="V07", t=32.0, who="ERZÄHLER", text="Aber Anstand [p:400] war nie sein Instrument."),
    dict(id="V08", t=36.3, who="ERZÄHLER", text="Er spielte Klavier."),
    dict(id="V09", t=39.1, who="ERZÄHLER", text="Saxofon."),
    dict(id="V10", t=40.6, who="ERZÄHLER", text="Schlagzeug."),
    dict(id="V11", t=42.1, who="ERZÄHLER", text="Gitarre."),
    dict(id="V12", t=43.8, who="ERZÄHLER", text="Er spielte [p:200] einfach alles."),
    dict(id="V13", t=48.2, who="ERZÄHLER", text="Und dann [p:350] schrieb er ein Lied"),
    dict(id="V14", t=51.2, who="ERZÄHLER", text="über ein Katzenklo."),
    dict(id="V15", t=63.6, who="INTERVIEWERIN", text="Herr Schneider. [p:300] Was wollen Sie uns mit Ihrer Musik sagen?"),
    dict(id="V16", t=69.2, who="HELGE",    text="Nee."),
]
