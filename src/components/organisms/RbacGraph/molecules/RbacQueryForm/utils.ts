import type { TRbacQueryPayload } from 'localTypes/rbacGraph'
import { DEFAULT_SPEC } from './constants'

export const updateSpec = (prev: TRbacQueryPayload, patch: Partial<TRbacQueryPayload['spec']>): TRbacQueryPayload => ({
  spec: { ...prev.spec, ...patch },
})

export const updateSelector = (
  prev: TRbacQueryPayload,
  patch: Partial<TRbacQueryPayload['spec']['selector']>,
): TRbacQueryPayload => ({
  spec: { ...prev.spec, selector: { ...prev.spec.selector, ...patch } },
})

export const getPrimarySelectorCount = (spec: TRbacQueryPayload['spec']) =>
  [
    spec.selector.apiGroups,
    spec.selector.resources,
    spec.selector.verbs,
    spec.selector.resourceNames,
    spec.selector.nonResourceURLs,
  ].filter(values => values.length > 0).length

export const getScopeIdentityCount = (spec: TRbacQueryPayload['spec']) =>
  [
    spec.matchMode !== DEFAULT_SPEC.matchMode,
    spec.wildcardMode !== DEFAULT_SPEC.wildcardMode,
    spec.filterPhantomAPIs !== DEFAULT_SPEC.filterPhantomAPIs,
    Boolean(spec.namespaceScope?.namespaces?.length),
    Boolean(spec.namespaceScope?.strict),
    Boolean(spec.impersonateUser),
    Boolean(spec.impersonateGroup),
  ].filter(Boolean).length

export const getRuntimeLimitsCount = (spec: TRbacQueryPayload['spec']) =>
  [
    spec.podPhaseMode !== DEFAULT_SPEC.podPhaseMode,
    spec.maxPodsPerSubject !== DEFAULT_SPEC.maxPodsPerSubject,
    spec.maxWorkloadsPerPod !== DEFAULT_SPEC.maxWorkloadsPerPod,
  ].filter(Boolean).length
