import type {
  TRbacRuleRef,
  TRbacGraph as TGraph,
  TRawRuleRef,
  TParsedPermission,
  TRoleRuleDetail,
  TRoleDetails,
} from 'localTypes/rbacGraph'
import { ROLE_NODE_TYPES } from '../constants'
import {
  toRawRuleRef,
  normalizeResourceValue,
  normalizeRuleRef,
  mergeRuleRefs,
  serializeRuleRef,
  formatRuleTarget,
  formatRuleVerb,
} from './valuesAndFormatters'
import { parsePermissionLabel } from './parsePermissionLabel'

const getNormalizedApiGroups = (ruleRefs?: TRbacRuleRef[]) =>
  Array.from(
    new Set(
      (ruleRefs ?? [])
        .flatMap(ruleRef => ruleRef.apiGroups ?? [])
        .map(group => group.trim())
        .filter(group => group.length > 0 && group !== '*'),
    ),
  )
const getSourceRuleKey = (ruleRef: TRawRuleRef) =>
  ruleRef.sourceObjectUID || ruleRef.sourceRuleIndex !== undefined
    ? `${ruleRef.sourceObjectUID ?? 'unknown'}:${ruleRef.sourceRuleIndex ?? 0}`
    : serializeRuleRef(ruleRef)
const getPermissionRefs = (ruleRef: TRawRuleRef): TRawRuleRef[] => {
  if ((ruleRef.expandedRefs?.length ?? 0) > 0) {
    return ruleRef.expandedRefs!.map(expandedRef => ({
      ...expandedRef,
      sourceObjectUID: ruleRef.sourceObjectUID,
      sourceRuleIndex: ruleRef.sourceRuleIndex,
    }))
  }

  if (
    ruleRef.resource !== undefined ||
    ruleRef.nonResourceURL !== undefined ||
    ruleRef.verb !== undefined ||
    ruleRef.apiGroup !== undefined
  ) {
    return [ruleRef]
  }

  return []
}

const serializePermissionRef = (ruleRef: TRawRuleRef) =>
  JSON.stringify({
    apiGroup: ruleRef.apiGroup ?? '',
    resource: normalizeResourceValue(ruleRef) ?? '',
    nonResourceURL: ruleRef.nonResourceURL ?? '',
    verb: ruleRef.verb ?? '',
    phantom: Boolean(ruleRef.phantom),
  })

const buildParsedPermission = (ruleRef: TRawRuleRef, ruleKeys: string[]): TParsedPermission => {
  const target = ruleRef.nonResourceURL ?? normalizeResourceValue(ruleRef) ?? '*'
  const verb = (ruleRef.verb ?? '*').toUpperCase()

  return {
    id: `${serializePermissionRef(ruleRef)}:${ruleKeys.join('|') || 'all'}`,
    label: `${verb} ${target}`,
    verb,
    target,
    ruleKeys,
    apiGroups: ruleRef.apiGroup && ruleRef.apiGroup !== '*' ? [ruleRef.apiGroup] : [],
  }
}

export const collectRoleDetails = (graph: TGraph | null, nodeId: string | null): TRoleDetails | null => {
  if (!graph || !nodeId) return null

  const node = graph.nodes.find(item => item.id === nodeId)
  if (!node || !ROLE_NODE_TYPES.has(node.type)) return null

  const nodeById = new Map(graph.nodes.map(item => [item.id, item]))
  const ruleMap = new Map<string, TRoleRuleDetail>()
  const permissionMap = new Map<string, TParsedPermission>()

  ;(node.matchedRuleRefs ?? []).map(toRawRuleRef).forEach(rawRuleRef => {
    const key = getSourceRuleKey(rawRuleRef)
    const normalizedRuleRef = normalizeRuleRef(rawRuleRef)
    const currentRule = ruleMap.get(key)

    ruleMap.set(key, {
      key,
      ruleRef: currentRule ? mergeRuleRefs(currentRule.ruleRef, normalizedRuleRef) : normalizedRuleRef,
      expandedPermissionCount: currentRule?.expandedPermissionCount ?? 0,
    })

    getPermissionRefs(rawRuleRef).forEach(permissionRef => {
      const permission = buildParsedPermission(permissionRef, [key])
      if (!permissionMap.has(permission.id)) {
        permissionMap.set(permission.id, permission)
      }
    })
  })

  graph.edges.forEach(edge => {
    if (edge.type !== 'permissions-role' || edge.from !== node.id) return

    const permissionNode = nodeById.get(edge.to)
    if (!permissionNode) return

    const rawRuleRefs = (edge.ruleRefs ?? []).map(toRawRuleRef)
    const normalizedRuleRefs = rawRuleRefs.map(normalizeRuleRef)
    const ruleKeys = rawRuleRefs.map(getSourceRuleKey)
    const { verb, target } = parsePermissionLabel(permissionNode.name)

    normalizedRuleRefs.forEach((ruleRef, index) => {
      const key = ruleKeys[index]
      const currentRule = ruleMap.get(key)
      ruleMap.set(key, {
        key,
        ruleRef: currentRule ? mergeRuleRefs(currentRule.ruleRef, ruleRef) : ruleRef,
        expandedPermissionCount: currentRule?.expandedPermissionCount ?? 0,
      })
    })

    const permissionKey = `${permissionNode.id}:${ruleKeys.join('|') || 'all'}`
    if (!permissionMap.has(permissionKey)) {
      permissionMap.set(permissionKey, {
        id: permissionKey,
        label: permissionNode.name,
        verb,
        target,
        ruleKeys,
        apiGroups: getNormalizedApiGroups(normalizedRuleRefs),
      })
    }
  })

  permissionMap.forEach(permission => {
    const targets = permission.ruleKeys.length > 0 ? permission.ruleKeys : Array.from(ruleMap.keys())
    targets.forEach(ruleKey => {
      const rule = ruleMap.get(ruleKey)
      if (rule) {
        rule.expandedPermissionCount += 1
      }
    })
  })

  return {
    node,
    rules: Array.from(ruleMap.values()).sort((left, right) =>
      formatRuleVerb(left.ruleRef)
        .concat(formatRuleTarget(left.ruleRef))
        .localeCompare(formatRuleVerb(right.ruleRef).concat(formatRuleTarget(right.ruleRef))),
    ),
    permissions: Array.from(permissionMap.values()).sort(
      (left, right) => left.target.localeCompare(right.target) || left.verb.localeCompare(right.verb),
    ),
  }
}
