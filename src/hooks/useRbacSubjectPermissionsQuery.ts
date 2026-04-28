/* eslint-disable no-nested-ternary */
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type {
  TRbacAttributedGrant,
  TRbacAssessment,
  TRbacReverseQueryPayload,
  TRbacRoleDetailsResponse,
  TRbacSubjectPermissionGrantGroup,
  TRbacSubjectPermissionsStatus,
} from 'localTypes/rbacGraph'

const getRbacSubjectPermissionsApiUrl = (clusterId: string) =>
  `/api/clusters/${clusterId}/k8s/apis/rbacgraph.in-cloud.io/v1alpha1/subjectpermissionsviews`

type TNewVerbPermission = {
  granted?: boolean
  supportedByApi?: boolean
  rules?: Array<{
    ruleIndex?: number
    apiGroups?: string[]
    resources?: string[]
    verbs?: string[]
    nonResourceURLs?: string[]
  }>
}

type TNewResourcePermission = {
  plural?: string
  phantom?: boolean
  verbs?: Record<string, TNewVerbPermission>
}

type TNewApiGroupPermission = {
  apiGroup?: string
  resources?: TNewResourcePermission[]
}

type TNewNonResourceUrlPermission = {
  url?: string
  verbs?: Record<string, TNewVerbPermission>
}

type TNewSubjectPermissionsStatus = TRbacSubjectPermissionsStatus & {
  apiGroups?: TNewApiGroupPermission[]
  nonResourceUrls?: {
    urls?: TNewNonResourceUrlPermission[]
  }
}

const normalizeAssessment = (assessment?: TRbacAssessment): TRbacAssessment | undefined => {
  if (!assessment || typeof assessment !== 'object') {
    return undefined
  }

  return {
    highestSeverity:
      typeof assessment.highestSeverity === 'string' && assessment.highestSeverity.trim().length > 0
        ? assessment.highestSeverity
        : undefined,
    criticalCount: typeof assessment.criticalCount === 'number' ? assessment.criticalCount : 0,
    highCount: typeof assessment.highCount === 'number' ? assessment.highCount : 0,
    mediumCount: typeof assessment.mediumCount === 'number' ? assessment.mediumCount : 0,
    lowCount: typeof assessment.lowCount === 'number' ? assessment.lowCount : 0,
    totalCount: typeof assessment.totalCount === 'number' ? assessment.totalCount : 0,
    checkIDs: Array.isArray(assessment.checkIDs)
      ? assessment.checkIDs.filter(checkID => typeof checkID === 'string')
      : [],
  }
}

const normalizeRuleOrigins = (rules: TNewVerbPermission['rules']) =>
  Array.isArray(rules)
    ? rules.map(rule => ({
        apiGroups: Array.isArray(rule.apiGroups) ? rule.apiGroups : undefined,
        resources: Array.isArray(rule.resources) ? rule.resources : undefined,
        verbs: Array.isArray(rule.verbs) ? rule.verbs : [],
        nonResourceURLs: Array.isArray(rule.nonResourceURLs) ? rule.nonResourceURLs : undefined,
        sourceRuleIndex: typeof rule.ruleIndex === 'number' ? rule.ruleIndex : undefined,
      }))
    : []

const grantTargetKey = (grant: TRbacAttributedGrant) =>
  grant.nonResourceURL
    ? ['non-resource', grant.nonResourceURL, grant.verb, (grant.resourceNames ?? []).join('\u0000')].join('\u0001')
    : [
        'resource',
        grant.apiGroup ?? '',
        grant.resource ?? '',
        grant.verb,
        (grant.resourceNames ?? []).join('\u0000'),
      ].join('\u0001')

const groupSubjectGrants = (grants: TRbacAttributedGrant[] = []): TRbacSubjectPermissionGrantGroup[] => {
  const groupsByKey = new Map<string, TRbacSubjectPermissionGrantGroup>()

  grants.forEach(grant => {
    const key = grantTargetKey(grant)
    const existing = groupsByKey.get(key)
    const group =
      existing ??
      ({
        key,
        type: grant.nonResourceURL ? 'non-resource' : 'resource',
        apiGroup: grant.apiGroup,
        resource: grant.resource,
        nonResourceURL: grant.nonResourceURL,
        verb: grant.verb,
        resourceNames: grant.resourceNames ?? [],
        grants: [],
      } satisfies TRbacSubjectPermissionGrantGroup)
    const grantKey = [
      grant.sourceRole.kind,
      grant.sourceRole.namespace ?? '',
      grant.sourceRole.name,
      grant.sourceBinding.kind,
      grant.sourceBinding.namespace ?? '',
      grant.sourceBinding.name,
    ].join('\u0001')

    if (
      !group.grants.some(
        item =>
          [
            item.role.kind,
            item.role.namespace ?? '',
            item.role.name,
            item.binding.kind,
            item.binding.namespace ?? '',
            item.binding.name,
          ].join('\u0001') === grantKey,
      )
    ) {
      group.grants.push({
        role: grant.sourceRole,
        binding: grant.sourceBinding,
      })
    }

    groupsByKey.set(key, group)
  })

  return Array.from(groupsByKey.values()).sort(
    (left, right) =>
      left.type.localeCompare(right.type) ||
      (left.apiGroup ?? '').localeCompare(right.apiGroup ?? '') ||
      (left.resource ?? left.nonResourceURL ?? '').localeCompare(right.resource ?? right.nonResourceURL ?? '') ||
      left.verb.localeCompare(right.verb),
  )
}

const normalizeSubjectPermissionsResponse = (
  status: TNewSubjectPermissionsStatus,
  payload: TRbacReverseQueryPayload,
): TRbacRoleDetailsResponse => {
  const resourceGroups = Array.isArray(status.apiGroups)
    ? status.apiGroups.map(group => ({
        apiGroup: group.apiGroup === 'core' ? '' : String(group.apiGroup ?? ''),
        displayName: group.apiGroup === 'core' ? 'core (v1)' : String(group.apiGroup ?? ''),
        existsInApi: null,
        resources: Array.isArray(group.resources)
          ? group.resources.map(resource => {
              const verbsRecord = resource.verbs ?? {}
              const activeVerbs = Object.entries(verbsRecord).filter(([, permission]) => permission?.granted !== false)

              return {
                resource: String(resource.plural ?? ''),
                kind: null,
                existsInApi: typeof resource.phantom === 'boolean' ? !resource.phantom : null,
                apiVerbs: activeVerbs
                  .filter(([, permission]) => permission?.supportedByApi !== false)
                  .map(([verb]) => verb),
                resourceNames: [],
                verbs: activeVerbs.map(([verb]) => verb),
                verbOrigins: Object.fromEntries(
                  activeVerbs.map(([verb, permission]) => [verb, normalizeRuleOrigins(permission?.rules)]),
                ),
              }
            })
          : [],
      }))
    : []

  const rawNonResourceUrlEntries = status.nonResourceUrls?.urls
  const nonResourceUrlEntries = Array.isArray(rawNonResourceUrlEntries) ? rawNonResourceUrlEntries : []
  const nonResourceUrls = nonResourceUrlEntries.map(permission => {
    const verbsRecord = permission.verbs ?? {}
    const activeVerbs = Object.entries(verbsRecord).filter(([, verbPermission]) => verbPermission?.granted !== false)

    return {
      url: String(permission.url ?? ''),
      verbs: activeVerbs.map(([verb]) => verb),
      verbOrigins: Object.fromEntries(
        activeVerbs.map(([verb, verbPermission]) => [verb, normalizeRuleOrigins(verbPermission?.rules)]),
      ),
    }
  })
  const subject = status.subject ?? payload.spec.subject
  const roles = Array.isArray(status.roles) ? status.roles : []
  const roleAssessments = roles.map(role => normalizeAssessment(role.assessment)).filter(Boolean)
  const totalAssessment = roleAssessments.reduce<TRbacAssessment | undefined>((acc, assessment) => {
    if (!assessment) return acc

    return {
      highestSeverity: acc?.highestSeverity ?? assessment.highestSeverity,
      criticalCount: (acc?.criticalCount ?? 0) + assessment.criticalCount,
      highCount: (acc?.highCount ?? 0) + assessment.highCount,
      mediumCount: (acc?.mediumCount ?? 0) + assessment.mediumCount,
      lowCount: (acc?.lowCount ?? 0) + assessment.lowCount,
      totalCount: (acc?.totalCount ?? 0) + assessment.totalCount,
      checkIDs: Array.from(new Set([...(acc?.checkIDs ?? []), ...(assessment.checkIDs ?? [])])),
    }
  }, undefined)

  return {
    uid: '',
    kind: subject.kind || 'Subject',
    name: subject.name,
    namespace: subject.namespace,
    labels: undefined,
    annotations: undefined,
    aggregated: false,
    aggregationSources: [],
    rules: [],
    resourceGroups,
    nonResourceUrls,
    bindings: [],
    assessment: totalAssessment,
    subjectGrantGroups: groupSubjectGrants(status.grants),
  }
}

type TUseRbacSubjectPermissionsQueryArgs = {
  clusterId: string
  payload: TRbacReverseQueryPayload | null
  enabled?: boolean
}

export const useRbacSubjectPermissionsQuery = ({
  clusterId,
  payload,
  enabled = true,
}: TUseRbacSubjectPermissionsQueryArgs) =>
  useQuery({
    enabled: Boolean(enabled && clusterId && payload),
    queryKey: ['rbac-subject-permissions', clusterId, payload],
    queryFn: async (): Promise<TRbacRoleDetailsResponse> => {
      if (!payload) {
        throw new Error('Subject permissions query requires a payload.')
      }

      const { data } = await axios.post(getRbacSubjectPermissionsApiUrl(clusterId), payload)
      const status =
        typeof data === 'object' && data !== null && typeof data.status === 'object' && data.status !== null
          ? (data.status as TNewSubjectPermissionsStatus)
          : ({
              subject: payload.spec.subject,
              grants: [],
              bindings: [],
              roles: [],
            } as TNewSubjectPermissionsStatus)

      return normalizeSubjectPermissionsResponse(status, payload)
    },
  })
