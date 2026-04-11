import type { TKindWithVersion } from '@prorobotech/openapi-k8s-toolkit'

const normalizeValue = (value: string) => value.trim().toLowerCase()
const isConcreteApiGroup = (value: string) => value.length > 0 && value !== '*'
const sortKinds = (left: TKindWithVersion, right: TKindWithVersion) => {
  if (left.version.preferred !== right.version.preferred) {
    return left.version.preferred ? -1 : 1
  }

  return (
    left.kind.localeCompare(right.kind) ||
    left.group.localeCompare(right.group) ||
    left.version.resource.localeCompare(right.version.resource) ||
    left.version.version.localeCompare(right.version.version)
  )
}

const normalizeApiGroups = (apiGroups?: string[]) =>
  Array.from(new Set((apiGroups ?? []).map(group => group.trim()).filter(isConcreteApiGroup)))

const getMatchingKindsByResource = ({
  apiGroups,
  kindsWithVersion,
  value,
}: {
  apiGroups?: string[]
  kindsWithVersion: TKindWithVersion[]
  value: string
}) => {
  const normalizedApiGroups = normalizeApiGroups(apiGroups)
  const normalizedValue = normalizeValue(value)

  return kindsWithVersion
    .filter(kind => normalizeValue(kind.version.resource) === normalizedValue)
    .filter(kind => normalizedApiGroups.length === 0 || normalizedApiGroups.includes(kind.group))
    .sort(sortKinds)
}

const getMatchingKindsByKind = ({
  kindsWithVersion,
  value,
}: {
  kindsWithVersion: TKindWithVersion[]
  value: string
}) => {
  const normalizedValue = normalizeValue(value)

  return kindsWithVersion.filter(kind => normalizeValue(kind.kind) === normalizedValue).sort(sortKinds)
}

const getResolvedKindFromMatches = (matches: TKindWithVersion[]) => {
  const distinctKinds = Array.from(new Set(matches.map(match => match.kind)))

  return distinctKinds.length === 1 ? distinctKinds[0] : undefined
}

export const resolveKindValue = ({
  apiGroups,
  fallbackKind,
  kindsWithVersion,
  value,
}: {
  apiGroups?: string[]
  fallbackKind?: string | null
  kindsWithVersion: TKindWithVersion[]
  value: string
}) => {
  const trimmedValue = value.trim()

  if (!trimmedValue || trimmedValue === '*' || trimmedValue.startsWith('/')) {
    return trimmedValue
  }

  const exactMatchWithinApiGroup = getMatchingKindsByResource({
    apiGroups,
    kindsWithVersion,
    value: trimmedValue,
  })
  const resolvedExactMatchWithinApiGroup = getResolvedKindFromMatches(exactMatchWithinApiGroup)

  if (resolvedExactMatchWithinApiGroup) {
    return resolvedExactMatchWithinApiGroup
  }

  const exactPluralMatch = getMatchingKindsByResource({
    kindsWithVersion,
    value: trimmedValue,
  })
  const resolvedExactPluralMatch = getResolvedKindFromMatches(exactPluralMatch)

  if (resolvedExactPluralMatch) {
    return resolvedExactPluralMatch
  }

  const exactKindMatch = getMatchingKindsByKind({
    kindsWithVersion,
    value: trimmedValue,
  })
  const resolvedExactKindMatch = getResolvedKindFromMatches(exactKindMatch)

  if (resolvedExactKindMatch) {
    return resolvedExactKindMatch
  }

  return fallbackKind?.trim() || trimmedValue
}

export const shouldShowResolvedResourceBadge = (value: string) => {
  const trimmedValue = value.trim()

  return Boolean(trimmedValue) && trimmedValue !== '*' && !trimmedValue.startsWith('/')
}

export const resolveResourceDisplayValue = ({
  apiGroups,
  kindsWithVersion,
  value,
}: {
  apiGroups?: string[]
  kindsWithVersion: TKindWithVersion[]
  value: string
}): string => {
  const trimmedValue = value.trim()

  if (!trimmedValue || trimmedValue.includes('*') || trimmedValue.startsWith('/')) {
    return trimmedValue
  }

  const slashIndex = trimmedValue.indexOf('/')
  const parentResource = slashIndex === -1 ? trimmedValue : trimmedValue.slice(0, slashIndex)
  const subresource = slashIndex === -1 ? '' : trimmedValue.slice(slashIndex)
  const resolvedKind = resolveKindValue({
    apiGroups,
    kindsWithVersion,
    value: parentResource,
  })

  return `${resolvedKind}${subresource}`
}

export const resolveResourcePresentation = ({
  apiGroups,
  fallbackKind,
  kindsWithVersion,
  resource,
}: {
  apiGroups?: string[]
  fallbackKind?: string | null
  kindsWithVersion: TKindWithVersion[]
  resource: string
}) => {
  const trimmedResource = resource.trim()
  const slashIndex = trimmedResource.indexOf('/')
  const parentResource = slashIndex === -1 ? trimmedResource : trimmedResource.slice(0, slashIndex)
  const subresource = slashIndex === -1 ? undefined : trimmedResource.slice(slashIndex + 1)
  const resolvedKind = resolveKindValue({
    apiGroups,
    fallbackKind,
    kindsWithVersion,
    value: parentResource,
  })

  return {
    parentResource,
    subresource,
    resolvedKind,
    displayValue: resolvedKind,
  }
}
