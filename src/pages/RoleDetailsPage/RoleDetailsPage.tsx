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

const getPluginBasePath = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.at(-3) === 'roles') {
    return `/${segments.slice(0, -3).join('/')}`
  }

  if (segments.at(-2) === 'clusterroles') {
    return `/${segments.slice(0, -2).join('/')}`
  }

  if (segments.at(-1) === 'rbac' || segments.at(-1) === 'table') {
    return `/${segments.slice(0, -1).join('/')}`
  }

  return pathname
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
    <>
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
    </>
  )
}
