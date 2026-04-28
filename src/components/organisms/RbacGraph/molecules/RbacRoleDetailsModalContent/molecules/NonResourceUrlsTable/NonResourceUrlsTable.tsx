import React, { FC, useMemo } from 'react'
import type { TKindWithVersion } from '@prorobotech/openapi-k8s-toolkit'
import { GlobalOutlined } from '@ant-design/icons'
import { Collapse, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TRbacRoleDetailsNonResourceUrlPermission, TRbacSubjectPermissionGrantGroup } from 'localTypes/rbacGraph'
import { getVerbColor, sortVerbs } from '../../utils'
import type { TTokenLike } from '../../types'
import { PermissionCell } from '../PermissionCell'
import { GrantSourcesCell } from '../GrantSourcesCell'

const { Text } = Typography

type TNonResourceUrlsTableProps = {
  kindsWithVersion: TKindWithVersion[]
  permissions: TRbacRoleDetailsNonResourceUrlPermission[]
  subjectGrantGroups?: TRbacSubjectPermissionGrantGroup[]
  token: TTokenLike
}

export const NonResourceUrlsTable: FC<TNonResourceUrlsTableProps> = ({
  kindsWithVersion,
  permissions,
  subjectGrantGroups,
  token,
}) => {
  const verbs = useMemo(() => {
    const verbSet = new Set<string>()
    permissions.forEach(permission => {
      permission.verbs.forEach(verb => verbSet.add(verb))
    })

    return sortVerbs(verbSet)
  }, [permissions])

  const grantsByUrl = useMemo(() => {
    const map = new Map<string, TRbacSubjectPermissionGrantGroup[]>()

    ;(subjectGrantGroups ?? [])
      .filter(grantGroup => grantGroup.type === 'non-resource')
      .forEach(grantGroup => {
        const key = grantGroup.nonResourceURL ?? ''
        const groups = map.get(key) ?? []
        groups.push(grantGroup)
        map.set(key, groups)
      })

    return map
  }, [subjectGrantGroups])

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
      ...(subjectGrantGroups
        ? [
            {
              title: 'Granted By',
              key: 'grantedBy',
              width: 520,
              render: (_: unknown, permission: TRbacRoleDetailsNonResourceUrlPermission) => (
                <GrantSourcesCell groups={grantsByUrl.get(permission.url) ?? []} />
              ),
            },
          ]
        : []),
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
            kindsWithVersion={kindsWithVersion}
            matchValue={{ url: permission.url, verb }}
          />
        ),
      })),
    ],
    [grantsByUrl, kindsWithVersion, subjectGrantGroups, token, verbs],
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
