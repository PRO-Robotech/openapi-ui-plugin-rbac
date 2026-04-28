import type { TRbacQueryPayload, TRbacReverseQueryPayload, TRbacGraphOptions, TRbacNode } from 'localTypes/rbacGraph'

export const LEGEND = [
  { label: 'Grants', color: '#0f766e' },
  { label: 'Subjects', color: '#475569' },
  { label: 'Aggregates', color: '#c2410c', dashed: true },
  { label: 'Permissions', color: '#2563eb' },
  { label: 'Runs As', color: '#0ea5a4' },
  { label: 'Owned By', color: '#334155' },
]

export const DEFAULT_PAYLOAD: TRbacQueryPayload = {
  spec: {
    selector: { apiGroups: [], resources: [], verbs: [], resourceNames: [], nonResourceURLs: [] },
    matchMode: 'any',
    wildcardMode: 'expand',
    includeRuleMetadata: true,
    includePods: false,
    includeWorkloads: false,
    podPhaseMode: 'active',
    maxPodsPerSubject: 20,
    maxWorkloadsPerPod: 10,
    filterPhantomAPIs: true,
  },
}

export const DEFAULT_REVERSE_PAYLOAD: TRbacReverseQueryPayload = {
  spec: {
    subject: { kind: '', name: '' },
    selector: { apiGroups: [], resources: [], verbs: [], resourceNames: [], nonResourceURLs: [] },
    matchMode: 'any',
    wildcardMode: 'expand',
    directOnly: false,
    filterPhantomAPIs: true,
  },
}

export const DEFAULT_OPTIONS: TRbacGraphOptions = {
  showRoles: true,
  showBindings: true,
  showSubjects: true,
  showAggregateEdges: true,
  onlyReachable: false,
  showPermissions: false,
  starMode: false,
  reduceEdgeCrossings: false,
  includePods: false,
  includeWorkloads: false,
}

export const EMPTY_SELECTOR_SELECTION = {
  apiGroups: [] as string[],
  resources: [] as string[],
  verbs: [] as string[],
  resourceNames: [] as string[],
  nonResourceURLs: [] as string[],
}

export const ROLE_NODE_TYPES = new Set<TRbacNode['type']>(['Role', 'ClusterRole'])
export const SUBJECT_NODE_TYPES = new Set<TRbacNode['type']>(['User', 'Group', 'ServiceAccount'])
