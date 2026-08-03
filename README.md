# Kulturliste

Eine kleine Progressive Web App (PWA), um Kultur-Aktivitäten zu sammeln – auf
dem Handy installierbar, alle Daten bleiben lokal auf dem Gerät. Bewusst
schlicht: Titel eintragen, Kategorie wählen, abhaken, löschen.

## So funktioniert es

- **Eintrag anlegen** – Titel eingeben, eine Kategorie antippen, speichern. Mehr
  braucht es nicht.
- **Automatisch einsortiert** – jeder Eintrag landet im Abschnitt seiner
  Kategorie.
- **Abhaken** – einen Eintrag antippen, sobald du ihn erledigt hast (Film
  gesehen, Buch gelesen, Konzert besucht …). Er wird dann **durchgestrichen**.
- **Löschen** – erst wenn ein Eintrag durchgestrichen ist, erscheint der
  „Löschen"-Button, mit dem du ihn entfernst.

## Kategorien

Kinofilm · DVD-Film · Mediathek-Film · Serie/Streaming · Buch · Konzert · Oper ·
Theater · Museum/Ausstellung · Podcast · Schallplatte (LP) · Spotify

Jede Kategorie hat ein eigenes Emoji und eine eigene Farbe. In der Liste sind die
Kategorien **aufklappbar** – antippen öffnet oder schließt den jeweiligen
Abschnitt.

## Speicherung

Alle Einträge liegen im **IndexedDB-Speicher** des Browsers, also lokal auf dem
Gerät. Kein Server, kein Login, kein manuelles Zwischenspeichern – die App merkt
sich alles automatisch, auch nach dem Schließen. **Hinweis:** Es gibt kein
Cloud-Backup; die Daten leben nur auf diesem Gerät.

## App auf dem iPhone installieren

1. `npm run build` und die `dist/`-Dateien hosten (z. B. auf einem beliebigen
   Static-Hosting-Dienst) oder `npm run preview` im gleichen WLAN öffnen.
2. Seite in **Safari** öffnen (nicht in einem In-App-Browser).
3. Über **Teilen → „Zum Home-Bildschirm"** hinzufügen. Die App startet dann als
   eigenständige App und funktioniert offline.

Damit iOS den lokalen Speicher bei sehr langer Nichtnutzung nicht räumt, hilft
es, die App auf dem Home-Bildschirm installiert zu haben und sie gelegentlich zu
öffnen.

## Entwicklung

```bash
npm install
npm run dev       # Dev-Server
npm run build     # Produktions-Build (dist/)
npm run preview   # Build lokal testen
npm run lint      # oxlint
```

## Tech-Stack

- React + TypeScript + Vite
- Tailwind CSS
- IndexedDB (via `idb`) für lokale Datenhaltung
- `vite-plugin-pwa` für Installierbarkeit/Offline-Support
