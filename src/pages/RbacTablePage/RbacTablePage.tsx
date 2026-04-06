import React, { FC } from 'react'
import { RbacTable } from 'components'

type TRbacTablePageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

export const RbacTablePage: FC<TRbacTablePageProps> = ({ cluster }) => {
  return <RbacTable clusterId={cluster ?? ''} />
}
