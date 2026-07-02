/**
 * Room management utilities and color palette
 */

export const COLOR_PALETTE = [
  { name: 'Voltage Yellow', hex: '#FFFF00' },
  { name: 'Electric Lime', hex: '#00FF00' },
  { name: 'Cyan', hex: '#00FFFF' },
  { name: 'Magenta', hex: '#FF00FF' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Orange', hex: '#FF8800' },
  { name: 'Pink', hex: '#FF69B4' },
  { name: 'Purple', hex: '#AA00FF' },
  { name: 'Deep Blue', hex: '#0055FF' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Mint Green', hex: '#98FF98' },
  { name: 'Teal', hex: '#008080' },
  { name: 'Coral', hex: '#FF7F50' },
  { name: 'Salmon', hex: '#FA8072' },
  { name: 'Peach', hex: '#FFDAB9' },
  { name: 'Lavender', hex: '#E6E6FA' },
  { name: 'Slate', hex: '#708090' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Forest Green', hex: '#228B22' },
  { name: 'Rust', hex: '#B7410E' },
];

export interface Room {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get color name from hex value, or return hex if not in palette
 */
export function getColorName(hex: string): string {
  const color = COLOR_PALETTE.find((c) => c.hex.toUpperCase() === hex.toUpperCase());
  return color?.name || hex;
}

/**
 * Validate room name (non-empty, reasonable length)
 */
export function validateRoomName(name: string): string | null {
  if (!name.trim()) {
    return 'Room name is required';
  }
  if (name.length > 50) {
    return 'Room name must be 50 characters or less';
  }
  return null;
}
