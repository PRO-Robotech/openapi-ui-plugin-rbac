import { useCallback, useEffect, useState } from 'react'

const THEME_EVENT = 'openapi-theme-change'

type ThemeMode = 'light' | 'dark'

const readTheme = (): ThemeMode => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light')

export const useThemeMode = (externalToggleTheme?: () => void) => {
  const [mode, setMode] = useState<ThemeMode>(() => readTheme())

  // ✅ keep local state in sync when any federated module broadcasts theme change
  useEffect(() => {
    const onThemeEvent = () => setMode(readTheme())

    window.addEventListener(THEME_EVENT, onThemeEvent as EventListener)
    return () => window.removeEventListener(THEME_EVENT, onThemeEvent as EventListener)
  }, [])

  // ✅ optional convenience wrapper (if you need to trigger it from inside)
  const toggleTheme = useCallback(() => {
    if (externalToggleTheme) {
      // externalToggleTheme will set localStorage + dispatch + dispatch THEME_EVENT
      externalToggleTheme()
      // mode will update via the event listener
      return
    }

    // fallback if not provided
    const next = readTheme() === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    window.dispatchEvent(new CustomEvent(THEME_EVENT))
    setMode(next)
  }, [externalToggleTheme])

  return { mode, toggleTheme }
}
