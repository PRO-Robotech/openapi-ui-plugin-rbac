/* eslint-disable no-nested-ternary */
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { TRbacNode, TRbacRoleDetailsResponse } from 'localTypes/rbacGraph'

const getRbacRoleDetailsApiUrl = (clusterId: string) =>
  `/api/clusters/${clusterId}/k8s/apis/rbacgraph.incloud.io/v1alpha1/rolepermissionsviews`

const buildRoleDetailsPayload = (node: Pick<TRbacNode, 'type' | 'name' | 'namespace'>) => ({
  spec: {
    role: {
      kind: node.type,
      name: node.name,
      ...(node.type === 'role' && node.namespace ? { namespace: node.namespace } : {}),
    },
  },
})

type TNewVerbPermission = {
  granted?: boolean
  supportedByApi?: boolean
  rules?: Array<{
    ruleIndex?: number
    apiGroups?: string[]
    resources?: string[]
    verbs?: string[]
    nonResourceURLs?: string[]
  }>
}

type TNewResourcePermission = {
  plural?: string
  phantom?: boolean
  verbs?: Record<string, TNewVerbPermission>
}

type TNewApiGroupPermission = {
  apiGroup?: string
  resources?: TNewResourcePermission[]
}

type TNewNonResourceUrlPermission = {
  url?: string
  verbs?: Record<string, TNewVerbPermission>
}

type TNewStatus = {
  name?: string
  scope?: string
  apiGroups?: TNewApiGroupPermission[]
  nonResourceUrls?: {
    urls?: TNewNonResourceUrlPermission[]
  }
}

const normalizeRuleOrigins = (rules: TNewVerbPermission['rules']) =>
  Array.isArray(rules)
    ? rules.map(rule => ({
        apiGroups: Array.isArray(rule.apiGroups) ? rule.apiGroups : undefined,
        resources: Array.isArray(rule.resources) ? rule.resources : undefined,
        verbs: Array.isArray(rule.verbs) ? rule.verbs : [],
        nonResourceURLs: Array.isArray(rule.nonResourceURLs) ? rule.nonResourceURLs : undefined,
        sourceRuleIndex: typeof rule.ruleIndex === 'number' ? rule.ruleIndex : undefined,
      }))
    : []

const normalizeRoleDetailsResponse = (
  status: TNewStatus,
  node: Pick<TRbacNode, 'type' | 'name' | 'namespace'>,
): TRbacRoleDetailsResponse => {
  const resourceGroups = Array.isArray(status.apiGroups)
    ? status.apiGroups.map(group => ({
        apiGroup: group.apiGroup === 'core' ? '' : String(group.apiGroup ?? ''),
        displayName: group.apiGroup === 'core' ? 'core (v1)' : String(group.apiGroup ?? ''),
        existsInApi: null,
        resources: Array.isArray(group.resources)
          ? group.resources.map(resource => {
              const verbsRecord = resource.verbs ?? {}
              const activeVerbs = Object.entries(verbsRecord).filter(([, permission]) => permission?.granted !== false)

              return {
                resource: String(resource.plural ?? ''),
                kind: null,
                existsInApi: typeof resource.phantom === 'boolean' ? !resource.phantom : null,
                apiVerbs: activeVerbs
                  .filter(([, permission]) => permission?.supportedByApi !== false)
                  .map(([verb]) => verb),
                resourceNames: [],
                verbs: activeVerbs.map(([verb]) => verb),
                verbOrigins: Object.fromEntries(
                  activeVerbs.map(([verb, permission]) => [verb, normalizeRuleOrigins(permission?.rules)]),
                ),
              }
            })
          : [],
      }))
    : []

  const nonResourceUrlsFromStatus = status.nonResourceUrls?.urls
  const nonResourceUrlEntries = Array.isArray(nonResourceUrlsFromStatus) ? nonResourceUrlsFromStatus : []

  const nonResourceUrls =
    nonResourceUrlEntries.length > 0
      ? nonResourceUrlEntries.map(permission => {
          const verbsRecord = permission.verbs ?? {}
          const activeVerbs = Object.entries(verbsRecord).filter(
            ([, verbPermission]) => verbPermission?.granted !== false,
          )

          return {
            url: String(permission.url ?? ''),
            verbs: activeVerbs.map(([verb]) => verb),
            verbOrigins: Object.fromEntries(
              activeVerbs.map(([verb, verbPermission]) => [verb, normalizeRuleOrigins(verbPermission?.rules)]),
            ),
          }
        })
      : []

  return {
    uid: '',
    kind: node.type,
    name: String(status.name ?? node.name),
    namespace: node.type === 'role' ? node.namespace : undefined,
    labels: undefined,
    annotations: undefined,
    aggregated: false,
    aggregationSources: [],
    rules: [],
    resourceGroups,
    nonResourceUrls,
    bindings: [],
  }
}

type TUseRbacRoleDetailsQueryArgs = {
  clusterId: string
  node: Pick<TRbacNode, 'type' | 'name' | 'namespace'> | null
}

export const useRbacRoleDetailsQuery = ({ clusterId, node }: TUseRbacRoleDetailsQueryArgs) =>
  useQuery({
    enabled: Boolean(clusterId && node),
    queryKey: ['rbac-role-details', clusterId, node?.type, node?.name, node?.namespace],
    queryFn: async (): Promise<TRbacRoleDetailsResponse> => {
      if (!node) {
        throw new Error('Role details query requires a selected node.')
      }

      const { data } = await axios.post(getRbacRoleDetailsApiUrl(clusterId), buildRoleDetailsPayload(node))
      const status =
        typeof data === 'object' && data !== null && typeof data.status === 'object' && data.status !== null
          ? (data.status as TNewStatus)
          : {}

      return normalizeRoleDetailsResponse(status, node)
    },
  })
