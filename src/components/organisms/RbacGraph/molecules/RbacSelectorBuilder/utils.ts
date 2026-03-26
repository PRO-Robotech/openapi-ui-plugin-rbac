import { CORE_GROUP_VALUE } from './constants'

export const normalizeGroupValue = (value: string) => (value === '' ? CORE_GROUP_VALUE : value)

export const denormalizeGroupValue = (value: string) => (value === CORE_GROUP_VALUE ? '' : value)
