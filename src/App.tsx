import React, { FC } from 'react'
import { Provider } from 'react-redux'
import { store } from 'store/store'
import { RbacPage } from 'pages/RbacPage'
import { ThemeModeProvider } from 'hooks/ThemeModeContext'
import { useThemeMode } from 'hooks/useThemeMode'
import { AppInner } from './AppInner'

export type TAppProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  withRoutes?: boolean
  toggleTheme?: () => void
}

export const App: FC<TAppProps> = ({
  cluster,
  namespace,
  syntheticProject,
  pluginName,
  pluginPath,
  withRoutes,
  toggleTheme,
}) => {
  const { mode, toggleTheme: toggleThemeInternal } = useThemeMode(toggleTheme)

  const providerValue = { mode, toggleTheme: toggleThemeInternal }

  // Logic is specific for type of plugin
  if (!withRoutes) {
    return (
      <ThemeModeProvider value={providerValue}>
        <Provider store={store}>
          <RbacPage
            cluster={cluster}
            namespace={namespace}
            syntheticProject={syntheticProject}
            pluginName={pluginName}
            pluginPath={pluginPath}
            toggleTheme={toggleTheme}
          />
        </Provider>
      </ThemeModeProvider>
    )
  }
  return (
    <ThemeModeProvider value={providerValue}>
      <Provider store={store}>
        <AppInner
          cluster={cluster}
          namespace={namespace}
          syntheticProject={syntheticProject}
          pluginName={pluginName}
          pluginPath={pluginPath}
          toggleTheme={toggleTheme}
        />
      </Provider>
    </ThemeModeProvider>
  )
}

// eslint-disable-next-line import/no-default-export
export default App
