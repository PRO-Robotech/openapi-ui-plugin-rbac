import type { TRbacExpansionTruncation, TRbacQueryWarning } from 'localTypes/rbacGraph'

type TRbacQueryWarningStatus = {
  expansionTruncated?: TRbacExpansionTruncation | null
}

export const getRbacQueryWarnings = (status: TRbacQueryWarningStatus): TRbacQueryWarning[] => {
  const messages = status.expansionTruncated?.messages
  return Array.isArray(messages) ? messages.filter(message => message.trim().length > 0) : []
}

export const formatRbacQueryWarning = (warning: TRbacQueryWarning) => {
  if (typeof warning === 'string') {
    return warning
  }

  const message = typeof warning.message === 'string' ? warning.message : ''
  const code = typeof warning.code === 'string' ? warning.code : ''
  const roleCount = typeof warning.roleCount === 'number' ? ` (${warning.roleCount} roles)` : ''

  if (code && message) {
    return `${code}: ${message}${roleCount}`
  }

  return message || code || 'RBAC query returned a warning.'
}
