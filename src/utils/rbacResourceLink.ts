import { getResourceLink } from '@prorobotech/openapi-k8s-toolkit'
import type { TNavigationResource } from '@prorobotech/openapi-k8s-toolkit'
import type { TRbacNode } from 'localTypes/rbacGraph'
import { getRuntimeFactoryConfig, OPENAPI_UI_BASEPREFIX } from './runtimeConfig'

type TRbacLinkableNode = Pick<TRbacNode, 'type' | 'name' | 'namespace'>

type TResourceRouteConfig = {
  apiGroupVersion: string
  pluralName: string
  needsNamespace: boolean
}

export const RBAC_NAVIGATION_QUERY = {
  apiGroup: 'front.in-cloud.io',
  apiVersion: 'v1alpha1',
  plural: 'navigations',
  fieldSelector: 'metadata.name=navigation',
} as const

const RBAC_RESOURCE_ROUTE_CONFIG: Partial<Record<TRbacNode['type'], TResourceRouteConfig>> = {
  Role: {
    apiGroupVersion: 'rbac.authorization.k8s.io/v1',
    pluralName: 'roles',
    needsNamespace: true,
  },
  ClusterRole: {
    apiGroupVersion: 'rbac.authorization.k8s.io/v1',
    pluralName: 'clusterroles',
    needsNamespace: false,
  },
  RoleBinding: {
    apiGroupVersion: 'rbac.authorization.k8s.io/v1',
    pluralName: 'rolebindings',
    needsNamespace: true,
  },
  ClusterRoleBinding: {
    apiGroupVersion: 'rbac.authorization.k8s.io/v1',
    pluralName: 'clusterrolebindings',
    needsNamespace: false,
  },
  ServiceAccount: {
    apiGroupVersion: 'v1',
    pluralName: 'serviceaccounts',
    needsNamespace: true,
  },
}

export const getNavigationBaseFactoriesMapping = (
  navigationData?: { items?: TNavigationResource[] } | null,
): Record<string, string> | undefined => {
  const navigationResource = navigationData?.items?.[0]
  return navigationResource?.spec?.baseFactoriesMapping
}

export const getRbacResourceHref = ({
  clusterId,
  node,
  baseFactoriesMapping,
}: {
  clusterId: string
  node: TRbacLinkableNode
  baseFactoriesMapping?: Record<string, string>
}): string | undefined => {
  const resourceConfig = RBAC_RESOURCE_ROUTE_CONFIG[node.type]

  if (!clusterId || !resourceConfig || !node.name) {
    return undefined
  }

  if (resourceConfig.needsNamespace && !node.namespace) {
    return undefined
  }

  const runtimeFactoryConfig = getRuntimeFactoryConfig()

  return getResourceLink({
    baseprefix: OPENAPI_UI_BASEPREFIX,
    cluster: clusterId,
    namespace: node.namespace,
    apiGroupVersion: resourceConfig.apiGroupVersion,
    pluralName: resourceConfig.pluralName,
    name: node.name,
    baseFactoriesMapping,
    baseFactoryNamespacedAPIKey: runtimeFactoryConfig.baseFactoryNamespacedAPIKey,
    baseFactoryClusterSceopedAPIKey: runtimeFactoryConfig.baseFactoryClusterSceopedAPIKey,
    baseFactoryNamespacedBuiltinKey: runtimeFactoryConfig.baseFactoryNamespacedBuiltinKey,
    baseFactoryClusterSceopedBuiltinKey: runtimeFactoryConfig.baseFactoryClusterSceopedBuiltinKey,
  })
}
