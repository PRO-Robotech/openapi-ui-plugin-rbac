import type { TRbacBreadcrumbLink } from 'components/molecules'
import { OPENAPI_UI_BASEPREFIX } from './runtimeConfig'

const API_GROUP = 'rbac.authorization.k8s.io'
const API_VERSION = 'v1'

const buildApiLabel = (plural: 'roles' | 'clusterroles') => `${API_GROUP}/${API_VERSION}/${plural}`

export const buildRbacPageBreadcrumbs = (): TRbacBreadcrumbLink[] => [
  {
    key: 'rbac',
    label: 'RBAC',
  },
]

export const buildRbacTablePageBreadcrumbs = (): TRbacBreadcrumbLink[] => [
  {
    key: 'rbac-table',
    label: 'RBAC Table',
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
