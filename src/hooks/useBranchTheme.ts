import { useEffect, useState } from 'react';

export type BranchTheme = 'dark' | 'light';
function savedTheme(storageKey: string): BranchTheme {
  try { return window.localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

export function useBranchTheme(storageKey = 'cirox:branch-theme') {
  const [theme, setTheme] = useState<BranchTheme>(() => savedTheme(storageKey));

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setTheme(savedTheme(storageKey));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { window.localStorage.setItem(storageKey, next); } catch { /* Theme still works when storage is blocked. */ }
  };

  return { theme, toggleTheme };
}
