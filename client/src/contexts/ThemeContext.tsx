/**
 * Innovation 10: Adaptive Dark/Light/High-Contrast Theme Engine
 * Syncs with OS preference, supports high-contrast mode, persists to server
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'high-contrast' | 'system';
export type ResolvedTheme = 'light' | 'dark' | 'high-contrast';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  switchable: boolean;
  systemPreference: 'light' | 'dark';
  prefersHighContrast: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

const THEME_CLASSES: Record<ResolvedTheme, string[]> = {
  'light': [],
  'dark': ['dark'],
  'high-contrast': ['dark', 'high-contrast'],
};

export function ThemeProvider({ children, defaultTheme = 'system', switchable = true }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (!switchable) return defaultTheme;
    try { return (localStorage.getItem('naijahomes-theme') as Theme) || defaultTheme; } catch { return defaultTheme; }
  });

  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  const [prefersHighContrast, setPrefersHighContrast] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-contrast: more)').matches
  );

  // Listen to OS preference changes
  useEffect(() => {
    const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
    const contrastMQ = window.matchMedia('(prefers-contrast: more)');

    const onDarkChange = (e: MediaQueryListEvent) => setSystemPreference(e.matches ? 'dark' : 'light');
    const onContrastChange = (e: MediaQueryListEvent) => setPrefersHighContrast(e.matches);

    darkMQ.addEventListener('change', onDarkChange);
    contrastMQ.addEventListener('change', onContrastChange);
    return () => {
      darkMQ.removeEventListener('change', onDarkChange);
      contrastMQ.removeEventListener('change', onContrastChange);
    };
  }, []);

  const resolvedTheme: ResolvedTheme = (() => {
    if (theme === 'high-contrast') return 'high-contrast';
    if (theme === 'system') {
      if (prefersHighContrast) return 'high-contrast';
      return systemPreference;
    }
    return theme as ResolvedTheme;
  })();

  // Apply theme classes to document root
  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove('dark', 'high-contrast');
    // Add resolved theme classes
    THEME_CLASSES[resolvedTheme].forEach(cls => root.classList.add(cls));
    // Set color-scheme for browser UI (scrollbars, inputs)
    root.style.colorScheme = resolvedTheme === 'light' ? 'light' : 'dark';
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'light' ? '#ffffff' : '#0f172a');
    }
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (switchable) {
      try { localStorage.setItem('naijahomes-theme', newTheme); } catch {}
      // Sync to server for cross-device persistence
      fetch('/api/trpc/user.updatePreferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      }).catch(() => {}); // Non-blocking
    }
  }, [switchable]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, switchable, systemPreference, prefersHighContrast }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Theme switcher UI component */
export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { theme, setTheme, switchable } = useTheme();
  if (!switchable) return null;

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'high-contrast', label: 'High Contrast', icon: '◑' },
    { value: 'system', label: 'System', icon: '💻' },
  ];

  return (
    <div className={`flex gap-1 p-1 bg-muted rounded-lg ${className}`} role="group" aria-label="Theme selection">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            theme === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={theme === opt.value}
          title={opt.label}
        >
          <span aria-hidden="true">{opt.icon}</span>
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export default ThemeProvider;
