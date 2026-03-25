/* eslint-disable import/no-default-export */
import React, { FC } from 'react'
import { Routes, Route, Navigate, useInRouterContext } from 'react-router-dom'
import { RbacPage } from 'pages'

export type TAppInnerProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

export const AppInner: FC<TAppInnerProps> = ({
  cluster,
  namespace,
  syntheticProject,
  pluginName,
  pluginPath,
  toggleTheme,
}) => {
  const inRouter = useInRouterContext()
  // eslint-disable-next-line no-console
  console.log('Plugin sees router context?', inRouter)

  if (!inRouter) return <div>Plugin is NOT under host Router (likely duplicate react-router-dom)</div>

  return (
    <Routes>
      <Route index element={<Navigate to="rbac" replace />} />

      {/* NOTE: paths are RELATIVE to /.../plugins/:pluginName/* */}
      <Route
        path="rbac"
        element={
          <RbacPage
            cluster={cluster}
            namespace={namespace}
            syntheticProject={syntheticProject}
            pluginName={pluginName}
            pluginPath={pluginPath}
            toggleTheme={toggleTheme}
          />
        }
      />

      {/* optional catch-all */}
      {/* <Route path="*" element={<MainPage />} /> */}
    </Routes>
  )
}
