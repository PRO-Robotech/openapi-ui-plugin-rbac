import React, { FC, useMemo } from 'react'
import { Alert, Empty, Typography } from 'antd'
import {
  DynamicComponents,
  DynamicRendererWithProviders,
  type TDynamicComponentsAppTypeMap,
} from '@prorobotech/openapi-k8s-toolkit'
import { useParams } from 'react-router-dom'
import { RbacPageShell } from 'components'
import {
  RbacInlineDetailsSection,
  type TRbacInlineDetailsSectionData,
} from 'components/organisms/RbacInlineDetailsSection'
import { useTheme } from 'hooks/ThemeModeContext'
import { buildRoleDetailsBreadcrumbs } from 'utils/rbacBreadcrumbs'
import { getPluginBasePath } from 'utils/getPluginBasePath'
import { buildRoleDetailsFactory } from './buildRoleDetailsFactory'

export type TRoleDetailsPageComponentMap = TDynamicComponentsAppTypeMap & {
  RbacInlineDetailsSection: TRbacInlineDetailsSectionData
}

type TRoleDetailsPageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

export const RoleDetailsPage: FC<TRoleDetailsPageProps> = ({ cluster }) => {
  const { mode } = useTheme()
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const components = useMemo(
    () => ({
      ...DynamicComponents,
      RbacInlineDetailsSection,
    }),
    [],
  )

  const clusterId = cluster ?? ''
  const roleNamespace = namespace ?? ''
  const roleName = name ?? ''
  const basePath = useMemo(() => getPluginBasePath(typeof window === 'undefined' ? '' : window.location.pathname), [])
  const breadcrumbItems = useMemo(
    () =>
      buildRoleDetailsBreadcrumbs({
        clusterId,
        namespace: roleNamespace,
        roleName,
      }),
    [clusterId, roleName, roleNamespace],
  )

  const factoryData = useMemo(
    () =>
      buildRoleDetailsFactory({
        clusterId,
        namespace: roleNamespace,
        roleName,
        basePath,
      }),
    [basePath, clusterId, roleName, roleNamespace],
  )

  if (!clusterId) {
    return <Alert type="error" message="Cluster is required to open Role details." />
  }

  if (!roleNamespace || !roleName) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Role route params are incomplete." />
  }

  return (
    <RbacPageShell breadcrumbItems={breadcrumbItems}>
      <Typography.Title level={4} style={{ display: 'none' }}>
        Role details
      </Typography.Title>
      <DynamicRendererWithProviders<TRoleDetailsPageComponentMap>
        components={components}
        items={factoryData.data}
        urlsToFetch={factoryData.urlsToFetch}
        effectiveReqIndexes={factoryData.effectiveReqIndexes}
        theme={mode}
      />
    </RbacPageShell>
  )
}
