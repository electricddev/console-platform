/**
 * Hyve v2 palette — RGB tuples used by the canvas grid for snake/food
 * coloring and by shell components for accent dots. Kept in sync, by hand,
 * with the OKLCH tokens in app/v2/v2.css.
 *
 * Each entry includes a `family` — 3 harmonious hexes used to compose
 * multi-blob auras. Inspired by hmm's ProjectBlobs technique, where a card's
 * aura is *composed* from the colors of its constituent agents. We don't have
 * agents per vault, so the family is the vault's color identity expressed as
 * a harmonious trio that always reads "blueish" / "greenish" / etc., no
 * matter where it appears in the vault's sub-pages.
 */
export interface PaletteEntry {
  id: string
  label: string
  hex: string
  hexEnd: string
  rgb: string // "r, g, b"
  /** 3 hexes used to compose the aura — primary first. */
  family: [string, string, string]
}

export const v2Palette: PaletteEntry[] = [
  {
    id: 'forest',
    label: 'Forest',
    hex: '#3F7D5F',
    hexEnd: '#7BB394',
    rgb: '63, 125, 95',
    family: ['#3F7D5F', '#4FA6A6', '#7BB394'], // forest · teal · light-green
  },
  {
    id: 'periwinkle',
    label: 'Periwinkle',
    hex: '#8EA4D2',
    hexEnd: '#B8C8E6',
    rgb: '142, 164, 210',
    family: ['#8EA4D2', '#5FA3C7', '#9A87C0'], // periwinkle · sky · mauve
  },
  {
    id: 'amber',
    label: 'Amber',
    hex: '#D9A24A',
    hexEnd: '#EDC987',
    rgb: '217, 162, 74',
    family: ['#D9A24A', '#EDC987', '#C77B8A'], // amber · light-amber · rose
  },
  {
    id: 'rose',
    label: 'Rose',
    hex: '#C77B8A',
    hexEnd: '#E0B3BD',
    rgb: '199, 123, 138',
    family: ['#C77B8A', '#E0B3BD', '#9A87C0'], // rose · light-rose · mauve
  },
  {
    id: 'sky',
    label: 'Sky',
    hex: '#5FA3C7',
    hexEnd: '#9CC7DD',
    rgb: '95, 163, 199',
    family: ['#5FA3C7', '#4FA6A6', '#8EA4D2'], // sky · teal · periwinkle
  },
  {
    id: 'mauve',
    label: 'Mauve',
    hex: '#9A87C0',
    hexEnd: '#C2B5DA',
    rgb: '154, 135, 192',
    family: ['#9A87C0', '#C77B8A', '#8EA4D2'], // mauve · rose · periwinkle
  },
  {
    id: 'teal',
    label: 'Teal',
    hex: '#4FA6A6',
    hexEnd: '#8DCACA',
    rgb: '79, 166, 166',
    family: ['#4FA6A6', '#3F7D5F', '#5FA3C7'], // teal · forest · sky
  },
]

export function paletteRgbList(): string[] {
  return v2Palette.map((p) => p.rgb)
}

export function getPaletteEntry(id: string): PaletteEntry | undefined {
  return v2Palette.find((p) => p.id === id)
}

/** Returns the 3-hex family for a palette id, with a sensible fallback. */
export function getPaletteFamily(id: string): [string, string, string] {
  return getPaletteEntry(id)?.family ?? ['#8a8a8a', '#a0a0a0', '#666666']
}
