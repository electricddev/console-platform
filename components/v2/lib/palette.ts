/**
 * Hyve v2 palette — RGB tuples used by the canvas grid for snake/food
 * coloring and by shell components for accent dots. Kept in sync, by hand,
 * with the OKLCH tokens in app/v2/v2.css.
 */
export interface PaletteEntry {
  id: string
  label: string
  hex: string
  hexEnd: string
  rgb: string // "r, g, b"
}

export const v2Palette: PaletteEntry[] = [
  { id: 'forest', label: 'Forest', hex: '#3F7D5F', hexEnd: '#7BB394', rgb: '63, 125, 95' },
  { id: 'periwinkle', label: 'Periwinkle', hex: '#8EA4D2', hexEnd: '#B8C8E6', rgb: '142, 164, 210' },
  { id: 'amber', label: 'Amber', hex: '#D9A24A', hexEnd: '#EDC987', rgb: '217, 162, 74' },
  { id: 'rose', label: 'Rose', hex: '#C77B8A', hexEnd: '#E0B3BD', rgb: '199, 123, 138' },
  { id: 'sky', label: 'Sky', hex: '#5FA3C7', hexEnd: '#9CC7DD', rgb: '95, 163, 199' },
  { id: 'mauve', label: 'Mauve', hex: '#9A87C0', hexEnd: '#C2B5DA', rgb: '154, 135, 192' },
  { id: 'teal', label: 'Teal', hex: '#4FA6A6', hexEnd: '#8DCACA', rgb: '79, 166, 166' },
]

export function paletteRgbList(): string[] {
  return v2Palette.map((p) => p.rgb)
}

export function getPaletteEntry(id: string): PaletteEntry | undefined {
  return v2Palette.find((p) => p.id === id)
}
