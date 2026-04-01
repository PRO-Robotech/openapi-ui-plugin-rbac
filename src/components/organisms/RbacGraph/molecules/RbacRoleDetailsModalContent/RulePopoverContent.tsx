import React, { FC } from 'react'
import { Tag, Typography } from 'antd'
import type { TRbacRoleDetailsRuleOrigin } from 'localTypes/rbacGraph'
import { hexToRgba } from './utils'
import type { TKindByResource, TMatchContext, TTokenLike } from './types'

const { Text } = Typography

type TRulePopoverContentProps = {
  origins: TRbacRoleDetailsRuleOrigin[]
  matchContext: TMatchContext
  kindByResource: TKindByResource
  token: TTokenLike
}

const FieldLabel: FC<{ children: React.ReactNode; token: TTokenLike }> = ({ children, token }) => (
  <Text
    type="secondary"
    style={{
      fontSize: 11,
      fontFamily: token.fontFamilyCode,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}
  >
    {children}
  </Text>
)

const ValueTag: FC<{ value: string; matched?: boolean; token: TTokenLike }> = ({ value, matched = false, token }) => (
  <Tag
    style={{
      marginInlineEnd: 0,
      fontFamily: token.fontFamilyCode,
      fontSize: 12,
      fontWeight: matched ? 600 : 400,
      color: matched ? token.colorPrimary : undefined,
      borderColor: matched ? hexToRgba(token.colorPrimary, 0.45) : token.colorBorder,
      background: matched ? hexToRgba(token.colorPrimary, 0.1) : token.colorBgContainer,
    }}
  >
    {value === '' ? '""' : value}
  </Tag>
)

const ResourceTag: FC<{
  resource: string
  matched: boolean
  kindByResource: TKindByResource
  token: TTokenLike
}> = ({ resource, matched, kindByResource, token }) => {
  const [parentResource, subresource] = resource.split('/')
  const displayValue = kindByResource.get(parentResource) ?? parentResource

  return (
    <Tag
      style={{
        marginInlineEnd: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: matched ? 600 : 400,
        color: matched ? token.colorPrimary : undefined,
        borderColor: matched ? hexToRgba(token.colorPrimary, 0.45) : token.colorBorder,
        background: matched ? hexToRgba(token.colorPrimary, 0.1) : token.colorBgContainer,
      }}
    >
      <span style={{ fontFamily: token.fontFamilyCode }}>{displayValue}</span>
      {subresource && <span style={{ opacity: 0.7, fontFamily: token.fontFamilyCode }}>/ {subresource}</span>}
    </Tag>
  )
}

const FieldSection: FC<{ label: string; token: TTokenLike; children: React.ReactNode }> = ({ label, token, children }) => (
  <div style={{ marginBottom: 6 }}>
    <FieldLabel token={token}>{label}:</FieldLabel>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>{children}</div>
  </div>
)

export const RulePopoverContent: FC<TRulePopoverContentProps> = ({ origins, matchContext, kindByResource, token }) => (
  <div style={{ maxWidth: 420, maxHeight: 400, overflow: 'auto' }}>
    {origins.map((origin, index) => (
      <div
        key={`${origin.sourceObjectUID ?? 'rule'}-${origin.sourceRuleIndex ?? index}`}
        style={{
          paddingTop: index === 0 ? 0 : 8,
          marginTop: index === 0 ? 0 : 8,
          borderTop: index === 0 ? 'none' : `1px solid ${token.colorBorder}`,
        }}
      >
        {origins.length > 1 && (
          <Text type="secondary" style={{ fontSize: 10 }}>
            Rule {index + 1} of {origins.length}
          </Text>
        )}

        {(origin.apiGroups?.length ?? 0) > 0 && (
          <FieldSection label="apiGroups" token={token}>
            {origin.apiGroups!.map(value => (
              <ValueTag
                key={`ag-${value}`}
                value={value}
                matched={value === '*' || value === (matchContext.apiGroup ?? '')}
                token={token}
              />
            ))}
          </FieldSection>
        )}

        {(origin.resources?.length ?? 0) > 0 && (
          <FieldSection label="resources" token={token}>
            {origin.resources!.map(resource => (
              <ResourceTag
                key={`res-${resource}`}
                resource={resource}
                matched={resource === '*' || resource === matchContext.resource}
                kindByResource={kindByResource}
                token={token}
              />
            ))}
          </FieldSection>
        )}

        {(origin.resourceNames?.length ?? 0) > 0 && (
          <FieldSection label="resourceNames" token={token}>
            {origin.resourceNames!.map(value => (
              <ValueTag key={`rn-${value}`} value={value} token={token} />
            ))}
          </FieldSection>
        )}

        {(origin.nonResourceURLs?.length ?? 0) > 0 && (
          <FieldSection label="nonResourceURLs" token={token}>
            {origin.nonResourceURLs!.map(value => (
              <ValueTag
                key={`nru-${value}`}
                value={value}
                matched={value === '*' || value === (matchContext.url ?? '')}
                token={token}
              />
            ))}
          </FieldSection>
        )}

        <FieldSection label="verbs" token={token}>
          {origin.verbs.map(value => (
            <ValueTag
              key={`verb-${value}`}
              value={value}
              matched={value === '*' || value.toLowerCase() === matchContext.verb.toLowerCase()}
              token={token}
            />
          ))}
        </FieldSection>
      </div>
    ))}
  </div>
)
