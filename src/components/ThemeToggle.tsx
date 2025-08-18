import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost fab"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Toggle theme"
    >
      <span className="text-2xl transition-all duration-300 transform hover:scale-110">
        {isDark ? '☀️' : '🌙'}
      </span>
    </button>
  );
}
