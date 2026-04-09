import React, { FC, PropsWithChildren } from 'react'
import { theme } from 'antd'
import { RbacBreadcrumbs, type TRbacBreadcrumbLink } from 'components/molecules/RbacBreadcrumbs'
import { Styled } from './styled'

type TRbacPageShellProps = PropsWithChildren<{
  breadcrumbItems: TRbacBreadcrumbLink[]
}>

export const RbacPageShell: FC<TRbacPageShellProps> = ({ breadcrumbItems, children }) => {
  const { token } = theme.useToken()
  const isEmbeddedUnderHost =
    typeof window !== 'undefined' && window.location.pathname.split('/').filter(Boolean).includes('plugins')

  return (
    <>
      {isEmbeddedUnderHost ? (
        <Styled.EmbeddedBreadcrumbSlot>
          <RbacBreadcrumbs items={breadcrumbItems} />
        </Styled.EmbeddedBreadcrumbSlot>
      ) : (
        <Styled.NavigationContainer $bgColor={token.colorBgLayout}>
          <RbacBreadcrumbs items={breadcrumbItems} />
        </Styled.NavigationContainer>
      )}
      <Styled.Content>{children}</Styled.Content>
    </>
  )
}
