import React, { FC } from 'react'
import { RbacGraph, RbacPageShell } from 'components'
import { buildRbacPageBreadcrumbs } from 'utils/rbacBreadcrumbs'

type TRbacPageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

export const RbacPage: FC<TRbacPageProps> = ({ cluster }) => {
  return (
    <RbacPageShell breadcrumbItems={buildRbacPageBreadcrumbs()}>
      <RbacGraph clusterId={cluster ?? ''} />
    </RbacPageShell>
  )
}
