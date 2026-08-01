'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { readTheme, writeTheme } from '@/lib/session-storage';

/** Available colour themes. */
export type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  /** Switches between dark and light. */
  toggleTheme: () => void;
  /**
   * Sets an explicit theme.
   *
   * @param theme - Theme to apply.
   */
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Colour theme provider.
 *
 * The theme is stored on `<html data-theme>` so CSS variables switch without a
 * re-render, and persisted to local storage. Dark is the product default — the
 * cinematic surface the whole design system is built on — and light is applied
 * only when the member picks it explicitly.
 *
 * @param props.children - Application tree.
 * @returns The provider element.
 */
export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const initial: Theme = readTheme() ?? 'dark';
    setThemeState(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const setTheme = useCallback((next: Theme): void => {
    setThemeState(next);
    writeTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  const toggleTheme = useCallback((): void => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Accesses the theme context.
 *
 * @returns The theme value; falls back to dark outside of the provider so
 *          isolated component tests do not need the wrapper.
 */
export function useTheme(): ThemeContextValue {
  return (
    useContext(ThemeContext) ?? {
      theme: 'dark',
      toggleTheme: () => undefined,
      setTheme: () => undefined,
    }
  );
}
