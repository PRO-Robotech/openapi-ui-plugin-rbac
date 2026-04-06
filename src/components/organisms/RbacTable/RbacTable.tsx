/* eslint-disable max-lines-per-function */
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnsType } from 'antd/es/table'
import { useKindsRaw, useK8sSmartResource } from '@prorobotech/openapi-k8s-toolkit'
import { Alert, Card, Descriptions, Empty, Modal, Spin, Table, Tag, Typography, theme } from 'antd'
import axios from 'axios'
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
import { RbacQueryForm, RbacRoleDetailsModalContent } from 'components/organisms/RbacGraph/molecules'
import { DEFAULT_PAYLOAD, EMPTY_SELECTOR_SELECTION, ROLE_NODE_TYPES } from 'components/organisms/RbacGraph/constants'
import { hasWildcard, toSortedOptions } from 'components/organisms/RbacGraph/utils'
import { Styled } from './styled'

type TSelectorSelection = typeof EMPTY_SELECTOR_SELECTION

type TTableRow = {
  key: string
  nodeId: string
  connectedNodeId: string | null
  type: string
  name: string
  namespace: string
  aggregated: boolean
  matchedRuleCount: number
  incomingCount: number
  outgoingCount: number
  connectionDirection: 'incoming' | 'outgoing' | 'none'
  relationType: string
  connectedNodeType: string
  connectedNodeName: string
  connectedNodeNamespace: string
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

const buildTableRows = (graph: TGraph | null): TTableRow[] => {
  if (!graph) return []

  const nodeById = new Map(graph.nodes.map(node => [node.id, node] as const))
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  const rows: TTableRow[] = []

  graph.edges.forEach(edge => {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1)
    outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1)
  })

  const sortedNodes = [...graph.nodes].sort((left, right) => {
    const typeCompare = left.type.localeCompare(right.type)
    if (typeCompare !== 0) return typeCompare

    const namespaceCompare = (left.namespace ?? '').localeCompare(right.namespace ?? '')
    if (namespaceCompare !== 0) return namespaceCompare

    return left.name.localeCompare(right.name)
  })

  sortedNodes.forEach(node => {
    const baseRow = {
      type: node.type,
      name: node.name,
      namespace: node.namespace ?? 'cluster-wide',
      aggregated: Boolean(node.aggregated),
      matchedRuleCount: node.matchedRuleRefs?.length ?? 0,
      incomingCount: incoming.get(node.id) ?? 0,
      outgoingCount: outgoing.get(node.id) ?? 0,
    }

    const connectedEdges = graph.edges
      .filter(edge => edge.from === node.id || edge.to === node.id)
      .sort((left, right) => left.type.localeCompare(right.type) || left.id.localeCompare(right.id))

    if (connectedEdges.length === 0) {
      rows.push({
        key: `${node.id}::none`,
        nodeId: node.id,
        connectedNodeId: null,
        ...baseRow,
        connectionDirection: 'none',
        relationType: '-',
        connectedNodeType: '-',
        connectedNodeName: '-',
        connectedNodeNamespace: '-',
      })
      return
    }

    connectedEdges.forEach(edge => {
      const isOutgoing = edge.from === node.id
      const connectedNode = nodeById.get(isOutgoing ? edge.to : edge.from)

      rows.push({
        key: `${node.id}::${edge.id}::${isOutgoing ? 'out' : 'in'}`,
        nodeId: node.id,
        connectedNodeId: connectedNode?.id ?? null,
        ...baseRow,
        connectionDirection: isOutgoing ? 'outgoing' : 'incoming',
        relationType: edge.type,
        connectedNodeType: connectedNode?.type ?? '-',
        connectedNodeName: connectedNode?.name ?? '-',
        connectedNodeNamespace: connectedNode?.namespace ?? 'cluster-wide',
      })
    })
  })

  return rows
}

const renderAggregated = (value: boolean) =>
  value ? <Tag color="orange">yes</Tag> : <Typography.Text type="secondary">no</Typography.Text>

const renderDirection = (value: TTableRow['connectionDirection']) => {
  if (value === 'outgoing') return <Tag color="blue">outgoing</Tag>
  if (value === 'incoming') return <Tag color="cyan">incoming</Tag>

  return <Typography.Text type="secondary">none</Typography.Text>
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
  const { token } = theme.useToken()
  const [payload, setPayload] = useState<TRbacQueryPayload>(DEFAULT_PAYLOAD)
  const [graphData, setGraphData] = useState<TGraph | null>(null)
  const [stats, setStats] = useState<TRbacQueryResponse['stats']>()
  const [queryErrorMessage, setQueryErrorMessage] = useState<string | null>(null)
  const [selectorSelection, setSelectorSelection] = useState<TSelectorSelection>(EMPTY_SELECTOR_SELECTION)
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null)

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

  const rows = useMemo(() => buildTableRows(graphData), [graphData])
  const selectedRow = useMemo(() => rows.find(row => row.key === selectedRowKey) ?? null, [rows, selectedRowKey])
  const nodeById = useMemo(() => new Map(graphData?.nodes.map(node => [node.id, node] as const) ?? []), [graphData])
  const selectedNode = useMemo(() => {
    if (!selectedRow) return null
    return nodeById.get(selectedRow.nodeId) ?? null
  }, [nodeById, selectedRow])
  const selectedConnectedNode = useMemo(() => {
    if (!selectedRow?.connectedNodeId) return null
    return nodeById.get(selectedRow.connectedNodeId) ?? null
  }, [nodeById, selectedRow])

  const primaryRoleNode = useMemo<Pick<TRbacNode, 'type' | 'name' | 'namespace'> | null>(() => {
    if (!selectedNode || !ROLE_NODE_TYPES.has(selectedNode.type)) return null
    return selectedNode
  }, [selectedNode])
  const secondaryRoleNode = useMemo<Pick<TRbacNode, 'type' | 'name' | 'namespace'> | null>(() => {
    if (!selectedConnectedNode || !ROLE_NODE_TYPES.has(selectedConnectedNode.type)) return null
    if (
      primaryRoleNode &&
      primaryRoleNode.type === selectedConnectedNode.type &&
      primaryRoleNode.name === selectedConnectedNode.name &&
      primaryRoleNode.namespace === selectedConnectedNode.namespace
    ) {
      return null
    }

    return selectedConnectedNode
  }, [primaryRoleNode, selectedConnectedNode])

  const primaryRoleDetailsQuery = useRbacRoleDetailsQuery({
    clusterId,
    node: primaryRoleNode,
    selector: payload.spec.selector,
    matchMode: payload.spec.matchMode,
    wildcardMode: payload.spec.wildcardMode,
    filterPhantomAPIs: payload.spec.filterPhantomAPIs,
  })

  const secondaryRoleDetailsQuery = useRbacRoleDetailsQuery({
    clusterId,
    node: secondaryRoleNode,
    selector: payload.spec.selector,
    matchMode: payload.spec.matchMode,
    wildcardMode: payload.spec.wildcardMode,
    filterPhantomAPIs: payload.spec.filterPhantomAPIs,
  })

  const columns = useMemo<ColumnsType<TTableRow>>(
    () => [
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        width: 170,
        sorter: (left, right) => left.type.localeCompare(right.type),
        render: value => <Tag>{value}</Tag>,
      },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 260,
        sorter: (left, right) => left.name.localeCompare(right.name),
      },
      {
        title: 'Namespace',
        dataIndex: 'namespace',
        key: 'namespace',
        width: 180,
        sorter: (left, right) => left.namespace.localeCompare(right.namespace),
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
        title: 'Incoming',
        dataIndex: 'incomingCount',
        key: 'incomingCount',
        width: 120,
        sorter: (left, right) => left.incomingCount - right.incomingCount,
      },
      {
        title: 'Outgoing',
        dataIndex: 'outgoingCount',
        key: 'outgoingCount',
        width: 120,
        sorter: (left, right) => left.outgoingCount - right.outgoingCount,
      },
      {
        title: 'Direction',
        dataIndex: 'connectionDirection',
        key: 'connectionDirection',
        width: 130,
        sorter: (left, right) => left.connectionDirection.localeCompare(right.connectionDirection),
        render: renderDirection,
      },
      {
        title: 'Relation',
        dataIndex: 'relationType',
        key: 'relationType',
        width: 170,
        sorter: (left, right) => left.relationType.localeCompare(right.relationType),
        render: value => <Tag>{value}</Tag>,
      },
      {
        title: 'Connected Type',
        dataIndex: 'connectedNodeType',
        key: 'connectedNodeType',
        width: 170,
        sorter: (left, right) => left.connectedNodeType.localeCompare(right.connectedNodeType),
      },
      {
        title: 'Connected Name',
        dataIndex: 'connectedNodeName',
        key: 'connectedNodeName',
        width: 260,
        sorter: (left, right) => left.connectedNodeName.localeCompare(right.connectedNodeName),
      },
      {
        title: 'Connected Namespace',
        dataIndex: 'connectedNodeNamespace',
        key: 'connectedNodeNamespace',
        width: 180,
        sorter: (left, right) => left.connectedNodeNamespace.localeCompare(right.connectedNodeNamespace),
      },
    ],
    [],
  )

  const handleSubmit = useCallback(() => {
    setQueryErrorMessage(null)
    queryMutation.mutate(payload, {
      onSuccess: (data: TRbacQueryResponse) => {
        setQueryErrorMessage(null)
        setGraphData(data.graph)
        setStats(data.stats)
        setSelectedRowKey(null)
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
  }, [])

  const nonResourceUrlsErrorMessage =
    typeof nonResourceUrlsError === 'string' ? nonResourceUrlsError : nonResourceUrlsError?.message
  const roleDetailsToken = useMemo(() => getRoleDetailsToken(token), [token])

  const content = (() => {
    if (queryMutation.isPending) {
      return (
        <Styled.SpinContainer>
          <Spin tip="Loading table data..." />
        </Styled.SpinContainer>
      )
    }

    if (!graphData) {
      return (
        <Styled.EmptyState>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Configure selectors and run a query to view RBAC results as a table."
          />
        </Styled.EmptyState>
      )
    }

    return (
      <Styled.TableContainer
        $colorBgContainer={token.colorBgContainer}
        $colorBorder={token.colorBorder}
        $borderRadius={token.borderRadius}
      >
        <Table<TTableRow>
          rowKey="key"
          dataSource={rows}
          columns={columns}
          size="small"
          pagination={false}
          scroll={{ x: 1200, y: 640 }}
          onRow={record => ({
            onClick: () => setSelectedRowKey(record.key),
          })}
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

  const secondaryRoleContent = (() => {
    if (!secondaryRoleNode) return null
    if (secondaryRoleDetailsQuery.isLoading) {
      return (
        <Styled.SpinContainer>
          <Spin tip="Loading related role details..." />
        </Styled.SpinContainer>
      )
    }
    if (secondaryRoleDetailsQuery.isError) {
      return (
        <Alert
          type="error"
          message="Error while loading related role details"
          description={getQueryErrorMessage(secondaryRoleDetailsQuery.error)}
        />
      )
    }
    if (secondaryRoleDetailsQuery.data) {
      return <RbacRoleDetailsModalContent data={secondaryRoleDetailsQuery.data} token={roleDetailsToken} />
    }

    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No related role details were returned." />
  })()

  return (
    <Styled.Container>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <RbacQueryForm
          value={payload}
          selectorLoading={kindsLoading || nonResourceUrlsLoading}
          selectorOptions={selectorOptions}
          onSelectorChange={(patch, changedKey) => handleSelectorChange({ ...selectorSelection, ...patch }, changedKey)}
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
        <Alert type="error" message="Error while loading non-resource URLs" description={nonResourceUrlsErrorMessage} />
      )}

      {queryErrorMessage && <Alert type="error" message="Error while running query" description={queryErrorMessage} />}

      {stats && (
        <Styled.StatsBar>
          <span>Roles: {stats.matchedRoles}</span>
          <span>Bindings: {stats.matchedBindings}</span>
          <span>Subjects: {stats.matchedSubjects}</span>
          <span>Rows: {rows.length}</span>
        </Styled.StatsBar>
      )}

      {content}
      <Modal
        open={Boolean(selectedRow)}
        onCancel={() => setSelectedRowKey(null)}
        footer={null}
        width={1400}
        centered
        destroyOnHidden
        title={selectedRow ? `${selectedRow.type}: ${selectedRow.name}` : 'RBAC relation details'}
      >
        {!selectedRow || !selectedNode ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No row is selected." />
        ) : (
          <>
            <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Node">{`${selectedRow.type}: ${selectedRow.name}`}</Descriptions.Item>
              <Descriptions.Item label="Namespace">{selectedRow.namespace}</Descriptions.Item>
              <Descriptions.Item label="Direction">{selectedRow.connectionDirection}</Descriptions.Item>
              <Descriptions.Item label="Relation">{selectedRow.relationType}</Descriptions.Item>
              <Descriptions.Item label="Connected Node">
                {selectedConnectedNode ? `${selectedRow.connectedNodeType}: ${selectedRow.connectedNodeName}` : 'None'}
              </Descriptions.Item>
              <Descriptions.Item label="Connected Namespace">{selectedRow.connectedNodeNamespace}</Descriptions.Item>
              <Descriptions.Item label="Matched Rules">{selectedRow.matchedRuleCount}</Descriptions.Item>
              <Descriptions.Item label="Edges">{`${selectedRow.incomingCount} in / ${selectedRow.outgoingCount} out`}</Descriptions.Item>
            </Descriptions>

            {primaryRoleNode && (
              <div style={{ marginBottom: 24 }}>
                <Typography.Title level={5}>{`${primaryRoleNode.type}: ${primaryRoleNode.name}`}</Typography.Title>
                {primaryRoleContent}
              </div>
            )}

            {secondaryRoleNode && (
              <div>
                <Typography.Title level={5}>{`${secondaryRoleNode.type}: ${secondaryRoleNode.name}`}</Typography.Title>
                {secondaryRoleContent}
              </div>
            )}
          </>
        )}
      </Modal>
    </Styled.Container>
  )
}
