import { useEffect, useState } from 'react';

export type BranchTheme = 'dark' | 'light';
const storageKey = 'cirox:branch-theme';

function savedTheme(): BranchTheme {
  try { return window.localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

export function useBranchTheme() {
  const [theme, setTheme] = useState<BranchTheme>(savedTheme);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setTheme(savedTheme());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { window.localStorage.setItem(storageKey, next); } catch { /* Theme still works when storage is blocked. */ }
  };

  return { theme, toggleTheme };
}
