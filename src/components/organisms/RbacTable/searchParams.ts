import { DEFAULT_PAYLOAD } from 'components/organisms/RbacGraph/constants'
import type { TRbacQueryPayload } from 'localTypes/rbacGraph'
import type { TTableScope } from './buildRoleTableRows'

export type TRbacTableSelectorSelection = TRbacQueryPayload['spec']['selector']

export type TRbacTableSearchState = {
  payload: TRbacQueryPayload
  selectorSelection: TRbacTableSelectorSelection
  scopeFilters: TTableScope[]
  roleColumnFilter: string[]
  accountColumnFilter: string[]
}

type TResourceOptions = {
  apiGroups: Set<string>
  resources: Set<string>
  verbs: Set<string>
}

type TNonResourceOptions = {
  nonResourceURLs: Set<string>
  verbs: Set<string>
}

type TCollectResourceOptions = (
  selection: Pick<TRbacTableSelectorSelection, 'apiGroups' | 'resources' | 'verbs'>,
  ignoredKey?: 'apiGroups' | 'resources' | 'verbs',
) => TResourceOptions

type TCollectNonResourceOptions = (
  selection: Pick<TRbacTableSelectorSelection, 'nonResourceURLs' | 'verbs'>,
  ignoredKey?: 'nonResourceURLs' | 'verbs',
) => TNonResourceOptions

export type TRbacTableSearchNormalizationOptions = {
  changedKey?: keyof TRbacTableSelectorSelection
  collectResourceOptions?: TCollectResourceOptions
  collectNonResourceOptions?: TCollectNonResourceOptions
}

const TABLE_SCOPES = new Set<TTableScope>(['cluster-wide', 'narrowed', 'same-ns', 'cross-ns', 'orphan'])
const MATCH_MODES = new Set<TRbacQueryPayload['spec']['matchMode']>(['any', 'all'])
const WILDCARD_MODES = new Set<TRbacQueryPayload['spec']['wildcardMode']>(['expand', 'exact'])
const POD_PHASE_MODES = new Set<TRbacQueryPayload['spec']['podPhaseMode']>(['active', 'running', 'all'])

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>()

  return values.filter(value => {
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

const sanitizeStrings = (values: string[]) =>
  uniqueStrings(values.map(value => value.trim()).filter(value => value.length > 0))

const getSingleParam = (params: URLSearchParams, key: string) => {
  const value = params.get(key)
  return value?.trim() ? value.trim() : undefined
}

const parseBooleanParam = (params: URLSearchParams, key: string) => {
  const value = params.get(key)

  if (value === 'true') return true
  if (value === 'false') return false

  return undefined
}

const parseNumberParam = (params: URLSearchParams, key: string) => {
  const value = params.get(key)
  if (!value) return undefined

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return undefined

  return parsed
}

const getArrayParam = (params: URLSearchParams, key: string) => sanitizeStrings(params.getAll(key))

const appendParams = (params: URLSearchParams, key: string, values: string[]) => {
  values.forEach(value => {
    params.append(key, value)
  })
}

const clonePayload = (payload: TRbacQueryPayload): TRbacQueryPayload => ({
  spec: {
    ...payload.spec,
    selector: {
      apiGroups: [...payload.spec.selector.apiGroups],
      resources: [...payload.spec.selector.resources],
      verbs: [...payload.spec.selector.verbs],
      resourceNames: [...payload.spec.selector.resourceNames],
      nonResourceURLs: [...payload.spec.selector.nonResourceURLs],
    },
    namespaceScope: payload.spec.namespaceScope
      ? {
          namespaces: [...payload.spec.namespaceScope.namespaces],
          strict: payload.spec.namespaceScope.strict,
        }
      : undefined,
  },
})

export const createDefaultRbacTableSearchState = (): TRbacTableSearchState => ({
  payload: clonePayload(DEFAULT_PAYLOAD),
  selectorSelection: {
    apiGroups: [],
    resources: [],
    verbs: [],
    resourceNames: [],
    nonResourceURLs: [],
  },
  scopeFilters: [],
  roleColumnFilter: [],
  accountColumnFilter: [],
})

export const areRbacTableSearchStatesEqual = (left: TRbacTableSearchState, right: TRbacTableSearchState) =>
  left.payload.spec.matchMode === right.payload.spec.matchMode &&
  left.payload.spec.wildcardMode === right.payload.spec.wildcardMode &&
  left.payload.spec.podPhaseMode === right.payload.spec.podPhaseMode &&
  left.payload.spec.filterPhantomAPIs === right.payload.spec.filterPhantomAPIs &&
  left.payload.spec.impersonateUser === right.payload.spec.impersonateUser &&
  left.payload.spec.impersonateGroup === right.payload.spec.impersonateGroup &&
  left.payload.spec.maxPodsPerSubject === right.payload.spec.maxPodsPerSubject &&
  left.payload.spec.maxWorkloadsPerPod === right.payload.spec.maxWorkloadsPerPod &&
  left.payload.spec.namespaceScope?.strict === right.payload.spec.namespaceScope?.strict &&
  left.payload.spec.namespaceScope?.namespaces.join('\u0000') ===
    right.payload.spec.namespaceScope?.namespaces.join('\u0000') &&
  left.selectorSelection.apiGroups.join('\u0000') === right.selectorSelection.apiGroups.join('\u0000') &&
  left.selectorSelection.resources.join('\u0000') === right.selectorSelection.resources.join('\u0000') &&
  left.selectorSelection.verbs.join('\u0000') === right.selectorSelection.verbs.join('\u0000') &&
  left.selectorSelection.resourceNames.join('\u0000') === right.selectorSelection.resourceNames.join('\u0000') &&
  left.selectorSelection.nonResourceURLs.join('\u0000') === right.selectorSelection.nonResourceURLs.join('\u0000') &&
  left.scopeFilters.join('\u0000') === right.scopeFilters.join('\u0000') &&
  left.roleColumnFilter.join('\u0000') === right.roleColumnFilter.join('\u0000') &&
  left.accountColumnFilter.join('\u0000') === right.accountColumnFilter.join('\u0000')

export const parseRbacTableSearchParams = (params: URLSearchParams): TRbacTableSearchState => {
  const defaultState = createDefaultRbacTableSearchState()
  const selectorSelection = {
    apiGroups: getArrayParam(params, 'apiGroup'),
    resources: getArrayParam(params, 'resource'),
    verbs: getArrayParam(params, 'verb'),
    resourceNames: getArrayParam(params, 'resourceName'),
    nonResourceURLs: getArrayParam(params, 'nonResourceURL'),
  }

  const namespaceScopeNamespaces = getArrayParam(params, 'namespace')
  const namespaceScopeStrict = parseBooleanParam(params, 'namespaceStrict')
  const matchMode = getSingleParam(params, 'matchMode')
  const wildcardMode = getSingleParam(params, 'wildcardMode')
  const podPhaseMode = getSingleParam(params, 'podPhaseMode')
  const filterPhantomAPIs = parseBooleanParam(params, 'filterPhantomAPIs')
  const impersonateUser = getSingleParam(params, 'impersonateUser')
  const impersonateGroup = getSingleParam(params, 'impersonateGroup')
  const maxPodsPerSubject = parseNumberParam(params, 'maxPodsPerSubject')
  const maxWorkloadsPerPod = parseNumberParam(params, 'maxWorkloadsPerPod')

  return {
    payload: {
      spec: {
        ...defaultState.payload.spec,
        selector: selectorSelection,
        matchMode: MATCH_MODES.has(matchMode as TRbacQueryPayload['spec']['matchMode'])
          ? (matchMode as TRbacQueryPayload['spec']['matchMode'])
          : defaultState.payload.spec.matchMode,
        wildcardMode: WILDCARD_MODES.has(wildcardMode as TRbacQueryPayload['spec']['wildcardMode'])
          ? (wildcardMode as TRbacQueryPayload['spec']['wildcardMode'])
          : defaultState.payload.spec.wildcardMode,
        podPhaseMode: POD_PHASE_MODES.has(podPhaseMode as TRbacQueryPayload['spec']['podPhaseMode'])
          ? (podPhaseMode as TRbacQueryPayload['spec']['podPhaseMode'])
          : defaultState.payload.spec.podPhaseMode,
        filterPhantomAPIs: filterPhantomAPIs ?? defaultState.payload.spec.filterPhantomAPIs,
        impersonateUser,
        impersonateGroup,
        maxPodsPerSubject: maxPodsPerSubject ?? defaultState.payload.spec.maxPodsPerSubject,
        maxWorkloadsPerPod: maxWorkloadsPerPod ?? defaultState.payload.spec.maxWorkloadsPerPod,
        namespaceScope:
          namespaceScopeNamespaces.length > 0 || namespaceScopeStrict
            ? {
                namespaces: namespaceScopeNamespaces,
                strict: namespaceScopeStrict ?? false,
              }
            : undefined,
      },
    },
    selectorSelection,
    scopeFilters: getArrayParam(params, 'scope').filter((scope): scope is TTableScope =>
      TABLE_SCOPES.has(scope as TTableScope),
    ),
    roleColumnFilter: getArrayParam(params, 'roleFilter'),
    accountColumnFilter: getArrayParam(params, 'accountFilter'),
  }
}

export const normalizeRbacTableSearchState = (
  state: TRbacTableSearchState,
  options: TRbacTableSearchNormalizationOptions = {},
): TRbacTableSearchState => {
  const nextState = createDefaultRbacTableSearchState()
  const { changedKey } = options
  const sanitizedSelectorSelection: TRbacTableSelectorSelection = {
    apiGroups: sanitizeStrings(state.selectorSelection.apiGroups),
    resources: sanitizeStrings(state.selectorSelection.resources),
    verbs: sanitizeStrings(state.selectorSelection.verbs),
    resourceNames: sanitizeStrings(state.selectorSelection.resourceNames),
    nonResourceURLs: sanitizeStrings(state.selectorSelection.nonResourceURLs),
  }
  const isResourceSelector = changedKey === 'apiGroups' || changedKey === 'resources' || changedKey === 'resourceNames'
  const activatedResourceSelection =
    changedKey !== undefined &&
    isResourceSelector &&
    Array.isArray(sanitizedSelectorSelection[changedKey]) &&
    sanitizedSelectorSelection[changedKey].length > 0
  const activatedNonResourceSelection =
    changedKey === 'nonResourceURLs' && sanitizedSelectorSelection.nonResourceURLs.length > 0

  const selectorWithExclusiveMode =
    sanitizedSelectorSelection.nonResourceURLs.length > 0 &&
    (sanitizedSelectorSelection.apiGroups.length > 0 ||
      sanitizedSelectorSelection.resources.length > 0 ||
      sanitizedSelectorSelection.resourceNames.length > 0)
      ? {
          ...sanitizedSelectorSelection,
          ...(activatedNonResourceSelection
            ? { apiGroups: [], resources: [], resourceNames: [] }
            : { nonResourceURLs: [] }),
        }
      : {
          ...sanitizedSelectorSelection,
          ...(activatedResourceSelection ? { nonResourceURLs: [] } : {}),
          ...(activatedNonResourceSelection ? { apiGroups: [], resources: [], resourceNames: [] } : {}),
        }

  let nextSelection = selectorWithExclusiveMode

  if (options.collectResourceOptions && options.collectNonResourceOptions) {
    const nextApiGroups = nextSelection.apiGroups.filter(
      group => options.collectResourceOptions?.(nextSelection, 'apiGroups').apiGroups.has(group),
    )
    const nextResources = nextSelection.resources.filter(
      resource =>
        options
          .collectResourceOptions?.(
            {
              ...nextSelection,
              apiGroups: nextApiGroups,
            },
            'resources',
          )
          .resources.has(resource),
    )
    const nextHasResourceFilters = Boolean(
      nextApiGroups.length || nextResources.length || nextSelection.resourceNames.length,
    )
    const nextHasNonResourceFilters = Boolean(nextSelection.nonResourceURLs.length)
    const allowedVerbs = new Set<string>()
    const resourceVerbs = options.collectResourceOptions(
      {
        ...nextSelection,
        apiGroups: nextApiGroups,
        resources: nextResources,
      },
      'verbs',
    ).verbs
    const nonResourceVerbs = options.collectNonResourceOptions(
      {
        nonResourceURLs: nextSelection.nonResourceURLs,
        verbs: nextSelection.verbs,
      },
      'verbs',
    ).verbs

    if (nextHasResourceFilters || !nextHasNonResourceFilters) {
      resourceVerbs.forEach(verb => allowedVerbs.add(verb))
    }

    if (nextHasNonResourceFilters || !nextHasResourceFilters) {
      nonResourceVerbs.forEach(verb => allowedVerbs.add(verb))
    }

    const nextVerbs = nextSelection.verbs.filter(verb => allowedVerbs.has(verb))
    const nextNonResourceURLs = nextSelection.nonResourceURLs.filter(
      nonResourceURL =>
        options
          .collectNonResourceOptions?.(
            {
              nonResourceURLs: nextSelection.nonResourceURLs,
              verbs: nextVerbs,
            },
            'nonResourceURLs',
          )
          .nonResourceURLs.has(nonResourceURL),
    )

    nextSelection = {
      apiGroups: nextApiGroups,
      resources: nextResources,
      resourceNames: nextSelection.resourceNames,
      verbs: nextVerbs,
      nonResourceURLs: nextNonResourceURLs,
    }
  }

  const namespaceScopeNamespaces = sanitizeStrings(state.payload.spec.namespaceScope?.namespaces ?? [])
  const namespaceScopeStrict = Boolean(state.payload.spec.namespaceScope?.strict)

  nextState.selectorSelection = nextSelection
  nextState.payload = {
    spec: {
      ...nextState.payload.spec,
      ...state.payload.spec,
      selector: nextSelection,
      matchMode: MATCH_MODES.has(state.payload.spec.matchMode)
        ? state.payload.spec.matchMode
        : DEFAULT_PAYLOAD.spec.matchMode,
      wildcardMode: WILDCARD_MODES.has(state.payload.spec.wildcardMode)
        ? state.payload.spec.wildcardMode
        : DEFAULT_PAYLOAD.spec.wildcardMode,
      podPhaseMode: POD_PHASE_MODES.has(state.payload.spec.podPhaseMode)
        ? state.payload.spec.podPhaseMode
        : DEFAULT_PAYLOAD.spec.podPhaseMode,
      filterPhantomAPIs: state.payload.spec.filterPhantomAPIs,
      impersonateUser: state.payload.spec.impersonateUser?.trim() || undefined,
      impersonateGroup: state.payload.spec.impersonateGroup?.trim() || undefined,
      maxPodsPerSubject:
        Number.isFinite(state.payload.spec.maxPodsPerSubject) && state.payload.spec.maxPodsPerSubject >= 0
          ? state.payload.spec.maxPodsPerSubject
          : DEFAULT_PAYLOAD.spec.maxPodsPerSubject,
      maxWorkloadsPerPod:
        Number.isFinite(state.payload.spec.maxWorkloadsPerPod) && state.payload.spec.maxWorkloadsPerPod >= 0
          ? state.payload.spec.maxWorkloadsPerPod
          : DEFAULT_PAYLOAD.spec.maxWorkloadsPerPod,
      namespaceScope:
        namespaceScopeNamespaces.length > 0 || namespaceScopeStrict
          ? {
              namespaces: namespaceScopeNamespaces,
              strict: namespaceScopeStrict,
            }
          : undefined,
    },
  }
  nextState.scopeFilters = sanitizeStrings(state.scopeFilters).filter((scope): scope is TTableScope =>
    TABLE_SCOPES.has(scope as TTableScope),
  )
  nextState.roleColumnFilter = sanitizeStrings(state.roleColumnFilter).slice(0, 1)
  nextState.accountColumnFilter = sanitizeStrings(state.accountColumnFilter).slice(0, 1)

  return nextState
}

export const serializeRbacTableSearchParams = (
  state: TRbacTableSearchState,
  options?: TRbacTableSearchNormalizationOptions,
) => {
  const normalizedState = normalizeRbacTableSearchState(state, options)
  const params = new URLSearchParams()
  const { payload, selectorSelection, scopeFilters, roleColumnFilter, accountColumnFilter } = normalizedState
  const { spec } = payload

  appendParams(params, 'apiGroup', selectorSelection.apiGroups)
  appendParams(params, 'resource', selectorSelection.resources)
  appendParams(params, 'verb', selectorSelection.verbs)
  appendParams(params, 'resourceName', selectorSelection.resourceNames)
  appendParams(params, 'nonResourceURL', selectorSelection.nonResourceURLs)
  appendParams(params, 'namespace', spec.namespaceScope?.namespaces ?? [])
  appendParams(params, 'scope', scopeFilters)
  appendParams(params, 'roleFilter', roleColumnFilter)
  appendParams(params, 'accountFilter', accountColumnFilter)

  if (spec.matchMode !== DEFAULT_PAYLOAD.spec.matchMode) {
    params.set('matchMode', spec.matchMode)
  }

  if (spec.wildcardMode !== DEFAULT_PAYLOAD.spec.wildcardMode) {
    params.set('wildcardMode', spec.wildcardMode)
  }

  if (spec.filterPhantomAPIs !== DEFAULT_PAYLOAD.spec.filterPhantomAPIs) {
    params.set('filterPhantomAPIs', String(spec.filterPhantomAPIs))
  }

  if (spec.podPhaseMode !== DEFAULT_PAYLOAD.spec.podPhaseMode) {
    params.set('podPhaseMode', spec.podPhaseMode)
  }

  if (spec.maxPodsPerSubject !== DEFAULT_PAYLOAD.spec.maxPodsPerSubject) {
    params.set('maxPodsPerSubject', String(spec.maxPodsPerSubject))
  }

  if (spec.maxWorkloadsPerPod !== DEFAULT_PAYLOAD.spec.maxWorkloadsPerPod) {
    params.set('maxWorkloadsPerPod', String(spec.maxWorkloadsPerPod))
  }

  if (spec.namespaceScope?.strict) {
    params.set('namespaceStrict', 'true')
  }

  if (spec.impersonateUser) {
    params.set('impersonateUser', spec.impersonateUser)
  }

  if (spec.impersonateGroup) {
    params.set('impersonateGroup', spec.impersonateGroup)
  }

  return params
}

export const hasNonDefaultRequestState = (
  state: TRbacTableSearchState,
  options?: TRbacTableSearchNormalizationOptions,
) => {
  const normalizedState = normalizeRbacTableSearchState(state, options)
  const { spec } = normalizedState.payload

  return Boolean(
    normalizedState.selectorSelection.apiGroups.length ||
      normalizedState.selectorSelection.resources.length ||
      normalizedState.selectorSelection.verbs.length ||
      normalizedState.selectorSelection.resourceNames.length ||
      normalizedState.selectorSelection.nonResourceURLs.length ||
      spec.matchMode !== DEFAULT_PAYLOAD.spec.matchMode ||
      spec.wildcardMode !== DEFAULT_PAYLOAD.spec.wildcardMode ||
      spec.filterPhantomAPIs !== DEFAULT_PAYLOAD.spec.filterPhantomAPIs ||
      spec.podPhaseMode !== DEFAULT_PAYLOAD.spec.podPhaseMode ||
      spec.maxPodsPerSubject !== DEFAULT_PAYLOAD.spec.maxPodsPerSubject ||
      spec.maxWorkloadsPerPod !== DEFAULT_PAYLOAD.spec.maxWorkloadsPerPod ||
      (spec.namespaceScope?.namespaces.length ?? 0) > 0 ||
      Boolean(spec.namespaceScope?.strict) ||
      Boolean(spec.impersonateUser) ||
      Boolean(spec.impersonateGroup),
  )
}

export const hasAnyRbacTableSearchState = (
  state: TRbacTableSearchState,
  options?: TRbacTableSearchNormalizationOptions,
) => {
  const normalizedState = normalizeRbacTableSearchState(state, options)

  return Boolean(
    hasNonDefaultRequestState(normalizedState) ||
      normalizedState.scopeFilters.length ||
      normalizedState.roleColumnFilter.length ||
      normalizedState.accountColumnFilter.length,
  )
}
