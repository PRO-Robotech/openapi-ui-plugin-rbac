import React, { FC, useCallback } from 'react'
import { Tabs } from 'antd'
import { useSearchParams } from 'react-router-dom'
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

const VIEW_PARAM = 'view'
const REVERSED_VIEW = 'reversed'

export const RbacTablePage: FC<TRbacTablePageProps> = ({ cluster }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get(VIEW_PARAM) === REVERSED_VIEW ? REVERSED_VIEW : 'default'

  const handleTabChange = useCallback(
    (key: string) => {
      const nextSearchParams = new URLSearchParams(searchParams)

      if (key === REVERSED_VIEW) {
        nextSearchParams.set(VIEW_PARAM, REVERSED_VIEW)
      } else {
        nextSearchParams.delete(VIEW_PARAM)
      }

      setSearchParams(nextSearchParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return (
    <RbacPageShell breadcrumbItems={buildRbacTablePageBreadcrumbs()}>
      <Tabs
        activeKey={activeTab}
        destroyOnHidden
        onChange={handleTabChange}
        items={[
          {
            key: 'default',
            label: 'Default',
            children: activeTab === 'default' ? <RbacTable clusterId={cluster ?? ''} /> : null,
          },
          {
            key: REVERSED_VIEW,
            label: 'Reversed',
            children: activeTab === REVERSED_VIEW ? <RbacTable clusterId={cluster ?? ''} mode="subject" /> : null,
          },
        ]}
      />
    </RbacPageShell>
  )
}
