import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Initial sync
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');

    // System preference change listener
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('ucds_theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        if (e.matches) {
          document.documentElement.classList.add('dark');
          document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', 'light');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('ucds_theme', nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', 'light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      className="inline-flex items-center justify-center p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/80 transition-all border border-slate-200/80 dark:border-slate-800 shadow-xs focus-visible:outline-2 focus-visible:outline-red-500"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-slate-700 transition-transform hover:-rotate-12" />
      ) : (
        <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
      )}
    </button>
  );
};
