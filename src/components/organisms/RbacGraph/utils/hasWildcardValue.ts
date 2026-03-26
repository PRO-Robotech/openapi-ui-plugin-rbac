export const hasWildcardValue = (values?: string[]) => (values ?? []).some(value => value.includes('*'))
