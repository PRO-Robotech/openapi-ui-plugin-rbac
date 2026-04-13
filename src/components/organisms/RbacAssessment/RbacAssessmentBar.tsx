import React, { CSSProperties, FC, useMemo } from 'react'
import { Tooltip, Typography, theme } from 'antd'
import type { TRbacAssessment } from 'localTypes/rbacGraph'
import { buildAssessmentSegments, getAssessmentLabel } from './utils'

type TRbacAssessmentBarProps = {
  assessment?: TRbacAssessment
  size?: 'compact' | 'small'
  style?: CSSProperties
}

const TOTAL_CELL_STYLE: Record<NonNullable<TRbacAssessmentBarProps['size']>, CSSProperties> = {
  compact: {
    minWidth: 30,
    height: 20,
    fontSize: 11,
  },
  small: {
    minWidth: 38,
    height: 24,
    fontSize: 13,
  },
}

const SEGMENT_STYLE: Record<NonNullable<TRbacAssessmentBarProps['size']>, CSSProperties> = {
  compact: {
    minWidth: 24,
    height: 20,
    fontSize: 11,
  },
  small: {
    minWidth: 30,
    height: 24,
    fontSize: 12,
  },
}

export const RbacAssessmentBar: FC<TRbacAssessmentBarProps> = ({ assessment, size = 'small', style }) => {
  const { token } = theme.useToken()
  const segments = useMemo(() => buildAssessmentSegments(assessment), [assessment])

  const totalCellStyle = TOTAL_CELL_STYLE[size]
  const segmentStyle = SEGMENT_STYLE[size]

  const segmentPalette = {
    critical: {
      background: token.colorError,
      text: token.colorWhite,
    },
    high: {
      background: token.volcano6,
      text: token.colorWhite,
    },
    medium: {
      background: token.orange5,
      text: token.colorWhite,
    },
    low: {
      background: token.gold4,
      text: token.colorText,
    },
  } as const

  const tooltipContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: token.colorText }}>
      <Typography.Text style={{ color: token.colorText }}>
        Highest severity: {assessment?.highestSeverity?.toLowerCase() ?? 'none'}
      </Typography.Text>
      {segments.map(segment => (
        <Typography.Text key={segment.key} style={{ color: token.colorText }}>
          {segment.label}: {segment.count}
        </Typography.Text>
      ))}
      <Typography.Text style={{ color: token.colorText }}>Total: {assessment?.totalCount ?? 0}</Typography.Text>
      {assessment?.checkIDs && assessment.checkIDs.length > 0 && (
        <Typography.Text style={{ color: token.colorText }}>Checks: {assessment.checkIDs.join(', ')}</Typography.Text>
      )}
    </div>
  )

  return (
    <Tooltip title={tooltipContent}>
      <div
        aria-label={getAssessmentLabel(assessment)}
        style={{
          display: 'inline-flex',
          alignItems: 'stretch',
          width: 'fit-content',
          maxWidth: '100%',
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
          border: `1px solid ${token.colorBorder}`,
          background: token.colorBgContainer,
          ...style,
        }}
      >
        {segments.map(segment => (
          <div
            key={segment.key}
            style={{
              ...segmentStyle,
              flex: segment.flexGrow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: segment.isZero ? token.colorTextQuaternary : segmentPalette[segment.key].text,
              background: segment.isZero ? token.colorFillAlter : segmentPalette[segment.key].background,
              borderRight: `1px solid ${token.colorBgContainer}`,
            }}
          >
            {segment.count}
          </div>
        ))}
        <div
          style={{
            ...totalCellStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            color: token.colorTextSecondary,
            background: token.colorFillAlter,
          }}
        >
          {assessment?.totalCount ?? 0}
        </div>
      </div>
    </Tooltip>
  )
}
