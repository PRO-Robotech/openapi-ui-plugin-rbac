import styled from 'styled-components'
import { HEAD_FIRST_ROW, NAV_HEIGHT } from 'constants/blocksSizes'

type TNavigationContainerProps = {
  $bgColor: string
}

const NavigationContainer = styled.div<TNavigationContainerProps>`
  display: flex;
  justify-content: start;
  align-items: center;
  height: ${NAV_HEIGHT}px;
  min-height: ${NAV_HEIGHT}px;
  position: sticky;
  top: ${HEAD_FIRST_ROW}px;
  background: ${({ $bgColor }) => $bgColor};
  width: 100%;
  z-index: 1055;
`

const EmbeddedBreadcrumbSlot = styled.div`
  display: flex;
  align-items: center;
  min-height: ${NAV_HEIGHT}px;
  margin-top: -${NAV_HEIGHT}px;
  position: relative;
  z-index: 1055;
`

const Content = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
`

export const Styled = {
  EmbeddedBreadcrumbSlot,
  NavigationContainer,
  Content,
}
