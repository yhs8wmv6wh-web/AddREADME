# Kalorien

PWA zum Kalorien-Tracken beim Abnehmen. Läuft unter `…github.io/AddREADME/kalorien/`.
Alle Daten liegen lokal auf dem Gerät (IndexedDB), kein Server.

## Funktionen

- **Tagebuch**: Frühstück, Mittag, Abend, Snacks; Mengen immer in g/ml, eigene Portionen
  pro Lebensmittel (z. B. „Mein Weinglas" = 150 ml).
- **Barcode-Scanner** (Rückkamera, live) → Open Food Facts. Unbekannte Produkte:
  Nährwerttabelle fotografieren, Claude liest die Werte aus; danach beim nächsten Scan sofort da.
- **Suche** in der USDA FoodData Central (Foundation + SR Legacy, mit Mikronährstoffen).
  Deutsche Suchbegriffe werden per Claude ins Englische übersetzt.
- **Mikronährstoffe**: Eisen, Magnesium, Vitamin D, B12 (Ziele nach DGE, änderbar), dazu Ballaststoffe, Salz.
- **Rezept-PDF** (z. B. NYT Cooking): Claude liest Zutaten und Mengen, schätzt Nährwerte;
  Zutaten abwählbar, Mengen änderbar, Abgleich mit USDA-Messwerten. Portionen = Mitte der Angabe („4 to 6" → 5).
- **Training**: kcal von Hand (z. B. eGym) oder Fahrrad aus Dauer + Tempo (MET, netto).
- **Feste Aktivitäten**: z. B. Arbeitsweg Mo–Fr morgens + nachmittags; werden automatisch eingetragen,
  einzelne Einträge löschbar (bleiben gelöscht).
- **Ziel**: Grundumsatz nach Mifflin-St Jeor × Alltagsfaktor − Defizit (Tempo × 7.700 kcal / 7).
  Trainings-kcal kommen optional aufs Tagesbudget.
- **Fortschritt**: Gewicht, Körperfett, Verlauf, Prognose, 7-Tage-Schnitt.
- **Backup** als JSON (ohne API-Schlüssel).

## Schlüssel (in den Einstellungen, nur lokal gespeichert)

- Claude-API-Schlüssel (console.anthropic.com) – für PDF, Foto, Übersetzung.
- USDA-Schlüssel (kostenlos, api.data.gov/signup) – ohne nur DEMO_KEY mit sehr niedrigem Limit.

## Entwicklung

```bash
npm install
npm run dev
npm run build
```
