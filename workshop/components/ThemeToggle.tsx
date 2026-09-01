'use client';

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return document.documentElement.dataset.theme === 'light';
}

function getServerSnapshot(): boolean {
  return false;
}

export function ThemeToggle(): React.JSX.Element {
  const isLight = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggleTheme(): void {
    const next = isLight ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    listeners.forEach((listener) => listener());
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme}>
      {isLight ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
