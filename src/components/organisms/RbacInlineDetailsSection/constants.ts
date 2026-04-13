import type { TRbacQueryPayload } from 'localTypes/rbacGraph'

export const CORE_SENTINEL = '__core__'

export const defaultSelectorOptions = {
  apiGroups: [],
  resources: [],
  verbs: [],
  nonResourceURLs: [],
}

export const defaultQueryBehavior: Pick<TRbacQueryPayload['spec'], 'matchMode' | 'wildcardMode' | 'filterPhantomAPIs'> =
  {
    matchMode: 'any',
    wildcardMode: 'expand',
    filterPhantomAPIs: false,
  }

export const MIN_RESULTS_HEIGHT = 320
export const CARD_BOTTOM_CLEARANCE = 24
