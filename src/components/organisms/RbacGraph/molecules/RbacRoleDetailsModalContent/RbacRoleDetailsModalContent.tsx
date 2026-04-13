import React, { FC } from 'react'
import type { TKindWithVersion } from '@prorobotech/openapi-k8s-toolkit'
import { CheckCircleOutlined, CheckOutlined } from '@ant-design/icons'
import { Empty, Typography } from 'antd'
import type { TRbacRoleDetailsResponse } from 'localTypes/rbacGraph'
import { RbacAssessmentBar } from 'components/organisms/RbacAssessment'
import { ApiGroupSection, NonResourceUrlsTable } from './molecules'
import { Styled } from './styled'
import type { TTokenLike } from './types'

const { Text } = Typography

type TRbacRoleDetailsModalContentProps = {
  data: TRbacRoleDetailsResponse
  kindsWithVersion: TKindWithVersion[]
  token: TTokenLike
}

export const RbacRoleDetailsModalContent: FC<TRbacRoleDetailsModalContentProps> = ({
  data,
  kindsWithVersion,
  token,
}) => {
  if (data.resourceGroups.length === 0 && data.nonResourceUrls.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No role details were returned for this node." />
  }

  return (
    <Styled.Container style={{ color: token.colorText }}>
      <Styled.AssessmentSection>
        <Typography.Text strong>Assessment</Typography.Text>
        <RbacAssessmentBar assessment={data.assessment} size="compact" />
      </Styled.AssessmentSection>

      {data.resourceGroups.map(group => (
        <ApiGroupSection key={group.apiGroup} group={group} token={token} kindsWithVersion={kindsWithVersion} />
      ))}

      <NonResourceUrlsTable permissions={data.nonResourceUrls} token={token} kindsWithVersion={kindsWithVersion} />

      <div style={{ paddingTop: 8, borderTop: `1px solid ${token.colorBorder}` }}>
        <Styled.LegendRow>
          <Styled.LegendItem>
            <CheckOutlined style={{ fontSize: 12, color: token.colorPrimary }} />
            <Text style={{ fontSize: 12, color: token.colorText }}>Granted & supported</Text>
          </Styled.LegendItem>
          <Styled.LegendItem>
            <CheckCircleOutlined style={{ fontSize: 14, color: token.colorPrimary, opacity: 0.6 }} />
            <Text style={{ fontSize: 12, color: token.colorText }}>Granted, not supported by API</Text>
          </Styled.LegendItem>
        </Styled.LegendRow>
      </div>
    </Styled.Container>
  )
}
