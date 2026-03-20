import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { PALETTE } from './constants';
import type { Theme } from './types';

type ColorMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  theme: Theme;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [colorMode, setColorMode] = useState<ColorMode>('system');

  const isDark = colorMode === 'dark' || (colorMode === 'system' && systemScheme === 'dark');

  const theme: Theme = useMemo(() => isDark ? {
    background: PALETTE.darkSurface,
    surfaceContainer: PALETTE.darkSurfaceContainer,
    surface: PALETTE.darkSurfaceCard,
    text: PALETTE.darkOnSurface,
    textSecondary: PALETTE.darkOnSurfaceVariant,
    inputBg: PALETTE.darkSurfaceHigh,
    primary: PALETTE.primaryContainer,
    primaryContainer: PALETTE.primaryContainer + '30',
    tertiary: PALETTE.tertiary,
    outline: PALETTE.darkOutline,
    outlineVariant: PALETTE.darkOutline + '40',
    error: '#ffb4ab',
    isDark: true,
  } : {
    background: PALETTE.surface,
    surfaceContainer: PALETTE.surfaceContainer,
    surface: PALETTE.surfaceTop,
    text: PALETTE.onSurface,
    textSecondary: PALETTE.onSurfaceVariant,
    inputBg: PALETTE.surfaceContainer,
    primary: PALETTE.primary,
    primaryContainer: PALETTE.primaryContainer,
    tertiary: PALETTE.tertiary,
    outline: PALETTE.outline,
    outlineVariant: PALETTE.outlineVariant,
    error: PALETTE.error,
    isDark: false,
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ colorMode, setColorMode, theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
