# Bücherregal

Eine kleine Progressive Web App (PWA), um gelesene Bücher zu tracken – auf dem
Handy installierbar, alle Daten bleiben lokal auf dem Gerät. Bewusst
zurückhaltend gestaltet: neutrale Farben, Serifen-Überschriften, keine
Ablenkung vom Inhalt.

## Funktionen

- **Bücher erfassen** – manuell (Titel, Autor:in, Seiten, Sprache, Genre,
  Status, Bewertung, Notizen, Tags) oder per **Screenshot-Import**: Screenshot
  aus dem Libby-Verlauf hochladen, Titel/Autor:in werden per Texterkennung
  (OCR) automatisch vorausgefüllt und können vor dem Speichern korrigiert
  werden.
- **Begonnen/Beendet** – optionales Startdatum, verpflichtendes Enddatum
  (mindestens Monat/Jahr) für als "Gelesen" markierte Bücher.
- **Tags** – frei vergebbare Tags (z. B. "Buchklub"), über die sich das Regal
  filtern lässt – praktisch, um z. B. alle Bücher des eigenen Buchklubs
  auf einen Blick zu sehen.
- **Digitales Bücherregal** – Übersicht aller Bücher mit Suche und Filter
  (Gelesen / Am Lesen / Wunschliste / Tags), ideal zum Durchstöbern für
  Empfehlungen oder Geschenkideen.
- **Statistik-Seite** – Bücher/Seiten pro Jahr oder Monat, Aufschlüsselung
  nach Sprache (Deutsch/Englisch/Andere) und Top-Genres. Nach Jahr filterbar.
- **Läuft offline** – als PWA installierbar (Homescreen), Buchdaten liegen im
  IndexedDB-Speicher des Browsers. Kein Server, kein Login.

## OCR-Import: Hinweis

Die Texterkennung (Tesseract.js) lädt das Sprachmodell beim ersten Einsatz
von einem CDN nach – dafür ist beim ersten Scan einmalig eine
Internetverbindung nötig. Erkannte Felder sind ein **Vorschlag**, der vor
dem Speichern geprüft und bei Bedarf korrigiert werden sollte, da OCR aus
Fotos/Screenshots nie 100% zuverlässig ist.

## Entwicklung

```bash
npm install
npm run dev       # Dev-Server
npm run build     # Produktions-Build (dist/)
npm run preview   # Build lokal testen
npm run lint       # oxlint
```

## Tech-Stack

- React + TypeScript + Vite
- Tailwind CSS
- IndexedDB (via `idb`) für lokale Datenhaltung
- Tesseract.js für OCR
- `vite-plugin-pwa` für Installierbarkeit/Offline-Support

## App auf dem Handy installieren

1. `npm run build` und die `dist/`-Dateien hosten (z. B. auf einem beliebigen
   Static-Hosting-Dienst) oder `npm run preview` im gleichen WLAN öffnen.
2. Seite im Handy-Browser öffnen.
3. "Zum Home-Bildschirm hinzufügen" (iOS Safari) bzw. das Installations-Banner
   (Android Chrome) nutzen.
