/* eslint-disable max-lines-per-function */
import React from 'react'
import { Tag } from 'antd'
import { RbacResourceLink } from 'components/organisms/RbacGraph/atoms/RbacResourceLink'
import { RbacResourceLabel } from 'components/organisms/RbacGraph/atoms/RbacResourceLabel'
import { Styled } from '../../styled'

export const LinkedResourceLabel = ({
  badgeId,
  value,
  badgeValue,
  href,
  namespace,
}: {
  badgeId: string
  value: string
  badgeValue?: string
  href?: string
  namespace?: string
}) => {
  let textNode: React.ReactNode

  if (namespace && namespace !== 'cluster-wide') {
    textNode = (
      <Styled.AccountBindingTextGroup>
        <Tag color="orange">{namespace}</Tag>
        {href ? <RbacResourceLink href={href}>{value}</RbacResourceLink> : <span>{value}</span>}
      </Styled.AccountBindingTextGroup>
    )
  } else if (href) {
    textNode = <RbacResourceLink href={href}>{value}</RbacResourceLink>
  }

  const label = <RbacResourceLabel badgeId={badgeId} value={value} badgeValue={badgeValue} />
  if (!textNode) return label

  return <RbacResourceLabel badgeId={badgeId} value={value} badgeValue={badgeValue} textNode={textNode} />
}
