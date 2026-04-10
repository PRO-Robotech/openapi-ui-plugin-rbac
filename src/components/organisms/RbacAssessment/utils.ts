import type { TRbacAssessment } from 'localTypes/rbacGraph'

export const ASSESSMENT_SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const

export type TAssessmentSeverity = (typeof ASSESSMENT_SEVERITY_ORDER)[number]

export type TAssessmentSegment = {
  key: TAssessmentSeverity
  label: string
  count: number
  flexGrow: number
  isZero: boolean
}

const SEGMENT_META: Record<TAssessmentSeverity, Pick<TAssessmentSegment, 'key' | 'label'>> = {
  critical: {
    key: 'critical',
    label: 'Critical',
  },
  high: {
    key: 'high',
    label: 'High',
  },
  medium: {
    key: 'medium',
    label: 'Medium',
  },
  low: {
    key: 'low',
    label: 'Low',
  },
}

export const getAssessmentLabel = (assessment?: TRbacAssessment) => {
  if (!assessment) return 'Assessment unavailable'

  const highestSeverity =
    typeof assessment.highestSeverity === 'string' && assessment.highestSeverity.trim().length > 0
      ? assessment.highestSeverity.toLowerCase()
      : 'none'

  return `Assessment: ${highestSeverity}, total ${assessment.totalCount}`
}

export const buildAssessmentSegments = (assessment?: TRbacAssessment): TAssessmentSegment[] =>
  ASSESSMENT_SEVERITY_ORDER.map(key => {
    let count = assessment?.lowCount ?? 0

    if (key === 'critical') {
      count = assessment?.criticalCount ?? 0
    } else if (key === 'high') {
      count = assessment?.highCount ?? 0
    } else if (key === 'medium') {
      count = assessment?.mediumCount ?? 0
    }

    return {
      ...SEGMENT_META[key],
      count,
      flexGrow: count > 0 ? count : 1,
      isZero: count === 0,
    }
  })
