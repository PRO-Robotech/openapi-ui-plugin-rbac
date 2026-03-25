/* eslint-disable import/no-default-export */
import React, { FC } from 'react'
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
  return (
    <RbacPage
      cluster={cluster}
      namespace={namespace}
      syntheticProject={syntheticProject}
      pluginName={pluginName}
      pluginPath={pluginPath}
      toggleTheme={toggleTheme}
    />
  )
}
