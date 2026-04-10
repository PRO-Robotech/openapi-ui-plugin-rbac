import React, { FC, useCallback, useMemo, useState } from 'react'
import { ClearOutlined, FilterOutlined } from '@ant-design/icons'
import { useKindsRaw, useK8sSmartResource } from '@prorobotech/openapi-k8s-toolkit'
import { Alert, Button, Card, Empty, Flex, Select, Spin, Typography, theme } from 'antd'
import { useRbacRoleDetailsQuery } from 'hooks/useRbacRoleDetailsQuery'
import type { TNonResourceUrlList, TRbacNode, TRbacQueryPayload } from 'localTypes/rbacGraph'
import { RbacRoleDetailsModalContent } from 'components/organisms/RbacGraph/molecules'
import { applyInlineFilters, EMPTY_RBAC_INLINE_FILTER, type TRbacInlineFilterState } from './filterEngine'
import { createSelectorRelations, computeSelectorConstraints, toInlineSelectorOptions } from './selectorMetadata'

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
  const {
    data: nonResourceUrlsData,
    isLoading: nonResourceUrlsLoading,
    error: nonResourceUrlsError,
  } = useK8sSmartResource<TNonResourceUrlList>({
    cluster: data.clusterId,
    apiGroup: 'rbacgraph.in-cloud.io',
    apiVersion: 'v1alpha1',
    plural: 'nonresourceurls',
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
    selector: filter,
    matchMode: defaultQueryBehavior.matchMode,
    wildcardMode: defaultQueryBehavior.wildcardMode,
    filterPhantomAPIs: defaultQueryBehavior.filterPhantomAPIs,
  })

  const hasResourceFilter =
    filter.apiGroups.length > 0 || filter.resources.length > 0 || filter.resourceNames.length > 0
  const hasNonResourceFilter = filter.nonResourceURLs.length > 0
  const hasAnyFilter = hasResourceFilter || hasNonResourceFilter || filter.verbs.length > 0

  const selectorRelations = useMemo(
    () => createSelectorRelations(kindsData?.kindsWithVersion ?? [], nonResourceUrlsData?.items ?? []),
    [kindsData?.kindsWithVersion, nonResourceUrlsData?.items],
  )

  const selectorOptions = useMemo(() => {
    const selectorMetadataSettled = !kindsLoading && !nonResourceUrlsLoading

    if (!selectorMetadataSettled) return defaultSelectorOptions

    return toInlineSelectorOptions(
      computeSelectorConstraints({
        hasResourceFilters: hasResourceFilter,
        hasNonResourceFilters: hasNonResourceFilter,
        relations: selectorRelations,
        selection: filter,
      }),
    )
  }, [filter, hasNonResourceFilter, hasResourceFilter, kindsLoading, nonResourceUrlsLoading, selectorRelations])

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
      return <RbacRoleDetailsModalContent data={filteredData} token={getRoleDetailsToken(token)} />
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
          disabled={hasNonResourceFilter}
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
          disabled={hasNonResourceFilter}
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
          loading={kindsLoading || nonResourceUrlsLoading}
          mode="tags"
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
          mode="tags"
          disabled={hasNonResourceFilter}
          maxTagCount={1}
          placeholder="Resource Name"
          popupMatchSelectWidth={false}
          showSearch
          style={{ width: 200 }}
          tokenSeparators={[' ', ',']}
          value={filter.resourceNames}
          onChange={values => updateFilter('resourceNames', values)}
        />
        <Select
          allowClear
          loading={nonResourceUrlsLoading}
          mode="tags"
          disabled={hasResourceFilter}
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

      {nonResourceUrlsError && (
        <Alert
          type="error"
          message="Error while loading non-resource URLs"
          description={typeof nonResourceUrlsError === 'string' ? nonResourceUrlsError : nonResourceUrlsError.message}
          style={{ marginBottom: 16 }}
        />
      )}

      {content}
    </Card>
  )
}
