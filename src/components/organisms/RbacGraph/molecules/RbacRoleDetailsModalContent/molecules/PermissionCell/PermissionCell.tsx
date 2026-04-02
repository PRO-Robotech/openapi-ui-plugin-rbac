import React, { FC, useState } from 'react'
import { CheckCircleOutlined, CheckOutlined, MinusOutlined } from '@ant-design/icons'
import { Popover } from 'antd'
import type { TPermissionCellProps } from '../../types'
import { RulePopoverContent } from '../RulePopoverContent'
import { Styled } from '../../styled'

export const PermissionCell: FC<TPermissionCellProps> = ({
  allowed,
  color,
  existsInApi,
  origins,
  token,
  kindByResource,
  matchValue,
}) => {
  const [open, setOpen] = useState(false)

  if (!allowed) {
    return (
      <Styled.DeniedCell $colorTextSecondary={token.colorTextSecondary}>
        <MinusOutlined style={{ fontSize: 14 }} />
      </Styled.DeniedCell>
    )
  }

  const hasOrigins = origins.length > 0
  const isPhantom = existsInApi === false
  const content = (
    <Styled.PermissionCell
      $clickable={hasOrigins}
      $phantom={isPhantom}
      $colorFillSecondary={token.colorFillSecondary}
      $borderRadius={token.borderRadius ?? 4}
      style={{ color }}
    >
      {isPhantom ? <CheckCircleOutlined style={{ fontSize: 16 }} /> : <CheckOutlined style={{ fontSize: 14 }} />}
    </Styled.PermissionCell>
  )

  if (!hasOrigins) return content

  return (
    <Popover
      content={
        <RulePopoverContent origins={origins} matchContext={matchValue} kindByResource={kindByResource} token={token} />
      }
      title={`Granted by rule${origins.length > 1 ? 's' : ''}`}
      trigger="click"
      placement="top"
      overlayStyle={{ maxWidth: 460 }}
      open={open}
      onOpenChange={setOpen}
    >
      {content}
    </Popover>
  )
}
