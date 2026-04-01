import React, { FC, useMemo } from 'react'
import { CheckCircleOutlined, CheckOutlined } from '@ant-design/icons'
import { Empty, Tag, Typography } from 'antd'
import type { TRbacRoleDetailsResponse } from 'localTypes/rbacGraph'
import { ApiGroupSection } from './ApiGroupSection'
import { NonResourceUrlsTable } from './NonResourceUrlsTable'
import { Styled } from './styled'
import type { TTokenLike } from './types'

const { Text } = Typography

type TRbacRoleDetailsModalContentProps = {
  data: TRbacRoleDetailsResponse
  token: TTokenLike
}

export const RbacRoleDetailsModalContent: FC<TRbacRoleDetailsModalContentProps> = ({ data, token }) => {
  const kindByResource = useMemo(() => {
    const map = new Map<string, string>()

    data.resourceGroups.forEach(group => {
      group.resources.forEach(resource => {
        const key = resource.resource.split('/')[0]
        if (!map.has(key) && resource.kind) {
          map.set(key, resource.kind)
        }
      })
    })

    return map
  }, [data.resourceGroups])

  if (data.resourceGroups.length === 0 && data.nonResourceUrls.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No role details were returned for this node." />
  }

  return (
    <Styled.Container style={{ color: token.colorText }}>
      <Styled.SummaryRow>
        <Tag>{data.kind || 'role'}</Tag>
        {data.namespace && <Tag>{data.namespace}</Tag>}
        {data.aggregated && <Tag color="blue">{`aggregation sources: ${(data.aggregationSources ?? []).length}`}</Tag>}
        {Array.isArray(data.bindings) && <Tag>{`bindings: ${data.bindings.length}`}</Tag>}
        <Tag>{`rules: ${data.rules.length}`}</Tag>
      </Styled.SummaryRow>

      {data.resourceGroups.map(group => (
        <ApiGroupSection key={group.apiGroup} group={group} token={token} kindByResource={kindByResource} />
      ))}

      <NonResourceUrlsTable permissions={data.nonResourceUrls} token={token} kindByResource={kindByResource} />

      <div style={{ paddingTop: 8, borderTop: `1px solid ${token.colorBorder}` }}>
        <Styled.LegendRow>
          <Styled.LegendItem>
            <CheckOutlined style={{ fontSize: 12, color: token.colorPrimary }} />
            <Text style={{ fontSize: 12, color: token.colorText }}>
              Granted & supported
            </Text>
          </Styled.LegendItem>
          <Styled.LegendItem>
            <CheckCircleOutlined style={{ fontSize: 14, color: token.colorPrimary, opacity: 0.6 }} />
            <Text style={{ fontSize: 12, color: token.colorText }}>
              Granted, not supported by API
            </Text>
          </Styled.LegendItem>
        </Styled.LegendRow>
      </div>
    </Styled.Container>
  )
}
