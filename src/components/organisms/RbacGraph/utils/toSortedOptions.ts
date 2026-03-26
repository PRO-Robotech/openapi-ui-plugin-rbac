export const toSortedOptions = (values: Set<string>) =>
  Array.from(values)
    .sort((a, b) => a.localeCompare(b))
    .map(value => ({ value, label: value }))
