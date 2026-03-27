import { type Node, type Edge } from '@xyflow/react'

export type TRbacNodeType =
  | 'role'
  | 'clusterRole'
  | 'roleBinding'
  | 'clusterRoleBinding'
  | 'aggregationRelation'
  | 'permission'
  | 'pod'
  | 'podOverflow'
  | 'workload'
  | 'workloadOverflow'
  | 'subject'

export type TRbacEdgeType =
  | 'grants'
  | 'subjects'
  | 'aggregates'
  | 'aggregates-source'
  | 'aggregates-target'
  | 'permissions-role'
  | 'permissions-binding'
  | 'runsAs'
  | 'ownedBy'

export type TRbacRuleRef = {
  apiGroups: string[]
  resources: string[]
  verbs: string[]
  resourceNames?: string[]
  nonResourceURLs?: string[]
}

export type TRbacNode = {
  id: string
  type: TRbacNodeType
  name: string
  namespace?: string
  aggregated?: boolean
  aggregationSources?: string[]
  matchedRuleRefs?: TRbacRuleRef[]
}

export type TRbacEdge = {
  id: string
  from: string
  to: string
  type: TRbacEdgeType
  ruleRefs?: TRbacRuleRef[]
  explain?: string
}

export type TRbacGraph = {
  nodes: TRbacNode[]
  edges: TRbacEdge[]
}

export type TRbacSelector = {
  apiGroups: string[]
  resources: string[]
  verbs: string[]
  resourceNames: string[]
  nonResourceURLs: string[]
}

export type TRbacNamespaceScope = {
  namespaces: string[]
  strict: boolean
}

export type TRbacQueryPayload = {
  spec: {
    selector: TRbacSelector
    matchMode: 'any' | 'all'
    includeRuleMetadata: boolean
    includePods: boolean
    includeWorkloads: boolean
    podPhaseMode: 'active' | 'running' | 'all'
    maxPodsPerSubject: number
    maxWorkloadsPerPod: number
    namespaceScope?: TRbacNamespaceScope
    impersonateUser?: string
    impersonateGroup?: string
  }
}

export type TRbacQueryResponse = {
  graph: TRbacGraph
  stats?: {
    matchedRoles: number
    matchedBindings: number
    matchedSubjects: number
  }
}

export type TRbacGraphOptions = {
  showRoles: boolean
  showBindings: boolean
  showSubjects: boolean
  showAggregateEdges: boolean
  onlyReachable: boolean
  showPermissions: boolean
  starMode: boolean
  reduceEdgeCrossings: boolean
  includePods: boolean
  includeWorkloads: boolean
}

export type TRbacGraphProps = {
  clusterId: string
}

export type TNonResourceUrlItem = {
  url: string
  verbs: string[]
  roles: string[]
}

export type TNonResourceUrlList = {
  items: TNonResourceUrlItem[]
}

export type TFlowModel = {
  nodes: Node[]
  edges: Edge[]
}

export type TRawRuleRef = TRbacRuleRef & {
  apiGroup?: string
  resource?: string
  subresource?: string
  verb?: string
  nonResourceURL?: string
  sourceObjectUID?: string
  sourceRuleIndex?: number
  phantom?: boolean
  expandedRefs?: TRawRuleRef[]
}

export type TParsedPermission = {
  id: string
  label: string
  verb: string
  target: string
  ruleKeys: string[]
  apiGroups: string[]
}

export type TRoleRuleDetail = {
  key: string
  ruleRef: TRbacRuleRef
  expandedPermissionCount: number
}

export type TRoleDetails = {
  node: TRbacNode
  rules: TRoleRuleDetail[]
  permissions: TParsedPermission[]
}
