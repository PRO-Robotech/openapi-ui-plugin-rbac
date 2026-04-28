import React, { FC } from 'react'
import { RbacPageShell, RbacTable } from 'components'
import { buildRbacReverseTablePageBreadcrumbs } from 'utils/rbacBreadcrumbs'

type TTableReversePageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

export const TableReversePage: FC<TTableReversePageProps> = ({ cluster }) => {
  return (
    <RbacPageShell breadcrumbItems={buildRbacReverseTablePageBreadcrumbs()}>
      <RbacTable clusterId={cluster ?? ''} mode="subject" />
    </RbacPageShell>
  )
}
