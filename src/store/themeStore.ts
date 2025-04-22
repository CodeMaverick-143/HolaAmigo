import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeState = {
  darkMode: boolean;
  toggleDarkMode: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'hola-theme',
    }
  )
);