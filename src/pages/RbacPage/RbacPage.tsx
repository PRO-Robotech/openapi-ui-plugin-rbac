import React, { FC } from 'react'
import { Greeting } from 'components'

type TRbacPageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

export const RbacPage: FC<TRbacPageProps> = props => {
  return <Greeting {...props} />
}
