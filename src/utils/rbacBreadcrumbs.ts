import type { TRbacBreadcrumbLink } from 'components/molecules'
import { OPENAPI_UI_BASEPREFIX } from './runtimeConfig'

const API_GROUP = 'rbac.authorization.k8s.io'
const API_VERSION = 'v1'

const buildApiLabel = (plural: 'roles' | 'clusterroles') => `${API_GROUP}/${API_VERSION}/${plural}`
const buildAccountLabel = (kind?: string) => {
  if (kind === 'ServiceAccount') return 'v1/serviceaccounts'
  if (kind === 'Group') return 'RBAC Groups'
  if (kind === 'User') return 'RBAC Users'
  return 'RBAC Accounts'
}

const buildAccountListLink = ({
  clusterId,
  kind,
  namespace,
}: {
  clusterId: string
  kind?: string
  namespace?: string
}) => {
  if (kind === 'ServiceAccount') {
    const namespaceSegment = namespace ? `/${namespace}` : ''

    return `${OPENAPI_UI_BASEPREFIX}/${clusterId}${namespaceSegment}/builtin-table/serviceaccounts`
  }

  if (kind === 'Group' || kind === 'User') {
    return `${OPENAPI_UI_BASEPREFIX}/${clusterId}/plugins/plugin-rbac/table-reverse`
  }

  return undefined
}

export const buildRbacPageBreadcrumbs = (): TRbacBreadcrumbLink[] => [
  {
    key: 'rbac',
    label: 'RBAC',
  },
]

export const buildRbacReversePageBreadcrumbs = (): TRbacBreadcrumbLink[] => [
  {
    key: 'rbac-reverse',
    label: 'RBAC Reverse Graph',
  },
]

export const buildRbacTablePageBreadcrumbs = (): TRbacBreadcrumbLink[] => [
  {
    key: 'rbac-table',
    label: 'RBAC Table',
  },
]

export const buildRbacReverseTablePageBreadcrumbs = (): TRbacBreadcrumbLink[] => [
  {
    key: 'rbac-reverse-table',
    label: 'RBAC Reverse Table',
  },
]

export const buildRoleDetailsBreadcrumbs = ({
  clusterId,
  namespace,
  roleName,
}: {
  clusterId: string
  namespace: string
  roleName: string
}): TRbacBreadcrumbLink[] => [
  {
    key: 'roles',
    label: buildApiLabel('roles'),
    link: `${OPENAPI_UI_BASEPREFIX}/${clusterId}/${namespace}/api-table/${API_GROUP}/${API_VERSION}/roles`,
  },
  {
    key: 'role-name',
    label: roleName,
  },
  {
    key: 'details',
    label: 'Details',
  },
]

export const buildClusterRoleDetailsBreadcrumbs = ({
  clusterId,
  clusterRoleName,
}: {
  clusterId: string
  clusterRoleName: string
}): TRbacBreadcrumbLink[] => [
  {
    key: 'clusterroles',
    label: buildApiLabel('clusterroles'),
    link: `${OPENAPI_UI_BASEPREFIX}/${clusterId}/api-table/${API_GROUP}/${API_VERSION}/clusterroles`,
  },
  {
    key: 'clusterrole-name',
    label: clusterRoleName,
  },
  {
    key: 'details',
    label: 'Details',
  },
]

export const buildAccountDetailsBreadcrumbs = ({
  clusterId,
  kind,
  namespace,
  name,
}: {
  clusterId: string
  kind?: string
  namespace?: string
  name: string
}): TRbacBreadcrumbLink[] => [
  {
    key: 'accounts',
    label: buildAccountLabel(kind),
    link: buildAccountListLink({ clusterId, kind, namespace }),
  },
  {
    key: 'account-name',
    label: name,
  },
  {
    key: 'details',
    label: 'Details',
  },
]
