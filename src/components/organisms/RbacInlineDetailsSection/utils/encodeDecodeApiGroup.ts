import { CORE_SENTINEL } from '../constants'

export const encodeApiGroup = (value: string) => (value === '' ? CORE_SENTINEL : value)

export const decodeApiGroup = (value: string) => (value === CORE_SENTINEL ? '' : value)
