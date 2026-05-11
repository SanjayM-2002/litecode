import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

function applyToDom(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  root.style.colorScheme = theme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (t) => {
        applyToDom(t)
        set({ theme: t })
      },
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        applyToDom(next)
        set({ theme: next })
      },
    }),
    {
      name: 'litecode-theme',
      onRehydrateStorage: () => (state) => {
        // Apply the persisted/default theme to the DOM as soon as the store rehydrates
        // so we never flash the wrong theme on initial paint.
        applyToDom(state?.theme ?? 'dark')
      },
    },
  ),
)

/** Hook with the same shape as the old context-based useTheme. */
export function useTheme() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  return { theme, setTheme, toggleTheme }
}
