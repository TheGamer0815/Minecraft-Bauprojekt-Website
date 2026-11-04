// Blockpalette für ECHO-7.
// Alle Blöcke sind Vanilla-Minecraft (Java/Bedrock 1.20+). Die Namen entsprechen
// der deutschen Spielsprache, `id` ist die technische Kennung ohne Namespace.
//
// shape: Darstellungsform im 3D-Modell
//   cube | slab | stairs | pane | bars | fence | rod | chain | trapdoor | lantern
// glass: transparent gerendert (alpha = Deckkraft)
// light: Lichtquelle (wird selbstleuchtend gerendert)

export const BLOCKS = {
  white_concrete:            { name: 'Weißer Beton',              color: '#d4d9da', cat: 'Beton' },
  light_gray_concrete:       { name: 'Hellgrauer Beton',          color: '#8b8b84', cat: 'Beton' },
  gray_concrete:             { name: 'Grauer Beton',              color: '#3e4246', cat: 'Beton' },
  black_concrete:            { name: 'Schwarzer Beton',           color: '#14161b', cat: 'Beton' },
  yellow_concrete:           { name: 'Gelber Beton',              color: '#f0b11c', cat: 'Beton' },
  red_concrete:              { name: 'Roter Beton',               color: '#8e2522', cat: 'Beton' },
  blue_concrete:             { name: 'Blauer Beton',              color: '#2f3394', cat: 'Beton' },

  quartz_block:              { name: 'Quarzblock',                color: '#ece7e0', cat: 'Quarz' },
  quartz_pillar:             { name: 'Quarzsäule',                color: '#e8e2d9', cat: 'Quarz' },
  quartz_slab:               { name: 'Quarzstufe',                color: '#ece7e0', cat: 'Quarz',  shape: 'slab' },
  quartz_stairs:             { name: 'Quarztreppe',               color: '#ece7e0', cat: 'Quarz',  shape: 'stairs' },

  polished_diorite:          { name: 'Polierter Diorit',          color: '#c3c4c6', cat: 'Stein' },
  polished_andesite:         { name: 'Polierter Andesit',         color: '#878a89', cat: 'Stein' },
  polished_andesite_stairs:  { name: 'Polierte Andesittreppe',    color: '#878a89', cat: 'Stein',  shape: 'stairs' },
  smooth_stone:              { name: 'Glatter Stein',             color: '#a3a3a3', cat: 'Stein' },
  polished_deepslate:        { name: 'Polierter Tiefenschiefer',  color: '#4a4a4c', cat: 'Stein' },
  deepslate_tiles:           { name: 'Tiefenschieferfliesen',     color: '#38383b', cat: 'Stein' },
  yellow_terracotta:         { name: 'Gelbe Keramik',             color: '#b98526', cat: 'Stein' },

  tinted_glass:              { name: 'Getöntes Glas',             color: '#2e2834', cat: 'Glas', glass: true, alpha: 0.86 },
  light_blue_stained_glass:  { name: 'Hellblaues Glas',           color: '#7fb4e6', cat: 'Glas', glass: true, alpha: 0.55 },
  cyan_stained_glass:        { name: 'Türkises Glas',             color: '#3f9fb5', cat: 'Glas', glass: true, alpha: 0.62 },
  cyan_stained_glass_pane:   { name: 'Türkise Glasscheibe',       color: '#4aaec4', cat: 'Glas', glass: true, alpha: 0.62, shape: 'pane' },
  yellow_stained_glass:      { name: 'Gelbes Glas',               color: '#e8e23a', cat: 'Glas', glass: true, alpha: 0.55 },
  lime_stained_glass:        { name: 'Hellgrünes Glas',           color: '#9ad848', cat: 'Glas', glass: true, alpha: 0.58 },

  sea_lantern:               { name: 'Seelaterne',                color: '#d4ece6', cat: 'Licht', light: true },
  end_rod:                   { name: 'Endstab',                   color: '#f6f1e8', cat: 'Licht', light: true, shape: 'rod' },
  lantern:                   { name: 'Laterne',                   color: '#f3c46b', cat: 'Licht', light: true, shape: 'lantern' },

  iron_block:                { name: 'Eisenblock',                color: '#dcdcdc', cat: 'Metall' },
  iron_trapdoor:             { name: 'Eisenfalltür',              color: '#c8c8c8', cat: 'Metall', shape: 'trapdoor' },
  iron_bars:                 { name: 'Eisengitter',               color: '#7c7f82', cat: 'Metall', shape: 'bars' },
  chain:                     { name: 'Kette',                     color: '#3b4252', cat: 'Metall', shape: 'chain' },
  lightning_rod:             { name: 'Blitzableiter',             color: '#c77b56', cat: 'Metall', shape: 'rod' },

  birch_fence:               { name: 'Birkenholzzaun',            color: '#cdb97f', cat: 'Deko', shape: 'fence' },
  dark_oak_fence:            { name: 'Schwarzeichenholzzaun',     color: '#45321d', cat: 'Deko', shape: 'fence' },
  barrel:                    { name: 'Fass',                      color: '#7a5a36', cat: 'Deko' },
};

export const CATEGORY_ORDER = ['Beton', 'Quarz', 'Stein', 'Glas', 'Licht', 'Metall', 'Deko'];

export function blockInfo(id) {
  const b = BLOCKS[id];
  if (!b) throw new Error('Unbekannter Block: ' + id);
  return b;
}

export function shapeOf(id) {
  return BLOCKS[id].shape || 'cube';
}

// Vollblöcke, die Licht/Sicht vollständig blockieren (für Flächen-Culling & AO)
export function isOpaqueCube(id) {
  const b = BLOCKS[id];
  return !b.glass && !b.shape;
}

export const DIR_LABEL = { n: 'Norden', s: 'Süden', e: 'Osten', w: 'Westen' };
