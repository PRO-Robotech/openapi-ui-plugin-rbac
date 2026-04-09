import type { TKindWithVersion } from '@prorobotech/openapi-k8s-toolkit'
import type { TNonResourceUrlItem, TRbacQueryPayload } from 'localTypes/rbacGraph'
import { hasWildcard } from 'components/organisms/RbacGraph/utils'

type TRbacInlineFilterState = TRbacQueryPayload['spec']['selector']

type TResourceOptions = {
  apiGroups: Set<string>
  resources: Set<string>
  verbs: Set<string>
}

type TNonResourceOptions = {
  nonResourceURLs: Set<string>
  verbs: Set<string>
}

type TSelectorRelations = {
  collectResourceOptions: (
    selection: Pick<TRbacInlineFilterState, 'apiGroups' | 'resources' | 'verbs'>,
    ignoredKey?: 'apiGroups' | 'resources' | 'verbs',
  ) => TResourceOptions
  collectNonResourceOptions: (
    selection: Pick<TRbacInlineFilterState, 'nonResourceURLs' | 'verbs'>,
    ignoredKey?: 'nonResourceURLs' | 'verbs',
  ) => TNonResourceOptions
}

type TSelectorConstraints = {
  allowedGroups: Set<string>
  allowedResources: Set<string>
  allowedVerbs: Set<string>
  allowedNonResourceURLs: Set<string>
}

export type TInlineSelectorOptions = {
  apiGroups: string[]
  resources: string[]
  verbs: string[]
  nonResourceURLs: string[]
}

export const createSelectorRelations = (
  kindsWithVersion: TKindWithVersion[],
  nonResourceItems: TNonResourceUrlItem[],
): TSelectorRelations => {
  const normalizedKindsWithVersion = kindsWithVersion.map(kind => ({
    ...kind,
    version: {
      ...kind.version,
      verbs: (kind.version.verbs ?? []).filter(verb => !hasWildcard(verb)),
    },
  }))
  const normalizedNonResourceItems = nonResourceItems
    .filter(item => !hasWildcard(item.url))
    .map(item => ({
      ...item,
      verbs: item.verbs.filter(verb => !hasWildcard(verb)),
    }))

  const matchesResourceSelection = (
    kind: (typeof normalizedKindsWithVersion)[number],
    selection: Pick<TRbacInlineFilterState, 'apiGroups' | 'resources' | 'verbs'>,
  ) =>
    (selection.apiGroups.length === 0 || selection.apiGroups.includes(kind.group)) &&
    (selection.resources.length === 0 || selection.resources.includes(kind.version.resource)) &&
    (selection.verbs.length === 0 || selection.verbs.some(verb => kind.version.verbs?.includes(verb)))

  const matchesNonResourceSelection = (
    item: TNonResourceUrlItem,
    selection: Pick<TRbacInlineFilterState, 'nonResourceURLs' | 'verbs'>,
  ) =>
    (selection.nonResourceURLs.length === 0 || selection.nonResourceURLs.includes(item.url)) &&
    (selection.verbs.length === 0 || selection.verbs.some(verb => item.verbs.includes(verb)))

  const collectResourceOptions: TSelectorRelations['collectResourceOptions'] = (selection, ignoredKey) => {
    const filteredKinds = normalizedKindsWithVersion.filter(kind =>
      matchesResourceSelection(kind, {
        apiGroups: ignoredKey === 'apiGroups' ? [] : selection.apiGroups,
        resources: ignoredKey === 'resources' ? [] : selection.resources,
        verbs: ignoredKey === 'verbs' ? [] : selection.verbs,
      }),
    )

    return {
      apiGroups: new Set(filteredKinds.map(kind => kind.group)),
      resources: new Set(filteredKinds.map(kind => kind.version.resource)),
      verbs: new Set(filteredKinds.flatMap(kind => kind.version.verbs ?? [])),
    }
  }

  const collectNonResourceOptions: TSelectorRelations['collectNonResourceOptions'] = (selection, ignoredKey) => {
    const filteredNonResourceItems = normalizedNonResourceItems.filter(item =>
      matchesNonResourceSelection(item, {
        nonResourceURLs: ignoredKey === 'nonResourceURLs' ? [] : selection.nonResourceURLs,
        verbs: ignoredKey === 'verbs' ? [] : selection.verbs,
      }),
    )

    return {
      nonResourceURLs: new Set(filteredNonResourceItems.map(item => item.url)),
      verbs: new Set(filteredNonResourceItems.flatMap(item => item.verbs)),
    }
  }

  return {
    collectResourceOptions,
    collectNonResourceOptions,
  }
}

export const computeSelectorConstraints = ({
  hasResourceFilters,
  hasNonResourceFilters,
  relations,
  selection,
}: {
  hasResourceFilters: boolean
  hasNonResourceFilters: boolean
  relations: TSelectorRelations
  selection: TRbacInlineFilterState
}): TSelectorConstraints => {
  const resourceOptionsForGroups = relations.collectResourceOptions(selection, 'apiGroups')
  const resourceOptionsForResources = relations.collectResourceOptions(selection, 'resources')
  const resourceOptionsForVerbs = relations.collectResourceOptions(selection, 'verbs')
  const nonResourceOptionsForUrls = relations.collectNonResourceOptions(selection, 'nonResourceURLs')
  const nonResourceOptionsForVerbs = relations.collectNonResourceOptions(selection, 'verbs')
  const allowedVerbs = new Set<string>()

  if (hasResourceFilters || !hasNonResourceFilters) {
    resourceOptionsForVerbs.verbs.forEach(verb => allowedVerbs.add(verb))
  }

  if (hasNonResourceFilters || !hasResourceFilters) {
    nonResourceOptionsForVerbs.verbs.forEach(verb => allowedVerbs.add(verb))
  }

  return {
    allowedGroups: resourceOptionsForGroups.apiGroups,
    allowedResources: resourceOptionsForResources.resources,
    allowedVerbs,
    allowedNonResourceURLs: nonResourceOptionsForUrls.nonResourceURLs,
  }
}

export const toInlineSelectorOptions = (constraints: TSelectorConstraints): TInlineSelectorOptions => ({
  apiGroups: Array.from(constraints.allowedGroups).sort((left, right) => {
    if (left === '') return -1
    if (right === '') return 1
    return left.localeCompare(right)
  }),
  resources: Array.from(constraints.allowedResources).sort(),
  verbs: Array.from(constraints.allowedVerbs).sort(),
  nonResourceURLs: Array.from(constraints.allowedNonResourceURLs).sort(),
})
