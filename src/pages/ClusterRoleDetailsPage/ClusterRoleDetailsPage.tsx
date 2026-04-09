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
import { buildClusterRoleDetailsBreadcrumbs } from 'utils/rbacBreadcrumbs'
import { getPluginBasePath } from 'utils/getPluginBasePath'
import { buildClusterRoleDetailsFactory } from './buildClusterRoleDetailsFactory'

export type TClusterRoleDetailsPageComponentMap = TDynamicComponentsAppTypeMap & {
  RbacInlineDetailsSection: TRbacInlineDetailsSectionData
}

type TClusterRoleDetailsPageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

export const ClusterRoleDetailsPage: FC<TClusterRoleDetailsPageProps> = ({ cluster }) => {
  const { mode } = useTheme()
  const { name } = useParams<{ name: string }>()
  const components = useMemo(
    () => ({
      ...DynamicComponents,
      RbacInlineDetailsSection,
    }),
    [],
  )

  const clusterId = cluster ?? ''
  const clusterRoleName = name ?? ''
  const basePath = useMemo(() => getPluginBasePath(typeof window === 'undefined' ? '' : window.location.pathname), [])
  const breadcrumbItems = useMemo(
    () =>
      buildClusterRoleDetailsBreadcrumbs({
        clusterId,
        clusterRoleName,
      }),
    [clusterId, clusterRoleName],
  )

  const factoryData = useMemo(
    () =>
      buildClusterRoleDetailsFactory({
        clusterId,
        clusterRoleName,
        basePath,
      }),
    [basePath, clusterId, clusterRoleName],
  )

  if (!clusterId) {
    return <Alert type="error" message="Cluster is required to open ClusterRole details." />
  }

  if (!clusterRoleName) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ClusterRole name is missing from the route." />
  }

  return (
    <RbacPageShell breadcrumbItems={breadcrumbItems}>
      <Typography.Title level={4} style={{ display: 'none' }}>
        ClusterRole details
      </Typography.Title>
      <DynamicRendererWithProviders<TClusterRoleDetailsPageComponentMap>
        components={components}
        items={factoryData.data}
        urlsToFetch={factoryData.urlsToFetch}
        effectiveReqIndexes={factoryData.effectiveReqIndexes}
        theme={mode}
      />
    </RbacPageShell>
  )
}
