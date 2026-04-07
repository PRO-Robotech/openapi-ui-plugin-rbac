import styled from 'styled-components'

type THeightProps = {
  $height?: number
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Chrome = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const StatsBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 8px 16px;
  font-size: 12px;
  opacity: 0.8;
`

const StatsMetrics = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  min-width: 0;
`

const ScopeFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
`

const ScopeFilterButton = styled.button<{
  $active: boolean
  $color: string
  $background: string
  $border: string
  $text: string
}>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid ${({ $active, $border, $color }) => ($active ? $color : $border)};
  border-radius: 8px;
  background: ${({ $active, $background }) => ($active ? $background : 'transparent')};
  color: ${({ $active, $text, $color }) => ($active ? $color : $text)};
  cursor: pointer;
  font: inherit;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;

  &:hover {
    border-color: ${({ $color }) => $color};
    color: ${({ $color }) => $color};
  }
`

type TTableContainerProps = THeightProps & {
  $colorBgContainer: string
  $colorBorder: string
  $borderRadius: number
}

const TableContainer = styled.div<TTableContainerProps>`
  height: ${({ $height }) => `${$height}px`};
  min-height: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${({ $colorBorder }) => $colorBorder};
  border-radius: ${({ $borderRadius }) => `${$borderRadius}px`};
  background: ${({ $colorBgContainer }) => $colorBgContainer};

  .ant-table-wrapper,
  .ant-spin-nested-loading,
  .ant-spin-container,
  .ant-table,
  .ant-table-container {
    height: 100%;
  }

  .ant-table-container {
    border-radius: inherit;
  }

  .ant-table-header {
    /* stylelint-disable declaration-no-important  */
    overflow: hidden !important;
    border-bottom: 1px solid ${({ $colorBorder }) => $colorBorder};
  }

  .ant-table-thead > tr > th {
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .ant-table-tbody > tr > td {
    padding: 12px 16px;
    vertical-align: top;
  }

  /* stylelint-disable selector-no-qualifying-type */

  .ant-table-tbody > tr.ant-table-row:hover > td {
    background: ${({ $colorBgContainer }) => $colorBgContainer};
  }

  .ant-table-body {
    overflow: auto !important;
  }

  .ant-table-placeholder .ant-table-cell {
    border-bottom: 0;
  }
`

const EmptyState = styled.div<THeightProps>`
  display: flex;
  min-height: ${({ $height = 240 }) => `${$height}px`};
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  border: 1px solid transparent;
`

const SpinContainer = styled.div<THeightProps>`
  display: flex;
  min-height: ${({ $height = 240 }) => `${$height}px`};
  align-items: center;
  justify-content: center;
`

const ResourceList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-width: 0;
`

const ResourceListItem = styled.div`
  min-width: 0;
`

const ResourceStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const AccountBindingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const AccountBindingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: nowrap;
`

const AccountBindingSection = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: nowrap;
`

const AccountBindingTextGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;

  .ant-tag {
    margin-inline-end: 0;
    flex-shrink: 0;
  }

  /* stylelint-disable no-descending-specificity */

  > span:last-child,
  .ant-typography,
  .ant-typography a,
  a {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const AccountBindingMain = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: nowrap;
  flex-shrink: 0;
`

const AccountBindingArrow = styled.span`
  color: rgb(0 0 0 / 35%);
  line-height: 1;
  flex-shrink: 0;
  padding-top: 4px;
`

const InlineTags = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  min-width: 0;
  flex-shrink: 0;

  .ant-tag {
    margin-inline-end: 0;
  }
`

export const Styled = {
  Container,
  Chrome,
  StatsBar,
  StatsMetrics,
  ScopeFilters,
  ScopeFilterButton,
  TableContainer,
  EmptyState,
  SpinContainer,
  ResourceList,
  ResourceListItem,
  ResourceStack,
  AccountBindingList,
  AccountBindingRow,
  AccountBindingSection,
  AccountBindingTextGroup,
  AccountBindingMain,
  AccountBindingArrow,
  InlineTags,
}
