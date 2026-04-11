import type {
  TRbacQueryPayload,
  TRbacRoleDetailsNonResourceUrlPermission,
  TRbacRoleDetailsResourceGroup,
  TRbacRoleDetailsResponse,
} from 'localTypes/rbacGraph'

export type TRbacInlineFilterState = TRbacQueryPayload['spec']['selector']

type TResourceEntry = {
  apiGroup: string
  resource: string
  verbs: string[]
  resourceNames: string[]
}

type TAvailableOptions = {
  apiGroups: string[]
  resources: string[]
  verbs: string[]
  resourceNames: string[]
  nonResourceURLs: string[]
}

export const EMPTY_RBAC_INLINE_FILTER: TRbacInlineFilterState = {
  apiGroups: [],
  resources: [],
  verbs: [],
  resourceNames: [],
  nonResourceURLs: [],
}

const flatEntries = (groups: TRbacRoleDetailsResourceGroup[]): TResourceEntry[] => {
  const entries: TResourceEntry[] = []

  groups.forEach(group => {
    group.resources.forEach(resource => {
      entries.push({
        apiGroup: group.apiGroup,
        resource: resource.resource,
        verbs: [...resource.verbs],
        resourceNames: [...resource.resourceNames],
      })
    })
  })

  return entries
}

export const computeAvailableOptions = (
  data: Pick<TRbacRoleDetailsResponse, 'resourceGroups' | 'nonResourceUrls'>,
  filter: TRbacInlineFilterState,
): TAvailableOptions => {
  const hasResourceFilter =
    filter.apiGroups.length > 0 || filter.resources.length > 0 || filter.resourceNames.length > 0
  const hasNonResourceFilter = filter.nonResourceURLs.length > 0

  const apiGroups = new Set<string>()
  const resources = new Set<string>()
  const verbs = new Set<string>()
  const resourceNames = new Set<string>()
  const nonResourceURLs = new Set<string>()

  if (!hasNonResourceFilter) {
    flatEntries(data.resourceGroups).forEach(entry => {
      const matchApiGroup = filter.apiGroups.length === 0 || filter.apiGroups.includes(entry.apiGroup)
      const matchResource = filter.resources.length === 0 || filter.resources.includes(entry.resource)
      const matchVerb = filter.verbs.length === 0 || entry.verbs.some(verb => filter.verbs.includes(verb))
      const matchResourceNames =
        filter.resourceNames.length === 0 || entry.resourceNames.some(name => filter.resourceNames.includes(name))

      if (matchResource && matchVerb && matchResourceNames) apiGroups.add(entry.apiGroup)
      if (matchApiGroup && matchVerb && matchResourceNames) resources.add(entry.resource)
      if (matchApiGroup && matchResource && matchResourceNames) entry.verbs.forEach(verb => verbs.add(verb))
      if (matchApiGroup && matchResource && matchVerb) entry.resourceNames.forEach(name => resourceNames.add(name))
    })
  }

  if (!hasResourceFilter) {
    data.nonResourceUrls.forEach(permission => {
      const permissionVerbs = [...permission.verbs]
      const matchUrl = filter.nonResourceURLs.length === 0 || filter.nonResourceURLs.includes(permission.url)
      const matchVerb = filter.verbs.length === 0 || permissionVerbs.some(verb => filter.verbs.includes(verb))

      if (matchVerb) nonResourceURLs.add(permission.url)
      if (matchUrl) permissionVerbs.forEach(verb => verbs.add(verb))
    })
  }

  return {
    apiGroups: [...apiGroups].sort((left, right) => {
      if (left === '') return -1
      if (right === '') return 1
      return left.localeCompare(right)
    }),
    resources: [...resources].sort(),
    verbs: [...verbs].sort(),
    resourceNames: [...resourceNames].sort(),
    nonResourceURLs: [...nonResourceURLs].sort(),
  }
}

const filterResourceGroups = (
  groups: TRbacRoleDetailsResourceGroup[],
  filter: TRbacInlineFilterState,
): TRbacRoleDetailsResourceGroup[] => {
  const hasFilter =
    filter.apiGroups.length > 0 ||
    filter.resources.length > 0 ||
    filter.verbs.length > 0 ||
    filter.resourceNames.length > 0

  if (!hasFilter) return groups

  return groups
    .filter(group => filter.apiGroups.length === 0 || filter.apiGroups.includes(group.apiGroup))
    .map(group => {
      const resources = group.resources.filter(resource => {
        if (filter.resources.length > 0 && !filter.resources.includes(resource.resource)) return false
        if (filter.verbs.length > 0 && !filter.verbs.some(verb => resource.verbs.includes(verb))) return false
        if (
          filter.resourceNames.length > 0 &&
          !resource.resourceNames.some(name => filter.resourceNames.includes(name))
        )
          return false
        return true
      })

      if (resources.length === 0) return null

      return {
        ...group,
        resources,
      }
    })
    .filter((group): group is TRbacRoleDetailsResourceGroup => group !== null)
}

const filterNonResourceUrls = (
  permissions: TRbacRoleDetailsNonResourceUrlPermission[],
  filter: TRbacInlineFilterState,
): TRbacRoleDetailsNonResourceUrlPermission[] => {
  const hasFilter = filter.nonResourceURLs.length > 0 || filter.verbs.length > 0

  if (!hasFilter) return permissions

  return permissions.filter(permission => {
    if (filter.nonResourceURLs.length > 0 && !filter.nonResourceURLs.includes(permission.url)) return false
    if (filter.verbs.length > 0 && !filter.verbs.some(verb => permission.verbs.includes(verb))) return false
    return true
  })
}

export const applyInlineFilters = (
  data: TRbacRoleDetailsResponse,
  filter: TRbacInlineFilterState,
): TRbacRoleDetailsResponse => {
  const hasResourceFilter =
    filter.apiGroups.length > 0 || filter.resources.length > 0 || filter.resourceNames.length > 0
  const hasNonResourceFilter = filter.nonResourceURLs.length > 0

  return {
    ...data,
    resourceGroups: hasNonResourceFilter ? [] : filterResourceGroups(data.resourceGroups, filter),
    nonResourceUrls: hasResourceFilter ? [] : filterNonResourceUrls(data.nonResourceUrls, filter),
  }
}
