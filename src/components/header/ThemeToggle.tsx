'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Resolves to false during SSR and true once mounted on the client, without
  // a setState-in-effect that would trigger a cascading render.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground"
        aria-label="Toggle theme"
      >
        <Moon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="size-5" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}
