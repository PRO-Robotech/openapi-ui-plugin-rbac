/* eslint-disable no-nested-ternary */
import React, { FC } from 'react'
import { Tag } from 'antd'
import type { TRbacNode } from 'localTypes/rbacGraph'
import { RbacResourceLink } from '../RbacResourceLink'
import { RbacResourceLabel } from '../RbacResourceLabel'

type TRbacModalTitleLabelProps = {
  badgeId: string
  node: Pick<TRbacNode, 'type' | 'name' | 'namespace'>
  href?: string
}

export const RbacModalTitleLabel: FC<TRbacModalTitleLabelProps> = ({ badgeId, node, href }) => {
  const textNode =
    node.type === 'Role' && node.namespace ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Tag color="orange" style={{ marginInlineEnd: 0 }}>
          {node.namespace}
        </Tag>
        {href ? <RbacResourceLink href={href}>{node.name}</RbacResourceLink> : <span>{node.name}</span>}
      </span>
    ) : href ? (
      <RbacResourceLink href={href}>{node.name}</RbacResourceLink>
    ) : (
      <span>{node.name}</span>
    )

  return (
    <span style={{ display: 'inline-flex', paddingBottom: 4 }}>
      <RbacResourceLabel badgeId={badgeId} value={node.name} badgeValue={node.type} textNode={textNode} />
    </span>
  )
}
