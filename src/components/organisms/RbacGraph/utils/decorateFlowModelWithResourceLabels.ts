import { TKindWithVersion } from '@prorobotech/openapi-k8s-toolkit'
import type { TRbacNode, TRbacRuleRef, TFlowModel } from 'localTypes/rbacGraph'
import { parsePermissionLabel } from './parsePermissionLabel'
import { resolveResourceDisplayValue, shouldShowResolvedResourceBadge } from './resourceDisplay'

const getApiGroupsFromRuleRefs = (ruleRefs?: TRbacRuleRef[]) =>
  Array.from(
    new Set(
      (ruleRefs ?? [])
        .flatMap(ruleRef => ruleRef.apiGroups ?? [])
        .map(group => group.trim())
        .filter(group => group.length > 0 && group !== '*'),
    ),
  )

export const decorateFlowModelWithResourceLabels = (
  model: TFlowModel,
  kindsWithVersion: TKindWithVersion[],
): TFlowModel => ({
  nodes: model.nodes.map(node => {
    if (node.type !== 'rbacCard') return node

    const data = node.data as {
      label: string
      nodeType?: TRbacNode['type']
      typeLabel: string
      matchedRuleRefs?: TRbacRuleRef[]
    }

    if (data.nodeType === 'permission') {
      const { verb, target } = parsePermissionLabel(data.label)
      const titleValue = resolveResourceDisplayValue({
        apiGroups: getApiGroupsFromRuleRefs(data.matchedRuleRefs),
        kindsWithVersion,
        value: target,
      })

      return {
        ...node,
        data: {
          ...data,
          titlePrefix: verb,
          titleValue,
          titleShowsBadge: shouldShowResolvedResourceBadge(target),
        },
      }
    }

    return {
      ...node,
      data: {
        ...data,
        titlePrefix: undefined,
        titleValue: data.label,
        badgeValue: data.typeLabel,
        titleShowsBadge: true,
      },
    }
  }),
  edges: model.edges,
})
