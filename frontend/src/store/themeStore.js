import { create } from 'zustand';

// Aplica/remove a classe .dark no <html> — é o que ativa as variantes
// dark: do Tailwind v4 (configurado via @custom-variant no index.css).
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Tema inicial: preferência salva > preferência do sistema operacional.
function getInitialTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useThemeStore = create((set, get) => ({
  theme: initialTheme,

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
    set({ theme: next });
  },
}));
