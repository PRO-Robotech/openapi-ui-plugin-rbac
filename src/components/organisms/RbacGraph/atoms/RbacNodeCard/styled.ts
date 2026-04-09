import styled from 'styled-components'

type TCardProps = {
  $borderColor: string
  $dimmed: boolean
  $phantom: boolean
  $isRoot: boolean
}

const Card = styled.div<TCardProps>`
  ${({ $dimmed, $phantom }) => {
    let opacity = 1

    if ($dimmed) {
      opacity = 0.25
    } else if ($phantom) {
      opacity = 0.6
    }

    return `opacity: ${opacity};`
  }}
  position: relative;
  min-width: 180px;
  max-width: 260px;
  border: 2px solid ${({ $borderColor }) => $borderColor};
  border-radius: 8px;
  padding: 8px 12px;
  background-clip: padding-box;
  box-shadow: ${({ $isRoot }) => ($isRoot ? '0 0 0 3px rgba(24, 144, 255, 0.4)' : 'none')};
  transition:
    opacity 0.2s,
    box-shadow 0.2s;
  cursor: pointer;
  z-index: 1;
`

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
`

const BadgeTrail = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

type TBadgeProps = {
  $color: string
}

const TypeBadge = styled.span<TBadgeProps>`
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ $color }) => $color};
  min-width: 0;
`

type TRuleCountBadgeProps = {
  $color: string
}

const RuleCountBadge = styled.span<TRuleCountBadgeProps>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border: 1px solid ${({ $color }) => $color};
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: ${({ $color }) => $color};
`

type TStateBadgeProps = {
  $color: string
}

const StateBadge = styled.span<TStateBadgeProps>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border: 1px solid ${({ $color }) => $color};
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: ${({ $color }) => $color};
`

const Title = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
`

const TitlePrefix = styled.span`
  font-weight: 700;
`

const Subtitle = styled.div`
  font-size: 11px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const Styled = {
  Card,
  BadgeRow,
  BadgeTrail,
  TypeBadge,
  RuleCountBadge,
  StateBadge,
  Title,
  TitlePrefix,
  Subtitle,
}
