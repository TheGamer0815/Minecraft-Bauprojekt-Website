# ECHO-7 · Minecraft-Bauplaner

Persönlicher digitaler Bauplaner für das Minecraft-Soloprojekt **ECHO-7 – Sci-Fi Research Outpost**.
Das Gebäude ist nach dem Referenzbild (`assets/reference.jpg`) als blockgenaues Modell aufgebaut:
Bogendach-Halle mit Oberlichtern, Silo, Kommunikationsturm mit Solarsegel, Forschungsmodul mit
gestuftem Hangar-Portal, Ringmodul mit gelbem Halo, Ladekran, seitliche Landebahn, Frachtdeck,
Freitreppe, Wachhaus und Straße.

| Kennzahl | Wert |
|---|---|
| Ausdehnung (X × Y × Z) | 96 × 58 × 49 Blöcke (Plattform 74 × 49) |
| Blöcke | 20 644 (davon 3 852 verdeckt) |
| Blocktypen | 35, ausschließlich Vanilla |
| Bauphasen / Schritte | 9 / 53 |
| Ebenen | Y0 bis Y57 |

## Bereiche der Website

- **OVERVIEW** – Live-Modell, Projektdatenblatt, Schieberegler-Vergleich Vorlage ↔ Modell, Phasenstatus, Gebäudebereiche.
- **3D BLUEPRINT** – frei drehbares Three.js-Modell (Drehen, Zoomen, Verschieben), Ansichten Vorlage/Vorne/Hinten/Links/Rechts/Oben,
  15 anwählbare Bereiche mit Hervorhebung, Bauphasen ein-/ausblenden, Bauablauf-Regler mit Abspielfunktion, Höhenschnitt, Block-Info beim Überfahren.
- **BUILD GUIDE** – 9 Bauphasen mit Erklärung, Materialliste, Blockanzahlen, Maßen, 3D-Vorschau und Schritt-für-Schritt-Anleitung.
  Dazu der **Schicht-Modus**: jede Y-Ebene als Draufsicht mit jedem Block (Treppenrichtung, Scheiben, Zäune …), Blockliste je Ebene,
  3D-Vorschau der Ebene und Markierung „gebaut“.
- **MATERIALS** – vollständige Materialliste mit deutschen Blocknamen und `minecraft:`-IDs, Stacks, Shulkerkisten, verdeckte Blöcke,
  Eingabe der gesammelten Mengen, Filter je Phase, Liste kopieren.
- **PROGRESS** – Gesamtfortschritt, Ebenen- und Schrittstatus, Protokoll, Weltursprung für echte Spielkoordinaten, Sicherung/Import/Reset.

Der Fortschritt wird im Browser gespeichert (`localStorage`).

## Starten

Die Seite ist statisch und braucht keinen Build. Wegen der ES-Module muss sie über einen Webserver laufen:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Für GitHub Pages: Repository-Einstellungen → Pages → Branch wählen, Ordner `/`.

## Aufbau

```
index.html            Gerüst und Navigation
css/style.css         Gestaltung (dunkles Leitstand-Design)
js/data/blocks.js     Blockpalette (deutsche Namen, IDs, Farben, Formen)
js/data/model.js      Erzeugt das komplette Gebäude Block für Block
js/data/guide.js      Texte der Bauphasen, Schritte und Bereiche
js/core/analysis.js   Mengen, Maße und Ebenen aus dem Modell
js/core/store.js      Fortschritt im localStorage
js/viewer/viewer.js   Three.js-Voxel-Viewer (Flächen-Mesher mit Ambient Occlusion, Voxel-Picking)
js/views/*.js         Die fünf Ansichten
vendor/three/         Three.js r160 (MIT-Lizenz)
```

Alle Zahlen in Anleitung, Materialliste und Schichtplänen werden aus `js/data/model.js` berechnet.
Wer das Gebäude ändern möchte, passt nur diese Datei an – der Rest der Website zieht automatisch nach.

Koordinaten: +X = Osten, +Z = Süden, +Y = oben. Der Modellursprung 0|0|0 ist die Nordwest-Ecke der Fundamentschicht.
