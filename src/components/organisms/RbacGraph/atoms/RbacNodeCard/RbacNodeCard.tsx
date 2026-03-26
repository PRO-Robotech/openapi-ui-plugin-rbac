import React, { FC, memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { theme } from 'antd'
import type { TRbacNodeType } from 'localTypes/rbacGraph'
import { RbacResourceLabel } from '../RbacResourceLabel'
import { NODE_COLORS, RULE_COUNT_NODE_TYPES } from './constants'
import { Styled } from './styled'

type TRbacNodeData = {
  label: string
  nodeType: TRbacNodeType
  typeLabel: string
  namespace?: string
  aggregated?: boolean
  ruleCount: number
  filteredDim: boolean
  focusDim: boolean
  focusRoot: boolean
  titlePrefix?: string
  titleValue?: string
  titleShowsBadge?: boolean
  badgeValue?: string
}

type TRbacNodeCardProps = NodeProps & {
  data: TRbacNodeData
}

// eslint-disable-next-line react/prop-types
export const RbacNodeCard: FC<TRbacNodeCardProps> = memo(({ data, selected }) => {
  const { token } = theme.useToken()
  const {
    label,
    nodeType,
    typeLabel,
    namespace,
    ruleCount,
    filteredDim,
    focusDim,
    focusRoot,
    titlePrefix,
    titleValue = label,
    titleShowsBadge = true,
    badgeValue,
  } = data as unknown as TRbacNodeData
  const borderColor = NODE_COLORS[nodeType] ?? '#475569'
  const hiddenHandleStyle = { opacity: 0, width: 8, height: 8, pointerEvents: 'none' } as const
  const showRuleCount = RULE_COUNT_NODE_TYPES.has(nodeType) && ruleCount > 0

  return (
    <Styled.Card
      $borderColor={borderColor}
      $dimmed={filteredDim || focusDim}
      $isRoot={focusRoot || selected}
      style={{ background: token.colorBgContainer }}
    >
      <Handle type="target" position={Position.Left} id="left" style={hiddenHandleStyle} />
      <Handle type="target" position={Position.Top} id="top" style={hiddenHandleStyle} />
      <Handle type="target" position={Position.Right} id="right" style={hiddenHandleStyle} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={hiddenHandleStyle} />
      <Handle type="source" position={Position.Left} id="left" style={hiddenHandleStyle} />
      <Handle type="source" position={Position.Top} id="top" style={hiddenHandleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={hiddenHandleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={hiddenHandleStyle} />
      <Styled.BadgeRow>
        <Styled.TypeBadge $color={borderColor}>{typeLabel}</Styled.TypeBadge>
        {showRuleCount && <Styled.RuleCountBadge $color={borderColor}>RULES {ruleCount}</Styled.RuleCountBadge>}
      </Styled.BadgeRow>
      <Styled.Title style={{ color: token.colorText }}>
        {titlePrefix && <Styled.TitlePrefix>{titlePrefix}</Styled.TitlePrefix>}
        <RbacResourceLabel
          badgeId={`rbac-node-${nodeType}-${titleValue}`}
          value={titleValue}
          badgeValue={badgeValue}
          showBadge={titleShowsBadge}
        />
      </Styled.Title>
      {namespace && <Styled.Subtitle style={{ color: token.colorTextSecondary }}>{namespace}</Styled.Subtitle>}
    </Styled.Card>
  )
})
