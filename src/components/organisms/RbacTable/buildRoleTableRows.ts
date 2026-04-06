import type { TRbacGraph as TGraph, TRbacNode } from 'localTypes/rbacGraph'
import { ROLE_NODE_TYPES, SUBJECT_NODE_TYPES } from 'components/organisms/RbacGraph/constants'

export type TTableSubject = {
  key: string
  kind: Extract<TRbacNode['type'], 'User' | 'Group' | 'ServiceAccount'>
  name: string
  namespace?: string
}

export type TTableAggregationSource = {
  key: string
  type: TRbacNode['type']
  name: string
  namespace?: string
}

export type TRoleTableRow = {
  key: string
  roleNodeId: string
  roleKind: Extract<TRbacNode['type'], 'Role' | 'ClusterRole'>
  roleName: string
  namespace: string
  aggregated: boolean
  matchedRuleCount: number
  subjectsCount: number
  subjects: TTableSubject[]
  aggregationSourcesCount: number
  aggregationSources: TTableAggregationSource[]
}

const ROLE_SORT_ORDER: Record<TRoleTableRow['roleKind'], number> = {
  ClusterRole: 0,
  Role: 1,
}

const toSubjectKey = (node: TRbacNode) => `${node.type}:${node.namespace ?? ''}:${node.name}`
const toAggregationKey = (type: TRbacNode['type'], name: string, namespace?: string) =>
  `${type}:${namespace ?? ''}:${name}`

const sortSubjects = (left: TTableSubject, right: TTableSubject) =>
  left.kind.localeCompare(right.kind) ||
  (left.namespace ?? '').localeCompare(right.namespace ?? '') ||
  left.name.localeCompare(right.name)

const sortAggregationSources = (left: TTableAggregationSource, right: TTableAggregationSource) =>
  left.type.localeCompare(right.type) ||
  (left.namespace ?? '').localeCompare(right.namespace ?? '') ||
  left.name.localeCompare(right.name)

export const buildRoleTableRows = (graph: TGraph | null): TRoleTableRow[] => {
  if (!graph) return []

  const nodeById = new Map(graph.nodes.map(node => [node.id, node] as const))
  const subjectEdgesByBindingId = new Map<string, TRbacNode[]>()
  const subjectMapByRoleId = new Map<string, Map<string, TTableSubject>>()
  const aggregationMapByRoleId = new Map<string, Map<string, TTableAggregationSource>>()

  graph.edges.forEach(edge => {
    if (edge.type !== 'subjects') return

    const bindingId = edge.from
    const subjectNode = nodeById.get(edge.to)
    if (!subjectNode || !SUBJECT_NODE_TYPES.has(subjectNode.type)) return

    const subjectNodes = subjectEdgesByBindingId.get(bindingId) ?? []
    subjectNodes.push(subjectNode)
    subjectEdgesByBindingId.set(bindingId, subjectNodes)
  })

  graph.edges.forEach(edge => {
    if (edge.type !== 'grants') return

    const roleNode = nodeById.get(edge.from)
    if (!roleNode || !ROLE_NODE_TYPES.has(roleNode.type)) return

    const roleSubjects = subjectMapByRoleId.get(roleNode.id) ?? new Map<string, TTableSubject>()
    ;(subjectEdgesByBindingId.get(edge.to) ?? []).forEach(subjectNode => {
      roleSubjects.set(toSubjectKey(subjectNode), {
        key: toSubjectKey(subjectNode),
        kind: subjectNode.type as TTableSubject['kind'],
        name: subjectNode.name,
        namespace: subjectNode.namespace,
      })
    })
    subjectMapByRoleId.set(roleNode.id, roleSubjects)
  })

  graph.edges.forEach(edge => {
    if (edge.type !== 'aggregates' && edge.type !== 'aggregates-source' && edge.type !== 'aggregates-target') return

    const sourceNode = nodeById.get(edge.from)
    const targetNode = nodeById.get(edge.to)

    if (!sourceNode || !targetNode || !ROLE_NODE_TYPES.has(sourceNode.type) || !ROLE_NODE_TYPES.has(targetNode.type)) {
      return
    }

    const aggregationSources = aggregationMapByRoleId.get(targetNode.id) ?? new Map<string, TTableAggregationSource>()
    aggregationSources.set(toAggregationKey(sourceNode.type, sourceNode.name, sourceNode.namespace), {
      key: toAggregationKey(sourceNode.type, sourceNode.name, sourceNode.namespace),
      type: sourceNode.type,
      name: sourceNode.name,
      namespace: sourceNode.namespace,
    })
    aggregationMapByRoleId.set(targetNode.id, aggregationSources)
  })

  const rows = graph.nodes
    .filter((node): node is TRbacNode & { type: TRoleTableRow['roleKind'] } => ROLE_NODE_TYPES.has(node.type))
    .map<TRoleTableRow>(node => {
      const aggregationSources = aggregationMapByRoleId.get(node.id) ?? new Map<string, TTableAggregationSource>()

      ;(node.aggregationSources ?? []).forEach(source => {
        const sourceNode = nodeById.get(source)
        if (sourceNode && ROLE_NODE_TYPES.has(sourceNode.type)) {
          aggregationSources.set(toAggregationKey(sourceNode.type, sourceNode.name, sourceNode.namespace), {
            key: toAggregationKey(sourceNode.type, sourceNode.name, sourceNode.namespace),
            type: sourceNode.type,
            name: sourceNode.name,
            namespace: sourceNode.namespace,
          })
          return
        }

        aggregationSources.set(toAggregationKey('ClusterRole', source), {
          key: toAggregationKey('ClusterRole', source),
          type: 'ClusterRole',
          name: source,
        })
      })

      const subjects = Array.from(subjectMapByRoleId.get(node.id)?.values() ?? []).sort(sortSubjects)
      const sortedAggregationSources = Array.from(aggregationSources.values()).sort(sortAggregationSources)

      return {
        key: node.id,
        roleNodeId: node.id,
        roleKind: node.type,
        roleName: node.name,
        namespace: node.namespace ?? 'cluster-wide',
        aggregated: Boolean(node.aggregated),
        matchedRuleCount: node.matchedRuleRefs?.length ?? 0,
        subjectsCount: subjects.length,
        subjects,
        aggregationSourcesCount: sortedAggregationSources.length,
        aggregationSources: sortedAggregationSources,
      }
    })

  return rows.sort(
    (left, right) =>
      ROLE_SORT_ORDER[left.roleKind] - ROLE_SORT_ORDER[right.roleKind] ||
      left.namespace.localeCompare(right.namespace) ||
      left.roleName.localeCompare(right.roleName),
  )
}
