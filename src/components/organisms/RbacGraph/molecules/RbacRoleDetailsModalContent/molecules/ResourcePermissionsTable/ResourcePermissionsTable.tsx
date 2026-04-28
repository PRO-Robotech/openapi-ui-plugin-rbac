import React, { FC, useMemo } from 'react'
import type { TKindWithVersion } from '@prorobotech/openapi-k8s-toolkit'
import { WarningOutlined } from '@ant-design/icons'
import { Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type {
  TRbacRoleDetailsResourceGroup,
  TRbacRoleDetailsResourcePermission,
  TRbacSubjectPermissionGrantGroup,
} from 'localTypes/rbacGraph'
import { resolveResourcePresentation } from 'components/organisms/RbacGraph/utils'
import { RbacResourceLabel } from '../../../../atoms'
import type { TTokenLike } from '../../types'
import { getVerbColor, sortVerbs } from '../../utils'
import { PermissionCell } from '../PermissionCell'
import { ResourceNamesBadge } from '../ResourceNamesBadge'
import { GrantSourcesCell } from '../GrantSourcesCell'

const { Text } = Typography

type TResourceLabelPRops = {
  permission: TRbacRoleDetailsResourcePermission
  apiGroup: string
  badgeId: string
  kindsWithVersion: TKindWithVersion[]
  token: TTokenLike
}

const ResourceLabel: FC<TResourceLabelPRops> = ({ permission, apiGroup, badgeId, kindsWithVersion, token }) => {
  const { displayValue, resolvedKind, subresource } = resolveResourcePresentation({
    apiGroups: [apiGroup],
    fallbackKind: permission.kind,
    kindsWithVersion,
    resource: permission.resource,
  })
  const isSubresource = Boolean(subresource)

  if (isSubresource) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', color: token.colorText }}>
        {permission.existsInApi === false && <WarningOutlined style={{ color: token.colorWarning, fontSize: 14 }} />}
        <RbacResourceLabel badgeId={badgeId} value={displayValue} badgeValue={resolvedKind} />
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
      <RbacResourceLabel badgeId={badgeId} value={permission.resource} badgeValue={resolvedKind} />
    </span>
  )
}

type TResourcePermissionsTableProps = {
  group: TRbacRoleDetailsResourceGroup
  kindsWithVersion: TKindWithVersion[]
  subjectGrantGroups?: TRbacSubjectPermissionGrantGroup[]
  token: TTokenLike
}

export const ResourcePermissionsTable: FC<TResourcePermissionsTableProps> = ({
  group,
  kindsWithVersion,
  subjectGrantGroups,
  token,
}) => {
  const activeVerbs = useMemo(() => {
    const verbSet = new Set<string>()

    group.resources.forEach(resource => {
      resource.verbs.forEach(verb => verbSet.add(verb))
    })

    return sortVerbs(verbSet)
  }, [group.resources])

  const grantsByResource = useMemo(() => {
    const map = new Map<string, TRbacSubjectPermissionGrantGroup[]>()

    ;(subjectGrantGroups ?? [])
      .filter(grantGroup => grantGroup.type === 'resource' && (grantGroup.apiGroup ?? '') === group.apiGroup)
      .forEach(grantGroup => {
        const key = grantGroup.resource ?? ''
        const groups = map.get(key) ?? []
        groups.push(grantGroup)
        map.set(key, groups)
      })

    return map
  }, [group.apiGroup, subjectGrantGroups])

  const columns = useMemo<ColumnsType<TRbacRoleDetailsResourcePermission>>(() => {
    const baseColumns: ColumnsType<TRbacRoleDetailsResourcePermission> = [
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
              apiGroup={group.apiGroup}
              badgeId={`modal-resource-${group.apiGroup}-${resource.resource}`}
              kindsWithVersion={kindsWithVersion}
              token={token}
            />
            {resource.resourceNames.length > 0 && (
              <ResourceNamesBadge resourceNames={resource.resourceNames} token={token} />
            )}
          </span>
        ),
      },
      ...(subjectGrantGroups
        ? [
            {
              title: 'Granted By',
              key: 'grantedBy',
              width: 520,
              render: (_: unknown, resource: TRbacRoleDetailsResourcePermission) => (
                <GrantSourcesCell groups={grantsByResource.get(resource.resource) ?? []} />
              ),
            },
          ]
        : []),
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
            kindsWithVersion={kindsWithVersion}
            matchValue={{ apiGroup: group.apiGroup, resource: resource.resource, verb }}
          />
        ),
      })),
    ]

    return baseColumns
  }, [activeVerbs, grantsByResource, group.apiGroup, kindsWithVersion, subjectGrantGroups, token])

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
