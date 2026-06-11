import React, { FC } from 'react'
import { getUppercase, hslFromString, type TDynamicComponentsAppTypeMap } from '@prorobotech/openapi-k8s-toolkit'
import { useThemeMode } from 'hooks/useThemeMode'

export const getRbacResourceBadgeStyle = (bgColor: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  border: `1px solid ${bgColor}`,
  borderRadius: 4,
  padding: '0 7px',
  height: 22,
  fontFamily: '"SF Pro", sans-serif',
  fontSize: 12,
  fontStyle: 'normal',
  fontWeight: 400,
  lineHeight: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textTransform: 'uppercase',
  letterSpacing: 0,
  boxSizing: 'border-box',
  flexShrink: 0,
})

export const renderRbacResourceBadge = (value: string, theme: 'light' | 'dark', displayValue = value) => {
  const badgeColor = hslFromString(value, theme)

  return React.createElement('span', { style: getRbacResourceBadgeStyle(badgeColor) }, getUppercase(displayValue))
}

export const RbacResourceBadge: FC<{ data: TDynamicComponentsAppTypeMap['ResourceBadge'] }> = ({ data }) => {
  const { mode } = useThemeMode()

  return renderRbacResourceBadge(data.value, mode, data.abbreviation || data.value)
}
