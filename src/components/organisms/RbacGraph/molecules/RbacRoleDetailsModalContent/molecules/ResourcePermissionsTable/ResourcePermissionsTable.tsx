import React, { FC, useMemo } from 'react'
import { WarningOutlined } from '@ant-design/icons'
import { Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { TRbacRoleDetailsResourceGroup, TRbacRoleDetailsResourcePermission } from 'localTypes/rbacGraph'
import { RbacResourceLabel } from '../../../../atoms'
import type { TKindByResource, TTokenLike } from '../../types'
import { getVerbColor, sortVerbs } from '../../utils'
import { PermissionCell } from '../PermissionCell'
import { ResourceNamesBadge } from '../ResourceNamesBadge'

const { Text } = Typography

type TResourceLabelPRops = {
  permission: TRbacRoleDetailsResourcePermission
  badgeId: string
  kindByResource: TKindByResource
  token: TTokenLike
}

const ResourceLabel: FC<TResourceLabelPRops> = ({ permission, badgeId, kindByResource, token }) => {
  const slashIndex = permission.resource.indexOf('/')
  const isSubresource = slashIndex !== -1

  if (isSubresource) {
    const parentResource = permission.resource.slice(0, slashIndex)
    const subresource = permission.resource.slice(slashIndex + 1)
    const displayValue = kindByResource.get(parentResource) ?? permission.kind ?? parentResource

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', color: token.colorText }}>
        {permission.existsInApi === false && <WarningOutlined style={{ color: token.colorWarning, fontSize: 14 }} />}
        <RbacResourceLabel badgeId={badgeId} value={displayValue} />
        <Text
          style={{
            fontSize: 10.5,
            fontFamily: token.fontFamilyCode,
            color: token.colorTextSecondary,
            background: token.colorFillAlter,
            padding: '1px 5px',
            borderRadius: 4,
          }}
        >
          {subresource}
        </Text>
      </span>
    )
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', color: token.colorText }}>
      {permission.existsInApi === false && <WarningOutlined style={{ color: token.colorWarning, fontSize: 14 }} />}
      <RbacResourceLabel badgeId={badgeId} value={permission.kind ?? permission.resource} />
    </span>
  )
}

type TResourcePermissionsTableProps = {
  group: TRbacRoleDetailsResourceGroup
  token: TTokenLike
  kindByResource: TKindByResource
}

export const ResourcePermissionsTable: FC<TResourcePermissionsTableProps> = ({ group, token, kindByResource }) => {
  const activeVerbs = useMemo(() => {
    const verbSet = new Set<string>()

    group.resources.forEach(resource => {
      resource.verbs.forEach(verb => verbSet.add(verb))
    })

    return sortVerbs(verbSet)
  }, [group.resources])

  const columns = useMemo<ColumnsType<TRbacRoleDetailsResourcePermission>>(
    () => [
      {
        title: 'Resource',
        key: 'resource',
        fixed: 'left',
        width: 280,
        render: (_, resource) => (
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', color: token.colorText }}
          >
            <ResourceLabel
              permission={resource}
              badgeId={`modal-resource-${group.apiGroup}-${resource.resource}`}
              kindByResource={kindByResource}
              token={token}
            />
            {resource.resourceNames.length > 0 && (
              <ResourceNamesBadge resourceNames={resource.resourceNames} token={token} />
            )}
          </span>
        ),
      },
      ...activeVerbs.map(verb => ({
        title: (
          <span style={{ color: getVerbColor(verb, token), fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
            {verb}
          </span>
        ),
        key: verb,
        width: 72,
        align: 'center' as const,
        onHeaderCell: () => ({ style: { textAlign: 'center' as const } }),
        render: (_: unknown, resource: TRbacRoleDetailsResourcePermission) => (
          <PermissionCell
            allowed={resource.verbs.includes(verb)}
            color={getVerbColor(verb, token)}
            existsInApi={resource.apiVerbs === null ? null : resource.apiVerbs.includes(verb)}
            origins={resource.verbOrigins[verb] ?? []}
            token={token}
            kindByResource={kindByResource}
            matchValue={{ apiGroup: group.apiGroup, resource: resource.resource, verb }}
          />
        ),
      })),
    ],
    [activeVerbs, group.apiGroup, kindByResource, token],
  )

  return (
    <Table<TRbacRoleDetailsResourcePermission>
      columns={columns}
      dataSource={group.resources}
      rowKey="resource"
      pagination={false}
      size="small"
      bordered
      scroll={{ x: 'max-content' }}
      rowClassName={record => (record.existsInApi === false ? 'rbac-role-details-row-unresolved' : '')}
    />
  )
}
