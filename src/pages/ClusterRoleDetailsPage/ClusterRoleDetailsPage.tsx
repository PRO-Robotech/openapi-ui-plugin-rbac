import React, { FC, useMemo } from 'react'
import { Alert, Empty, Typography } from 'antd'
import {
  DynamicComponents,
  DynamicRendererWithProviders,
  type TDynamicComponentsAppTypeMap,
} from '@prorobotech/openapi-k8s-toolkit'
import { useParams } from 'react-router-dom'
import {
  RbacInlineDetailsSection,
  type TRbacInlineDetailsSectionData,
} from 'components/organisms/RbacInlineDetailsSection'
import { useTheme } from 'hooks/ThemeModeContext'
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

const getPluginBasePath = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.at(-2) === 'clusterroles') {
    return `/${segments.slice(0, -2).join('/')}`
  }

  if (segments.at(-1) === 'rbac' || segments.at(-1) === 'table') {
    return `/${segments.slice(0, -1).join('/')}`
  }

  return pathname
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
    <>
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
    </>
  )
}
