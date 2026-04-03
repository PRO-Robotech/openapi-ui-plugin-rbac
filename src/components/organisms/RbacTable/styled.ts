import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const StatsBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
`

const TableContainer = styled.div<{
  $colorBgContainer: string
  $colorBorder: string
  $borderRadius: number
}>`
  overflow: hidden;
  border: 1px solid ${({ $colorBorder }) => $colorBorder};
  border-radius: ${({ $borderRadius }) => `${$borderRadius}px`};
  background: ${({ $colorBgContainer }) => $colorBgContainer};

  .ant-table-wrapper {
    overflow: auto;
  }
`

const EmptyState = styled.div`
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
`

const SpinContainer = styled.div`
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
`

export const Styled = {
  Container,
  StatsBar,
  TableContainer,
  EmptyState,
  SpinContainer,
}
