/* eslint-disable no-nested-ternary */
/* eslint-disable max-lines-per-function */
import React, { FC, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  useReactFlow,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useKinds, useK8sSmartResource } from '@prorobotech/openapi-k8s-toolkit'
import { Alert, Button, Card, Checkbox, Collapse, Empty, Modal, Spin, Tag, Typography, theme } from 'antd'
import axios from 'axios'
import { FOOTER_HEIGHT } from 'constants/blocksSizes'
import type {
  TRbacQueryPayload,
  TRbacQueryResponse,
  TRbacGraphOptions,
  TRbacGraph as TGraph,
  TRbacNode,
  TRbacGraphProps,
  TNonResourceUrlItem,
  TNonResourceUrlList,
  TFlowModel,
  TParsedPermission,
} from 'localTypes/rbacGraph'
import { useRbacGraphQuery } from 'hooks/useRbacGraphQuery'
import { layoutRbacGraph } from 'utils/rbacForceLayout'
import { layoutRbacGraphStar } from 'utils/rbacStarLayout'
import {
  buildRbacFlowModel,
  applyFocusToModel,
  applyStarSelectionToModel,
  filterGraphByOptions,
} from 'utils/rbacFlowAdapter'
import { NamespaceGroupNode, RbacEdge, RbacNodeCard, RbacResourceLabel } from './atoms'
import { RbacQueryForm, RbacGraphToggles } from './molecules'
import {
  resolveResourceDisplayValue,
  shouldShowResolvedResourceBadge,
  hasWildcard,
  toSortedOptions,
  sortValues,
  formatJoinedValues,
  formatRuleTarget,
  formatRuleVerb,
  formatApiGroups,
  collectRoleDetails,
  hasWildcardValue,
  hasConcreteResourceValues,
  decorateFlowModelWithResourceLabels,
} from './utils'
import { LEGEND, DEFAULT_PAYLOAD, DEFAULT_OPTIONS, EMPTY_SELECTOR_SELECTION, ROLE_NODE_TYPES } from './constants'
import { Styled } from './styled'

export const nodeTypes: NodeTypes = { rbacCard: RbacNodeCard, namespaceGroup: NamespaceGroupNode }
export const edgeTypes: EdgeTypes = { rbacEdge: RbacEdge }

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

const RbacGraphInner: FC<TRbacGraphProps> = ({ clusterId }) => {
  const { token } = theme.useToken()
  const { fitView } = useReactFlow()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chromeRef = useRef<HTMLDivElement | null>(null)
  const [payload, setPayload] = useState<TRbacQueryPayload>(DEFAULT_PAYLOAD)
  const [options, setOptions] = useState<TRbacGraphOptions>(DEFAULT_OPTIONS)
  const shouldFitViewAfterLayoutRef = useRef(false)
  const shouldFitViewAfterStarSwitchRef = useRef(false)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [starSelectedNodeId, setStarSelectedNodeId] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<TGraph | null>(null)
  const [stats, setStats] = useState<TRbacQueryResponse['stats']>()
  const [layouting, setLayouting] = useState(false)
  const [canvasHeight, setCanvasHeight] = useState(320)
  const [baseModel, setBaseModel] = useState<TFlowModel | null>(null)
  const [detailsNodeId, setDetailsNodeId] = useState<string | null>(null)
  const [selectedRuleKeys, setSelectedRuleKeys] = useState<string[]>([])
  const [queryErrorMessage, setQueryErrorMessage] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const roleDetails = useMemo(() => collectRoleDetails(graphData, detailsNodeId), [detailsNodeId, graphData])
  const selectedRuleKeySet = useMemo(() => new Set(selectedRuleKeys), [selectedRuleKeys])
  const filteredPermissions = useMemo(() => {
    if (!roleDetails) return []
    if (selectedRuleKeySet.size === 0) return []

    return roleDetails.permissions.filter(
      permission =>
        permission.ruleKeys.length === 0 || permission.ruleKeys.some(ruleKey => selectedRuleKeySet.has(ruleKey)),
    )
  }, [roleDetails, selectedRuleKeySet])
  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, TParsedPermission[]>()

    filteredPermissions.forEach(permission => {
      const bucket = groups.get(permission.target) ?? []
      bucket.push(permission)
      groups.set(permission.target, bucket)
    })

    return Array.from(groups.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([target, permissions]) => ({
        target,
        permissions: permissions.sort((left, right) => left.verb.localeCompare(right.verb)),
      }))
  }, [filteredPermissions])

  const queryMutation = useRbacGraphQuery()

  const {
    data: kindsData,
    isLoading: kindsLoading,
    error: kindsError,
  } = useKinds({
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

  const kindsWithVersion = useMemo(() => kindsData?.kindsWithVersion ?? [], [kindsData?.kindsWithVersion])

  const renderResolvedResourceLabel = useCallback(
    (
      value: string,
      options?: {
        apiGroups?: string[]
        badgeId?: string
        textClassName?: string
      },
    ) => {
      const displayValue = resolveResourceDisplayValue({
        apiGroups: options?.apiGroups,
        kindsWithVersion,
        value,
      })

      return (
        <RbacResourceLabel
          badgeId={options?.badgeId ?? `rbac-resource-${displayValue}`}
          value={displayValue}
          showBadge={shouldShowResolvedResourceBadge(value)}
          textClassName={options?.textClassName}
        />
      )
    },
    [kindsWithVersion],
  )

  const [selectorSelection, setSelectorSelection] = useState(EMPTY_SELECTOR_SELECTION)
  const hasResourceFilters = Boolean(
    selectorSelection.apiGroups.length ||
      selectorSelection.resources.length ||
      selectorSelection.resourceNames.length,
  )
  const hasNonResourceFilters = Boolean(selectorSelection.nonResourceURLs.length)
  const {
    includePods,
    includeWorkloads,
    onlyReachable,
    starMode,
    reduceEdgeCrossings,
    showAggregateEdges,
    showPermissions,
  } = options
  const viewMode = starMode ? 'star' : reduceEdgeCrossings ? 'default-reduced' : 'default'
  const previousViewModeRef = useRef(viewMode)

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
      selection: {
        apiGroups: string[]
        resources: string[]
        verbs: string[]
      },
    ) =>
      (selection.apiGroups.length === 0 || selection.apiGroups.includes(kind.group)) &&
      (selection.resources.length === 0 || selection.resources.includes(kind.version.resource)) &&
      (selection.verbs.length === 0 || selection.verbs.some(verb => kind.version.verbs?.includes(verb)))

    const matchesNonResourceSelection = (
      item: TNonResourceUrlItem,
      selection: {
        nonResourceURLs: string[]
        verbs: string[]
      },
    ) =>
      (selection.nonResourceURLs.length === 0 || selection.nonResourceURLs.includes(item.url)) &&
      (selection.verbs.length === 0 || selection.verbs.some(verb => item.verbs.includes(verb)))

    const collectResourceOptions = (
      selection: {
        apiGroups: string[]
        resources: string[]
        verbs: string[]
      },
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
      selection: {
        nonResourceURLs: string[]
        verbs: string[]
      },
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
    (sel: typeof selectorSelection, changedKey?: keyof typeof EMPTY_SELECTOR_SELECTION) => {
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

  useEffect(() => {
    if (!roleDetails) {
      setSelectedRuleKeys([])
      return
    }

    setSelectedRuleKeys(roleDetails.rules.map(rule => rule.key))
  }, [roleDetails])

  const clearGraphView = useCallback(() => {
    setFocusNodeId(null)
    setStarSelectedNodeId(null)
    setBaseModel(null)
    setGraphData(null)
    setStats(undefined)
    setDetailsNodeId(null)
    setSelectedRuleKeys([])
    setNodes([])
    setEdges([])
  }, [setEdges, setNodes])

  const handleSubmit = useCallback(() => {
    setQueryErrorMessage(null)
    queryMutation.mutate(payload, {
      onSuccess: (data: TRbacQueryResponse) => {
        setQueryErrorMessage(null)
        setGraphData(data.graph)
        setStats(data.stats)
        setFocusNodeId(null)
        setStarSelectedNodeId(null)
        setDetailsNodeId(null)
      },
      onError: error => {
        clearGraphView()
        setQueryErrorMessage(getQueryErrorMessage(error))
      },
    })
  }, [clearGraphView, payload, queryMutation])

  const handleReset = useCallback(() => {
    setPayload(DEFAULT_PAYLOAD)
    setOptions(DEFAULT_OPTIONS)
    setSelectorSelection(EMPTY_SELECTOR_SELECTION)
    setQueryErrorMessage(null)
    clearGraphView()
  }, [clearGraphView])

  useEffect(() => {
    if (previousViewModeRef.current !== viewMode) {
      const switchedToStar = viewMode === 'star'
      previousViewModeRef.current = viewMode
      shouldFitViewAfterLayoutRef.current = Boolean(graphData)
      shouldFitViewAfterStarSwitchRef.current = switchedToStar && Boolean(graphData)
    }
  }, [graphData, viewMode])

  useEffect(() => {
    if (!graphData) return

    setLayouting(true)
    const applyLayout = async () => {
      try {
        const effectiveOptions: TRbacGraphOptions = {
          showRoles: options.showRoles,
          showBindings: options.showBindings,
          showSubjects: options.showSubjects,
          includePods,
          includeWorkloads,
          onlyReachable,
          starMode,
          reduceEdgeCrossings,
          showAggregateEdges,
          showPermissions,
        }
        const effectiveGraph = filterGraphByOptions(graphData, effectiveOptions)
        const layout = starMode
          ? { positions: layoutRbacGraphStar(effectiveGraph) }
          : await layoutRbacGraph(
              effectiveGraph.nodes.map(node => node.id),
              effectiveGraph.edges.map(edge => ({ id: edge.id, source: edge.from, target: edge.to, type: edge.type })),
              new Map(effectiveGraph.nodes.map(node => [node.id, node.namespace])),
              {
                reduceEdgeCrossings,
              },
            )
        const model = buildRbacFlowModel(effectiveGraph, layout, effectiveOptions)
        setBaseModel(decorateFlowModelWithResourceLabels(model, kindsWithVersion))
      } finally {
        setLayouting(false)
      }
    }

    applyLayout()
  }, [
    graphData,
    includePods,
    includeWorkloads,
    onlyReachable,
    options.showBindings,
    options.showRoles,
    options.showSubjects,
    starMode,
    reduceEdgeCrossings,
    showAggregateEdges,
    showPermissions,
    kindsWithVersion,
  ])

  useEffect(() => {
    if (!baseModel) {
      setNodes([])
      setEdges([])
      return
    }

    if (starMode) {
      const selected = applyStarSelectionToModel(baseModel.nodes, baseModel.edges, starSelectedNodeId)
      setNodes(selected.nodes)
      setEdges(selected.edges)
      return
    }

    const focused = applyFocusToModel(baseModel.nodes, baseModel.edges, focusNodeId)
    setNodes(focused.nodes)
    setEdges(focused.edges)
  }, [baseModel, focusNodeId, setEdges, setNodes, starMode, starSelectedNodeId])

  useEffect(() => {
    if (!shouldFitViewAfterLayoutRef.current || layouting || nodes.length === 0) return

    shouldFitViewAfterLayoutRef.current = false
    window.requestAnimationFrame(() => {
      // eslint-disable-next-line no-void
      void fitView({ padding: 0.16 })
    })
  }, [fitView, layouting, nodes])

  useEffect(() => {
    if (!shouldFitViewAfterStarSwitchRef.current || layouting || nodes.length === 0 || !starMode) return

    shouldFitViewAfterStarSwitchRef.current = false
    window.requestAnimationFrame(() => {
      // eslint-disable-next-line no-void
      void fitView({ padding: 0.24, duration: 250 })
    })
  }, [fitView, layouting, nodes, starMode])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string; data?: { nodeType?: TRbacNode['type'] } }) => {
      if (node.id.startsWith('ns-group-')) return

      if (node.data?.nodeType && ROLE_NODE_TYPES.has(node.data.nodeType)) {
        setDetailsNodeId(node.id)
      }
    },
    [],
  )

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      event.preventDefault()

      if (node.id.startsWith('ns-group-')) return

      if (starMode) {
        setStarSelectedNodeId(prev => (prev === node.id ? null : node.id))
        return
      }

      setFocusNodeId(prev => (prev === node.id ? null : node.id))
    },
    [starMode],
  )

  const clearActiveNodeState = useCallback(() => {
    if (starMode) {
      setStarSelectedNodeId(null)
      return
    }

    setFocusNodeId(null)
  }, [starMode])

  const handlePaneClick = useCallback(() => {
    clearActiveNodeState()
  }, [clearActiveNodeState])

  const handleCanvasClickCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null

      if (!target) return
      if (!target.closest('.react-flow')) return
      if (target.closest('.react-flow__node')) return
      if (target.closest('.react-flow__controls')) return
      if (target.closest('.react-flow__minimap')) return
      if (target.closest('.react-flow__panel')) return
      if (target.closest('.react-flow__attribution')) return
      if (!target.closest('.react-flow__pane') && !target.closest('.react-flow__edge')) return

      clearActiveNodeState()
    },
    [clearActiveNodeState],
  )

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
      event.preventDefault()

      if (event.target instanceof HTMLElement && event.target.closest('.react-flow__node')) {
        return
      }

      clearActiveNodeState()
    },
    [clearActiveNodeState],
  )

  const isLoading = queryMutation.isPending || layouting
  const nonResourceUrlsErrorMessage =
    typeof nonResourceUrlsError === 'string' ? nonResourceUrlsError : nonResourceUrlsError?.message
  const roleDetailsTitle = roleDetails
    ? `${roleDetails.node.type === 'clusterRole' ? 'clusterRole' : 'role'}: ${roleDetails.node.name}`
    : ''

  useEffect(() => {
    const updateCanvasHeight = () => {
      const containerRect = containerRef.current?.getBoundingClientRect()
      const chromeHeight = chromeRef.current?.getBoundingClientRect().height ?? 0

      if (!containerRect) return

      const viewportHeight = window.innerHeight
      const nextHeight = Math.max(
        320,
        Math.floor(viewportHeight - containerRect.top - chromeHeight - FOOTER_HEIGHT - 16),
      )

      setCanvasHeight(prev => (prev === nextHeight ? prev : nextHeight))
    }

    updateCanvasHeight()

    const resizeObserver = new ResizeObserver(() => updateCanvasHeight())
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    if (chromeRef.current) resizeObserver.observe(chromeRef.current)

    window.addEventListener('resize', updateCanvasHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateCanvasHeight)
    }
  }, [graphData, stats, kindsError, nonResourceUrlsError, isLoading])

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
          <Alert
            type="error"
            message="Error while loading Kubernetes kinds"
            description={kindsError.message}
            style={{ marginTop: 8 }}
          />
        )}

        {nonResourceUrlsError && (
          <Alert
            type="error"
            message="Error while loading non-resource URLs"
            description={nonResourceUrlsErrorMessage}
            style={{ marginTop: 8 }}
          />
        )}

        {queryErrorMessage && (
          <Alert
            type="error"
            message="Error while running query"
            description={queryErrorMessage}
            style={{ marginTop: 8 }}
          />
        )}

        <Card size="small" styles={{ body: { padding: 0 } }} style={{ marginTop: 8 }}>
          <RbacGraphToggles value={options} onChange={setOptions} />
        </Card>

        {stats && (
          <Styled.StatsBar>
            <span>Roles: {stats.matchedRoles}</span>
            <span>Bindings: {stats.matchedBindings}</span>
            <span>Subjects: {stats.matchedSubjects}</span>
          </Styled.StatsBar>
        )}

        <Styled.LegendRow>
          {LEGEND.map(l => (
            <Styled.LegendItem key={l.label}>
              <Styled.LegendSwatch $color={l.color} $dashed={l.dashed} />
              {l.label}
            </Styled.LegendItem>
          ))}
        </Styled.LegendRow>
      </Styled.Chrome>

      {isLoading ? (
        <Styled.SpinContainer>
          <Spin tip="Computing layout..." />
        </Styled.SpinContainer>
      ) : !graphData ? (
        <Styled.EmptyState>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Configure selectors and run a query to visualize the RBAC graph."
          />
        </Styled.EmptyState>
      ) : (
        <Styled.CanvasWrapper
          onClickCapture={handleCanvasClickCapture}
          $height={canvasHeight}
          $colorBgContainer={token.colorBgContainer}
          $colorBgElevated={token.colorBgElevated}
          $colorBorder={token.colorBorder}
          $colorFillSecondary={token.colorFillSecondary}
          $colorPrimary={token.colorPrimary}
          $colorText={token.colorText}
          $colorTextSecondary={token.colorTextSecondary}
          $borderRadius={token.borderRadius}
          $boxShadowSecondary={token.boxShadowSecondary}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneClick={handlePaneClick}
            onPaneContextMenu={handlePaneContextMenu}
            nodesDraggable={false}
            fitView
            fitViewOptions={{ padding: 0.16 }}
            minZoom={0.05}
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap
              bgColor={token.colorBgContainer}
              maskColor={token.colorFillSecondary}
              nodeColor={token.colorTextSecondary}
            />
            <Controls />
          </ReactFlow>
        </Styled.CanvasWrapper>
      )}
      <Modal
        open={Boolean(roleDetails)}
        title={roleDetailsTitle}
        onCancel={() => setDetailsNodeId(null)}
        footer={null}
        width={1400}
        centered
        destroyOnHidden
      >
        {roleDetails && (
          <Styled.DetailsLayout
            $colorBgElevated={token.colorBgElevated}
            $colorBgContainer={token.colorBgContainer}
            $colorBorder={token.colorBorder}
            $colorBorderSecondary={token.colorBorderSecondary}
            $colorFillAlter={token.colorFillAlter}
            $colorPrimary={token.colorPrimary}
            $colorPrimaryBg={token.colorPrimaryBg}
            $colorPrimaryBorder={token.colorPrimaryBorder}
            $colorPrimaryText={token.colorPrimaryText}
            $colorText={token.colorText}
            $colorTextSecondary={token.colorTextSecondary}
            $boxShadowSecondary={token.boxShadowSecondary}
            $borderRadius={token.borderRadius}
          >
            <Styled.DetailsSection>
              <Styled.DetailsSectionHeader>
                <Styled.DetailsSectionTitle>Original Rules</Styled.DetailsSectionTitle>
              </Styled.DetailsSectionHeader>
              <Styled.DetailsToolbar>
                <Styled.DetailsToolbarActions>
                  <Button size="small" onClick={() => setSelectedRuleKeys(roleDetails.rules.map(rule => rule.key))}>
                    Select All
                  </Button>
                  <Button size="small" onClick={() => setSelectedRuleKeys([])}>
                    Deselect All
                  </Button>
                </Styled.DetailsToolbarActions>
                <Styled.DetailsToolbarMeta>{roleDetails.rules.length} rules</Styled.DetailsToolbarMeta>
              </Styled.DetailsToolbar>

              {roleDetails.rules.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No rule metadata available for this role." />
              ) : (
                <Styled.RuleList>
                  {roleDetails.rules.map(rule => {
                    const checked = selectedRuleKeySet.has(rule.key)

                    return (
                      <Styled.RuleCard
                        key={rule.key}
                        type="button"
                        $selected={checked}
                        onClick={() =>
                          setSelectedRuleKeys(prev =>
                            prev.includes(rule.key) ? prev.filter(key => key !== rule.key) : [...prev, rule.key],
                          )
                        }
                      >
                        <Styled.RuleCardHeader>
                          <Checkbox checked={checked} style={{ pointerEvents: 'none' }} />
                          <Styled.RuleCardBody>
                            <Styled.RuleHeadline>
                              <Styled.RuleVerb>{formatRuleVerb(rule.ruleRef)}</Styled.RuleVerb>
                              <Styled.RuleTarget>
                                {sortValues(rule.ruleRef.nonResourceURLs).length > 0 ||
                                !hasConcreteResourceValues(rule.ruleRef.resources) ? (
                                  formatRuleTarget(rule.ruleRef)
                                ) : (
                                  <Styled.RuleTargetList>
                                    {sortValues(rule.ruleRef.resources).map(resource =>
                                      resource.includes('*') || resource.includes('/') ? (
                                        <span key={`${rule.key}-${resource}`}>{resource}</span>
                                      ) : (
                                        renderResolvedResourceLabel(resource, {
                                          apiGroups: rule.ruleRef.apiGroups,
                                          badgeId: `${rule.key}-${resource}`,
                                        })
                                      ),
                                    )}
                                  </Styled.RuleTargetList>
                                )}
                              </Styled.RuleTarget>
                            </Styled.RuleHeadline>
                            <Styled.RuleMeta>{rule.expandedPermissionCount} expanded permissions</Styled.RuleMeta>
                            <Styled.RuleTagRow>
                              {hasWildcardValue(rule.ruleRef.resources) && <Tag color="gold">* resource</Tag>}
                              {hasWildcardValue(rule.ruleRef.verbs) && <Tag color="gold">* verb</Tag>}
                              {sortValues(rule.ruleRef.nonResourceURLs).length > 0 && (
                                <Tag color="blue">non-resource</Tag>
                              )}
                              <Tag>{`apiGroup: ${formatApiGroups(rule.ruleRef)}`}</Tag>
                              {sortValues(rule.ruleRef.resourceNames).length > 0 && (
                                <Tag>{`resourceNames: ${formatJoinedValues(rule.ruleRef.resourceNames)}`}</Tag>
                              )}
                            </Styled.RuleTagRow>
                          </Styled.RuleCardBody>
                        </Styled.RuleCardHeader>
                      </Styled.RuleCard>
                    )
                  })}
                </Styled.RuleList>
              )}
            </Styled.DetailsSection>

            <Styled.DetailsSection>
              <Styled.DetailsSectionHeader>
                <Styled.DetailsSectionTitle>Expanded Permissions</Styled.DetailsSectionTitle>
              </Styled.DetailsSectionHeader>
              <Styled.PermissionPanel>
                <Styled.PermissionHeader>
                  <Typography.Text strong style={{ color: token.colorText }}>
                    {roleDetailsTitle}
                  </Typography.Text>
                  <Tag color="blue">Expanded: resource</Tag>
                  <Tag>{`${filteredPermissions.length} permissions`}</Tag>
                </Styled.PermissionHeader>

                {groupedPermissions.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      selectedRuleKeys.length === 0
                        ? 'Select at least one rule to inspect expanded permissions.'
                        : 'No expanded permissions matched the selected rules.'
                    }
                  />
                ) : (
                  <Collapse
                    ghost
                    defaultActiveKey={groupedPermissions.map(group => group.target)}
                    items={groupedPermissions.map(group => ({
                      key: group.target,
                      label: (
                        <Styled.RuleTargetList>
                          {renderResolvedResourceLabel(group.target, {
                            apiGroups: group.permissions.flatMap(permission => permission.apiGroups),
                            badgeId: `group-${group.target}`,
                          })}
                          <span>{`(${group.permissions.length})`}</span>
                        </Styled.RuleTargetList>
                      ),
                      children: (
                        <Styled.PermissionPillRow>
                          {group.permissions.map(permission => (
                            <Styled.PermissionPill key={permission.id}>
                              <Styled.PermissionVerb>{permission.verb}</Styled.PermissionVerb>
                            </Styled.PermissionPill>
                          ))}
                        </Styled.PermissionPillRow>
                      ),
                    }))}
                  />
                )}
              </Styled.PermissionPanel>
            </Styled.DetailsSection>
          </Styled.DetailsLayout>
        )}
      </Modal>
    </Styled.Container>
  )
}

export const RbacGraph: FC<TRbacGraphProps> = props => (
  <ReactFlowProvider>
    <RbacGraphInner {...props} />
  </ReactFlowProvider>
)
