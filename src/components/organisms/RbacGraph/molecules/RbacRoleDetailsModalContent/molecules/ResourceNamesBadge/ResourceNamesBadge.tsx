import React, { FC } from 'react'
import { FilterOutlined } from '@ant-design/icons'
import { Popover, Tag, Typography } from 'antd'
import type { TTokenLike } from '../../types'

const { Text } = Typography

type TResourceNamesBadgeProps = {
  resourceNames: string[]
  token: TTokenLike
}

const ResourceNamesContent: FC<TResourceNamesBadgeProps> = ({ resourceNames, token }) => (
  <div style={{ maxWidth: 320 }}>
    <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      resourceNames ({resourceNames.length})
    </Text>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {resourceNames.map(resourceName => (
        <Tag
          key={resourceName}
          style={{
            marginInlineEnd: 0,
            fontFamily: token.fontFamilyCode,
            fontSize: 12,
            color: token.colorPrimary,
            background: token.colorPrimaryBg,
            borderColor: token.colorPrimaryBorder,
          }}
        >
          {resourceName}
        </Tag>
      ))}
    </div>
  </div>
)

export const ResourceNamesBadge: FC<TResourceNamesBadgeProps> = ({ resourceNames, token }) => (
  <Popover
    content={<ResourceNamesContent resourceNames={resourceNames} token={token} />}
    title={null}
    trigger="click"
    placement="bottom"
  >
    <Tag
      style={{
        marginInlineEnd: 0,
        cursor: 'pointer',
        fontSize: 11,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        verticalAlign: 'middle',
        color: token.colorPrimary,
        background: token.colorPrimaryBg,
        borderColor: token.colorPrimaryBorder,
      }}
    >
      <FilterOutlined style={{ fontSize: 10 }} />
      {resourceNames.length}
    </Tag>
  </Popover>
)
