import { sortValues } from './valuesAndFormatters'

export const hasConcreteResourceValues = (values?: string[]) =>
  sortValues(values).some(value => value.trim().length > 0 && !value.includes('*') && !value.includes('/'))
