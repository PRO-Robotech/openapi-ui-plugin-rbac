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
  gap: 16px;
  padding: 8px 16px;
  font-size: 12px;
  opacity: 0.8;
`

const TableContainer = styled.div<
  THeightProps & {
  $colorBgContainer: string
  $colorBorder: string
  $borderRadius: number
}
>`
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

  .ant-table-tbody > tr.ant-table-row {
    cursor: pointer;
  }

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

export const Styled = {
  Container,
  Chrome,
  StatsBar,
  TableContainer,
  EmptyState,
  SpinContainer,
  ResourceList,
  ResourceListItem,
}
