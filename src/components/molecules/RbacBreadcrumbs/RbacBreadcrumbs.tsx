import React, { FC, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ManageableBreadcrumbs, type TManageableBreadcrumbsProps } from '@prorobotech/openapi-k8s-toolkit'
import type { BreadcrumbItemType } from 'antd/es/breadcrumb/Breadcrumb'
import { Styled } from './styled'

export type TRbacBreadcrumbLink = {
  key: string
  label: string
  link?: string
}

const toBreadcrumbItems = (items: TRbacBreadcrumbLink[]): BreadcrumbItemType[] =>
  items.map(({ key, label, link }) => ({
    key,
    title: link ? <Link to={link}>{label}</Link> : label,
  }))

type TRbacBreadcrumbsProps = {
  items: TRbacBreadcrumbLink[]
}

export const RbacBreadcrumbs: FC<TRbacBreadcrumbsProps> = ({ items }) => {
  const data = useMemo<TManageableBreadcrumbsProps['data']>(
    () => ({
      breadcrumbItems: toBreadcrumbItems(items),
    }),
    [items],
  )

  return (
    <Styled.Wrapper>
      <ManageableBreadcrumbs data={data} />
    </Styled.Wrapper>
  )
}
