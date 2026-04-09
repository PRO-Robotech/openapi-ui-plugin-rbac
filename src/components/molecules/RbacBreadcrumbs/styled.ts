import styled from 'styled-components'

const Wrapper = styled.div`
  width: 100%;
  display: flex;
  align-items: center;

  .ant-breadcrumb > ol > li .ant-breadcrumb-link {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 25px;
  }

  .ant-breadcrumb > ol > li:last-child .ant-breadcrumb-link {
    font-size: 16px;
  }
`

export const Styled = {
  Wrapper,
}
