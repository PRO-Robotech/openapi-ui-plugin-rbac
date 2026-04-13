export const getQueryErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return 'Failed to load RBAC details.'
}
