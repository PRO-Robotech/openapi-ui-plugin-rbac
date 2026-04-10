import type { TRbacAssessment, TRbacGraph as TGraph, TRbacNode } from 'localTypes/rbacGraph'
import { ROLE_NODE_TYPES, SUBJECT_NODE_TYPES } from 'components/organisms/RbacGraph/constants'

export type TTableSubject = {
  key: string
  kind: Extract<TRbacNode['type'], 'User' | 'Group' | 'ServiceAccount'>
  name: string
  namespace?: string
  phantom?: boolean
}

export type TTableAggregationSource = {
  key: string
  type: TRbacNode['type']
  name: string
  namespace?: string
}

export type TTableBinding = {
  key: string
  kind: Extract<TRbacNode['type'], 'RoleBinding' | 'ClusterRoleBinding'>
  name: string
  namespace?: string
}

export type TTableScope = 'cluster-wide' | 'narrowed' | 'same-ns' | 'cross-ns' | 'orphan'

export type TTableRuleSummaryItem = {
  key: string
  label: string
  tone: 'resource' | 'non-resource' | 'extra'
}

export type TTableAccountBinding = {
  key: string
  subject?: TTableSubject
  binding?: TTableBinding
  scope: TTableScope
  ruleCount: number
  ruleSummary: TTableRuleSummaryItem[]
}

export type TRoleTableRow = {
  key: string
  roleNodeId: string
  roleKind: Extract<TRbacNode['type'], 'Role' | 'ClusterRole'>
  roleName: string
  namespace: string
  assessment?: TRbacAssessment
  aggregated: boolean
  matchedRuleCount: number
  subjectsCount: number
  subjects: TTableSubject[]
  accountBindings: TTableAccountBinding[]
  aggregationSourcesCount: number
  aggregationSources: TTableAggregationSource[]
}

const ROLE_SORT_ORDER: Record<TRoleTableRow['roleKind'], number> = {
  ClusterRole: 0,
  Role: 1,
}

const toSubjectKey = (subject: Pick<TTableSubject, 'kind' | 'namespace' | 'name'>) =>
  `${subject.kind}:${subject.namespace ?? ''}:${subject.name}`
const toBindingKey = (node: TRbacNode) => `${node.type}:${node.namespace ?? ''}:${node.name}`
const toAggregationKey = (type: TRbacNode['type'], name: string, namespace?: string) =>
  `${type}:${namespace ?? ''}:${name}`

const parseAggregationSourceRef = (source: string): Pick<TTableAggregationSource, 'type' | 'name' | 'namespace'> => {
  const normalizedSource = source.trim()
  const [rawPrefix, ...rest] = normalizedSource.split(':')
  const prefix = rawPrefix?.toLowerCase()

  if (prefix === 'clusterrole' && rest.length > 0) {
    return {
      type: 'ClusterRole',
      name: rest.join(':'),
    }
  }

  if (prefix === 'role' && rest.length > 1) {
    return {
      type: 'Role',
      namespace: rest[0],
      name: rest.slice(1).join(':'),
    }
  }

  return {
    type: 'ClusterRole',
    name: normalizedSource,
  }
}

const sortSubjects = (left: TTableSubject, right: TTableSubject) =>
  left.kind.localeCompare(right.kind) ||
  (left.namespace ?? '').localeCompare(right.namespace ?? '') ||
  left.name.localeCompare(right.name)

const sortAggregationSources = (left: TTableAggregationSource, right: TTableAggregationSource) =>
  left.type.localeCompare(right.type) ||
  (left.namespace ?? '').localeCompare(right.namespace ?? '') ||
  left.name.localeCompare(right.name)

const sortAccountBindings = (left: TTableAccountBinding, right: TTableAccountBinding) =>
  (left.subject?.kind ?? '').localeCompare(right.subject?.kind ?? '') ||
  (left.subject?.namespace ?? '').localeCompare(right.subject?.namespace ?? '') ||
  (left.subject?.name ?? '').localeCompare(right.subject?.name ?? '') ||
  (left.binding?.kind ?? '').localeCompare(right.binding?.kind ?? '') ||
  (left.binding?.namespace ?? '').localeCompare(right.binding?.namespace ?? '') ||
  (left.binding?.name ?? '').localeCompare(right.binding?.name ?? '') ||
  left.scope.localeCompare(right.scope)

const buildRuleSummary = (node: TRbacNode): TTableRuleSummaryItem[] => {
  const resourceLabels = new Set<string>()
  const nonResourceLabels = new Set<string>()

  ;(node.matchedRuleRefs ?? []).forEach(ruleRef => {
    ;(ruleRef.resources ?? []).forEach(resource => {
      if (resource.trim().length > 0) {
        resourceLabels.add(resource)
      }
    })
    ;(ruleRef.nonResourceURLs ?? []).forEach(url => {
      if (url.trim().length > 0) {
        nonResourceLabels.add(url)
      }
    })
  })

  const summaryItems = [
    ...Array.from(resourceLabels)
      .sort((left, right) => left.localeCompare(right))
      .map<TTableRuleSummaryItem>(label => ({
        key: `resource:${label}`,
        label,
        tone: 'resource',
      })),
    ...Array.from(nonResourceLabels)
      .sort((left, right) => left.localeCompare(right))
      .map<TTableRuleSummaryItem>(label => ({
        key: `url:${label}`,
        label,
        tone: 'non-resource',
      })),
  ]
  if (summaryItems.length <= 3) {
    return summaryItems
  }

  return [
    ...summaryItems.slice(0, 3),
    {
      key: `extra:${summaryItems.length - 3}`,
      label: `+${summaryItems.length - 3}`,
      tone: 'extra',
    },
  ]
}

const normalizeTableSubject = ({
  subjectNode,
  binding,
}: {
  subjectNode: TRbacNode & { type: TTableSubject['kind'] }
  binding?: TTableBinding
}): TTableSubject => {
  const namespace =
    subjectNode.type === 'ServiceAccount'
      ? subjectNode.namespace ?? (binding?.kind === 'RoleBinding' ? binding.namespace : undefined)
      : undefined

  const subject = {
    kind: subjectNode.type,
    name: subjectNode.name,
    namespace,
    phantom: subjectNode.phantom,
  }

  return {
    key: toSubjectKey(subject),
    ...subject,
  }
}

const getAccountScope = ({
  roleNode,
  binding,
  subject,
}: {
  roleNode: TRbacNode & { type: TRoleTableRow['roleKind'] }
  binding?: TTableBinding
  subject?: TTableSubject
}): TTableScope => {
  if (!binding) {
    return 'orphan'
  }

  if (binding.kind === 'ClusterRoleBinding') {
    return 'cluster-wide'
  }

  if (roleNode.type === 'ClusterRole') {
    return 'narrowed'
  }

  if (subject?.kind === 'ServiceAccount') {
    return subject.namespace === roleNode.namespace ? 'same-ns' : 'cross-ns'
  }

  return 'same-ns'
}

export const buildRoleTableRows = (graph: TGraph | null): TRoleTableRow[] => {
  if (!graph) return []

  const nodeById = new Map(graph.nodes.map(node => [node.id, node] as const))
  const subjectEdgesByBindingId = new Map<string, TRbacNode[]>()
  const subjectMapByRoleId = new Map<string, Map<string, TTableSubject>>()
  const accountBindingsByRoleId = new Map<string, Map<string, TTableAccountBinding>>()
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

    const roleNodeCandidate = nodeById.get(edge.from)
    const bindingNode = nodeById.get(edge.to)
    if (!roleNodeCandidate || !ROLE_NODE_TYPES.has(roleNodeCandidate.type)) return

    const roleNode = roleNodeCandidate as TRbacNode & { type: TRoleTableRow['roleKind'] }

    const binding =
      bindingNode && (bindingNode.type === 'RoleBinding' || bindingNode.type === 'ClusterRoleBinding')
        ? {
            key: toBindingKey(bindingNode),
            kind: bindingNode.type,
            name: bindingNode.name,
            namespace: bindingNode.namespace,
          }
        : undefined
    const ruleSummary = buildRuleSummary(roleNode)
    const roleSubjects = subjectMapByRoleId.get(roleNode.id) ?? new Map<string, TTableSubject>()
    const roleAccountBindings = accountBindingsByRoleId.get(roleNode.id) ?? new Map<string, TTableAccountBinding>()
    const subjectNodes = subjectEdgesByBindingId.get(edge.to) ?? []

    subjectNodes.forEach(subjectNode => {
      const subject = normalizeTableSubject({
        subjectNode: subjectNode as TRbacNode & { type: TTableSubject['kind'] },
        binding,
      })

      roleSubjects.set(subject.key, subject)
      roleAccountBindings.set(`${subject.key}:${binding?.key ?? 'orphan'}`, {
        key: `${subject.key}:${binding?.key ?? 'orphan'}`,
        subject,
        binding,
        scope: getAccountScope({ roleNode, binding, subject }),
        ruleCount: roleNode.matchedRuleRefs?.length ?? 0,
        ruleSummary,
      })
    })

    if (subjectNodes.length === 0) {
      roleAccountBindings.set(`binding:${binding?.key ?? edge.to}`, {
        key: `binding:${binding?.key ?? edge.to}`,
        binding,
        scope: getAccountScope({ roleNode, binding }),
        ruleCount: roleNode.matchedRuleRefs?.length ?? 0,
        ruleSummary,
      })
    }

    subjectMapByRoleId.set(roleNode.id, roleSubjects)
    accountBindingsByRoleId.set(roleNode.id, roleAccountBindings)
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

        const parsedSource = parseAggregationSourceRef(source)
        aggregationSources.set(toAggregationKey(parsedSource.type, parsedSource.name, parsedSource.namespace), {
          key: toAggregationKey(parsedSource.type, parsedSource.name, parsedSource.namespace),
          ...parsedSource,
        })
      })

      const subjects = Array.from(subjectMapByRoleId.get(node.id)?.values() ?? []).sort(sortSubjects)
      const ruleSummary = buildRuleSummary(node)
      const accountBindings = Array.from(accountBindingsByRoleId.get(node.id)?.values() ?? [])
      const sortedAccountBindings =
        accountBindings.length > 0
          ? accountBindings.sort(sortAccountBindings)
          : [
              {
                key: `orphan:${node.id}`,
                scope: 'orphan' as const,
                ruleCount: node.matchedRuleRefs?.length ?? 0,
                ruleSummary,
              },
            ]
      const sortedAggregationSources = Array.from(aggregationSources.values()).sort(sortAggregationSources)

      return {
        key: node.id,
        roleNodeId: node.id,
        roleKind: node.type,
        roleName: node.name,
        namespace: node.namespace ?? 'cluster-wide',
        assessment: node.assessment,
        aggregated: Boolean(node.aggregated),
        matchedRuleCount: node.matchedRuleRefs?.length ?? 0,
        subjectsCount: subjects.length,
        subjects,
        accountBindings: sortedAccountBindings,
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
