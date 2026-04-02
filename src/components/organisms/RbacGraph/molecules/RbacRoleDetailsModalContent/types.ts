import type {
  TRbacRoleDetailsNonResourceUrlPermission,
  TRbacRoleDetailsResourcePermission,
  TRbacRoleDetailsRuleOrigin,
} from 'localTypes/rbacGraph'

export type TTokenLike = {
  colorBgContainer: string
  colorBgElevated: string
  colorBorder: string
  colorBorderSecondary?: string
  colorError: string
  colorFillAlter: string
  colorFillSecondary: string
  colorInfo?: string
  colorPrimary: string
  colorPrimaryBg: string
  colorPrimaryBorder: string
  colorPrimaryText: string
  colorText: string
  colorTextSecondary: string
  colorWarning: string
  borderRadius?: number
  boxShadowSecondary?: string
  fontFamilyCode: string
}

export type TMatchContext = {
  apiGroup?: string
  resource?: string
  url?: string
  verb: string
}

export type TKindByResource = Map<string, string>

export type TPermissionLike = TRbacRoleDetailsResourcePermission | TRbacRoleDetailsNonResourceUrlPermission

export type TPermissionCellProps = {
  allowed: boolean
  color: string
  existsInApi: boolean | null
  origins: TRbacRoleDetailsRuleOrigin[]
  token: TTokenLike
  kindByResource: TKindByResource
  matchValue: TMatchContext
}
