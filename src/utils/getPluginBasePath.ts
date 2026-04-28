export const getPluginBasePath = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.at(-3) === 'roles') {
    return `/${segments.slice(0, -3).join('/')}`
  }

  if (segments.at(-2) === 'clusterroles') {
    return `/${segments.slice(0, -2).join('/')}`
  }

  if (
    segments.at(-1) === 'rbac' ||
    segments.at(-1) === 'table' ||
    segments.at(-1) === 'reverse' ||
    segments.at(-1) === 'table-reverse'
  ) {
    return `/${segments.slice(0, -1).join('/')}`
  }

  return pathname
}
