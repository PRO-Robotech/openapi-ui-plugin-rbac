import type { TRbacGraphOptions, TRbacQueryPayload, TRbacSubjectsBySelectorGraphPayload } from 'localTypes/rbacGraph'
import { DEFAULT_OPTIONS, DEFAULT_PAYLOAD, DEFAULT_REVERSE_PAYLOAD, EMPTY_SELECTOR_SELECTION } from '../constants'

type TRbacGraphPayload = TRbacQueryPayload | TRbacSubjectsBySelectorGraphPayload
type TRbacGraphSelectorSelection = TRbacGraphPayload['spec']['selector']

export type TRbacGraphSearchState = {
  payload: TRbacGraphPayload
  selectorSelection: TRbacGraphSelectorSelection
  options: TRbacGraphOptions
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

export type TRbacGraphSearchNormalizationOptions = {
  changedKey?: keyof TRbacGraphSelectorSelection
  collectResourceOptions?: (
    selection: Pick<TRbacGraphSelectorSelection, 'apiGroups' | 'resources' | 'verbs'>,
    ignoredKey?: 'apiGroups' | 'resources' | 'verbs',
  ) => TResourceOptions
  collectNonResourceOptions?: (
    selection: Pick<TRbacGraphSelectorSelection, 'nonResourceURLs' | 'verbs'>,
    ignoredKey?: 'nonResourceURLs' | 'verbs',
  ) => TNonResourceOptions
}

const MATCH_MODES = new Set<TRbacGraphPayload['spec']['matchMode']>(['any', 'all'])
const WILDCARD_MODES = new Set<TRbacGraphPayload['spec']['wildcardMode']>(['expand', 'exact'])

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

const sanitizeApiGroupStrings = (values: string[]) =>
  uniqueStrings(values.map(value => value.trim()).filter(value => value.length > 0 || value === ''))

const getArrayParam = (params: URLSearchParams, key: string) => sanitizeStrings(params.getAll(key))

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

const appendParams = (params: URLSearchParams, key: string, values: string[]) => {
  values.forEach(value => {
    params.append(key, value)
  })
}

const cloneOptions = (options: TRbacGraphOptions): TRbacGraphOptions => ({ ...options })

const clonePayload = <TPayload extends TRbacGraphPayload>(payload: TPayload): TPayload =>
  ({
    spec: {
      ...payload.spec,
      selector: {
        apiGroups: [...payload.spec.selector.apiGroups],
        resources: [...payload.spec.selector.resources],
        verbs: [...payload.spec.selector.verbs],
        resourceNames: [...payload.spec.selector.resourceNames],
        nonResourceURLs: [...payload.spec.selector.nonResourceURLs],
      },
      ...('namespaceScope' in payload.spec && payload.spec.namespaceScope
        ? {
            namespaceScope: {
              namespaces: [...payload.spec.namespaceScope.namespaces],
              strict: payload.spec.namespaceScope.strict,
            },
          }
        : {}),
    },
  }) as TPayload

export const createDefaultRbacGraphSearchState = (isReverseMode: boolean): TRbacGraphSearchState => ({
  payload: clonePayload(isReverseMode ? DEFAULT_REVERSE_PAYLOAD : DEFAULT_PAYLOAD),
  selectorSelection: {
    apiGroups: [],
    resources: [],
    verbs: [],
    resourceNames: [],
    nonResourceURLs: [],
  },
  options: cloneOptions(DEFAULT_OPTIONS),
})

export const parseRbacGraphSearchParams = (params: URLSearchParams, isReverseMode: boolean): TRbacGraphSearchState => {
  const defaultState = createDefaultRbacGraphSearchState(isReverseMode)
  const selectorSelection: TRbacGraphSelectorSelection = {
    apiGroups: uniqueStrings(params.getAll('apiGroup').map(value => value.trim())),
    resources: getArrayParam(params, 'resource'),
    verbs: getArrayParam(params, 'verb'),
    resourceNames: getArrayParam(params, 'resourceName'),
    nonResourceURLs: getArrayParam(params, 'nonResourceURL'),
  }
  const matchMode = getSingleParam(params, 'matchMode')
  const wildcardMode = getSingleParam(params, 'wildcardMode')
  const filterPhantomAPIs = parseBooleanParam(params, 'filterPhantomAPIs')
  const parsedOptions = Object.keys(DEFAULT_OPTIONS).reduce<TRbacGraphOptions>((acc, key) => {
    const optionKey = key as keyof TRbacGraphOptions
    const value = parseBooleanParam(params, optionKey)

    return {
      ...acc,
      ...(value === undefined ? {} : { [optionKey]: value }),
    }
  }, cloneOptions(DEFAULT_OPTIONS))

  if (parsedOptions.starMode) {
    parsedOptions.reduceEdgeCrossings = false
  }

  const rolePayloadPatch = !isReverseMode
    ? {
        includePods: parsedOptions.includePods,
        includeWorkloads: parsedOptions.includeWorkloads,
        namespaceScope:
          getArrayParam(params, 'namespace').length > 0 || parseBooleanParam(params, 'namespaceStrict')
            ? {
                namespaces: getArrayParam(params, 'namespace'),
                strict: parseBooleanParam(params, 'namespaceStrict') ?? false,
              }
            : undefined,
        impersonateUser: getSingleParam(params, 'impersonateUser'),
        impersonateGroup: getSingleParam(params, 'impersonateGroup'),
      }
    : {}

  return {
    payload: {
      spec: {
        ...defaultState.payload.spec,
        selector: selectorSelection,
        matchMode: MATCH_MODES.has(matchMode as TRbacGraphPayload['spec']['matchMode'])
          ? (matchMode as TRbacGraphPayload['spec']['matchMode'])
          : defaultState.payload.spec.matchMode,
        wildcardMode: WILDCARD_MODES.has(wildcardMode as TRbacGraphPayload['spec']['wildcardMode'])
          ? (wildcardMode as TRbacGraphPayload['spec']['wildcardMode'])
          : defaultState.payload.spec.wildcardMode,
        filterPhantomAPIs: filterPhantomAPIs ?? defaultState.payload.spec.filterPhantomAPIs,
        ...('expandImplicitGroups' in defaultState.payload.spec
          ? { expandImplicitGroups: parseBooleanParam(params, 'expandImplicitGroups') ?? false }
          : {}),
        ...rolePayloadPatch,
      },
    } as TRbacGraphPayload,
    selectorSelection,
    options: parsedOptions,
  }
}

export const normalizeRbacGraphSearchState = (
  state: TRbacGraphSearchState,
  options: TRbacGraphSearchNormalizationOptions = {},
): TRbacGraphSearchState => {
  const { changedKey } = options
  const sanitizedSelectorSelection: TRbacGraphSelectorSelection = {
    apiGroups: sanitizeApiGroupStrings(state.selectorSelection.apiGroups),
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

  const isReverseMode = 'expandImplicitGroups' in state.payload.spec
  const defaultPayload = isReverseMode ? DEFAULT_REVERSE_PAYLOAD : DEFAULT_PAYLOAD
  const nextOptions = {
    ...DEFAULT_OPTIONS,
    ...state.options,
    ...(state.options.starMode ? { reduceEdgeCrossings: false } : {}),
    ...(isReverseMode ? { includePods: false, includeWorkloads: false } : {}),
  }
  const namespaceScopeNamespaces =
    'namespaceScope' in state.payload.spec ? sanitizeStrings(state.payload.spec.namespaceScope?.namespaces ?? []) : []
  const namespaceScopeStrict =
    'namespaceScope' in state.payload.spec ? Boolean(state.payload.spec.namespaceScope?.strict) : false

  return {
    selectorSelection: nextSelection,
    options: nextOptions,
    payload: {
      spec: {
        ...defaultPayload.spec,
        ...state.payload.spec,
        selector: nextSelection,
        matchMode: MATCH_MODES.has(state.payload.spec.matchMode)
          ? state.payload.spec.matchMode
          : defaultPayload.spec.matchMode,
        wildcardMode: WILDCARD_MODES.has(state.payload.spec.wildcardMode)
          ? state.payload.spec.wildcardMode
          : defaultPayload.spec.wildcardMode,
        filterPhantomAPIs: state.payload.spec.filterPhantomAPIs,
        ...('includePods' in defaultPayload.spec
          ? {
              includePods: nextOptions.includePods,
              includeWorkloads: nextOptions.includeWorkloads,
              namespaceScope:
                namespaceScopeNamespaces.length > 0 || namespaceScopeStrict
                  ? { namespaces: namespaceScopeNamespaces, strict: namespaceScopeStrict }
                  : undefined,
              impersonateUser:
                'impersonateUser' in state.payload.spec
                  ? state.payload.spec.impersonateUser?.trim() || undefined
                  : undefined,
              impersonateGroup:
                'impersonateGroup' in state.payload.spec
                  ? state.payload.spec.impersonateGroup?.trim() || undefined
                  : undefined,
            }
          : {}),
      },
    } as TRbacGraphPayload,
  }
}

export const serializeRbacGraphSearchParams = (
  state: TRbacGraphSearchState,
  normalizationOptions?: TRbacGraphSearchNormalizationOptions,
) => {
  const normalizedState = normalizeRbacGraphSearchState(state, normalizationOptions)
  const params = new URLSearchParams()
  const { payload, selectorSelection, options } = normalizedState
  const { spec } = payload

  appendParams(params, 'apiGroup', selectorSelection.apiGroups)
  appendParams(params, 'resource', selectorSelection.resources)
  appendParams(params, 'verb', selectorSelection.verbs)
  appendParams(params, 'resourceName', selectorSelection.resourceNames)
  appendParams(params, 'nonResourceURL', selectorSelection.nonResourceURLs)

  if (spec.matchMode !== DEFAULT_PAYLOAD.spec.matchMode) {
    params.set('matchMode', spec.matchMode)
  }

  if (spec.wildcardMode !== DEFAULT_PAYLOAD.spec.wildcardMode) {
    params.set('wildcardMode', spec.wildcardMode)
  }

  if (spec.filterPhantomAPIs !== DEFAULT_PAYLOAD.spec.filterPhantomAPIs) {
    params.set('filterPhantomAPIs', String(spec.filterPhantomAPIs))
  }

  if ('namespaceScope' in spec) {
    appendParams(params, 'namespace', spec.namespaceScope?.namespaces ?? [])
    if (spec.namespaceScope?.strict) params.set('namespaceStrict', 'true')
    if (spec.impersonateUser) params.set('impersonateUser', spec.impersonateUser)
    if (spec.impersonateGroup) params.set('impersonateGroup', spec.impersonateGroup)
  }

  if (
    'expandImplicitGroups' in spec &&
    spec.expandImplicitGroups !== DEFAULT_REVERSE_PAYLOAD.spec.expandImplicitGroups
  ) {
    params.set('expandImplicitGroups', String(spec.expandImplicitGroups))
  }

  Object.entries(options).forEach(([key, value]) => {
    const optionKey = key as keyof TRbacGraphOptions

    if (value !== DEFAULT_OPTIONS[optionKey]) {
      params.set(optionKey, String(value))
    }
  })

  return params
}

export const hasAnyRbacGraphSearchState = (
  state: TRbacGraphSearchState,
  normalizationOptions?: TRbacGraphSearchNormalizationOptions,
) => {
  const normalizedState = normalizeRbacGraphSearchState(state, normalizationOptions)
  const serialized = serializeRbacGraphSearchParams(normalizedState, normalizationOptions)

  return serialized.toString().length > 0
}

export const isEmptyRbacGraphSelectorSelection = (selection: TRbacGraphSelectorSelection) =>
  selection.apiGroups.join('\u0000') === EMPTY_SELECTOR_SELECTION.apiGroups.join('\u0000') &&
  selection.resources.join('\u0000') === EMPTY_SELECTOR_SELECTION.resources.join('\u0000') &&
  selection.verbs.join('\u0000') === EMPTY_SELECTOR_SELECTION.verbs.join('\u0000') &&
  selection.resourceNames.join('\u0000') === EMPTY_SELECTOR_SELECTION.resourceNames.join('\u0000') &&
  selection.nonResourceURLs.join('\u0000') === EMPTY_SELECTOR_SELECTION.nonResourceURLs.join('\u0000')
