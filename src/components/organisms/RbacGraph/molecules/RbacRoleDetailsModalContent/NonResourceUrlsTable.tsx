import React, { FC, useMemo } from 'react'
import { GlobalOutlined } from '@ant-design/icons'
import { Collapse, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TRbacRoleDetailsNonResourceUrlPermission } from 'localTypes/rbacGraph'
import { PermissionCell } from './PermissionCell'
import { getVerbColor, sortVerbs } from './utils'
import type { TKindByResource, TTokenLike } from './types'

const { Text } = Typography

type TNonResourceUrlsTableProps = {
  permissions: TRbacRoleDetailsNonResourceUrlPermission[]
  token: TTokenLike
  kindByResource: TKindByResource
}

export const NonResourceUrlsTable: FC<TNonResourceUrlsTableProps> = ({ permissions, token, kindByResource }) => {
  const verbs = useMemo(() => {
    const verbSet = new Set<string>()
    permissions.forEach(permission => {
      permission.verbs.forEach(verb => verbSet.add(verb))
    })

    return sortVerbs(verbSet)
  }, [permissions])

  const columns = useMemo<ColumnsType<TRbacRoleDetailsNonResourceUrlPermission>>(
    () => [
      {
        title: 'URL',
        key: 'url',
        fixed: 'left',
        width: 280,
        render: (_, permission) => (
          <Text code style={{ fontSize: 12.5 }}>
            {permission.url}
          </Text>
        ),
      },
      ...verbs.map(verb => ({
        title: (
          <span style={{ color: getVerbColor(verb, token), fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
            {verb}
          </span>
        ),
        key: verb,
        width: 72,
        align: 'center' as const,
        render: (_: unknown, permission: TRbacRoleDetailsNonResourceUrlPermission) => (
          <PermissionCell
            allowed={permission.verbs.includes(verb)}
            color={getVerbColor(verb, token)}
            existsInApi={null}
            origins={permission.verbOrigins[verb] ?? []}
            token={token}
            kindByResource={kindByResource}
            matchValue={{ url: permission.url, verb }}
          />
        ),
      })),
    ],
    [kindByResource, token, verbs],
  )

  if (permissions.length === 0) return null

  return (
    <Collapse
      defaultActiveKey={['non-resource-urls']}
      items={[
        {
          key: 'non-resource-urls',
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <GlobalOutlined />
              <span style={{ fontWeight: 600 }}>Non-Resource URLs</span>
              <Tag style={{ marginInlineEnd: 0 }}>{permissions.length} URLs</Tag>
            </span>
          ),
          children: (
            <Table<TRbacRoleDetailsNonResourceUrlPermission>
              columns={columns}
              dataSource={permissions}
              rowKey="url"
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 'max-content' }}
            />
          ),
        },
      ]}
    />
  )
}
