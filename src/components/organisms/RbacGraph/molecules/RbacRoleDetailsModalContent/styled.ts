import styled from 'styled-components'

type TCellProps = {
  $clickable?: boolean
  $phantom?: boolean
  $colorFillSecondary: string
  $borderRadius: number
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  .rbac-role-details-row-unresolved td {
    opacity: 0.5;
  }

  .rbac-role-details-row-unresolved:hover td {
    opacity: 0.75;
  }
`

const SummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
`

const PermissionCell = styled.div<TCellProps>`
  min-width: 40px;
  padding: 2px 0;
  text-align: center;
  border-radius: ${({ $borderRadius }) => `${$borderRadius}px`};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  opacity: ${({ $phantom }) => ($phantom ? 0.55 : 1)};
  transition:
    background 0.15s ease,
    opacity 0.15s ease;

  &:hover {
    background: ${({ $clickable, $colorFillSecondary }) => ($clickable ? $colorFillSecondary : 'transparent')};
  }

  &:empty {
    display: none;
  }
`

const DeniedCell = styled.div<{ $colorTextSecondary: string }>`
  min-width: 40px;
  text-align: center;
  opacity: 0.2;
  color: ${({ $colorTextSecondary }) => $colorTextSecondary};
`

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding-top: 8px;
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

export const Styled = {
  Container,
  SummaryRow,
  PermissionCell,
  DeniedCell,
  LegendRow,
  LegendItem,
}
