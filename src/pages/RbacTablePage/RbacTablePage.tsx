import React, { FC } from 'react'
import { RbacPageShell, RbacTable } from 'components'
import { buildRbacTablePageBreadcrumbs } from 'utils/rbacBreadcrumbs'

type TRbacTablePageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

export const RbacTablePage: FC<TRbacTablePageProps> = ({ cluster }) => {
  return (
    <RbacPageShell breadcrumbItems={buildRbacTablePageBreadcrumbs()}>
      <RbacTable clusterId={cluster ?? ''} />
    </RbacPageShell>
  )
}
