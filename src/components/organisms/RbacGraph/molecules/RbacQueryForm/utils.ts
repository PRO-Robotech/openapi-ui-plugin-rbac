import type { TRbacQueryPayload, TRbacReverseQueryPayload } from 'localTypes/rbacGraph'
import { DEFAULT_REVERSE_SPEC, DEFAULT_SPEC } from './constants'

export type TRbacQueryFormPayload = TRbacQueryPayload | TRbacReverseQueryPayload

export const updateSpec = <T extends TRbacQueryFormPayload>(prev: T, patch: Partial<T['spec']>): T =>
  ({
    spec: { ...prev.spec, ...patch },
  }) as T

export const updateSelector = (
  prev: TRbacQueryFormPayload,
  patch: Partial<TRbacQueryFormPayload['spec']['selector']>,
): TRbacQueryFormPayload =>
  ({
    spec: { ...prev.spec, selector: { ...prev.spec.selector, ...patch } },
  }) as TRbacQueryFormPayload

export const getPrimarySelectorCount = (spec: TRbacQueryFormPayload['spec']) =>
  [
    spec.selector.apiGroups,
    spec.selector.resources,
    spec.selector.verbs,
    spec.selector.resourceNames,
    spec.selector.nonResourceURLs,
  ].filter(values => values.length > 0).length

export const getSubjectCount = (spec: TRbacReverseQueryPayload['spec']) =>
  [Boolean(spec.subject.kind), Boolean(spec.subject.name), Boolean(spec.subject.namespace)].filter(Boolean).length

export const getScopeIdentityCount = (spec: TRbacQueryFormPayload['spec']) =>
  [
    spec.matchMode !== DEFAULT_SPEC.matchMode,
    spec.wildcardMode !== DEFAULT_SPEC.wildcardMode,
    spec.filterPhantomAPIs !== DEFAULT_SPEC.filterPhantomAPIs,
    'namespaceScope' in spec && Boolean(spec.namespaceScope?.namespaces?.length),
    'namespaceScope' in spec && Boolean(spec.namespaceScope?.strict),
    'impersonateUser' in spec && Boolean(spec.impersonateUser),
    'impersonateGroup' in spec && Boolean(spec.impersonateGroup),
    'directOnly' in spec && spec.directOnly !== DEFAULT_REVERSE_SPEC.directOnly,
  ].filter(Boolean).length

export const getRuntimeLimitsCount = (spec: TRbacQueryPayload['spec']) =>
  [
    spec.podPhaseMode !== DEFAULT_SPEC.podPhaseMode,
    spec.maxPodsPerSubject !== DEFAULT_SPEC.maxPodsPerSubject,
    spec.maxWorkloadsPerPod !== DEFAULT_SPEC.maxWorkloadsPerPod,
  ].filter(Boolean).length
