# Jobradar

Sucht jeden Werktag passende Stellen (Verlag, Literatur, Theater, Kultur, Stiftungen, Kultur-PR in Berlin), zeigt sie sortiert nach Passungswert und lernt aus deinen Bewertungen. Jede gelernte Änderung ist auf der Seite mit ihrer Herkunft sichtbar.

## Öffnen

**https://claude.ai/artifact/BArxuiJicG9uCrdiCvUs7u**, im Browser oder in der Claude-App, angemeldet mit deinem Claude-Konto. Die Seite ist privat, nur du siehst sie. Tipp für das iPhone: in Safari öffnen, dann „Teilen → Zum Home-Bildschirm“.

## Wie es aufgebaut ist

Du hast keinen eigenen Rechner im Spiel, deshalb läuft alles in der Cloud:

| Teil | Wo | Aufgabe |
|---|---|---|
| Seite | claude.ai (privates Artifact mit Datenbank) | Treffer, Bewertung, Regeln, Profil, Protokoll |
| Datenbank | an der Seite | Stellen, Bewertungen, Regeln, Profil, Läufe, Protokoll |
| Morgenlauf | Claude-Code-Routine „Jobradar Morgenlauf“ | liest Feedback, schreibt Profil fort, sucht, prüft Links, markiert Abgelaufenes |
| Code | dieser Ordner im Repo | `engine.js` (Lernen und Bewertung, von Seite und Lauf gemeinsam genutzt), `radar.mjs` (Werkzeug für den Lauf), `LAUF.md` (Ablauf des Laufs) |

## Bewerten

„Bewerten“ an einer Stelle antippen:
1. **Note 1–5** (5 = genau das, 1 = völlig daneben).
2. **Gründe** anklicken, mehrere möglich. „Neuer Grund …“ legt einen eigenen an (Name, positiv/negativ, auf welche Merkmalsgruppe er wirkt).
3. **Freitext**. Das versteht die Seite sofort:
   - „kein X“, „keine X“, „nie wieder X“ → harte Regel „nie zeigen“ und negatives Signal für X
   - „X immer zeigen“ → harte Regel „immer zeigen“ (Stelle steht oben)
   - „mehr X“ / „weniger X“ / „X interessiert mich nicht“ → Gewicht für X steigt/sinkt
   Alles andere liest Claude beim Morgenlauf und schreibt es ins Profil.

Nach dem Speichern wird die Liste sofort neu sortiert, und das Änderungsprotokoll zeigt, welche Gewichte sich wie verändert haben. Eine Bewertung kannst du ändern oder entfernen; das Lernen wird dann aus allen verbleibenden Bewertungen neu berechnet.

Status (neu, interessant, beworben, Gespräch, abgesagt, abgelehnt, abgelaufen) setzt du unten an jeder Stelle. Er beeinflusst das Lernen nicht, nur die Note tut das.

## Was das Radar gelernt hat

Reiter „Was das Radar gelernt hat“:
- Merkmale, die deine Bewertungen verschoben haben, mit Startwert, gelerntem Anteil und aktuellem Wert
- die 10 stärksten positiven und negativen Merkmale
- harte Regeln (mit Herkunft, löschbar; von Hand anlegbar)
- das Präferenzprofil (`profil.md`), bearbeitbar

Reiter „Änderungsprotokoll“: jede Bewertung und jeder Lauf mit den Änderungen und der Bewertung, aus der sie kommen. Warnungen oben auf der Seite, wenn ein Lauf Feedback nicht verarbeitet hat, ein Lauf ausgeblieben ist oder Quellen nicht erreichbar waren.

## Profil bearbeiten

Im Reiter „Was das Radar gelernt hat“ → „Profil bearbeiten“. Deine Fassung hat Vorrang: Der nächste Lauf nimmt sie als Grundlage und ergänzt nur. Ein gespiegelter Stand liegt nach jedem Lauf in `daten/profil.md` (Branch `claude/jobradar`), dort nur zum Lesen, Änderungen bitte auf der Seite.

## Zeitplan

- Routine „Jobradar Morgenlauf“, Montag bis Freitag **6:50 Uhr Berliner Zeit**, damit die Ergebnisse gegen 7 Uhr da sind. Jeder Lauf startet eine frische Cloud-Sitzung, die `LAUF.md` abarbeitet (etwa 10–20 Minuten).
- **Ist dein Handy aus, passiert nichts Schlimmes**: Der Lauf läuft in der Cloud, nicht auf deinem Gerät.
- **Fällt ein Lauf aus** (Störung), verarbeitet der nächste Lauf alle Bewertungen seitdem mit, denn er nimmt jede Bewertung ohne Vermerk „verarbeitet“. Die Seite warnt, wenn ein Werktagslauf fehlt. Mit „Suchlauf jetzt starten“ oben auf der Seite holst du ihn sofort nach.
- Uhrzeit ändern: in claude.ai unter Code → Routines die Routine „Jobradar Morgenlauf“ öffnen, oder Claude bitten („verschiebe den Jobradar-Lauf auf 6 Uhr“).
- Protokoll: Reiter „Änderungsprotokoll“ (Läufe) und `daten/lauf-log.md`.

## Die Formel

**Merkmale.** Jede Stelle wird in Merkmale zerlegt: Bereich (z. B. Verlag), Stellentyp (Lektorat), Arbeitgeber, Arbeitgebertyp, Stichwörter aus Titel und Beschreibung (z. B. „dramaturg…“), Ort (Berlin / anderer Ort), Arbeitsweise (remote/hybrid/Präsenz), Anstellung, Umfang, Befristung, Gehalt (über / um / unter 4.000 € / unklar), Sprache, Stufe (Einstieg … Leitung), fachfremde Anforderungen.

**Passungswert.** Jedes Merkmal hat ein Gewicht `w`. Summe = −0,8 + Summe der Gewichte aller Merkmale der Stelle. Passungswert = 100 / (1 + e^(−Summe/2)), also 0 bis 100. Die Begründung an jeder Stelle listet die stärksten Gewichte („+ Verlag“, „− befristet“).

**Startgewichte** stammen aus deinem Profil, z. B. Verlag +1,2, Theater/Bühne +1,0, Nachrichtenjournalismus −0,3, SEO −1,5, befristet −0,5, Teilzeit −0,3, Gehalt unter 4.000 € −1,2, nicht Berlin und nicht remote −4,0.

**Lernen.** Aus jeder Bewertung entsteht pro Merkmal ein Signal:
- Note: `t = (Note − 3) / 2`, also −1 (Note 1) bis +1 (Note 5).
- Merkmale, auf die ein angeklickter Grund zielt, bekommen die volle Note, alle anderen nur 30 % davon. Beispiel: „Gehalt zu niedrig“ trifft das Gehaltsmerkmal, nicht das Thema.
- Jeder angeklickte Grund addiert ±0,75 auf seine Merkmalsgruppen.
- Im Freitext genannte Begriffe („kein Kinderbuch“, „mehr Dramaturgie“) bekommen ±1,0. Nennt der Freitext einen Begriff, wirken die Themen-Gründe auf die übrigen Themenmerkmale (Bereich, Typ, andere Stichwörter) nur zu 25 %. So trifft „Kinderbuch: Thema passt nicht“ das Kinderbuch und nicht das Lektorat allgemein.

Das gelernte Gewicht ist ein geglätteter Mittelwert:

    gelernt(Merkmal) = 1,5 × (Summe der Signale) / (Anzahl Bewertungen mit dem Merkmal + 2)
    Gewicht = Startgewicht + gelernt

Die „+ 2“ ist die Glättung: Ein Merkmal, das nur einmal vorkam, bewegt sich höchstens um ein Drittel dessen, was viele gleichlautende Bewertungen bewirken. Beispiel: eine Note 5 ohne Gründe gibt dem Arbeitgeber +1,5 × 1 / 3 = +0,5. Weil die Summe aus allen Bewertungen neu berechnet wird, ist jede Änderung genau einer Bewertung zuzuordnen, und das Entfernen einer Bewertung nimmt ihren Einfluss vollständig zurück.

**Harte Regeln** stehen über dem Passungswert: „nie zeigen“ blendet eine Stelle aus (unten unter „durch Regel ausgeblendet“ weiter sichtbar), „immer zeigen“ setzt sie nach oben.

**Profil.** Beim Morgenlauf liest Claude alle Bewertungen seit dem letzten Lauf mit Gründen und Freitext, schreibt das Profil fort und leitet daraus Suchbegriffe und Quellen für die Suche ab. Das Protokoll nennt zu jeder Änderung die Bewertung, aus der sie kommt.

## Entwicklung

```bash
node jobradar/build.mjs                    # baut dist/jobradar.html (Seite mit eingebetteter engine.js)
node --test jobradar/test/engine.test.mjs  # Lern- und Bewertungstests
PW=$(npm root -g)/playwright SHOT_DIR=/tmp node jobradar/test/ui.check.mjs   # Oberflächentest mit simulierter Datenbank
```

Nach Änderungen an `page.src.html` oder `engine.js` bauen und die Seite neu veröffentlichen (Claude: Artifact mit `dist/jobradar.html` und der URL oben).
