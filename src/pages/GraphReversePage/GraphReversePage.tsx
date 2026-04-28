import React, { FC } from 'react'
import { RbacPageShell, RbacReverseGraph } from 'components'
import { buildRbacReversePageBreadcrumbs } from 'utils/rbacBreadcrumbs'

type TGraphReversePageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

export const GraphReversePage: FC<TGraphReversePageProps> = ({ cluster }) => {
  return (
    <RbacPageShell breadcrumbItems={buildRbacReversePageBreadcrumbs()}>
      <RbacReverseGraph clusterId={cluster ?? ''} />
    </RbacPageShell>
  )
}
