import type { TRbacQueryPayload } from 'localTypes/rbacGraph'

export const DEFAULT_SPEC: TRbacQueryPayload['spec'] = {
  selector: {
    apiGroups: [],
    resources: [],
    verbs: [],
    resourceNames: [],
    nonResourceURLs: [],
  },
  matchMode: 'any',
  wildcardMode: 'expand',
  includeRuleMetadata: true,
  includePods: false,
  includeWorkloads: false,
  podPhaseMode: 'active',
  maxPodsPerSubject: 20,
  maxWorkloadsPerPod: 10,
  filterPhantomAPIs: true,
}
