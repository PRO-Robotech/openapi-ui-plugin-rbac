/* eslint-disable max-lines-per-function */
import React from 'react'
import { Tag, Typography, theme } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons'

import { RbacResourceLink } from 'components/organisms/RbacGraph/atoms/RbacResourceLink'
import { RbacResourceLabel } from 'components/organisms/RbacGraph/atoms/RbacResourceLabel'
import { getRbacResourceHref } from 'utils/rbacResourceLink'
import { type TTableAccountBinding, type TRoleTableRow, type TTableAggregationSource } from './buildRoleTableRows'
import { formatSubjectLabel, getScopeTagStyle } from './gettersAndFormatters'
import { LinkedResourceLabel } from '../atoms'
import { Styled } from '../styled'

export const renderRoleLabel = ({
  row,
  clusterId,
  baseFactoriesMapping,
}: {
  row: TRoleTableRow
  clusterId: string
  baseFactoriesMapping?: Record<string, string>
}) => {
  const href = getRbacResourceHref({
    clusterId,
    node: {
      type: row.roleKind,
      name: row.roleName,
      namespace: row.roleKind === 'Role' && row.namespace !== 'cluster-wide' ? row.namespace : undefined,
    },
    baseFactoriesMapping,
  })

  if (row.roleKind === 'Role' && row.namespace !== 'cluster-wide') {
    return (
      <RbacResourceLabel
        badgeId={`rbac-table-role-${row.roleNodeId}`}
        value={row.roleName}
        badgeValue={row.roleKind}
        textNode={
          <Styled.AccountBindingTextGroup>
            <Tag color="orange">{row.namespace}</Tag>
            {href ? <RbacResourceLink href={href}>{row.roleName}</RbacResourceLink> : <span>{row.roleName}</span>}
          </Styled.AccountBindingTextGroup>
        }
      />
    )
  }

  return (
    <LinkedResourceLabel
      badgeId={`rbac-table-role-${row.roleNodeId}`}
      value={row.roleName}
      badgeValue={row.roleKind}
      href={href}
    />
  )
}

export const renderAccountBindings = ({
  accountBindings,
  clusterId,
  baseFactoriesMapping,
  token,
}: {
  accountBindings: TTableAccountBinding[]
  clusterId: string
  baseFactoriesMapping?: Record<string, string>
  token: ReturnType<typeof theme.useToken>['token']
}) => {
  if (accountBindings.length === 0) {
    return <Typography.Text type="secondary">-</Typography.Text>
  }

  return (
    <Styled.AccountBindingList>
      {accountBindings.map(accountBinding => (
        <Styled.AccountBindingRow key={accountBinding.key}>
          <Styled.AccountBindingSection>
            {accountBinding.subject ? (
              (() => {
                const { subject } = accountBinding
                if (!subject) return null
                const { key, kind, name, namespace } = subject
                const subjectHref =
                  kind === 'ServiceAccount' && !subject.phantom
                    ? getRbacResourceHref({
                        clusterId,
                        node: {
                          type: 'ServiceAccount',
                          name,
                          namespace,
                        },
                        baseFactoriesMapping,
                      })
                    : undefined

                return (
                  <RbacResourceLabel
                    badgeId={`rbac-table-subject-${key}`}
                    value={formatSubjectLabel(subject)}
                    badgeValue={kind}
                    textNode={
                      <Styled.AccountBindingTextGroup style={subject.phantom ? { opacity: 0.6 } : undefined}>
                        {namespace && <Tag color="orange">{namespace}</Tag>}
                        {subject.phantom && (
                          <Tag color="default" style={{ marginInlineEnd: 0 }}>
                            missing
                          </Tag>
                        )}
                        {subjectHref ? (
                          <RbacResourceLink href={subjectHref}>{formatSubjectLabel(subject)}</RbacResourceLink>
                        ) : (
                          <span>{formatSubjectLabel(subject)}</span>
                        )}
                      </Styled.AccountBindingTextGroup>
                    }
                  />
                )
              })()
            ) : (
              <Typography.Text type="secondary">no subject</Typography.Text>
            )}
          </Styled.AccountBindingSection>

          <Styled.AccountBindingArrow>
            <ArrowLeftOutlined />
          </Styled.AccountBindingArrow>

          <Styled.AccountBindingSection>
            {accountBinding.binding ? (
              (() => {
                const { binding } = accountBinding
                if (!binding) return null
                const { key, kind, name, namespace } = binding
                const bindingHref = getRbacResourceHref({
                  clusterId,
                  node: {
                    type: kind,
                    name,
                    namespace,
                  },
                  baseFactoriesMapping,
                })

                return (
                  <RbacResourceLabel
                    badgeId={`rbac-table-binding-${key}`}
                    value={name}
                    badgeValue={kind}
                    textNode={
                      <Styled.AccountBindingTextGroup>
                        {namespace && <Tag color="orange">{namespace}</Tag>}
                        {bindingHref ? (
                          <RbacResourceLink href={bindingHref}>{name}</RbacResourceLink>
                        ) : (
                          <span>{name}</span>
                        )}
                      </Styled.AccountBindingTextGroup>
                    }
                  />
                )
              })()
            ) : (
              <Typography.Text type="secondary">no binding</Typography.Text>
            )}
          </Styled.AccountBindingSection>

          <Styled.AccountBindingArrow>
            <ArrowRightOutlined />
          </Styled.AccountBindingArrow>

          <Styled.AccountBindingMain>
            <Tag bordered style={getScopeTagStyle(accountBinding.scope, token)}>
              {accountBinding.scope}
            </Tag>
          </Styled.AccountBindingMain>
        </Styled.AccountBindingRow>
      ))}
    </Styled.AccountBindingList>
  )
}

export const renderAggregationSources = ({
  sources,
  clusterId,
  baseFactoriesMapping,
  stacked = false,
}: {
  sources: TTableAggregationSource[]
  clusterId: string
  baseFactoriesMapping?: Record<string, string>
  stacked?: boolean
}) => {
  if (sources.length === 0) {
    return <Typography.Text type="secondary">-</Typography.Text>
  }

  const content = sources.map(source => (
    <Styled.ResourceListItem key={source.key}>
      <LinkedResourceLabel
        badgeId={`rbac-table-aggregator-${source.key}`}
        value={source.name}
        badgeValue={source.type}
        namespace={source.namespace}
        href={
          source.type === 'Role' || source.type === 'ClusterRole'
            ? getRbacResourceHref({
                clusterId,
                node: {
                  type: source.type,
                  name: source.name,
                  namespace: source.namespace,
                },
                baseFactoriesMapping,
              })
            : undefined
        }
      />
    </Styled.ResourceListItem>
  ))

  return stacked ? (
    <Styled.ResourceStack>{content}</Styled.ResourceStack>
  ) : (
    <Styled.ResourceList>{content}</Styled.ResourceList>
  )
}
