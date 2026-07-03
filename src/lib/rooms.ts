/**
 * Room management utilities and color palette
 */

// Curated to 10 mutually-distinct hues (down from 20, several of which were
// near-duplicates like Coral/Salmon/Orange). The first four reuse the design
// system's own tokens (voltage yellow, glitch red/green/blue) so room colors
// stay visually tied to the rest of the app instead of introducing an
// unrelated neon palette.
export const COLOR_PALETTE = [
  { name: 'Voltage Yellow', hex: '#FFE600' },
  { name: 'Glitch Red', hex: '#DC1F3C' },
  { name: 'Glitch Green', hex: '#10B25A' },
  { name: 'Glitch Blue', hex: '#2A5BFF' },
  { name: 'Orange', hex: '#FF8800' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Charcoal', hex: '#475569' },
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
