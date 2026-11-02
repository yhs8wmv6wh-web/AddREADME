# Gitarre üben

PWA zum Gitarrelernen mit eigenen Lieblingssongs. Läuft offline, alle Daten bleiben lokal (IndexedDB).
Online: https://yhs8wmv6wh-web.github.io/AddREADME/gitarre/

## Funktionen

- **Songs**: Akkorde/Tabs aus Ultimate Guitar, Songsterr, Songbüchern etc. einfügen. Erkannt werden
  „Akkorde über Text", ChordPro (`[Am]Text`, `{title: …}`), Tab-Zeilen (`e|---0---|`), Abschnitte (`[Chorus]`)
  und Kapo-Angaben (`Capo 2`).
  - Transponieren, Kapo umrechnen, **Kapo-Tipp** (Bund mit den einfachsten Griffen)
  - Griffbilder aller Akkorde des Songs, Akkord antippen = Griff + Klang
  - Häufigste Akkordwechsel des Songs, direkt üben
  - Auto-Scroll, Schriftgröße, Bildschirm bleibt an
- **Üben**
  - Metronom-Trainer: Akkordfolge mit Einzählen, aktueller + nächster Griff, optional Akkord mitspielen,
    optional automatisch schneller
  - 1-Minuten-Wechsel: zwei Akkorde, 60 s, Wechsel zählen, Rekorde und Verlauf
  - Fortschritt: Minuten heute, Tage in Folge
- **Akkorde**: Lernpfad in 5 Stufen mit „kann ich"-Markierung (Songliste zeigt dann „spielbar"),
  Bibliothek für alle Grundtöne und 16 Akkordarten, Suche
- **Stimmen**: Stimmgerät übers Mikrofon + Referenztöne
- **Mehr**: deutsche Notation (H/B), Backup/Wiederherstellen

Beispielsongs sind nur gemeinfreie Traditionals und eigene Übungen.

## Entwicklung

```bash
npm install
npm run dev
npm run build
npm run lint
```
