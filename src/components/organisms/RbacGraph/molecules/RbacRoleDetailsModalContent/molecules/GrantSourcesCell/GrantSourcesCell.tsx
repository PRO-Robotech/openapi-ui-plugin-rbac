import React, { FC, useMemo } from 'react'
import { Tag, Typography } from 'antd'
import type { TRbacSubjectPermissionGrantGroup } from 'localTypes/rbacGraph'
import { RbacResourceLabel } from '../../../../atoms'
import { Styled } from '../../styled'

const { Text } = Typography

type TGrantSourcesCellProps = {
  groups: TRbacSubjectPermissionGrantGroup[]
}

export const GrantSourcesCell: FC<TGrantSourcesCellProps> = ({ groups }) => {
  const sources = useMemo(() => {
    const sourcesByKey = new Map<
      string,
      {
        role: TRbacSubjectPermissionGrantGroup['grants'][number]['role']
        binding: TRbacSubjectPermissionGrantGroup['grants'][number]['binding']
        verbs: Set<string>
      }
    >()

    groups.forEach(group => {
      group.grants.forEach(grant => {
        const key = [
          grant.role.kind,
          grant.role.namespace ?? '',
          grant.role.name,
          grant.binding.kind,
          grant.binding.namespace ?? '',
          grant.binding.name,
        ].join('\u0001')
        const source = sourcesByKey.get(key) ?? {
          role: grant.role,
          binding: grant.binding,
          verbs: new Set<string>(),
        }

        source.verbs.add(group.verb)
        sourcesByKey.set(key, source)
      })
    })

    return Array.from(sourcesByKey.entries()).map(([key, source]) => ({ key, ...source }))
  }, [groups])

  if (sources.length === 0) {
    return <Text type="secondary">-</Text>
  }

  return (
    <Styled.GrantSourceList>
      {sources.map(source => (
        <Styled.GrantSourceItem key={source.key}>
          <RbacResourceLabel
            badgeId={`subject-grant-role-${source.key}`}
            value={source.role.name}
            badgeValue={source.role.kind}
            textNode={
              <Styled.GrantRefText>
                {source.role.namespace && <Tag style={{ marginInlineEnd: 0 }}>{source.role.namespace}</Tag>}
                <Text>{source.role.name}</Text>
              </Styled.GrantRefText>
            }
          />
          <Text type="secondary">via</Text>
          <RbacResourceLabel
            badgeId={`subject-grant-binding-${source.key}`}
            value={source.binding.name}
            badgeValue={source.binding.kind}
            textNode={
              <Styled.GrantRefText>
                {source.binding.namespace && <Tag style={{ marginInlineEnd: 0 }}>{source.binding.namespace}</Tag>}
                <Text>{source.binding.name}</Text>
              </Styled.GrantRefText>
            }
          />
          <Styled.GrantVerbList>
            {Array.from(source.verbs)
              .sort((left, right) => left.localeCompare(right))
              .map(verb => (
                <Tag key={verb} color="blue" style={{ marginInlineEnd: 0 }}>
                  {verb}
                </Tag>
              ))}
          </Styled.GrantVerbList>
        </Styled.GrantSourceItem>
      ))}
    </Styled.GrantSourceList>
  )
}
