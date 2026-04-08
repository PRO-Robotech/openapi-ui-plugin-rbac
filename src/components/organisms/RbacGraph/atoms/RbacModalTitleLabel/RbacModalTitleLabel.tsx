/* eslint-disable no-nested-ternary */
import React, { FC } from 'react'
import { Tag, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { TRbacNode } from 'localTypes/rbacGraph'
import { RbacResourceLabel } from '../RbacResourceLabel'

type TRbacModalTitleLabelProps = {
  badgeId: string
  node: Pick<TRbacNode, 'type' | 'name' | 'namespace'>
  href?: string
}

export const RbacModalTitleLabel: FC<TRbacModalTitleLabelProps> = ({ badgeId, node, href }) => {
  const navigate = useNavigate()
  const textNode =
    node.type === 'Role' && node.namespace ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Tag color="orange" style={{ marginInlineEnd: 0 }}>
          {node.namespace}
        </Tag>
        {href ? (
          <Typography.Link
            onClick={event => {
              event.preventDefault()
              event.stopPropagation()
              navigate(href)
            }}
          >
            {node.name}
          </Typography.Link>
        ) : (
          <span>{node.name}</span>
        )}
      </span>
    ) : href ? (
      <Typography.Link
        onClick={event => {
          event.preventDefault()
          event.stopPropagation()
          navigate(href)
        }}
      >
        {node.name}
      </Typography.Link>
    ) : (
      <span>{node.name}</span>
    )

  return (
    <span style={{ display: 'inline-flex', paddingBottom: 4 }}>
      <RbacResourceLabel badgeId={badgeId} value={node.name} badgeValue={node.type} textNode={textNode} />
    </span>
  )
}
