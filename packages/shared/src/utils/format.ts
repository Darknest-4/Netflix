/**
 * Formats a duration expressed in seconds as a compact, human readable string.
 *
 * @param seconds - Duration in seconds; negative values are clamped to zero.
 * @returns `"1 óra 42 p"`, `"42 p"` or `"48 mp"` depending on magnitude.
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours} óra ${minutes} p` : `${hours} óra`;
  }
  if (minutes > 0) {
    return `${minutes} p`;
  }
  return `${total} mp`;
}

/**
 * Formats a playback position as a media timestamp.
 *
 * @param seconds - Position in seconds.
 * @returns `h:mm:ss` when the duration reaches an hour, otherwise `m:ss`.
 */
export function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value: number): string => value.toString().padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/**
 * Formats a minor-unit amount as a localised currency string.
 *
 * @param amountMinor - Amount in the currency's smallest unit (fillér/cent).
 * @param currency - ISO-4217 currency code.
 * @param locale - BCP-47 locale tag, defaults to Hungarian.
 * @returns Localised currency string, e.g. `"3 990 Ft"`.
 */
export function formatPrice(amountMinor: number, currency: string, locale = 'hu-HU'): string {
  const fractionDigits = currency === 'HUF' ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountMinor / 100);
}

/**
 * Renders a percentage with no fractional digits.
 *
 * @param value - Ratio in the 0-100 range.
 * @returns e.g. `"87%"`.
 */
export function formatPercent(value: number): string {
  return `${Math.round(clamp(value, 0, 100))}%`;
}

/**
 * Clamps a number into an inclusive range.
 *
 * @param value - Input value.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns The value constrained to `[min, max]`.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Formats an ISO date string as a short Hungarian date.
 *
 * @param iso - ISO-8601 timestamp.
 * @param locale - BCP-47 locale tag.
 * @returns e.g. `"2026. 07. 31."`, or an empty string for invalid input.
 */
export function formatDate(iso: string, locale = 'hu-HU'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
