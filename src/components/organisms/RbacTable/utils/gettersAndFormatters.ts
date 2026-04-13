/* eslint-disable max-lines-per-function */
import React from 'react'
import { theme } from 'antd'

import {
  type TTableAccountBinding,
  type TRoleTableRow,
  type TTableScope,
  type TTableSubject,
} from './buildRoleTableRows'

export const formatSubjectLabel = ({ name }: TTableSubject) => name

export const getAccountBindingsSearchText = (accountBindings: TTableAccountBinding[]) =>
  accountBindings
    .flatMap(accountBinding => [
      accountBinding.subject?.kind,
      accountBinding.subject?.name,
      accountBinding.subject?.namespace,
      accountBinding.binding?.kind,
      accountBinding.binding?.name,
      accountBinding.binding?.namespace,
      accountBinding.scope,
    ])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

export const getRoleSearchText = (row: TRoleTableRow) =>
  [row.roleKind, row.roleName, row.namespace]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

export const getScopeTagStyle = (
  scope: TTableScope,
  token: ReturnType<typeof theme.useToken>['token'],
): React.CSSProperties => {
  if (scope === 'cluster-wide') {
    return {
      color: token.gold7,
      backgroundColor: token.gold1,
      borderColor: token.gold3,
    }
  }

  if (scope === 'narrowed') {
    return {
      color: token.blue7,
      backgroundColor: token.blue1,
      borderColor: token.blue3,
    }
  }

  if (scope === 'same-ns') {
    return {
      color: token.green7,
      backgroundColor: token.green1,
      borderColor: token.green3,
    }
  }

  if (scope === 'cross-ns') {
    return {
      color: token.volcano7,
      backgroundColor: token.volcano1,
      borderColor: token.volcano3,
    }
  }

  return {
    color: token.colorTextSecondary,
    backgroundColor: token.colorFillAlter,
    borderColor: token.colorBorder,
  }
}

export const getRoleDetailsToken = (token: ReturnType<typeof theme.useToken>['token']) => ({
  colorBgContainer: token.colorBgContainer,
  colorBgElevated: token.colorBgElevated,
  colorBorder: token.colorBorder,
  colorBorderSecondary: token.colorBorderSecondary,
  colorError: token.colorError,
  colorFillAlter: token.colorFillAlter,
  colorFillSecondary: token.colorFillSecondary,
  colorInfo: token.colorInfo,
  colorPrimary: token.colorPrimary,
  colorPrimaryBg: token.colorPrimaryBg,
  colorPrimaryBorder: token.colorPrimaryBorder,
  colorPrimaryText: token.colorPrimaryText,
  colorText: token.colorText,
  colorTextSecondary: token.colorTextSecondary,
  colorWarning: token.colorWarning,
  borderRadius: token.borderRadius,
  boxShadowSecondary: token.boxShadowSecondary,
  fontFamilyCode: token.fontFamilyCode,
})
