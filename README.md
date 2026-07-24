# Bücherregal

Eine kleine Progressive Web App (PWA), um gelesene Bücher zu tracken – auf dem
Handy installierbar, alle Daten bleiben lokal auf dem Gerät. Bewusst
zurückhaltend gestaltet: neutrale Farben, Serifen-Überschriften, keine
Ablenkung vom Inhalt.

## Funktionen

- **Bücher erfassen** – manuell (Titel, Autor:in, Seiten, Sprache, Genre,
  Status, Bewertung, Notizen, Tags) oder per **Screenshot-Import**: Screenshot
  aus dem Libby-Verlauf hochladen (oder direkt **aus der Zwischenablage
  einfügen** – Screenshot machen, kopieren, in der App einfügen, ohne ihn in
  der Fotomediathek behalten zu müssen), Titel/Autor:in werden per
  Texterkennung (OCR) automatisch vorausgefüllt und können vor dem Speichern
  korrigiert werden.
- **Begonnen/Beendet** – Monat/Jahr genügt (bei "Beendet" auch Pflicht), der
  genaue Tag ist ein optionales Extra-Feld, falls bekannt.
- **Tags** – frei vergebbare Tags (z. B. "Buchklub"), über die sich das Regal
  filtern lässt – praktisch, um z. B. alle Bücher des eigenen Buchklubs
  auf einen Blick zu sehen.
- **Digitales Bücherregal** – Übersicht aller Bücher mit Suche und Filter
  (Gelesen / Am Lesen / Wunschliste / Tags), ideal zum Durchstöbern für
  Empfehlungen oder Geschenkideen.
- **Statistik-Seite** – Bücher/Seiten pro Jahr oder Monat, Aufschlüsselung
  nach Sprache (Deutsch/Englisch/Andere), Top-Genres sowie Rekorde
  (schnellstes Buch, seitenstärkster Monat). Nach Jahr filterbar.
- **Seitenzahl & Cover automatisch suchen** – Button neben dem Seiten-Feld
  fragt Google Books (mit Open-Library-Fallback) ab und schlägt Treffer inkl.
  Cover-Vorschau vor (gedruckte Ausgaben zuerst, E-Books ganz unten markiert)
  – Titel/Autor:in eintragen, Treffer anklicken, fertig. Das Cover erscheint
  danach auf der Buchkarte im Regal für den direkten visuellen Überblick.
- **Läuft offline** – als PWA installierbar (Homescreen), Buchdaten liegen im
  IndexedDB-Speicher des Browsers. Kein Server, kein Login.

## Screenshot ohne Fotomediathek

1. Screenshot wie gewohnt machen (Seitentaste + Lauter, o. Ä.).
2. Auf die Vorschau unten links tippen, dann "..." → "Kopieren".
3. Direkt danach den Papierkorb antippen, um den Screenshot wieder zu löschen
   – er bleibt trotzdem in der Zwischenablage.
4. In der App: "Aus Libby-Screenshot" → "Aus Zwischenablage einfügen".

## OCR-Import: Hinweis

Die Texterkennung (Tesseract.js) lädt das Sprachmodell beim ersten Einsatz
von einem CDN nach – dafür ist beim ersten Scan einmalig eine
Internetverbindung nötig. Erkannte Felder sind ein **Vorschlag**, der vor
dem Speichern geprüft und bei Bedarf korrigiert werden sollte, da OCR aus
Fotos/Screenshots nie 100% zuverlässig ist.

## Seitenzahl-Suche: Hinweis

Ein direkter Zugriff auf Shop-Seiten wie Dussmann.de ist aus dem Browser
heraus technisch nicht möglich (CORS-Sperre) – stattdessen nutzt die App die
öffentliche, kostenlose **Google Books API**, die genau dafür gemacht ist und
ohne eigenen Server auskommt. Bei mehreren Treffern werden gedruckte
Ausgaben (Hardcover/Taschenbuch) vor E-Book-Einträgen angezeigt, da nur
deren Seitenzahl zu einem physischen Buch passt.

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

Die App wird per GitHub Actions automatisch auf **GitHub Pages** gebaut und
veröffentlicht (`.github/workflows/deploy-pages.yml`), sobald `main` oder
dieser Branch aktualisiert wird. Einmalig muss dafür in den
Repo-Einstellungen unter **Settings → Pages** als Quelle **"GitHub Actions"**
ausgewählt werden – danach ist die App unter
`https://<github-benutzername>.github.io/AddREADME/` erreichbar.

1. Diese Adresse im Handy-Browser öffnen.
2. **iOS (Safari):** Teilen-Symbol → "Zum Home-Bildschirm".
   **Android (Chrome):** Menü (⋮) → "App installieren" bzw. das
   Installations-Banner antippen.
3. Fertig – die App liegt jetzt als Icon auf dem Homescreen und startet ohne
   Browser-Leiste.

Alternativ lokal testen (ohne Veröffentlichung): `npm run build && npm run
preview -- --host`, dann die angezeigte Netzwerk-Adresse im selben WLAN vom
Handy aus öffnen.

## Updates auf dem Handy

Die App zeigt ein Banner ("Neue Version verfügbar") mit einem
"Aktualisieren"-Button, sobald eine neue Version bereitsteht – kein manuelles
Neu-Hinzufügen zum Homescreen nötig. Die Buchdaten liegen im Browser-Speicher
der Web-Adresse, nicht im Homescreen-Icon selbst, und bleiben davon
unberührt.
