import { createContext, useContext } from 'react'

export type TThemeMode = 'light' | 'dark'

type TThemeModeContextValue = {
  mode: TThemeMode
  toggleTheme?: () => void
}

const ThemeModeContext = createContext<TThemeModeContextValue | null>(null)

export const ThemeModeProvider = ThemeModeContext.Provider

export const useTheme = () => {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeModeProvider')
  return ctx
}
