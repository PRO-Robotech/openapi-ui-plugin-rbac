import type { TRbacRuleRef, TRawRuleRef } from 'localTypes/rbacGraph'

export const sortValues = (values?: string[]) => Array.from(new Set(values ?? [])).sort((a, b) => a.localeCompare(b))

export const toRawRuleRef = (ruleRef: TRbacRuleRef): TRawRuleRef => ruleRef as TRawRuleRef

export const normalizeResourceValue = (ruleRef: TRawRuleRef) =>
  ruleRef.resource ? `${ruleRef.resource}${ruleRef.subresource ? `/${ruleRef.subresource}` : ''}` : undefined

export const mergeValues = (...collections: Array<(string | undefined)[] | undefined>) =>
  sortValues(
    collections
      .flatMap(collection => collection ?? [])
      .map(value => value?.trim())
      .filter((value): value is string => value !== undefined && value.length > 0),
  )

export const normalizeRuleRef = (ruleRef: TRawRuleRef): TRbacRuleRef => ({
  apiGroups: mergeValues(ruleRef.apiGroups, ruleRef.apiGroup !== undefined ? [ruleRef.apiGroup] : undefined),
  resources: mergeValues(
    ruleRef.resources,
    normalizeResourceValue(ruleRef) ? [normalizeResourceValue(ruleRef)] : undefined,
  ),
  verbs: mergeValues(ruleRef.verbs, ruleRef.verb !== undefined ? [ruleRef.verb] : undefined),
  resourceNames: sortValues(ruleRef.resourceNames),
  nonResourceURLs: mergeValues(
    ruleRef.nonResourceURLs,
    ruleRef.nonResourceURL !== undefined ? [ruleRef.nonResourceURL] : undefined,
  ),
})

export const mergeRuleRefs = (left: TRbacRuleRef, right: TRbacRuleRef): TRbacRuleRef => ({
  apiGroups: mergeValues(left.apiGroups, right.apiGroups),
  resources: mergeValues(left.resources, right.resources),
  verbs: mergeValues(left.verbs, right.verbs),
  resourceNames: mergeValues(left.resourceNames, right.resourceNames),
  nonResourceURLs: mergeValues(left.nonResourceURLs, right.nonResourceURLs),
})

export const serializeRuleRef = (ruleRef: TRbacRuleRef) => JSON.stringify(normalizeRuleRef(ruleRef))

export const formatJoinedValues = (values?: string[], empty = '*') => {
  const normalized = sortValues(values)
  return normalized.length > 0 ? normalized.join(', ') : empty
}

export const formatRuleTarget = (ruleRef: TRbacRuleRef) => {
  const resources = formatJoinedValues(ruleRef.resources)
  const nonResourceURLs = formatJoinedValues(ruleRef.nonResourceURLs)
  return sortValues(ruleRef.nonResourceURLs).length > 0 ? nonResourceURLs : resources
}

export const formatRuleVerb = (ruleRef: TRbacRuleRef) => formatJoinedValues(ruleRef.verbs)

export const formatApiGroups = (ruleRef: TRbacRuleRef) => {
  const apiGroups = sortValues(ruleRef.apiGroups).map(value => value || '<core>')
  return apiGroups.length > 0 ? apiGroups.join(', ') : '<all>'
}
