'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES, type AuthResultDto, type ProfileDto, type UserDto } from '@nova/shared';

import { ApiError, apiFetch } from '@/lib/api-client';
import {
  clearSession,
  readActiveProfileId,
  readSession,
  writeActiveProfileId,
  writeSession,
} from '@/lib/session-storage';

/** Everything the app needs to know about the signed-in member. */
interface SessionContextValue {
  user: UserDto | null;
  profiles: ProfileDto[];
  activeProfile: ProfileDto | null;
  accessToken: string | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  /**
   * Signs a member in.
   *
   * @param email - Login address.
   * @param password - Password.
   * @param totpCode - TOTP code when 2FA is enabled.
   * @returns The raw auth result, so the form can render the 2FA challenge.
   */
  login: (email: string, password: string, totpCode?: string) => Promise<AuthResultDto>;
  /**
   * Registers a new member and signs them in.
   *
   * @param input - Registration payload.
   */
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  /** Signs the member out and returns to the landing page. */
  logout: () => Promise<void>;
  /**
   * Selects the active viewing profile.
   *
   * @param profileId - Profile to activate.
   */
  selectProfile: (profileId: string) => void;
  /** Re-reads profiles from the API (after create/update/delete). */
  refreshProfiles: () => Promise<void>;
  /**
   * Performs an authenticated API call, refreshing the access token once when
   * it has expired.
   *
   * @param path - API path.
   * @param options - Fetch options.
   * @returns The unwrapped payload.
   */
  authFetch: <T>(path: string, options?: Parameters<typeof apiFetch>[1]) => Promise<T>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Client-side session provider.
 *
 * Holds the token pair, the member and their profiles, and exposes a fetch
 * helper that transparently rotates an expired access token.
 *
 * @param props.children - Application tree.
 * @returns The provider element.
 */
export function SessionProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);
  const [profiles, setProfiles] = useState<ProfileDto[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionContextValue['status']>('loading');

  /**
   * Exchanges the refresh token for a new pair.
   *
   * @returns The new access token, or `null` when the session is over.
   */
  const refreshTokens = useCallback(async (): Promise<string | null> => {
    const stored = readSession();
    if (!stored) {
      return null;
    }
    try {
      const result = await apiFetch<AuthResultDto>(API_ROUTES.auth.refresh, {
        method: 'POST',
        body: { refreshToken: stored.refreshToken },
      });
      if (result.accessToken && result.refreshToken) {
        writeSession({ accessToken: result.accessToken, refreshToken: result.refreshToken });
        setAccessToken(result.accessToken);
        return result.accessToken;
      }
    } catch {
      clearSession();
    }
    return null;
  }, []);

  const authFetch = useCallback(
    async <T,>(path: string, options: Parameters<typeof apiFetch>[1] = {}): Promise<T> => {
      const token = accessToken ?? readSession()?.accessToken ?? null;
      try {
        return await apiFetch<T>(path, { ...options, token });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const fresh = await refreshTokens();
          if (fresh) {
            return apiFetch<T>(path, { ...options, token: fresh });
          }
          setUser(null);
          setStatus('anonymous');
        }
        throw error;
      }
    },
    [accessToken, refreshTokens],
  );

  const refreshProfiles = useCallback(async (): Promise<void> => {
    const list = await authFetch<ProfileDto[]>(API_ROUTES.profiles.list);
    setProfiles(list);
  }, [authFetch]);

  /** Restores the session from local storage on first paint. */
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      const stored = readSession();
      if (!stored) {
        setStatus('anonymous');
        return;
      }

      setAccessToken(stored.accessToken);
      try {
        const me = await apiFetch<UserDto>(API_ROUTES.auth.me, { token: stored.accessToken });
        const list = await apiFetch<ProfileDto[]>(API_ROUTES.profiles.list, {
          token: stored.accessToken,
        });
        if (cancelled) {
          return;
        }
        setUser(me);
        setProfiles(list);
        setActiveProfileId(readActiveProfileId());
        setStatus('authenticated');
      } catch {
        const fresh = await refreshTokens();
        if (cancelled) {
          return;
        }
        if (!fresh) {
          setStatus('anonymous');
          return;
        }
        const me = await apiFetch<UserDto>(API_ROUTES.auth.me, { token: fresh });
        const list = await apiFetch<ProfileDto[]>(API_ROUTES.profiles.list, { token: fresh });
        setUser(me);
        setProfiles(list);
        setActiveProfileId(readActiveProfileId());
        setStatus('authenticated');
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [refreshTokens]);

  /**
   * Applies a successful authentication result to the local state.
   *
   * @param result - Auth result returned by the API.
   */
  const applyAuthResult = useCallback(async (result: AuthResultDto): Promise<void> => {
    if (!result.accessToken || !result.refreshToken || !result.user) {
      return;
    }
    writeSession({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');

    const list = await apiFetch<ProfileDto[]>(API_ROUTES.profiles.list, {
      token: result.accessToken,
    });
    setProfiles(list);
  }, []);

  const login = useCallback(
    async (email: string, password: string, totpCode?: string): Promise<AuthResultDto> => {
      const result = await apiFetch<AuthResultDto>(API_ROUTES.auth.login, {
        method: 'POST',
        body: { email, password, ...(totpCode ? { totpCode } : {}) },
      });
      if (!result.twoFactorRequired) {
        await applyAuthResult(result);
      }
      return result;
    },
    [applyAuthResult],
  );

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string }): Promise<void> => {
      const result = await apiFetch<AuthResultDto>(API_ROUTES.auth.register, {
        method: 'POST',
        body: input,
      });
      await applyAuthResult(result);
    },
    [applyAuthResult],
  );

  const logout = useCallback(async (): Promise<void> => {
    const stored = readSession();
    if (stored) {
      await apiFetch(API_ROUTES.auth.logout, {
        method: 'POST',
        body: { refreshToken: stored.refreshToken },
      }).catch(() => undefined);
    }
    clearSession();
    setUser(null);
    setProfiles([]);
    setActiveProfileId(null);
    setAccessToken(null);
    setStatus('anonymous');
    router.push('/');
  }, [router]);

  const selectProfile = useCallback((profileId: string): void => {
    writeActiveProfileId(profileId);
    setActiveProfileId(profileId);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      profiles,
      activeProfile: profiles.find((profile) => profile.id === activeProfileId) ?? null,
      accessToken,
      status,
      login,
      register,
      logout,
      selectProfile,
      refreshProfiles,
      authFetch,
    }),
    [
      user,
      profiles,
      activeProfileId,
      accessToken,
      status,
      login,
      register,
      logout,
      selectProfile,
      refreshProfiles,
      authFetch,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Accesses the session context.
 *
 * @returns The session value.
 * @throws When called outside of {@link SessionProvider}.
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('A useSession csak SessionProvider-en belül használható.');
  }
  return context;
}
