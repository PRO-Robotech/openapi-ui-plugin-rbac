/* eslint-disable import/no-default-export */
import React, { FC } from 'react'
import { Styled } from './styled'
// import { useTheme } from 'hooks/ThemeModeContext'

export type TGreetingProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
}

export const Greeting: FC<TGreetingProps> = ({ cluster, namespace, syntheticProject, pluginName, pluginPath }) => {
  return (
    <Styled.Container>
      <h3>🚀 Plugin Loaded!</h3>
      <Styled.CustomPre>
        {JSON.stringify(
          {
            cluster,
            namespace,
            syntheticProject,
            pluginName,
            pluginPath,
          },
          null,
          2,
        )}
      </Styled.CustomPre>
    </Styled.Container>
  )
}
