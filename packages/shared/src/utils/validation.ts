import { MIN_PASSWORD_LENGTH } from '../constants';
import { MATURITY_WEIGHT } from '../constants';
import type { MaturityRating } from '../enums';

/** Pragmatic e-mail shape check — the authoritative check is the mail round-trip. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Validates an e-mail address.
 *
 * @param value - Raw user input.
 * @returns True when the value looks like a deliverable address.
 */
export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Outcome of the shared password policy check. */
export interface PasswordStrength {
  valid: boolean;
  /** 0-4 score rendered by the signup strength meter. */
  score: number;
  issues: string[];
}

/**
 * Applies the platform password policy.
 *
 * The same function runs in the browser (instant feedback) and in the API
 * (authoritative enforcement), so the two can never drift apart.
 *
 * @param password - Candidate password.
 * @returns Validity, a 0-4 strength score and human readable issues.
 */
export function checkPassword(password: string): PasswordStrength {
  const issues: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    issues.push(`Legalább ${MIN_PASSWORD_LENGTH} karakter szükséges.`);
  }
  if (!/[a-z]/.test(password)) {
    issues.push('Tartalmaznia kell kisbetűt.');
  }
  if (!/[A-Z]/.test(password)) {
    issues.push('Tartalmaznia kell nagybetűt.');
  }
  if (!/\d/.test(password)) {
    issues.push('Tartalmaznia kell számjegyet.');
  }

  const bonus = /[^\w\s]/.test(password) ? 1 : 0;
  const score = Math.min(4, Math.max(0, 4 - issues.length + bonus));

  return { valid: issues.length === 0, score, issues };
}

/**
 * Decides whether a profile is allowed to watch a given rating.
 *
 * @param profileLevel - Maximum rating configured on the profile.
 * @param titleRating - Rating of the catalog entry.
 * @returns True when playback is permitted.
 */
export function isMaturityAllowed(
  profileLevel: MaturityRating,
  titleRating: MaturityRating,
): boolean {
  return MATURITY_WEIGHT[titleRating] <= MATURITY_WEIGHT[profileLevel];
}

/**
 * Converts a display name into a URL-safe slug (diacritics folded).
 *
 * @param value - Human readable name.
 * @returns Lowercase, hyphenated slug.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
