import type { TTokenLike } from './types'

const VERB_CATEGORIES: Record<string, 'read' | 'write' | 'delete' | 'other'> = {
  get: 'read',
  list: 'read',
  watch: 'read',
  create: 'write',
  update: 'write',
  patch: 'write',
  delete: 'delete',
  deletecollection: 'delete',
  impersonate: 'other',
}

const VERB_ORDER = ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete', 'deletecollection', 'impersonate']

export const hexToRgba = (hex: string, alpha: number) => {
  const normalizedHex = hex.replace('#', '')

  if (normalizedHex.length !== 6) return hex

  const r = Number.parseInt(normalizedHex.slice(0, 2), 16)
  const g = Number.parseInt(normalizedHex.slice(2, 4), 16)
  const b = Number.parseInt(normalizedHex.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const getVerbColor = (verb: string, token: TTokenLike) => {
  const category = VERB_CATEGORIES[verb.toLowerCase()] ?? 'other'

  if (category === 'read') return token.colorInfo ?? token.colorPrimary
  if (category === 'write') return token.colorWarning
  if (category === 'delete') return token.colorError

  return token.colorPrimaryText
}

export const sortVerbs = (verbs: Iterable<string>) => {
  const set = new Set(Array.from(verbs).map(verb => verb.toLowerCase()))
  const ordered = VERB_ORDER.filter(verb => set.has(verb))
  const extra = Array.from(set)
    .filter(verb => !VERB_ORDER.includes(verb))
    .sort((left, right) => left.localeCompare(right))

  return [...ordered, ...extra]
}
