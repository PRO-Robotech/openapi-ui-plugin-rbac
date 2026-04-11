import React, { FC, useCallback, useMemo, useState } from 'react'
import { ClearOutlined, FilterOutlined } from '@ant-design/icons'
import { useKindsRaw } from '@prorobotech/openapi-k8s-toolkit'
import { Alert, Button, Card, Empty, Flex, Select, Spin, Typography, theme } from 'antd'
import { useRbacRoleDetailsQuery } from 'hooks/useRbacRoleDetailsQuery'
import type { TRbacNode, TRbacQueryPayload } from 'localTypes/rbacGraph'
import { RbacRoleDetailsModalContent } from 'components/organisms/RbacGraph/molecules'
import {
  applyInlineFilters,
  computeAvailableOptions,
  EMPTY_RBAC_INLINE_FILTER,
  type TRbacInlineFilterState,
} from './filterEngine'

export type TRbacInlineDetailsSectionData = {
  clusterId: string
  kind: Extract<TRbacNode['type'], 'Role' | 'ClusterRole'>
  name: string
  namespace?: string
  title?: string
}

type TRbacInlineDetailsSectionProps = {
  data: TRbacInlineDetailsSectionData
}

const getRoleDetailsToken = (token: ReturnType<typeof theme.useToken>['token']) => ({
  colorBgContainer: token.colorBgContainer,
  colorBgElevated: token.colorBgElevated,
  colorBorder: token.colorBorder,
  colorBorderSecondary: token.colorBorderSecondary,
  colorError: token.colorError,
  colorFillAlter: token.colorFillAlter,
  colorFillSecondary: token.colorFillSecondary,
  colorInfo: token.colorInfo,
  colorPrimary: token.colorPrimary,
  colorPrimaryBg: token.colorPrimaryBg,
  colorPrimaryBorder: token.colorPrimaryBorder,
  colorPrimaryText: token.colorPrimaryText,
  colorText: token.colorText,
  colorTextSecondary: token.colorTextSecondary,
  colorWarning: token.colorWarning,
  borderRadius: token.borderRadius,
  boxShadowSecondary: token.boxShadowSecondary,
  fontFamilyCode: token.fontFamilyCode,
})

const CORE_SENTINEL = '__core__'

const encodeApiGroup = (value: string) => (value === '' ? CORE_SENTINEL : value)
const decodeApiGroup = (value: string) => (value === CORE_SENTINEL ? '' : value)

const defaultSelectorOptions = {
  apiGroups: [],
  resources: [],
  verbs: [],
  nonResourceURLs: [],
}

const defaultQueryBehavior: Pick<TRbacQueryPayload['spec'], 'matchMode' | 'wildcardMode' | 'filterPhantomAPIs'> = {
  matchMode: 'any',
  wildcardMode: 'expand',
  filterPhantomAPIs: false,
}

const getQueryErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return 'Failed to load RBAC details.'
}

export const RbacInlineDetailsSection: FC<TRbacInlineDetailsSectionProps> = ({ data }) => {
  const { token } = theme.useToken()
  const [filter, setFilter] = useState<TRbacInlineFilterState>(EMPTY_RBAC_INLINE_FILTER)
  const {
    data: kindsData,
    isLoading: kindsLoading,
    error: kindsError,
  } = useKindsRaw({
    cluster: data.clusterId,
    isEnabled: Boolean(data.clusterId),
  })
  const node = useMemo<Pick<TRbacNode, 'type' | 'name' | 'namespace'>>(
    () => ({
      type: data.kind,
      name: data.name,
      namespace: data.kind === 'Role' ? data.namespace : undefined,
    }),
    [data.kind, data.name, data.namespace],
  )

  const roleDetailsQuery = useRbacRoleDetailsQuery({
    clusterId: data.clusterId,
    node,
    selector: EMPTY_RBAC_INLINE_FILTER,
    matchMode: defaultQueryBehavior.matchMode,
    wildcardMode: defaultQueryBehavior.wildcardMode,
    filterPhantomAPIs: defaultQueryBehavior.filterPhantomAPIs,
  })

  const hasResourceFilter =
    filter.apiGroups.length > 0 || filter.resources.length > 0 || filter.resourceNames.length > 0
  const hasNonResourceFilter = filter.nonResourceURLs.length > 0
  const hasAnyFilter = hasResourceFilter || hasNonResourceFilter || filter.verbs.length > 0

  const selectorOptions = useMemo(() => {
    if (!roleDetailsQuery.data) return defaultSelectorOptions

    return computeAvailableOptions(roleDetailsQuery.data, filter)
  }, [filter, roleDetailsQuery.data])

  const filteredData = useMemo(() => {
    if (!roleDetailsQuery.data) return null

    return applyInlineFilters(roleDetailsQuery.data, filter)
  }, [filter, roleDetailsQuery.data])

  const content = (() => {
    if (roleDetailsQuery.isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Spin tip="Loading RBAC details..." />
        </div>
      )
    }

    if (roleDetailsQuery.isError) {
      return (
        <Alert
          type="error"
          message="Error while loading RBAC details"
          description={getQueryErrorMessage(roleDetailsQuery.error)}
        />
      )
    }

    if (filteredData) {
      return (
        <RbacRoleDetailsModalContent
          data={filteredData}
          kindsWithVersion={kindsData?.kindsWithVersion ?? []}
          token={getRoleDetailsToken(token)}
        />
      )
    }

    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No RBAC details were returned." />
  })()

  const updateFilter = useCallback((key: keyof TRbacInlineFilterState, values: string[]) => {
    setFilter(previous => {
      const next: TRbacInlineFilterState = {
        ...previous,
        [key]: values,
      }

      if ((key === 'apiGroups' || key === 'resources' || key === 'resourceNames') && values.length > 0) {
        next.nonResourceURLs = []
      }

      if (key === 'nonResourceURLs' && values.length > 0) {
        next.apiGroups = []
        next.resources = []
        next.resourceNames = []
      }

      return next
    })
  }, [])

  const apiGroupOptions = useMemo(
    () =>
      selectorOptions.apiGroups.map(value => ({
        label: value || '(core)',
        value: encodeApiGroup(value),
      })),
    [selectorOptions.apiGroups],
  )

  const apiGroupValue = useMemo(() => filter.apiGroups.map(encodeApiGroup), [filter.apiGroups])

  return (
    <Card
      title={data.title ?? 'Permission Details'}
      extra={
        hasAnyFilter ? (
          <Button icon={<ClearOutlined />} onClick={() => setFilter(EMPTY_RBAC_INLINE_FILTER)} size="small">
            Reset
          </Button>
        ) : null
      }
      style={{ marginTop: 24 }}
    >
      <Flex align="center" gap={8} style={{ marginBottom: 16 }} wrap>
        <Typography.Text strong>
          <FilterOutlined style={{ marginInlineEnd: 8 }} />
          Selectors
        </Typography.Text>
        <Select
          allowClear
          loading={kindsLoading}
          mode="multiple"
          disabled={hasNonResourceFilter || apiGroupOptions.length === 0}
          maxTagCount={1}
          options={apiGroupOptions}
          placeholder="API Group"
          popupMatchSelectWidth={false}
          showSearch
          style={{ width: 200 }}
          value={apiGroupValue}
          onChange={values => updateFilter('apiGroups', values.map(decodeApiGroup))}
        />
        <Select
          allowClear
          loading={kindsLoading}
          mode="multiple"
          disabled={hasNonResourceFilter || selectorOptions.resources.length === 0}
          maxTagCount={1}
          options={selectorOptions.resources.map(value => ({ label: value, value }))}
          placeholder="Resource"
          popupMatchSelectWidth={false}
          showSearch
          style={{ width: 200 }}
          value={filter.resources}
          onChange={values => updateFilter('resources', values)}
        />
        <Select
          allowClear
          loading={kindsLoading}
          mode="multiple"
          disabled={selectorOptions.verbs.length === 0}
          maxTagCount={1}
          options={selectorOptions.verbs.map(value => ({ label: value, value }))}
          placeholder="Verb"
          popupMatchSelectWidth={false}
          showSearch
          style={{ width: 160 }}
          value={filter.verbs}
          onChange={values => updateFilter('verbs', values)}
        />
        <Select
          allowClear
          loading={roleDetailsQuery.isLoading}
          mode="multiple"
          disabled={hasResourceFilter || selectorOptions.nonResourceURLs.length === 0}
          maxTagCount={1}
          options={selectorOptions.nonResourceURLs.map(value => ({ label: value, value }))}
          placeholder="Non-Resource URL"
          popupMatchSelectWidth={false}
          showSearch
          style={{ width: 220 }}
          value={filter.nonResourceURLs}
          onChange={values => updateFilter('nonResourceURLs', values)}
        />
      </Flex>

      {kindsError && (
        <Alert
          type="error"
          message="Error while loading Kubernetes kinds"
          description={kindsError.message}
          style={{ marginBottom: 16 }}
        />
      )}

      {content}
    </Card>
  )
}
