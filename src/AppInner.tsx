/* eslint-disable import/no-default-export */
import React, { FC } from 'react'
import { Routes, Route, Navigate, useInRouterContext, useLocation } from 'react-router-dom'
import { AccountDetailsPage, ClusterRoleDetailsPage, RbacPage, RbacTablePage, RoleDetailsPage } from 'pages'

export type TAppInnerProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

const ReversedViewRedirect: FC<{ to: string }> = ({ to }) => {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)

  searchParams.set('view', 'reversed')

  return <Navigate to={`${to}?${searchParams.toString()}`} replace />
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

      <Route
        path="table"
        element={
          <RbacTablePage
            cluster={cluster}
            namespace={namespace}
            syntheticProject={syntheticProject}
            pluginName={pluginName}
            pluginPath={pluginPath}
            toggleTheme={toggleTheme}
          />
        }
      />

      <Route path="reverse" element={<ReversedViewRedirect to="../rbac" />} />

      <Route path="table-reverse" element={<ReversedViewRedirect to="../table" />} />

      <Route
        path="clusterroles/:name"
        element={
          <ClusterRoleDetailsPage
            cluster={cluster}
            namespace={namespace}
            syntheticProject={syntheticProject}
            pluginName={pluginName}
            pluginPath={pluginPath}
            toggleTheme={toggleTheme}
          />
        }
      />

      <Route
        path="accounts/serviceaccounts/:namespace/:name"
        element={
          <AccountDetailsPage
            cluster={cluster}
            namespace={namespace}
            syntheticProject={syntheticProject}
            pluginName={pluginName}
            pluginPath={pluginPath}
            toggleTheme={toggleTheme}
          />
        }
      />

      <Route
        path="accounts/:accountKind/:name"
        element={
          <AccountDetailsPage
            cluster={cluster}
            namespace={namespace}
            syntheticProject={syntheticProject}
            pluginName={pluginName}
            pluginPath={pluginPath}
            toggleTheme={toggleTheme}
          />
        }
      />

      <Route
        path="roles/:namespace/:name"
        element={
          <RoleDetailsPage
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
