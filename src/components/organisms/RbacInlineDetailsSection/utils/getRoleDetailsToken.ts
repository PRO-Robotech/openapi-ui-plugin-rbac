import { theme } from 'antd'

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
