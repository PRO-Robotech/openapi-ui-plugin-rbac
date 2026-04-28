import type { TKindWithVersion } from '@prorobotech/openapi-k8s-toolkit'
import React, { FC } from 'react'
import { AppstoreOutlined, WarningOutlined } from '@ant-design/icons'
import { Collapse, Tag, Typography } from 'antd'
import type { TRbacRoleDetailsResourceGroup, TRbacSubjectPermissionGrantGroup } from 'localTypes/rbacGraph'
import { ResourcePermissionsTable } from '../ResourcePermissionsTable'
import type { TTokenLike } from '../../types'

const { Text } = Typography

type TApiGroupSectionProps = {
  group: TRbacRoleDetailsResourceGroup
  kindsWithVersion: TKindWithVersion[]
  subjectGrantGroups?: TRbacSubjectPermissionGrantGroup[]
  token: TTokenLike
}

export const ApiGroupSection: FC<TApiGroupSectionProps> = ({ group, kindsWithVersion, subjectGrantGroups, token }) => {
  const groupMissing = group.existsInApi === false

  return (
    <Collapse
      defaultActiveKey={[group.apiGroup]}
      style={
        groupMissing
          ? {
              borderColor: token.colorWarning,
              opacity: 0.8,
            }
          : undefined
      }
      items={[
        {
          key: group.apiGroup,
          label: (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                opacity: groupMissing ? 0.65 : 1,
              }}
            >
              {groupMissing ? (
                <WarningOutlined style={{ color: token.colorWarning }} />
              ) : (
                <AppstoreOutlined style={{ color: token.colorPrimary }} />
              )}
              <Text strong style={{ fontFamily: token.fontFamilyCode, fontSize: 14 }}>
                {group.displayName || (group.apiGroup ? group.apiGroup : 'core (v1)')}
              </Text>
              {groupMissing && (
                <Text type="warning" style={{ fontSize: 11 }}>
                  not found in API
                </Text>
              )}
              <Tag style={{ marginInlineEnd: 0 }}>{group.resources.length} resources</Tag>
            </span>
          ),
          children: (
            <ResourcePermissionsTable
              group={group}
              token={token}
              kindsWithVersion={kindsWithVersion}
              subjectGrantGroups={subjectGrantGroups}
            />
          ),
        },
      ]}
    />
  )
}
