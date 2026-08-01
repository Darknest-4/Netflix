import type { ArtworkDto } from '../types/catalog';

/** Gradient stop pairs used to derive original, royalty-free artwork. */
const PALETTES: ReadonlyArray<readonly [string, string]> = [
  ['#7f1d1d', '#160404'],
  ['#0f172a', '#1e3a8a'],
  ['#4c1d95', '#0b0616'],
  ['#064e3b', '#022c22'],
  ['#7c2d12', '#180a02'],
  ['#831843', '#1a0410'],
  ['#134e4a', '#042f2e'],
  ['#3f3f46', '#09090b'],
  ['#1e1b4b', '#020617'],
  ['#78350f', '#1c1207'],
];

/** Procedural overlays combined with the gradients. */
const PATTERNS: ReadonlyArray<ArtworkDto['pattern']> = ['grain', 'rays', 'waves', 'grid', 'orbit'];

/**
 * Hashes a string into a non-negative 32 bit integer (FNV-1a).
 *
 * Used to make every generated visual deterministic: the same title always
 * receives the same artwork on the server, the client and in tests.
 *
 * @param input - Arbitrary seed string, typically a title id or slug.
 * @returns Stable non-negative integer hash.
 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash);
}

/**
 * Builds the deterministic artwork descriptor of a catalog entry.
 *
 * @param seed - Stable identifier of the entity (title id, episode id, ...).
 * @param wordmark - Text drawn onto the artwork, usually the title name.
 * @returns Artwork descriptor consumed by the `<Artwork />` React component.
 */
export function createArtwork(seed: string, wordmark: string): ArtworkDto {
  const hash = hashString(seed);
  const palette = PALETTES[hash % PALETTES.length] as readonly [string, string];
  const pattern = PATTERNS[(hash >> 3) % PATTERNS.length] as ArtworkDto['pattern'];

  return {
    from: palette[0],
    to: palette[1],
    angle: 25 + ((hash >> 5) % 12) * 10,
    pattern,
    wordmark,
  };
}

/**
 * Builds the deterministic gradient of a profile avatar.
 *
 * @param avatarKey - One of `AVATAR_PRESETS`.
 * @returns CSS gradient stops for the avatar tile.
 */
export function avatarGradient(avatarKey: string): { from: string; to: string } {
  const map: Record<string, [string, string]> = {
    nebula: ['#6d28d9', '#2e1065'],
    aurora: ['#0ea5e9', '#083344'],
    ember: ['#dc2626', '#450a0a'],
    lagoon: ['#0d9488', '#042f2e'],
    violet: ['#a21caf', '#3b0764'],
    citrus: ['#f59e0b', '#451a03'],
    mint: ['#22c55e', '#052e16'],
    cosmos: ['#4338ca', '#020617'],
  };
  const stops = map[avatarKey] ?? map.nebula!;
  return { from: stops[0], to: stops[1] };
}
