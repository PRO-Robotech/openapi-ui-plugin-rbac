import React, { FC } from 'react'
import { hslFromString } from '@prorobotech/openapi-k8s-toolkit'
import { useThemeMode } from 'hooks/useThemeMode'
import { Styled } from '../../styled'

type TRbacResourceLabelProps = {
  badgeId: string
  value: string
  badgeValue?: string
  showBadge?: boolean
  textClassName?: string
}

const normalizeBadgeValue = (value: string) =>
  value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')

const getBadgeAbbreviation = (value: string) => {
  const normalizedValue = normalizeBadgeValue(value)
  const words = normalizedValue
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean)

  if (words.length === 0) return ''
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? ''

  return words
    .slice(0, 3)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('')
}

export const RbacResourceLabel: FC<TRbacResourceLabelProps> = ({
  badgeId,
  value,
  badgeValue,
  showBadge = true,
  textClassName,
}) => {
  const { mode: theme } = useThemeMode()
  const effectiveBadgeValue = normalizeBadgeValue(badgeValue ?? value)
  const abbr = getBadgeAbbreviation(effectiveBadgeValue)
  const bgColor = effectiveBadgeValue.length > 0 ? hslFromString(effectiveBadgeValue, theme) : ''

  return (
    <Styled.ResourceLabel data-badge-id={badgeId}>
      {showBadge && bgColor.length > 0 && (
        <Styled.ResourceBadgeAbbr $bgColor={bgColor}>{abbr}</Styled.ResourceBadgeAbbr>
      )}
      <span className={textClassName}>{value}</span>
    </Styled.ResourceLabel>
  )
}
