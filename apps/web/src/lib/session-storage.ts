/** Local storage keys owned by the web app. */
const KEYS = {
  accessToken: 'nova.accessToken',
  refreshToken: 'nova.refreshToken',
  profileId: 'nova.profileId',
  theme: 'nova.theme',
} as const;

/** Token pair persisted between page loads. */
export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

/**
 * Reads the persisted session.
 *
 * @returns The stored token pair, or `null` on the server / when signed out.
 */
export function readSession(): StoredSession | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const accessToken = window.localStorage.getItem(KEYS.accessToken);
  const refreshToken = window.localStorage.getItem(KEYS.refreshToken);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

/**
 * Persists a session after a successful sign-in or token refresh.
 *
 * @param session - Token pair to store.
 */
export function writeSession(session: StoredSession): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(KEYS.accessToken, session.accessToken);
  window.localStorage.setItem(KEYS.refreshToken, session.refreshToken);
}

/** Removes every trace of the session (sign-out). */
export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(KEYS.accessToken);
  window.localStorage.removeItem(KEYS.refreshToken);
  window.localStorage.removeItem(KEYS.profileId);
}

/**
 * Reads the active viewing profile.
 *
 * @returns Profile id, or `null` when the profile gate has not been passed.
 */
export function readActiveProfileId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(KEYS.profileId);
}

/**
 * Stores the active viewing profile.
 *
 * @param profileId - Selected profile, or `null` to return to the gate.
 */
export function writeActiveProfileId(profileId: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (profileId) {
    window.localStorage.setItem(KEYS.profileId, profileId);
  } else {
    window.localStorage.removeItem(KEYS.profileId);
  }
}

/**
 * Reads the persisted colour theme.
 *
 * @returns `'dark'`, `'light'`, or `null` when the OS preference should win.
 */
export function readTheme(): 'dark' | 'light' | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const value = window.localStorage.getItem(KEYS.theme);
  return value === 'dark' || value === 'light' ? value : null;
}

/**
 * Persists the colour theme.
 *
 * @param theme - Selected theme.
 */
export function writeTheme(theme: 'dark' | 'light'): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(KEYS.theme, theme);
}
