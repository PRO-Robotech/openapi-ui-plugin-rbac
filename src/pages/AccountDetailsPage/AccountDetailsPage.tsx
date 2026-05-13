import React, { FC, useMemo } from 'react'
import { Alert, Empty, Typography } from 'antd'
import { DynamicComponents, type TDynamicComponentsAppTypeMap } from '@prorobotech/openapi-k8s-toolkit'
import { useParams } from 'react-router-dom'
import { RbacPageShell } from 'components'
import { RbacFactoryRenderer } from 'components/organisms'
import {
  RbacInlineDetailsSection,
  type TRbacInlineDetailsSectionData,
} from 'components/organisms/RbacInlineDetailsSection'
import { useTheme } from 'hooks/ThemeModeContext'
import { buildAccountDetailsBreadcrumbs } from 'utils/rbacBreadcrumbs'
import { getPluginBasePath } from 'utils/getPluginBasePath'
import { buildAccountDetailsFactory, type TAccountDetailsKind } from './buildAccountDetailsFactory'

export type TAccountDetailsPageComponentMap = TDynamicComponentsAppTypeMap & {
  RbacInlineDetailsSection: TRbacInlineDetailsSectionData
}

type TAccountDetailsPageProps = {
  cluster?: string
  namespace?: string
  syntheticProject?: string
  pluginName?: string
  pluginPath?: string
  toggleTheme?: () => void
}

const ACCOUNT_KIND_BY_ROUTE: Record<string, TAccountDetailsKind> = {
  serviceaccounts: 'ServiceAccount',
  users: 'User',
  groups: 'Group',
}

const getAccountDetailsKind = ({
  accountKind,
  namespace,
}: {
  accountKind?: string
  namespace?: string
}): TAccountDetailsKind | undefined => {
  if (accountKind) {
    return ACCOUNT_KIND_BY_ROUTE[accountKind]
  }

  if (namespace) {
    return 'ServiceAccount'
  }

  return undefined
}

export const AccountDetailsPage: FC<TAccountDetailsPageProps> = ({ cluster }) => {
  const { mode } = useTheme()
  const { accountKind, namespace, name } = useParams<{
    accountKind: string
    namespace?: string
    name: string
  }>()
  const components = useMemo(
    () => ({
      ...DynamicComponents,
      RbacInlineDetailsSection,
    }),
    [],
  )

  const clusterId = cluster ?? ''
  const kind = getAccountDetailsKind({ accountKind, namespace })
  const accountName = name ?? ''
  const accountNamespace = namespace ?? ''
  const basePath = useMemo(() => getPluginBasePath(typeof window === 'undefined' ? '' : window.location.pathname), [])
  const breadcrumbItems = useMemo(
    () =>
      buildAccountDetailsBreadcrumbs({
        clusterId,
        kind,
        name: accountName,
        namespace: accountNamespace,
      }),
    [accountName, accountNamespace, clusterId, kind],
  )

  const factoryData = useMemo(
    () =>
      kind
        ? buildAccountDetailsFactory({
            clusterId,
            kind,
            namespace: kind === 'ServiceAccount' ? accountNamespace : undefined,
            name: accountName,
            basePath,
          })
        : null,
    [accountName, accountNamespace, basePath, clusterId, kind],
  )

  if (!clusterId) {
    return <Alert type="error" message="Cluster is required to open account details." />
  }

  if (!kind || !accountName || (kind === 'ServiceAccount' && !accountNamespace)) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Account route params are incomplete." />
  }

  if (!factoryData) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Account factory is unavailable." />
  }

  return (
    <RbacPageShell breadcrumbItems={breadcrumbItems}>
      <Typography.Title level={4} style={{ display: 'none' }}>
        Account details
      </Typography.Title>
      <RbacFactoryRenderer<TAccountDetailsPageComponentMap>
        components={components}
        factoryData={factoryData}
        theme={mode}
      />
    </RbacPageShell>
  )
}
