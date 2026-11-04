// Texte der Bauanleitung. Zahlen (Blockanzahlen, Maße, Koordinaten) ergänzt die
// Oberfläche automatisch aus dem Modell – sie stimmen deshalb immer mit dem 3D-Modell überein.

export const SECTIONS = [
  { id: 'plattform', code: 'A', name: 'Plattform & Straße', text: 'Zweilagiges Fundament mit abgestufter Quarzkante, Grundplatte aus Poliertem Diorit, Fahrbahn mit Mittellinie und Gehweg an der Ostseite.' },
  { id: 'sockel', code: 'B', name: 'Sockelgeschoss & Terrasse', text: 'Das 5 Blöcke hohe Untergeschoss trägt die Terrasse auf Y7. Südfassade mit durchgehendem Fensterband, Lagertore an der Ostseite.' },
  { id: 'treppe', code: 'C', name: 'Freitreppe', text: 'Breite Treppenanlage von der Straße zur Terrasse mit Zwischenpodest und Glasbrüstungen.' },
  { id: 'halle', code: 'D', name: 'Glashalle mit Bogendach', text: 'Lange Halle mit geschwungenem, nach Osten ansteigendem Dach, zwei Oberlichtbändern und verglastem Atrium.' },
  { id: 'silo', code: 'E', name: 'Silo-Zylinder', text: 'Runder Speicherturm an der Südwestecke der Halle mit schwarz-goldenen Ringen und gläsernem Deckel.' },
  { id: 'turm', code: 'F', name: 'Kommunikationsturm', text: 'Turmschaft hinter der Halle, verglaster Turmkopf, Antennensäule mit Mast und das gelb gerahmte Solarsegel.' },
  { id: 'hauptblock', code: 'G', name: 'Forschungsmodul', text: 'Der zentrale Block: Sockelkörper, auskragendes Gurtgeschoss, Obergeschoss mit großen Fenstern und Technikgeschoss auf dem Dach.' },
  { id: 'portal', code: 'H', name: 'Hangar-Portal & Vorplatz', text: 'Gestufter dunkler Portaltrichter im Forschungsmodul mit Lichtlinie, Vorplatz und Datenkern-Monument.' },
  { id: 'ring', code: 'I', name: 'Ringmodul mit Halo', text: 'Runde Trommel mit Streifenfassade und Fensterband, gekrönt vom gelben Halo-Ring.' },
  { id: 'kran', code: 'J', name: 'Ladekran', text: 'Gelenkarm an der Trommel mit Greifer über der Landebahn und Sensorarm.' },
  { id: 'landebahn', code: 'K', name: 'Landebahn', text: 'Seitlich angebautes Lande- und Transportdeck auf Y11, teils auf Pfeilern über das Gelände hinaus.' },
  { id: 'fracht', code: 'L', name: 'Frachtdeck', text: 'Ladefläche vor der Landebahn mit gelben Gestellen, Lader, Vitrine und Warnmarkierungen.' },
  { id: 'kabine', code: 'M', name: 'Kontrollkabine', text: 'Verglaste Leitkabine vor dem Halleneingang.' },
  { id: 'wache', code: 'N', name: 'Wachhaus', text: 'Kleines Torhaus an der Straße mit goldenem Sockel.' },
  { id: 'technik', code: 'O', name: 'Technik', text: 'Rohrleitungen, Dachlüfter und der Technikhof mit Aggregaten hinter der Halle.' },
];

export const PHASES = [
  {
    id: 1, title: 'Fundament und Grundplatte',
    summary: 'Die Plattform ist das Raster für alles Weitere. Sie besteht aus zwei Lagen: Y0 als Fundament mit weißer Quarzkante und Y1 als begehbare Grundplatte mit Stufenkante und Straße.',
    tip: 'Markiere zuerst die vier Ecken und den Ursprung (Nordwest-Ecke = Block 0|0|0). Trage die Weltkoordinaten unter PROGRESS ein, dann zeigen alle Pläne echte Spielkoordinaten.',
    steps: [
      { id: '1.1', title: 'Fundamentschicht Y0', text: 'Fläche abstecken und vollflächig belegen. Die Außenreihe ist Quarzblock, an der Südkante wechseln ab X 22 je drei Gelber Beton und drei Quarzblöcke als Warnmarkierung. Das Innere liegt später vollständig verdeckt: Glatter Stein reicht, jeder andere Vollblock geht auch.' },
      { id: '1.2', title: 'Stufenkante Y1', text: 'Eine Reihe weiter innen rundum Quarzstufen in der unteren Blockhälfte setzen. So entsteht die abgetreppte weiße Kante der Vorlage.' },
      { id: '1.3', title: 'Grundplatte Y1', text: 'Die Innenfläche mit Poliertem Diorit füllen. Die äußerste Reihe der Grundplatte wird als Rahmenlinie aus Weißem Beton gelegt.' },
      { id: '1.4', title: 'Straße und Markierungen', text: 'Vor der Südseite eine 5 Blöcke breite Fahrbahn aus Grauem Beton mit gestrichelter Mittellinie aus Gelbem Beton (2 an, 2 aus). Nördlich davon ein Bordstein aus Weißem Beton.' },
    ],
  },
  {
    id: 2, title: 'Untere Gebäudestruktur',
    summary: 'Sockelgeschoss mit Terrassendecke, darauf die Rohbauten von Halle, Forschungsmodul, Ringmodul, Turm und Silo. Fensterflächen jetzt geschlossen mauern; Glas folgt in Phase 5.',
    tip: 'Runde Bauteile lassen sich am leichtesten Reihe für Reihe aus dem Schicht-Modus übernehmen: die Breiten pro Reihe stehen direkt im Plan.',
    steps: [
      { id: '2.1', title: 'Außenwände Sockelgeschoss', text: 'Umlaufende Wand auf der Deckfläche. Unterste Lage Polierter Andesit als dunkler Sockel, darüber Weißer Beton. Ecken und jede 5. Spalte werden Lisenen aus Hellgrauem Beton.' },
      { id: '2.2', title: 'Innenstützen', text: 'Im 8er-Raster Stützen aus Poliertem Andesit von Y2 bis Y6. Sie tragen optisch die Terrassendecke und helfen beim Abzählen der großen Fläche.' },
      { id: '2.3', title: 'Terrassendecke Y7', text: 'Die gesamte Fläche schließen: Polierter Diorit, die Außenkante Weißer Beton. Auf dieser Ebene stehen alle oberen Gebäude.' },
      { id: '2.4', title: 'Glashalle: Wände', text: 'Süd-, Nord- und Westwand der Halle. Die Längswände wachsen mit dem Dachbogen: jede Spalte endet genau einen Block unter dem Dach. Unterste Lage Hellgrauer Beton.' },
      { id: '2.5', title: 'Forschungsmodul: Sockelkörper', text: 'Hohler Quader bis Y21. Ecken sowie unterste und oberste Lage in Hellgrauem Beton. Die Portalöffnung wird erst in Phase 3 ausgeschnitten, hier einfach durchmauern.' },
      { id: '2.6', title: 'Ringmodul: Trommel unten', text: 'Kreis mit Radius 6,5 (Reihenbreiten 5-9-11-11-13-13-13-13-13-11-11-9-5). Senkrechte Streifen aus Hellgrauem Beton ab Y12. Nach Süden bleibt ein 3 Blöcke breiter Durchgang offen.' },
      { id: '2.7', title: 'Kommunikationsturm: Schaft', text: 'Hohler 7 × 7 Schaft hinter der Halle. Ecken und jede 6. Lage in Hellgrauem Beton.' },
      { id: '2.8', title: 'Silo-Zylinder', text: 'Kreis mit Radius 3,5 (Reihen 3-5-7-7-7-5-3). Farbringe von unten: Schwarzer Beton, zwei Lagen Weiß, Gelbe Keramik, Schwarz, Gelbe Keramik, vier Lagen Weiß, Schwarz, zwei Lagen Weiß.' },
    ],
  },
  {
    id: 3, title: 'Haupteingang und Hauptfassade',
    summary: 'Das dunkle Hangar-Portal ist das Gesicht der Station. Dazu kommen Vorplatz mit Datenkern, das Hangartor zur Landebahn, die Gliederung der Südfassaden und die große Freitreppe.',
    tip: 'Das Portal von außen nach innen bauen: erst den hellgrauen Rahmen, dann jede Stufe einen Block tiefer und einen Block schmaler.',
    steps: [
      { id: '3.1', title: 'Hangar-Portal', text: 'Öffnung im Forschungsmodul. Fünf ineinander gestufte Rahmen springen jeweils einen Block zurück und werden schmaler und niedriger. Abwechselnd Tiefenschieferfliesen und Polierter Tiefenschiefer, hinten Schwarzer Beton mit Getöntem Glas. Außen ein Rahmen aus Hellgrauem Beton mit gelb-schwarzen Warnstreifen am Fuß. Der Boden im Portal ist Polierter Tiefenschiefer.' },
      { id: '3.2', title: 'Vorplatz und Datenkern', text: 'Vorplatz mit hellgrauem Rand und weißem Mittelweg in der Portalachse. Links davon der Datenkern: Sockel aus Poliertem Tiefenschiefer, Kern aus Blauem Beton, Hellblaues Glas in Kreuzform, obenauf Seelaterne und Endstab.' },
      { id: '3.3', title: 'Hangartor zur Landebahn', text: 'In der Ostwand des Forschungsmoduls eine 6 × 6 Öffnung direkt über dem Landebahndeck, dahinter eine Wand aus Getöntem Glas. Davor steht ein Rahmen aus Hellgrauem Beton.' },
      { id: '3.4', title: 'Fassadengliederung', text: 'Quarzsäulen an den Hallenecken, ein hellgraues Gesimsband auf Y13 im Westteil der Hallenfront, ein Vordach aus Quarzstufen (obere Hälfte) über dem Halleneingang mit Kante aus Gelber Keramik auf zwei Quarzsäulen, sowie Quarzsäulen beidseits des Portals.' },
      { id: '3.5', title: 'Freitreppe', text: 'Zwei Läufe mit je drei Stufen und ein Zwischenpodest. Polierte Andesittreppen mit Blickrichtung Norden (Aufstieg zum Gebäude), darunter mit Poliertem Andesit auffüllen. Oben schließt ein Podest auf Terrassenhöhe an.' },
      { id: '3.6', title: 'Treppenwangen und Glasbrüstung', text: 'Seitenwangen aus Weißem Beton, oben Türkise Glasscheiben. In der Treppenmitte steht eine zweite Glasbrüstung direkt auf den Stufen.' },
      { id: '3.7', title: 'Lagertore Ostseite', text: 'Zwei 4 Blöcke breite Tore in der Ostwand des Sockels. Eisenfalltüren werden geöffnet an die Außenseite gesetzt und wirken wie ein Rolltor; Rahmen und Sturz aus Schwarzem Beton.' },
    ],
  },
  {
    id: 4, title: 'Obere Forschungsbereiche',
    summary: 'Das Forschungsmodul bekommt sein auskragendes Gurtgeschoss und das hohe Obergeschoss, die Trommel des Ringmoduls wächst bis Y36 und der Turm erhält seinen verglasten Kopf.',
    tip: 'Die Deckenplatte auf Y22 steht nach Norden und Süden je einen Block über. Erst die Platte legen, dann die Wände daraufsetzen.',
    steps: [
      { id: '4.1', title: 'Gurtgeschoss Forschungsmodul', text: 'Volle Deckenplatte aus Hellgrauem Beton mit Überstand nach Norden und Süden. Darauf ein dreilagiger Wandring aus Weißem Beton, der später das Fensterband aufnimmt.' },
      { id: '4.2', title: 'Obergeschoss Forschungsmodul', text: 'Wände wieder bündig mit dem Sockelkörper. Unterste Lage, Ecken und zwei Lisenen je Längsseite in Hellgrauem Beton.' },
      { id: '4.3', title: 'Ringmodul: Trommel oben', text: 'Die Trommel bis Y36 weiterführen. Streifen aus Hellgrauem Beton laufen bis Y32, die Lagen Y17 und Y36 sind hellgraue Ringe.' },
      { id: '4.4', title: 'Turmkopf', text: 'Ein 9 × 9 Kopf, ringsum einen Block breiter als der Schaft: Boden Hellgrauer Beton, zwei Lagen Wand, Decke Weißer Beton und eine Brüstung aus Quarzstufen.' },
    ],
  },
  {
    id: 5, title: 'Fenster und Beleuchtung',
    summary: 'Jetzt kommen die cyanfarbenen und hellblauen Glasflächen sowie alle Lichtquellen. Ersetze dafür die markierten Wandblöcke aus Phase 2 und 4.',
    tip: 'Glasscheiben verbinden sich automatisch mit Nachbarblöcken. Setze erst die Rahmenblöcke, dann die Scheiben, damit sie sauber anschließen.',
    steps: [
      { id: '5.1', title: 'Atrium-Glasfassade', text: 'Ostteil der Hallenfront: unten Wand mit dreiteiliger Glastür aus Getöntem Glas, darüber ein Band aus Türkisem Glas und eine große Fläche aus Hellblauem Glas mit Sprossen aus Weißem Beton (jede 4. Spalte, zwei Querriegel).' },
      { id: '5.2', title: 'Hallenfenster', text: 'Vier hohe Fensterpaare aus Getöntem Glas im Westteil der Hallenfront, oben und unten mit Schwarzem Beton gefasst. Auf der Westwand ein Rundfenster mit Rahmen aus Gelber Keramik, in Nord- und Westwand schmale Schlitze.' },
      { id: '5.3', title: 'Fenster Forschungsmodul', text: 'Fensterband aus Getöntem Glas im Gurtgeschoss mit Pfosten alle 5 Blöcke. Im Obergeschoss links ein großes Fenster aus Hellblauem Glas, sonst Gruppen aus Türkisen Glasscheiben. Im Sockelkörper an der Nordseite drei Fensterpaare.' },
      { id: '5.4', title: 'Fenster Sockelgeschoss', text: 'Südfassade: durchgehendes Band aus Türkisen Glasscheiben zwischen den Lisenen und eine Glastür aus Getöntem Glas. Die übrigen Seiten erhalten ein Fensterpaar pro Feld.' },
      { id: '5.5', title: 'Fensterbänder Ringmodul und Turm', text: 'Trommel: dreilagiges Band aus Hellblauem Glas, die Streifen laufen als Pfosten durch. Turmkopf und Turmschaft: Hellblaues Glas.' },
      { id: '5.6', title: 'Beleuchtung', text: 'Seelaternen in der Terrassenkante, als Leitlinie im Portalboden, im Scheitel jedes Portalrahmens und als Lichtring oben in der Trommel. Hängeleuchten aus Kette und Seelaterne unter den Überständen und in der Halle.' },
    ],
  },
  {
    id: 6, title: 'Dach und Antennen',
    summary: 'Das geschwungene Hallendach, die Dachlandschaft des Forschungsmoduls, der gelbe Halo-Ring, Antennenmast, Solarsegel und die Silo-Kuppel.',
    tip: 'Beim Bogendach immer von West nach Ost arbeiten: jede Spalte hat ihre feste Höhe; wo die nächste Spalte höher liegt, kommt eine Quarztreppe mit Blickrichtung Osten.',
    steps: [
      { id: '6.1', title: 'Bogendach der Glashalle', text: 'Das Dach steigt von West nach Ost als Viertelbogen um 9 Blöcke an und fällt zur Südfront um bis zu 4 Blöcke ab. Quarzblöcke, an jeder Höhenstufe eine Quarztreppe (Blick Osten bzw. Norden). Zwei Oberlichtbänder aus Hellblauem Glas mit grauen Rahmenreihen, an Nord- und Südrand eine Traufkante.' },
      { id: '6.2', title: 'Dach Forschungsmodul', text: 'Dachplatte aus Weißem Beton mit Brüstung aus Quarzstufen. Darauf das Technikgeschoss mit dunklem Schlitz aus Schwarzem Beton, ein zweites dunkles Feld auf der Dachplatte.' },
      { id: '6.3', title: 'Ringmodul-Dach und Halo', text: 'Dachscheibe aus Weißem Beton, darum ein Ring aus Gelbem Beton, der über die Trommel auskragt. Außen eine Lage Gelbes Glas und ein zweiter Ring Gelber Beton. Eisengitter als Konsolen, in der Mitte eine kleine Leuchte.' },
      { id: '6.4', title: 'Turmsäule und Antennenmast', text: '3 × 3 Säule mit hellgrauen Bändern und zwei dunklen Fenstern, darauf Eisenblöcke, Eisengitter, zwei Endstäbe und zwei Blitzableiter. Querarme aus Eisengitter mit Endstäben und Ketten, ein goldener Ausleger.' },
      { id: '6.5', title: 'Solarsegel', text: 'Parallelogramm aus 4 × 10 Blöcken westlich der Säule: Rahmen aus Gelber Keramik, Füllung Hellgrünes Glas. Alle vier Lagen springt das Segel einen Block nach Westen. Zwei Arme aus Eisengitter verbinden es mit der Säule.' },
      { id: '6.6', title: 'Silo-Kuppel', text: 'Deckel aus Hellblauem Glas mit Rand aus Gelber Keramik, darauf eine 3 × 3 Krone mit Seelaterne in der Mitte.' },
      { id: '6.7', title: 'Dachantenne und Eckleuchten', text: 'Kleine Antenne auf dem Forschungsmodul aus Eisengitter, Endstab und zwei Blitzableitern; Endstäbe auf den vier Dachecken.' },
    ],
  },
  {
    id: 7, title: 'Maschinen und technische Details',
    summary: 'Der Ladekran am Ringmodul, Rohrleitungen, Dachlüfter, der Technikhof hinter der Halle und die verglaste Kontrollkabine.',
    tip: 'Den Kran von der Schulter aus bauen. Für die schrägen Teile helfen Gerüstblöcke, die du danach wieder entfernst.',
    steps: [
      { id: '7.1', title: 'Ladekran', text: 'Schultergehäuse an der Ostseite der Trommel, Oberarm 2 × 2 schräg abfallend, Ellbogen aus Gelbem Beton mit Eisenkern, Unterarm diagonal nach Süden, Greifer mit Fingern aus Eisengitter über der Landebahn. Dazu ein Sensorarm mit Hellgrünem Glas.' },
      { id: '7.2', title: 'Rohrleitungen', text: 'Rohr aus Hellgrauem Beton mit Flanschen aus Eisenblock entlang der Nordseite des Forschungsmoduls bis in die Trommel, getragen von Eisengitter. Eine zweite Leitung hinter der Halle verbindet die Aggregate mit dem Turm.' },
      { id: '7.3', title: 'Lüftung auf dem Dach', text: 'Vier 2 × 2 Lüfter aus Hellgrauem Beton mit Eisenfalltüren (untere Hälfte) obenauf.' },
      { id: '7.4', title: 'Technikhof', text: 'Vier Aggregate mit 3 × 3 × 2 Blöcken hinter der Halle: Front aus Eisengitter, Deckel aus Eisenfalltüren.' },
      { id: '7.5', title: 'Kontrollkabine', text: 'Glaskabine vor dem Halleneingang: Sockel aus Hellgrauem Beton, umlaufend Türkises Glas, Rahmen aus Gelber Keramik, innen ein Pult aus Schwarzem Beton mit Seelaterne.' },
    ],
  },
  {
    id: 8, title: 'Seitlicher Landeplatz',
    summary: 'Die Landebahn auf Y11 schließt am Hangartor an, läuft über das Servicegeschoss und ragt auf Pfeilern weit über die Plattform hinaus.',
    tip: 'Pfeiler zuerst setzen und oben mit einer Hilfsreihe verbinden. Dann lässt sich das Deck Reihe für Reihe ohne Gerüst ausrollen.',
    steps: [
      { id: '8.1', title: 'Stützpfeiler', text: 'Acht Pfeiler mit 2 × 2 Blöcken aus Hellgrauem Beton tragen den Teil, der über die Plattform hinausragt. Unterste Lage Polierter Andesit.' },
      { id: '8.2', title: 'Servicegeschoss', text: 'Unter der Landebahn auf der Terrasse: Säulenreihe zur Südseite, geschlossene Wand zur Trommel mit Durchgang, Sturz aus Schwarzem Beton.' },
      { id: '8.3', title: 'Landebahn-Deck', text: 'Deck aus Grauem Beton, Rand aus Hellgrauem Beton.' },
      { id: '8.4', title: 'Markierungen', text: 'Gestrichelte Mittellinie aus Weißem Beton (3 an, 3 aus), Schwellenbalken an beiden Enden, eine gelb-schwarze Warnkante vor dem Hangartor.' },
      { id: '8.5', title: 'Randbefeuerung und Blende', text: 'Seelaternen alle 4 Blöcke im Rand, rote Endmarkierung aus Rotem Beton, eine zweilagige Blende aus Schwarzem und Grauem Beton unter dem Rand und Endstäbe als Anflugfeuer.' },
    ],
  },
  {
    id: 9, title: 'Dekoration und finale Details',
    summary: 'Geländer, Laternen, Wachhaus, Frachtdeck mit gelben Gestellen, Fässer und die letzten Warnmarkierungen.',
    tip: 'Das Geländer folgt automatisch allen freien Deckkanten. Am Treppenaustritt bleibt es offen.',
    steps: [
      { id: '9.1', title: 'Terrassengeländer', text: 'Birkenholzzaun auf allen freien Kanten der Terrasse, Öffnung am Treppenaustritt.' },
      { id: '9.2', title: 'Laternenmasten', text: 'Schwarzeichenholzzaun mit Laterne obenauf: drei Blöcke hoch auf der Terrasse und an der Straße, zwei Blöcke an der Treppe.' },
      { id: '9.3', title: 'Wachhaus', text: 'Häuschen an der Straße: Sockel aus Gelber Keramik, Quarzsäulen an den Ecken, Fenster aus Getöntem Glas, Tür auf der Westseite und eine Dachkante aus Quarzstufen mit gelben Ecken.' },
      { id: '9.4', title: 'Frachtdeck', text: 'Drei gelbe Ladegestelle auf Kettenbeinen mit schwarzer Ladung, ein kleiner Lader in Gelb und Schwarz und eine Vitrine aus Türkisem Glas.' },
      { id: '9.5', title: 'Frachtfässer', text: 'Fass-Stapel vor der Südfassade des Sockelgeschosses.' },
      { id: '9.6', title: 'Ostgeländer', text: 'Schwarzeichenholzzaun an der Ostkante des Gehwegs.' },
      { id: '9.7', title: 'Warnmarkierungen', text: 'Gelb-schwarze Kante entlang des Frachtdecks und eine Warnlinie vor dem Servicegeschoss.' },
    ],
  },
];

export const STEP_INDEX = {};
for (const p of PHASES) for (const s of p.steps) STEP_INDEX[s.id] = Object.assign(s, { phase: p.id });
export const STEP_ORDER = PHASES.flatMap((p) => p.steps.map((s) => s.id));
export const SECTION_INDEX = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
