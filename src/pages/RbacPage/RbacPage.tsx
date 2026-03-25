import React, { FC } from 'react'
import { RbacGraph } from 'components'

type TRbacPageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

export const RbacPage: FC<TRbacPageProps> = ({ cluster }) => {
  return <RbacGraph clusterId={cluster ?? ''} />
}
