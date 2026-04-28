/* eslint-disable max-lines-per-function */
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FilterDropdownProps } from 'antd/es/table/interface'
import { CompressOutlined, EyeOutlined, GlobalOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons'
import { useKindsRaw, useK8sSmartResource } from '@prorobotech/openapi-k8s-toolkit'
import type { TNavigationResource } from '@prorobotech/openapi-k8s-toolkit'
import { useSearchParams } from 'react-router-dom'
import { FOOTER_HEIGHT } from 'constants/blocksSizes'
import type {
  TRbacNode,
  TRbacQueryPayload,
  TRbacQueryResponse,
  TRbacReverseQueryPayload,
  TRbacGraph as TGraph,
  TRbacGraphProps,
  TNonResourceUrlItem,
  TNonResourceUrlList,
} from 'localTypes/rbacGraph'
import { useRbacGraphQuery } from 'hooks/useRbacGraphQuery'
import { useRbacReverseGraphQuery } from 'hooks/useRbacReverseGraphQuery'
import { useRbacRoleDetailsQuery } from 'hooks/useRbacRoleDetailsQuery'
import { useRbacSubjectPermissionsQuery } from 'hooks/useRbacSubjectPermissionsQuery'
import { RbacAssessmentBar } from 'components/organisms/RbacAssessment'
import { RbacModalTitleLabel } from 'components/organisms/RbacGraph/atoms'
import { RbacQueryForm, RbacRoleDetailsModalContent } from 'components/organisms/RbacGraph/molecules'
import { DEFAULT_REVERSE_PAYLOAD, ROLE_NODE_TYPES, SUBJECT_NODE_TYPES } from 'components/organisms/RbacGraph/constants'
import { hasWildcard, toSortedOptions } from 'components/organisms/RbacGraph/utils'
import { getNavigationBaseFactoriesMapping, getRbacResourceHref, RBAC_NAVIGATION_QUERY } from 'utils/rbacResourceLink'
import { buildRoleTableRows, type TRoleTableRow, type TTableScope } from './utils/buildRoleTableRows'
import {
  areRbacTableSearchStatesEqual,
  createDefaultRbacTableSearchState,
  hasAnyRbacTableSearchState,
  normalizeRbacTableSearchState,
  parseRbacTableSearchParams,
  serializeRbacTableSearchParams,
  type TRbacTableSearchState,
  type TRbacTableSelectorSelection,
} from './utils/searchParams'
import { getQueryErrorMessage } from './utils/getQueryErrorMessage'
import {
  getAccountBindingsSearchText,
  getRoleSearchText,
  getScopeTagStyle,
  getRoleDetailsToken,
} from './utils/gettersAndFormatters'
import { renderRoleLabel, renderAccountBindings, renderAggregationSources } from './utils/renders'
import { Styled } from './styled'

type TSelectorSelection = TRbacTableSelectorSelection
type TRbacTableMode = 'role' | 'subject'
type TRbacTablePayload = TRbacQueryPayload | TRbacReverseQueryPayload
type TRbacTableProps = TRbacGraphProps & {
  mode?: TRbacTableMode
}
type TScopeFilterItem = {
  scope: TTableScope
  label: string
  count: number
  icon: React.ReactNode
}

const MIN_TABLE_HEIGHT = 320
const TABLE_SCROLL_RESERVED_HEIGHT = 56
const BINDING_NODE_TYPES = new Set<TRbacNode['type']>(['RoleBinding', 'ClusterRoleBinding'])

const normalizeReverseGraphForTable = (graph: TGraph): TGraph => {
  const nodeById = new Map(graph.nodes.map(node => [node.id, node] as const))

  return {
    nodes: graph.nodes,
    edges: graph.edges.map(edge => {
      const fromNode = nodeById.get(edge.from)
      const toNode = nodeById.get(edge.to)

      if (
        edge.type === 'subjects' &&
        fromNode &&
        toNode &&
        SUBJECT_NODE_TYPES.has(fromNode.type) &&
        BINDING_NODE_TYPES.has(toNode.type)
      ) {
        return {
          ...edge,
          id: `${edge.id}:table-normalized`,
          from: edge.to,
          to: edge.from,
        }
      }

      if (
        edge.type === 'grants' &&
        fromNode &&
        toNode &&
        BINDING_NODE_TYPES.has(fromNode.type) &&
        ROLE_NODE_TYPES.has(toNode.type)
      ) {
        return {
          ...edge,
          id: `${edge.id}:table-normalized`,
          from: edge.to,
          to: edge.from,
        }
      }

      return edge
    }),
  }
}

const createDefaultReverseTableSearchState = (): TRbacTableSearchState => ({
  ...createDefaultRbacTableSearchState(),
  payload: DEFAULT_REVERSE_PAYLOAD as unknown as TRbacQueryPayload,
})

export const RbacTable: FC<TRbacTableProps> = ({ clusterId, mode = 'role' }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { token } = theme.useToken()
  const isReverseMode = mode === 'subject'

  const containerRef = useRef<HTMLDivElement | null>(null)
  const chromeRef = useRef<HTMLDivElement | null>(null)
  const initialSearchStateRef = useRef<TRbacTableSearchState>()
  const appliedSearchParamsRef = useRef(searchParams.toString())
  const autoSubmitAttemptedRef = useRef(false)

  if (!initialSearchStateRef.current) {
    initialSearchStateRef.current = isReverseMode
      ? createDefaultReverseTableSearchState()
      : normalizeRbacTableSearchState(parseRbacTableSearchParams(searchParams))
  }

  const initialSearchState = initialSearchStateRef.current
  const [payload, setPayload] = useState<TRbacTablePayload>(() => initialSearchState.payload as TRbacTablePayload)
  const [graphData, setGraphData] = useState<TGraph | null>(null)
  const [stats, setStats] = useState<TRbacQueryResponse['stats']>()
  const [queryErrorMessage, setQueryErrorMessage] = useState<string | null>(null)
  const [selectorSelection, setSelectorSelection] = useState<TSelectorSelection>(
    () => initialSearchState.selectorSelection,
  )
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null)
  const [selectedAggregatorRowKey, setSelectedAggregatorRowKey] = useState<string | null>(null)
  const [tableHeight, setTableHeight] = useState(MIN_TABLE_HEIGHT)
  const [scopeFilters, setScopeFilters] = useState<TTableScope[]>(() => initialSearchState.scopeFilters)
  const [roleColumnFilter, setRoleColumnFilter] = useState<string[]>(() => initialSearchState.roleColumnFilter)
  const [accountColumnFilter, setAccountColumnFilter] = useState<string[]>(() => initialSearchState.accountColumnFilter)
  const [collapseSignal, setCollapseSignal] = useState(0)

  const queryMutation = useRbacGraphQuery(clusterId)
  const reverseQueryMutation = useRbacReverseGraphQuery(clusterId)
  const activeQueryMutation = isReverseMode ? reverseQueryMutation : queryMutation

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
    apiGroup: 'rbacgraph.in-cloud.io',
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
  const selectorMetadataSettled = !kindsLoading && !nonResourceUrlsLoading
  const canApplySelectorConstraints =
    kindsData?.kindsWithVersion !== undefined && nonResourceUrlsData?.items !== undefined

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

  const searchNormalizationOptions = useMemo(
    () =>
      canApplySelectorConstraints
        ? {
            collectResourceOptions: selectorRelations.collectResourceOptions,
            collectNonResourceOptions: selectorRelations.collectNonResourceOptions,
          }
        : {},
    [canApplySelectorConstraints, selectorRelations],
  )

  const currentSearchState = useMemo<TRbacTableSearchState>(
    () => ({
      payload: payload as TRbacQueryPayload,
      selectorSelection,
      scopeFilters,
      roleColumnFilter,
      accountColumnFilter,
    }),
    [accountColumnFilter, payload, roleColumnFilter, scopeFilters, selectorSelection],
  )

  const normalizedSearchState = useMemo(
    () => normalizeRbacTableSearchState(currentSearchState, searchNormalizationOptions),
    [currentSearchState, searchNormalizationOptions],
  )

  const canonicalSearchParams = useMemo(
    () => serializeRbacTableSearchParams(normalizedSearchState, searchNormalizationOptions).toString(),
    [normalizedSearchState, searchNormalizationOptions],
  )

  const applySearchState = useCallback((nextState: TRbacTableSearchState) => {
    setPayload(nextState.payload)
    setSelectorSelection(nextState.selectorSelection)
    setScopeFilters(nextState.scopeFilters)
    setRoleColumnFilter(nextState.roleColumnFilter)
    setAccountColumnFilter(nextState.accountColumnFilter)
  }, [])

  const handleSelectorChange = useCallback(
    (sel: TSelectorSelection, changedKey?: keyof TSelectorSelection) => {
      if (isReverseMode) {
        const normalizedState = normalizeRbacTableSearchState(
          {
            ...currentSearchState,
            selectorSelection: sel,
          },
          {
            ...searchNormalizationOptions,
            changedKey,
          },
        )

        setSelectorSelection(normalizedState.selectorSelection)
        setPayload(
          prev =>
            ({
              spec: {
                ...prev.spec,
                selector: normalizedState.selectorSelection,
              },
            }) as TRbacTablePayload,
        )
        return
      }

      applySearchState(
        normalizeRbacTableSearchState(
          {
            ...currentSearchState,
            selectorSelection: sel,
            payload: {
              spec: {
                ...payload.spec,
                selector: sel,
              },
            } as TRbacQueryPayload,
          },
          {
            ...searchNormalizationOptions,
            changedKey,
          },
        ),
      )
    },
    [applySearchState, currentSearchState, isReverseMode, payload.spec, searchNormalizationOptions],
  )

  useEffect(() => {
    if (isReverseMode || !canApplySelectorConstraints) return

    if (!areRbacTableSearchStatesEqual(currentSearchState, normalizedSearchState)) {
      applySearchState(normalizedSearchState)
    }
  }, [applySearchState, canApplySelectorConstraints, currentSearchState, isReverseMode, normalizedSearchState])

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

  const selectedAggregatorRow = useMemo(
    () => filteredRows.find(row => row.key === selectedAggregatorRowKey) ?? null,
    [filteredRows, selectedAggregatorRowKey],
  )

  const nodeById = useMemo(() => new Map(graphData?.nodes.map(node => [node.id, node] as const) ?? []), [graphData])

  const selectedNode = useMemo(() => {
    if (!selectedRow) return null
    return nodeById.get(selectedRow.roleNodeId) ?? null
  }, [nodeById, selectedRow])

  const selectedNodeHref = useMemo(() => {
    if (!selectedNode) return undefined

    return getRbacResourceHref({
      clusterId,
      node: {
        type: selectedNode.type,
        name: selectedNode.name,
        namespace: selectedNode.type === 'Role' ? selectedNode.namespace : undefined,
      },
      baseFactoriesMapping,
    })
  }, [baseFactoriesMapping, clusterId, selectedNode])

  const reverseSubjectTitleNode = useMemo<Pick<TRbacNode, 'type' | 'name' | 'namespace'> | null>(() => {
    if (!isReverseMode) return null

    // eslint-disable-next-line prefer-destructuring
    const subject = (payload as TRbacReverseQueryPayload).spec.subject
    if (!subject.kind) return null

    return {
      type: subject.kind,
      name: subject.name.trim() || '*',
      namespace: subject.namespace?.trim() || undefined,
    }
  }, [isReverseMode, payload])

  const primaryRoleNode = useMemo<Pick<TRbacNode, 'type' | 'name' | 'namespace'> | null>(() => {
    if (isReverseMode || !selectedNode || !ROLE_NODE_TYPES.has(selectedNode.type)) return null
    return selectedNode
  }, [isReverseMode, selectedNode])

  const primaryRoleDetailsQuery = useRbacRoleDetailsQuery({
    clusterId,
    node: primaryRoleNode,
    selector: payload.spec.selector,
    matchMode: payload.spec.matchMode,
    wildcardMode: payload.spec.wildcardMode,
    filterPhantomAPIs: payload.spec.filterPhantomAPIs,
  })
  const subjectPermissionsQuery = useRbacSubjectPermissionsQuery({
    clusterId,
    payload: isReverseMode ? (payload as TRbacReverseQueryPayload) : null,
    enabled: isReverseMode && Boolean(selectedRow),
  })

  const renderAccountsFilterDropdown = useCallback(
    ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={event => event.stopPropagation()}>
        <Input
          placeholder="search accounts"
          value={selectedKeys[0]}
          onChange={event => {
            const nextValue = event.target.value
            const nextKeys = nextValue ? [nextValue] : []

            setSelectedKeys(nextKeys)
            setAccountColumnFilter(nextKeys as string[])
            confirm({ closeDropdown: false })
          }}
          onPressEnter={() => confirm({ closeDropdown: true })}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            size="small"
            style={{ width: 90 }}
            onClick={() => {
              clearFilters?.()
              setAccountColumnFilter([])
              confirm({ closeDropdown: false })
            }}
          >
            Reset
          </Button>
          <Button type="link" size="small" onClick={() => close()}>
            close
          </Button>
        </Space>
      </div>
    ),
    [],
  )

  const renderAccountsFilterIcon = useCallback(
    (filtered: boolean) => <SearchOutlined style={{ color: filtered ? token.colorPrimary : undefined }} />,
    [token.colorPrimary],
  )

  const renderRoleFilterDropdown = useCallback(
    ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={event => event.stopPropagation()}>
        <Input
          placeholder="search roles"
          value={selectedKeys[0]}
          onChange={event => {
            const nextValue = event.target.value
            const nextKeys = nextValue ? [nextValue] : []

            setSelectedKeys(nextKeys)
            setRoleColumnFilter(nextKeys as string[])
            confirm({ closeDropdown: false })
          }}
          onPressEnter={() => confirm({ closeDropdown: true })}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            size="small"
            style={{ width: 90 }}
            onClick={() => {
              clearFilters?.()
              setRoleColumnFilter([])
              confirm({ closeDropdown: false })
            }}
          >
            Reset
          </Button>
          <Button type="link" size="small" onClick={() => close()}>
            close
          </Button>
        </Space>
      </div>
    ),
    [],
  )

  const renderRoleFilterIcon = useCallback(
    (filtered: boolean) => <SearchOutlined style={{ color: filtered ? token.colorPrimary : undefined }} />,
    [token.colorPrimary],
  )

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
        filteredValue: roleColumnFilter,
        filterDropdown: renderRoleFilterDropdown,
        filterIcon: renderRoleFilterIcon,
        onFilter: (value, record) => getRoleSearchText(record).includes(String(value).toLowerCase()),
        sorter: (left, right) =>
          left.roleKind.localeCompare(right.roleKind) || left.roleName.localeCompare(right.roleName),
        render: (_, row) =>
          renderRoleLabel({
            row,
            clusterId,
            baseFactoriesMapping,
          }),
      },
      {
        title: 'Aggregated',
        dataIndex: 'aggregated',
        key: 'aggregated',
        width: 120,
        sorter: (left, right) => Number(left.aggregated) - Number(right.aggregated),
        render: (_, row) => {
          if (!row.aggregated) {
            return <Typography.Text type="secondary">no</Typography.Text>
          }

          const tag = <Tag color="green">yes</Tag>
          if (row.aggregationSourcesCount === 0) {
            return tag
          }

          return (
            <Typography.Link
              onClick={event => {
                event.preventDefault()
                event.stopPropagation()
                setSelectedAggregatorRowKey(row.key)
              }}
            >
              {tag}
            </Typography.Link>
          )
        },
      },
      {
        title: 'Assessment',
        dataIndex: 'assessment',
        key: 'assessment',
        width: 200,
        sorter: (left, right) => (left.assessment?.totalCount ?? 0) - (right.assessment?.totalCount ?? 0),
        render: (_, row) => <RbacAssessmentBar assessment={row.assessment} size="compact" />,
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
        filteredValue: accountColumnFilter,
        filterDropdown: renderAccountsFilterDropdown,
        filterIcon: renderAccountsFilterIcon,
        onFilter: (value, record) =>
          getAccountBindingsSearchText(record.accountBindings).includes(String(value).toLowerCase()),
        render: (_, row) =>
          renderAccountBindings({
            accountBindings: row.accountBindings,
            clusterId,
            baseFactoriesMapping,
            token,
          }),
      },
    ],
    [
      accountColumnFilter,
      baseFactoriesMapping,
      clusterId,
      renderRoleFilterDropdown,
      renderRoleFilterIcon,
      renderAccountsFilterDropdown,
      renderAccountsFilterIcon,
      roleColumnFilter,
      token,
    ],
  )

  const submitQuery = useCallback(
    (nextPayload: TRbacTablePayload) => {
      setCollapseSignal(prev => prev + 1)
      setQueryErrorMessage(null)
      const onSuccess = (data: TRbacQueryResponse) => {
        setQueryErrorMessage(null)
        setGraphData(isReverseMode ? normalizeReverseGraphForTable(data.graph) : data.graph)
        setStats(data.stats)
        setSelectedRowKey(null)
        setSelectedAggregatorRowKey(null)
      }
      const onError = (error: unknown) => {
        setGraphData(null)
        setStats(undefined)
        setSelectedRowKey(null)
        setSelectedAggregatorRowKey(null)
        setQueryErrorMessage(getQueryErrorMessage(error))
      }

      if (isReverseMode) {
        reverseQueryMutation.mutate(nextPayload as TRbacReverseQueryPayload, {
          onSuccess,
          onError,
        })
        return
      }

      queryMutation.mutate(nextPayload as TRbacQueryPayload, {
        onSuccess,
        onError,
      })
    },
    [isReverseMode, queryMutation, reverseQueryMutation],
  )

  const handleSubmit = useCallback(() => {
    submitQuery(payload)
  }, [payload, submitQuery])

  const handleReset = useCallback(() => {
    applySearchState(isReverseMode ? createDefaultReverseTableSearchState() : createDefaultRbacTableSearchState())
    setGraphData(null)
    setStats(undefined)
    setQueryErrorMessage(null)
    setSelectedRowKey(null)
    setSelectedAggregatorRowKey(null)
  }, [applySearchState, isReverseMode])

  const nonResourceUrlsErrorMessage =
    typeof nonResourceUrlsError === 'string' ? nonResourceUrlsError : nonResourceUrlsError?.message
  const roleDetailsToken = useMemo(() => getRoleDetailsToken(token), [token])
  const tableScrollY = useMemo(() => Math.max(240, tableHeight - TABLE_SCROLL_RESERVED_HEIGHT), [tableHeight])

  useEffect(() => {
    if (isReverseMode || canonicalSearchParams === appliedSearchParamsRef.current) return

    appliedSearchParamsRef.current = canonicalSearchParams
    setSearchParams(canonicalSearchParams ? new URLSearchParams(canonicalSearchParams) : new URLSearchParams(), {
      replace: true,
    })
  }, [canonicalSearchParams, isReverseMode, setSearchParams])

  useEffect(() => {
    if (autoSubmitAttemptedRef.current || !selectorMetadataSettled) return

    autoSubmitAttemptedRef.current = true

    if (!isReverseMode && hasAnyRbacTableSearchState(normalizedSearchState, searchNormalizationOptions)) {
      submitQuery(normalizedSearchState.payload)
    }
  }, [isReverseMode, normalizedSearchState, searchNormalizationOptions, selectorMetadataSettled, submitQuery])

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
  }, [graphData, stats, kindsError, nonResourceUrlsError, queryErrorMessage, activeQueryMutation.isPending])

  const content = (() => {
    if (activeQueryMutation.isPending) {
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

  const detailsModalContent = (() => {
    if (isReverseMode) {
      if (subjectPermissionsQuery.isLoading) {
        return (
          <Styled.SpinContainer>
            <Spin tip="Loading subject permissions..." />
          </Styled.SpinContainer>
        )
      }
      if (subjectPermissionsQuery.isError) {
        return (
          <Alert
            type="error"
            message="Error while loading subject permissions"
            description={getQueryErrorMessage(subjectPermissionsQuery.error)}
          />
        )
      }
      if (subjectPermissionsQuery.data) {
        return (
          <RbacRoleDetailsModalContent
            data={subjectPermissionsQuery.data}
            kindsWithVersion={kindsData?.kindsWithVersion ?? []}
            token={roleDetailsToken}
          />
        )
      }

      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No subject permissions were returned." />
    }

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
      return (
        <RbacRoleDetailsModalContent
          data={primaryRoleDetailsQuery.data}
          kindsWithVersion={kindsData?.kindsWithVersion ?? []}
          token={roleDetailsToken}
        />
      )
    }

    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No role details were returned." />
  })()

  const aggregatorModalContent = (() => {
    if (!selectedAggregatorRow) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No row is selected." />
    }

    if (selectedAggregatorRow.aggregationSources.length === 0) {
      return (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No aggregation sources were found for this role." />
      )
    }

    return (
      <div>
        <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Role">{`${selectedAggregatorRow.roleKind}: ${selectedAggregatorRow.roleName}`}</Descriptions.Item>
          <Descriptions.Item label="Namespace">{selectedAggregatorRow.namespace}</Descriptions.Item>
          <Descriptions.Item label="Aggregators">{selectedAggregatorRow.aggregationSourcesCount}</Descriptions.Item>
          <Descriptions.Item label="Aggregated">
            <Tag color="green">yes</Tag>
          </Descriptions.Item>
        </Descriptions>

        {renderAggregationSources({
          sources: selectedAggregatorRow.aggregationSources,
          clusterId,
          baseFactoriesMapping,
          stacked: true,
        })}
      </div>
    )
  })()

  return (
    <Styled.Container ref={containerRef}>
      <Styled.Chrome ref={chromeRef}>
        <Card size="small" styles={{ body: { padding: 0 } }}>
          <RbacQueryForm
            value={payload}
            queryMode={mode}
            selectorLoading={kindsLoading || nonResourceUrlsLoading}
            selectorOptions={selectorOptions}
            showRuntimeLimits={false}
            collapseSignal={collapseSignal}
            onSelectorChange={(patch, changedKey) =>
              handleSelectorChange({ ...selectorSelection, ...patch }, changedKey)
            }
            onChange={setPayload}
            onSubmit={handleSubmit}
            onReset={handleReset}
            loading={activeQueryMutation.isPending}
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
        title={
          // eslint-disable-next-line no-nested-ternary
          reverseSubjectTitleNode ? (
            <RbacModalTitleLabel
              badgeId={`rbac-table-modal-title-${reverseSubjectTitleNode.type}-${
                reverseSubjectTitleNode.namespace ?? ''
              }-${reverseSubjectTitleNode.name}`}
              node={reverseSubjectTitleNode}
            />
          ) : selectedNode ? (
            <RbacModalTitleLabel
              badgeId={`rbac-table-modal-title-${selectedNode.id}`}
              node={selectedNode}
              href={selectedNodeHref}
            />
          ) : (
            'RBAC role details'
          )
        }
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
              <Descriptions.Item label="Assessment" span={2}>
                <RbacAssessmentBar assessment={selectedRow.assessment} size="compact" />
              </Descriptions.Item>
              <Descriptions.Item label="Matched Rules">{selectedRow.matchedRuleCount}</Descriptions.Item>
              <Descriptions.Item label="Aggregated">
                {selectedRow.aggregated ? (
                  <Tag color="green">yes</Tag>
                ) : (
                  <Typography.Text type="secondary">no</Typography.Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Account List" span={2}>
                {renderAccountBindings({
                  accountBindings: selectedRow.accountBindings,
                  clusterId,
                  baseFactoriesMapping,
                  token,
                })}
              </Descriptions.Item>
            </Descriptions>

            {(isReverseMode || primaryRoleNode) && <div>{detailsModalContent}</div>}
          </>
        )}
      </Modal>
      <Modal
        open={Boolean(selectedAggregatorRow)}
        onCancel={() => setSelectedAggregatorRowKey(null)}
        footer={null}
        width={900}
        centered
        destroyOnHidden
        title={selectedAggregatorRow ? `Aggregators: ${selectedAggregatorRow.roleName}` : 'RBAC aggregators'}
      >
        {aggregatorModalContent}
      </Modal>
    </Styled.Container>
  )
}
