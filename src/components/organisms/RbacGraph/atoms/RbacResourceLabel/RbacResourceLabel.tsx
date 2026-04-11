import React, { FC } from 'react'
import { getUppercase, hslFromString } from '@prorobotech/openapi-k8s-toolkit'
import { useThemeMode } from 'hooks/useThemeMode'
import { Styled } from '../../styled'

type TRbacResourceLabelProps = {
  badgeId: string
  value: string
  badgeValue?: string
  showBadge?: boolean
  textClassName?: string
  textNode?: React.ReactNode
}

export const RbacResourceLabel: FC<TRbacResourceLabelProps> = ({
  badgeId,
  value,
  badgeValue,
  showBadge = true,
  textClassName,
  textNode,
}) => {
  const { mode: theme } = useThemeMode()
  const effectiveBadgeValue = (badgeValue ?? value).trim()
  const abbr = effectiveBadgeValue.length > 0 ? getUppercase(effectiveBadgeValue) : ''
  const bgColor = effectiveBadgeValue.length > 0 ? hslFromString(effectiveBadgeValue, theme) : ''

  return (
    <Styled.ResourceLabel data-badge-id={badgeId}>
      {showBadge && bgColor.length > 0 && (
        <Styled.ResourceBadgeAbbr $bgColor={bgColor}>{abbr}</Styled.ResourceBadgeAbbr>
      )}
      {textNode ?? <span className={textClassName}>{value}</span>}
    </Styled.ResourceLabel>
  )
}
