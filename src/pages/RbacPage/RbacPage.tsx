import React, { FC, useCallback } from 'react'
import { Tabs } from 'antd'
import { useSearchParams } from 'react-router-dom'
import { RbacGraph, RbacPageShell, RbacReverseGraph } from 'components'
import { buildRbacPageBreadcrumbs } from 'utils/rbacBreadcrumbs'

type TRbacPageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

const VIEW_PARAM = 'view'
const REVERSED_VIEW = 'reversed'

export const RbacPage: FC<TRbacPageProps> = ({ cluster }) => {
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
    <RbacPageShell breadcrumbItems={buildRbacPageBreadcrumbs()}>
      <Tabs
        activeKey={activeTab}
        destroyOnHidden
        onChange={handleTabChange}
        items={[
          {
            key: 'default',
            label: 'Default',
            children: activeTab === 'default' ? <RbacGraph clusterId={cluster ?? ''} /> : null,
          },
          {
            key: REVERSED_VIEW,
            label: 'Reversed',
            children: activeTab === REVERSED_VIEW ? <RbacReverseGraph clusterId={cluster ?? ''} /> : null,
          },
        ]}
      />
    </RbacPageShell>
  )
}
