export const parsePermissionLabel = (label: string) => {
  const match = label.match(/^([A-Z*]+)\s+(.+)$/)

  if (!match) {
    return { verb: '*', target: label }
  }

  return { verb: match[1], target: match[2] }
}
