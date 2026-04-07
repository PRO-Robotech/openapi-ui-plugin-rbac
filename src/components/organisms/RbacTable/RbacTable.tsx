/* eslint-disable max-lines-per-function */
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CompressOutlined,
  EyeOutlined,
  GlobalOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useKindsRaw, useK8sSmartResource } from '@prorobotech/openapi-k8s-toolkit'
import type { TNavigationResource } from '@prorobotech/openapi-k8s-toolkit'
import { Alert, Button, Card, Descriptions, Empty, Modal, Spin, Table, Tag, Tooltip, Typography, theme } from 'antd'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { FOOTER_HEIGHT } from 'constants/blocksSizes'
import type {
  TRbacNode,
  TRbacQueryPayload,
  TRbacQueryResponse,
  TRbacGraph as TGraph,
  TRbacGraphProps,
  TNonResourceUrlItem,
  TNonResourceUrlList,
} from 'localTypes/rbacGraph'
import { useRbacGraphQuery } from 'hooks/useRbacGraphQuery'
import { useRbacRoleDetailsQuery } from 'hooks/useRbacRoleDetailsQuery'
import { RbacResourceLabel } from 'components/organisms/RbacGraph/atoms/RbacResourceLabel'
import { RbacQueryForm, RbacRoleDetailsModalContent } from 'components/organisms/RbacGraph/molecules'
import { DEFAULT_PAYLOAD, EMPTY_SELECTOR_SELECTION, ROLE_NODE_TYPES } from 'components/organisms/RbacGraph/constants'
import { hasWildcard, toSortedOptions } from 'components/organisms/RbacGraph/utils'
import { getNavigationBaseFactoriesMapping, getRbacResourceHref, RBAC_NAVIGATION_QUERY } from 'utils/rbacResourceLink'
import {
  buildRoleTableRows,
  type TTableAccountBinding,
  type TRoleTableRow,
  type TTableAggregationSource,
  type TTableScope,
  type TTableSubject,
} from './buildRoleTableRows'
import { Styled } from './styled'

type TSelectorSelection = typeof EMPTY_SELECTOR_SELECTION
type TScopeFilterItem = {
  scope: TTableScope
  label: string
  count: number
  icon: React.ReactNode
}

const getQueryErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message

    if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
      return responseMessage
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return 'Query execution failed.'
}

const renderAggregated = (value: boolean) =>
  value ? <Tag color="orange">yes</Tag> : <Typography.Text type="secondary">no</Typography.Text>

const MIN_TABLE_HEIGHT = 320
const TABLE_SCROLL_RESERVED_HEIGHT = 56

const formatSubjectLabel = ({ name }: TTableSubject) => name

const formatAggregationSourceLabel = ({ name, namespace }: TTableAggregationSource) =>
  namespace ? `${namespace}/${name}` : name

const getScopeTagStyle = (
  scope: TTableScope,
  token: ReturnType<typeof theme.useToken>['token'],
): React.CSSProperties => {
  if (scope === 'cluster-wide') {
    return {
      color: token.gold7,
      backgroundColor: token.gold1,
      borderColor: token.gold3,
    }
  }

  if (scope === 'narrowed') {
    return {
      color: token.blue7,
      backgroundColor: token.blue1,
      borderColor: token.blue3,
    }
  }

  if (scope === 'same-ns') {
    return {
      color: token.green7,
      backgroundColor: token.green1,
      borderColor: token.green3,
    }
  }

  if (scope === 'cross-ns') {
    return {
      color: token.volcano7,
      backgroundColor: token.volcano1,
      borderColor: token.volcano3,
    }
  }

  return {
    color: token.colorTextSecondary,
    backgroundColor: token.colorFillAlter,
    borderColor: token.colorBorder,
  }
}

const LinkedResourceLabel = ({
  badgeId,
  value,
  badgeValue,
  href,
  navigate,
}: {
  badgeId: string
  value: string
  badgeValue?: string
  href?: string
  navigate: ReturnType<typeof useNavigate>
}) => {
  const label = <RbacResourceLabel badgeId={badgeId} value={value} badgeValue={badgeValue} />
  if (!href) return label

  return (
    <RbacResourceLabel
      badgeId={badgeId}
      value={value}
      badgeValue={badgeValue}
      textNode={
        <Typography.Link
          onClick={event => {
            event.preventDefault()
            event.stopPropagation()
            navigate(href)
          }}
        >
          {value}
        </Typography.Link>
      }
    />
  )
}

const renderRoleLabel = ({
  row,
  clusterId,
  baseFactoriesMapping,
  navigate,
}: {
  row: TRoleTableRow
  clusterId: string
  baseFactoriesMapping?: Record<string, string>
  navigate: ReturnType<typeof useNavigate>
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
            {href ? (
              <Typography.Link
                onClick={event => {
                  event.preventDefault()
                  event.stopPropagation()
                  navigate(href)
                }}
              >
                {row.roleName}
              </Typography.Link>
            ) : (
              <span>{row.roleName}</span>
            )}
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
      navigate={navigate}
    />
  )
}

const renderAccountBindings = ({
  accountBindings,
  clusterId,
  baseFactoriesMapping,
  navigate,
  token,
}: {
  accountBindings: TTableAccountBinding[]
  clusterId: string
  baseFactoriesMapping?: Record<string, string>
  navigate: ReturnType<typeof useNavigate>
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
                  kind === 'ServiceAccount'
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
                      <Styled.AccountBindingTextGroup>
                        {namespace && <Tag color="orange">{namespace}</Tag>}
                        {subjectHref ? (
                          <Typography.Link
                            onClick={event => {
                              event.preventDefault()
                              event.stopPropagation()
                              navigate(subjectHref)
                            }}
                          >
                            {formatSubjectLabel(subject)}
                          </Typography.Link>
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
                          <Typography.Link
                            onClick={event => {
                              event.preventDefault()
                              event.stopPropagation()
                              navigate(bindingHref)
                            }}
                          >
                            {name}
                          </Typography.Link>
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

const renderAggregationSources = ({
  sources,
  clusterId,
  baseFactoriesMapping,
  navigate,
}: {
  sources: TTableAggregationSource[]
  clusterId: string
  baseFactoriesMapping?: Record<string, string>
  navigate: ReturnType<typeof useNavigate>
}) => {
  if (sources.length === 0) {
    return <Typography.Text type="secondary">-</Typography.Text>
  }

  return (
    <Styled.ResourceList>
      {sources.map(source => (
        <Styled.ResourceListItem key={source.key}>
          <LinkedResourceLabel
            badgeId={`rbac-table-aggregator-${source.key}`}
            value={formatAggregationSourceLabel(source)}
            badgeValue={source.type}
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
            navigate={navigate}
          />
        </Styled.ResourceListItem>
      ))}
    </Styled.ResourceList>
  )
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

export const RbacTable: FC<TRbacGraphProps> = ({ clusterId }) => {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chromeRef = useRef<HTMLDivElement | null>(null)
  const [payload, setPayload] = useState<TRbacQueryPayload>(DEFAULT_PAYLOAD)
  const [graphData, setGraphData] = useState<TGraph | null>(null)
  const [stats, setStats] = useState<TRbacQueryResponse['stats']>()
  const [queryErrorMessage, setQueryErrorMessage] = useState<string | null>(null)
  const [selectorSelection, setSelectorSelection] = useState<TSelectorSelection>(EMPTY_SELECTOR_SELECTION)
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null)
  const [tableHeight, setTableHeight] = useState(MIN_TABLE_HEIGHT)
  const [scopeFilters, setScopeFilters] = useState<TTableScope[]>([])

  const queryMutation = useRbacGraphQuery(clusterId)

  const {
    data: kindsData,
    isLoading: kindsLoading,
    error: kindsError,
  } = useKindsRaw({
    cluster: clusterId,
    isEnabled: Boolean(clusterId),
  })

  const {
    data: nonResourceUrlsData,
    isLoading: nonResourceUrlsLoading,
    error: nonResourceUrlsError,
  } = useK8sSmartResource<TNonResourceUrlList>({
    cluster: clusterId,
    apiGroup: 'rbacgraph.incloud.io',
    apiVersion: 'v1alpha1',
    plural: 'nonresourceurls',
    isEnabled: Boolean(clusterId),
  })

  const { data: navigationData } = useK8sSmartResource<{ items: TNavigationResource[] }>({
    cluster: clusterId,
    apiGroup: RBAC_NAVIGATION_QUERY.apiGroup,
    apiVersion: RBAC_NAVIGATION_QUERY.apiVersion,
    plural: RBAC_NAVIGATION_QUERY.plural,
    fieldSelector: RBAC_NAVIGATION_QUERY.fieldSelector,
    isEnabled: Boolean(clusterId),
  })

  const baseFactoriesMapping = useMemo(() => getNavigationBaseFactoriesMapping(navigationData), [navigationData])

  const hasResourceFilters = Boolean(
    selectorSelection.apiGroups.length || selectorSelection.resources.length || selectorSelection.resourceNames.length,
  )
  const hasNonResourceFilters = Boolean(selectorSelection.nonResourceURLs.length)

  const selectorRelations = useMemo(() => {
    const kindsWithVersion =
      kindsData?.kindsWithVersion.map(kind => ({
        ...kind,
        version: {
          ...kind.version,
          verbs: (kind.version.verbs ?? []).filter(verb => !hasWildcard(verb)),
        },
      })) ?? []
    const nonResourceItems =
      nonResourceUrlsData?.items
        .filter(item => !hasWildcard(item.url))
        .map(item => ({
          ...item,
          verbs: item.verbs.filter(verb => !hasWildcard(verb)),
        })) ?? []

    const matchesResourceSelection = (
      kind: (typeof kindsWithVersion)[number],
      selection: { apiGroups: string[]; resources: string[]; verbs: string[] },
    ) =>
      (selection.apiGroups.length === 0 || selection.apiGroups.includes(kind.group)) &&
      (selection.resources.length === 0 || selection.resources.includes(kind.version.resource)) &&
      (selection.verbs.length === 0 || selection.verbs.some(verb => kind.version.verbs?.includes(verb)))

    const matchesNonResourceSelection = (
      item: TNonResourceUrlItem,
      selection: { nonResourceURLs: string[]; verbs: string[] },
    ) =>
      (selection.nonResourceURLs.length === 0 || selection.nonResourceURLs.includes(item.url)) &&
      (selection.verbs.length === 0 || selection.verbs.some(verb => item.verbs.includes(verb)))

    const collectResourceOptions = (
      selection: { apiGroups: string[]; resources: string[]; verbs: string[] },
      ignoredKey?: 'apiGroups' | 'resources' | 'verbs',
    ) => {
      const filteredKinds = kindsWithVersion.filter(kind =>
        matchesResourceSelection(kind, {
          apiGroups: ignoredKey === 'apiGroups' ? [] : selection.apiGroups,
          resources: ignoredKey === 'resources' ? [] : selection.resources,
          verbs: ignoredKey === 'verbs' ? [] : selection.verbs,
        }),
      )

      return {
        apiGroups: new Set(filteredKinds.map(kind => kind.group)),
        resources: new Set(filteredKinds.map(kind => kind.version.resource)),
        verbs: new Set(filteredKinds.flatMap(kind => kind.version.verbs ?? [])),
      }
    }

    const collectNonResourceOptions = (
      selection: { nonResourceURLs: string[]; verbs: string[] },
      ignoredKey?: 'nonResourceURLs' | 'verbs',
    ) => {
      const filteredNonResourceItems = nonResourceItems.filter(item =>
        matchesNonResourceSelection(item, {
          nonResourceURLs: ignoredKey === 'nonResourceURLs' ? [] : selection.nonResourceURLs,
          verbs: ignoredKey === 'verbs' ? [] : selection.verbs,
        }),
      )

      return {
        nonResourceURLs: new Set(filteredNonResourceItems.map(item => item.url)),
        verbs: new Set(filteredNonResourceItems.flatMap(item => item.verbs)),
      }
    }

    return {
      collectResourceOptions,
      collectNonResourceOptions,
    }
  }, [kindsData?.kindsWithVersion, nonResourceUrlsData?.items])

  const selectorConstraints = useMemo(() => {
    const resourceOptionsForGroups = selectorRelations.collectResourceOptions(selectorSelection, 'apiGroups')
    const resourceOptionsForResources = selectorRelations.collectResourceOptions(selectorSelection, 'resources')
    const resourceOptionsForVerbs = selectorRelations.collectResourceOptions(selectorSelection, 'verbs')
    const nonResourceOptionsForUrls = selectorRelations.collectNonResourceOptions(selectorSelection, 'nonResourceURLs')
    const nonResourceOptionsForVerbs = selectorRelations.collectNonResourceOptions(selectorSelection, 'verbs')
    const allowedVerbs = new Set<string>()

    if (hasResourceFilters || !hasNonResourceFilters) {
      resourceOptionsForVerbs.verbs.forEach(verb => allowedVerbs.add(verb))
    }

    if (hasNonResourceFilters || !hasResourceFilters) {
      nonResourceOptionsForVerbs.verbs.forEach(verb => allowedVerbs.add(verb))
    }

    return {
      allowedGroups: resourceOptionsForGroups.apiGroups,
      allowedResources: resourceOptionsForResources.resources,
      allowedVerbs,
      allowedNonResourceURLs: nonResourceOptionsForUrls.nonResourceURLs,
    }
  }, [hasNonResourceFilters, hasResourceFilters, selectorRelations, selectorSelection])

  const selectorOptions = useMemo(
    () => ({
      apiGroups: Array.from(selectorConstraints.allowedGroups)
        .sort((a, b) => a.localeCompare(b))
        .map(value => ({ value, label: value || '(core)' })),
      resources: toSortedOptions(selectorConstraints.allowedResources),
      verbs: toSortedOptions(selectorConstraints.allowedVerbs),
      nonResourceURLs: toSortedOptions(selectorConstraints.allowedNonResourceURLs),
    }),
    [
      selectorConstraints.allowedGroups,
      selectorConstraints.allowedNonResourceURLs,
      selectorConstraints.allowedResources,
      selectorConstraints.allowedVerbs,
    ],
  )

  const handleSelectorChange = useCallback(
    (sel: TSelectorSelection, changedKey?: keyof TSelectorSelection) => {
      const isResourceSelector =
        changedKey === 'apiGroups' || changedKey === 'resources' || changedKey === 'resourceNames'
      const activatedResourceSelection =
        changedKey !== undefined && isResourceSelector && Array.isArray(sel[changedKey]) && sel[changedKey].length > 0
      const activatedNonResourceSelection = changedKey === 'nonResourceURLs' && sel.nonResourceURLs.length > 0

      const selectionWithExclusiveMode = {
        ...sel,
        ...(activatedResourceSelection ? { nonResourceURLs: [] } : {}),
        ...(activatedNonResourceSelection ? { apiGroups: [], resources: [], resourceNames: [] } : {}),
      }

      const nextApiGroups = selectionWithExclusiveMode.apiGroups.filter(group =>
        selectorRelations.collectResourceOptions(selectionWithExclusiveMode, 'apiGroups').apiGroups.has(group),
      )
      const nextResources = selectionWithExclusiveMode.resources.filter(resource =>
        selectorRelations
          .collectResourceOptions(
            {
              ...selectionWithExclusiveMode,
              apiGroups: nextApiGroups,
            },
            'resources',
          )
          .resources.has(resource),
      )
      const nextResourceNames = selectionWithExclusiveMode.resourceNames
      const nextHasResourceFilters = Boolean(nextApiGroups.length || nextResources.length || nextResourceNames.length)
      const nextHasNonResourceFilters = Boolean(selectionWithExclusiveMode.nonResourceURLs.length)
      const allowedVerbs = new Set<string>()
      const resourceVerbs = selectorRelations.collectResourceOptions(
        {
          ...selectionWithExclusiveMode,
          apiGroups: nextApiGroups,
          resources: nextResources,
        },
        'verbs',
      ).verbs
      const nonResourceVerbs = selectorRelations.collectNonResourceOptions(
        { ...selectionWithExclusiveMode },
        'verbs',
      ).verbs

      if (nextHasResourceFilters || !nextHasNonResourceFilters) {
        resourceVerbs.forEach(verb => allowedVerbs.add(verb))
      }

      if (nextHasNonResourceFilters || !nextHasResourceFilters) {
        nonResourceVerbs.forEach(verb => allowedVerbs.add(verb))
      }

      const nextVerbs = selectionWithExclusiveMode.verbs.filter(verb => allowedVerbs.has(verb))
      const nextNonResourceURLs = selectionWithExclusiveMode.nonResourceURLs.filter(nonResourceURL =>
        selectorRelations
          .collectNonResourceOptions(
            {
              nonResourceURLs: selectionWithExclusiveMode.nonResourceURLs,
              verbs: nextVerbs,
            },
            'nonResourceURLs',
          )
          .nonResourceURLs.has(nonResourceURL),
      )
      const nextSelection = {
        ...sel,
        apiGroups: nextApiGroups,
        resources: nextResources,
        resourceNames: nextResourceNames,
        verbs: nextVerbs,
        nonResourceURLs: nextNonResourceURLs,
      }

      setSelectorSelection(nextSelection)
      setPayload(prev => ({
        spec: {
          ...prev.spec,
          selector: {
            ...prev.spec.selector,
            verbs: nextSelection.verbs,
            apiGroups: nextSelection.apiGroups,
            resources: nextSelection.resources,
            resourceNames: nextSelection.resourceNames,
            nonResourceURLs: nextSelection.nonResourceURLs,
          },
        },
      }))
    },
    [selectorRelations],
  )

  useEffect(() => {
    if (!kindsData?.kindsWithVersion) return

    const normalizedSelection = {
      ...selectorSelection,
      apiGroups: selectorSelection.apiGroups.filter(group => selectorConstraints.allowedGroups.has(group)),
      resources: selectorSelection.resources.filter(resource => selectorConstraints.allowedResources.has(resource)),
      verbs: selectorSelection.verbs.filter(verb => selectorConstraints.allowedVerbs.has(verb)),
      resourceNames: selectorSelection.resourceNames,
      nonResourceURLs: selectorSelection.nonResourceURLs.filter(nonResourceURL =>
        selectorConstraints.allowedNonResourceURLs.has(nonResourceURL),
      ),
    }

    const selectionChanged =
      normalizedSelection.apiGroups.length !== selectorSelection.apiGroups.length ||
      normalizedSelection.resources.length !== selectorSelection.resources.length ||
      normalizedSelection.verbs.length !== selectorSelection.verbs.length ||
      normalizedSelection.resourceNames.length !== selectorSelection.resourceNames.length ||
      normalizedSelection.nonResourceURLs.length !== selectorSelection.nonResourceURLs.length

    if (selectionChanged) {
      handleSelectorChange(normalizedSelection)
    }
  }, [
    handleSelectorChange,
    kindsData?.kindsWithVersion,
    selectorConstraints.allowedGroups,
    selectorConstraints.allowedNonResourceURLs,
    selectorConstraints.allowedResources,
    selectorConstraints.allowedVerbs,
    nonResourceUrlsData?.items,
    selectorSelection,
  ])

  const rows = useMemo(() => buildRoleTableRows(graphData), [graphData])
  const scopeFilterItems = useMemo<TScopeFilterItem[]>(() => {
    const counts = new Map<TTableScope, number>()

    rows.forEach(row => {
      row.accountBindings.forEach(accountBinding => {
        counts.set(accountBinding.scope, (counts.get(accountBinding.scope) ?? 0) + 1)
      })
    })

    const items: TScopeFilterItem[] = [
      {
        scope: 'cluster-wide',
        label: 'cluster',
        count: counts.get('cluster-wide') ?? 0,
        icon: <GlobalOutlined />,
      },
      {
        scope: 'cross-ns',
        label: 'cross-ns',
        count: counts.get('cross-ns') ?? 0,
        icon: <WarningOutlined />,
      },
      {
        scope: 'narrowed',
        label: 'narrowed',
        count: counts.get('narrowed') ?? 0,
        icon: <CompressOutlined rotate={45} />,
      },
      {
        scope: 'same-ns',
        label: 'same-ns',
        count: counts.get('same-ns') ?? 0,
        icon: <CompressOutlined />,
      },
      {
        scope: 'orphan',
        label: 'orphan',
        count: counts.get('orphan') ?? 0,
        icon: <WarningOutlined />,
      },
    ]

    return items.filter(item => item.count > 0)
  }, [rows])
  const filteredRows = useMemo(() => {
    if (scopeFilters.length === 0) {
      return rows
    }

    return rows
      .map(row => {
        const accountBindings = row.accountBindings.filter(accountBinding =>
          scopeFilters.includes(accountBinding.scope),
        )

        return {
          ...row,
          accountBindings,
        }
      })
      .filter(row => row.accountBindings.length > 0)
  }, [rows, scopeFilters])
  const selectedRow = useMemo(
    () => filteredRows.find(row => row.key === selectedRowKey) ?? null,
    [filteredRows, selectedRowKey],
  )
  const nodeById = useMemo(() => new Map(graphData?.nodes.map(node => [node.id, node] as const) ?? []), [graphData])
  const selectedNode = useMemo(() => {
    if (!selectedRow) return null
    return nodeById.get(selectedRow.roleNodeId) ?? null
  }, [nodeById, selectedRow])

  const primaryRoleNode = useMemo<Pick<TRbacNode, 'type' | 'name' | 'namespace'> | null>(() => {
    if (!selectedNode || !ROLE_NODE_TYPES.has(selectedNode.type)) return null
    return selectedNode
  }, [selectedNode])

  const primaryRoleDetailsQuery = useRbacRoleDetailsQuery({
    clusterId,
    node: primaryRoleNode,
    selector: payload.spec.selector,
    matchMode: payload.spec.matchMode,
    wildcardMode: payload.spec.wildcardMode,
    filterPhantomAPIs: payload.spec.filterPhantomAPIs,
  })

  const columns = useMemo<ColumnsType<TRoleTableRow>>(
    () => [
      {
        title: '',
        key: 'actions',
        width: 72,
        fixed: 'left',
        align: 'center',
        render: (_, row) => (
          <Tooltip title="Open details">
            <Button
              aria-label={`Open details for ${row.roleKind} ${row.roleName}`}
              icon={<EyeOutlined />}
              onClick={event => {
                event.stopPropagation()
                setSelectedRowKey(row.key)
              }}
            />
          </Tooltip>
        ),
      },
      {
        title: 'Role',
        key: 'role',
        width: 320,
        sorter: (left, right) =>
          left.roleKind.localeCompare(right.roleKind) || left.roleName.localeCompare(right.roleName),
        render: (_, row) =>
          renderRoleLabel({
            row,
            clusterId,
            baseFactoriesMapping,
            navigate,
          }),
      },
      {
        title: 'Aggregated',
        dataIndex: 'aggregated',
        key: 'aggregated',
        width: 120,
        sorter: (left, right) => Number(left.aggregated) - Number(right.aggregated),
        render: renderAggregated,
      },
      {
        title: 'Matched Rules',
        dataIndex: 'matchedRuleCount',
        key: 'matchedRuleCount',
        width: 140,
        sorter: (left, right) => left.matchedRuleCount - right.matchedRuleCount,
      },
      {
        title: 'Accounts',
        dataIndex: 'accountBindings',
        key: 'accountBindings',
        width: 640,
        render: (_, row) =>
          renderAccountBindings({
            accountBindings: row.accountBindings,
            clusterId,
            baseFactoriesMapping,
            navigate,
            token,
          }),
      },
      {
        title: 'Aggregators',
        dataIndex: 'aggregationSources',
        key: 'aggregationSources',
        width: 360,
        render: (_, row) =>
          renderAggregationSources({
            sources: row.aggregationSources,
            clusterId,
            baseFactoriesMapping,
            navigate,
          }),
      },
    ],
    [baseFactoriesMapping, clusterId, navigate, token],
  )

  const handleSubmit = useCallback(() => {
    setQueryErrorMessage(null)
    queryMutation.mutate(payload, {
      onSuccess: (data: TRbacQueryResponse) => {
        setQueryErrorMessage(null)
        setGraphData(data.graph)
        setStats(data.stats)
        setSelectedRowKey(null)
        setScopeFilters([])
      },
      onError: error => {
        setGraphData(null)
        setStats(undefined)
        setSelectedRowKey(null)
        setQueryErrorMessage(getQueryErrorMessage(error))
      },
    })
  }, [payload, queryMutation])

  const handleReset = useCallback(() => {
    setPayload(DEFAULT_PAYLOAD)
    setGraphData(null)
    setStats(undefined)
    setQueryErrorMessage(null)
    setSelectorSelection(EMPTY_SELECTOR_SELECTION)
    setSelectedRowKey(null)
    setScopeFilters([])
  }, [])

  const nonResourceUrlsErrorMessage =
    typeof nonResourceUrlsError === 'string' ? nonResourceUrlsError : nonResourceUrlsError?.message
  const roleDetailsToken = useMemo(() => getRoleDetailsToken(token), [token])
  const tableScrollY = useMemo(() => Math.max(240, tableHeight - TABLE_SCROLL_RESERVED_HEIGHT), [tableHeight])

  useEffect(() => {
    const updateTableHeight = () => {
      const containerRect = containerRef.current?.getBoundingClientRect()
      const chromeHeight = chromeRef.current?.getBoundingClientRect().height ?? 0

      if (!containerRect) return

      const viewportHeight = window.innerHeight
      const nextHeight = Math.max(
        MIN_TABLE_HEIGHT,
        Math.floor(viewportHeight - containerRect.top - chromeHeight - FOOTER_HEIGHT - 16),
      )

      setTableHeight(prev => (prev === nextHeight ? prev : nextHeight))
    }

    updateTableHeight()

    const resizeObserver = new ResizeObserver(() => updateTableHeight())
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    if (chromeRef.current) resizeObserver.observe(chromeRef.current)

    window.addEventListener('resize', updateTableHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateTableHeight)
    }
  }, [graphData, stats, kindsError, nonResourceUrlsError, queryErrorMessage, queryMutation.isPending])

  const content = (() => {
    if (queryMutation.isPending) {
      return (
        <Styled.SpinContainer $height={tableHeight}>
          <Spin tip="Loading table data..." />
        </Styled.SpinContainer>
      )
    }

    if (!graphData) {
      return (
        <Styled.EmptyState $height={tableHeight}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Configure selectors and run a query to view RBAC results as a table."
          />
        </Styled.EmptyState>
      )
    }

    return (
      <Styled.TableContainer
        $height={tableHeight}
        $colorBgContainer={token.colorBgContainer}
        $colorBorder={token.colorBorder}
        $borderRadius={token.borderRadius}
      >
        <Table<TRoleTableRow>
          rowKey="key"
          dataSource={filteredRows}
          columns={columns}
          size="small"
          pagination={false}
          scroll={{ x: 1800, y: tableScrollY }}
        />
      </Styled.TableContainer>
    )
  })()

  const primaryRoleContent = (() => {
    if (!primaryRoleNode) return null
    if (primaryRoleDetailsQuery.isLoading) {
      return (
        <Styled.SpinContainer>
          <Spin tip="Loading role details..." />
        </Styled.SpinContainer>
      )
    }
    if (primaryRoleDetailsQuery.isError) {
      return (
        <Alert
          type="error"
          message="Error while loading role details"
          description={getQueryErrorMessage(primaryRoleDetailsQuery.error)}
        />
      )
    }
    if (primaryRoleDetailsQuery.data) {
      return <RbacRoleDetailsModalContent data={primaryRoleDetailsQuery.data} token={roleDetailsToken} />
    }

    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No role details were returned." />
  })()

  return (
    <Styled.Container ref={containerRef}>
      <Styled.Chrome ref={chromeRef}>
        <Card size="small" styles={{ body: { padding: 0 } }}>
          <RbacQueryForm
            value={payload}
            selectorLoading={kindsLoading || nonResourceUrlsLoading}
            selectorOptions={selectorOptions}
            onSelectorChange={(patch, changedKey) =>
              handleSelectorChange({ ...selectorSelection, ...patch }, changedKey)
            }
            onChange={setPayload}
            onSubmit={handleSubmit}
            onReset={handleReset}
            loading={queryMutation.isPending}
          />
        </Card>

        {kindsError && (
          <Alert type="error" message="Error while loading Kubernetes kinds" description={kindsError.message} />
        )}

        {nonResourceUrlsError && (
          <Alert
            type="error"
            message="Error while loading non-resource URLs"
            description={nonResourceUrlsErrorMessage}
          />
        )}

        {queryErrorMessage && (
          <Alert type="error" message="Error while running query" description={queryErrorMessage} />
        )}

        {stats && (
          <Styled.StatsBar>
            <Styled.StatsMetrics>
              <span>Roles: {stats.matchedRoles}</span>
              <span>Bindings: {stats.matchedBindings}</span>
              <span>Subjects: {stats.matchedSubjects}</span>
              <span>Rows: {filteredRows.length}</span>
            </Styled.StatsMetrics>

            <Styled.ScopeFilters>
              {scopeFilterItems.map(item => {
                const active = scopeFilters.includes(item.scope)
                const scopeStyle = getScopeTagStyle(item.scope, token)

                return (
                  <Styled.ScopeFilterButton
                    key={item.scope}
                    type="button"
                    $active={active}
                    $color={String(scopeStyle.color)}
                    $background={String(scopeStyle.backgroundColor)}
                    $border={String(scopeStyle.borderColor)}
                    $text={token.colorText}
                    onClick={() =>
                      setScopeFilters(prev =>
                        prev.includes(item.scope) ? prev.filter(scope => scope !== item.scope) : [...prev, item.scope],
                      )
                    }
                  >
                    {item.icon}
                    <span>{`${item.label} ${item.count}`}</span>
                  </Styled.ScopeFilterButton>
                )
              })}
            </Styled.ScopeFilters>
          </Styled.StatsBar>
        )}
      </Styled.Chrome>

      {content}
      <Modal
        open={Boolean(selectedRow)}
        onCancel={() => setSelectedRowKey(null)}
        footer={null}
        width={1400}
        centered
        destroyOnHidden
        title={selectedRow ? `${selectedRow.roleKind}: ${selectedRow.roleName}` : 'RBAC role details'}
      >
        {!selectedRow || !selectedNode ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No row is selected." />
        ) : (
          <>
            <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Role">{`${selectedRow.roleKind}: ${selectedRow.roleName}`}</Descriptions.Item>
              <Descriptions.Item label="Namespace">{selectedRow.namespace}</Descriptions.Item>
              <Descriptions.Item label="Accounts">{selectedRow.accountBindings.length}</Descriptions.Item>
              <Descriptions.Item label="Aggregators">{selectedRow.aggregationSourcesCount}</Descriptions.Item>
              <Descriptions.Item label="Matched Rules">{selectedRow.matchedRuleCount}</Descriptions.Item>
              <Descriptions.Item label="Aggregated">{renderAggregated(selectedRow.aggregated)}</Descriptions.Item>
              <Descriptions.Item label="Account List" span={2}>
                {renderAccountBindings({
                  accountBindings: selectedRow.accountBindings,
                  clusterId,
                  baseFactoriesMapping,
                  navigate,
                  token,
                })}
              </Descriptions.Item>
              <Descriptions.Item label="Aggregator Roles" span={2}>
                {renderAggregationSources({
                  sources: selectedRow.aggregationSources,
                  clusterId,
                  baseFactoriesMapping,
                  navigate,
                })}
              </Descriptions.Item>
            </Descriptions>

            {primaryRoleNode && (
              <div>
                <Typography.Title level={5}>{`${primaryRoleNode.type}: ${primaryRoleNode.name}`}</Typography.Title>
                {primaryRoleContent}
              </div>
            )}
          </>
        )}
      </Modal>
    </Styled.Container>
  )
}
