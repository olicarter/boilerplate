import { useState, useEffect } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem('ripple_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
      localStorage.removeItem('ripple_theme');
    } else {
      root.setAttribute('data-theme', theme);
      localStorage.setItem('ripple_theme', theme);
    }
  }, [theme]);

  return { theme, setTheme: setThemeState };
}
