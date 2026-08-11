# Fremdwörter

Eine kleine Progressive Web App (PWA), um **Fremdwörter nachzuschlagen und zu
sammeln** – auf dem iPhone installierbar, alle Wörter bleiben lokal auf dem Gerät.

## So funktioniert es

- **Wort eingeben** – ein Fremd- oder Fachwort eintippen und auf „Erklären" tippen.
- **KI erklärt es** – Claude liefert eine **kurze, bündige** Erklärung auf Deutsch.
  Ist es **kein** deutsches Wort, kommt zusätzlich die **Etymologie** (Herkunft) dazu.
- **Automatisch gespeichert** – jedes nachgeschlagene Wort landet in der Liste.
- **Alphabetisch nachschlagen** – die Liste ist alphabetisch sortiert und über ein
  Suchfeld durchsuchbar. Wort antippen klappt die Erklärung auf.

## KI-Schlüssel (einmalig)

Die Erklärungen kommen von **Claude (Anthropic)**. Da die App ohne eigenen Server
direkt auf dem Gerät läuft, brauchst du einen **eigenen API-Schlüssel**:

1. Unter [console.anthropic.com](https://console.anthropic.com) im Bereich **API Keys**
   einen Schlüssel erstellen (`sk-ant-…`).
2. In der App unter **Einstellungen** eintragen. Der Schlüssel wird **nur lokal auf
   diesem Gerät** gespeichert und steht nirgends im Code.

Verwendet wird das günstige, schnelle Modell **Claude Haiku** – pro Wort fallen nur
Bruchteile eines Cents an.

## Speicherung

Alle Wörter liegen im **IndexedDB-Speicher** des Browsers, also lokal auf dem Gerät.
Kein Server, kein Login. Über **Sichern/Wiederherstellen** lässt sich die Sammlung als
JSON-Datei exportieren und importieren. **Hinweis:** Es gibt kein Cloud-Backup; die
Daten leben nur auf diesem Gerät.

## App auf dem iPhone installieren

1. Die veröffentlichte Adresse `…github.io/AddREADME/fremdwoerter/` in **Safari** öffnen.
2. Über **Teilen → „Zum Home-Bildschirm"** hinzufügen. Die App startet dann als
   eigenständige App; die Wortliste funktioniert auch offline (nur der KI-Aufruf für
   neue Wörter braucht Internet).

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
- Anthropic Claude API (`claude-haiku-4-5`), direkt aus dem Browser mit eigenem Schlüssel
