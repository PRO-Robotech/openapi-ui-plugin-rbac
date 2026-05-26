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
import { useKindsRaw, useK8sSmartResource } from '@prorobotech/openapi-k8s-toolkit'
import type { TNavigationResource } from '@prorobotech/openapi-k8s-toolkit'
import { Alert, Card, Empty, Modal, Spin, theme } from 'antd'
import axios from 'axios'
import { useSearchParams } from 'react-router-dom'
import { FOOTER_HEIGHT } from 'constants/blocksSizes'
import type {
  TRbacQueryPayload,
  TRbacReverseQueryPayload,
  TRbacSubjectsBySelectorGraphPayload,
  TRbacQueryResponse,
  TRbacGraphOptions,
  TRbacGraph as TGraph,
  TRbacNode,
  TRbacGraphProps,
  TNonResourceUrlItem,
  TNonResourceUrlList,
  TFlowModel,
  TRbacSubjectKind,
  TRbacQueryWarning,
} from 'localTypes/rbacGraph'
import { useRbacGraphQuery } from 'hooks/useRbacGraphQuery'
import { useRbacReverseGraphQuery } from 'hooks/useRbacReverseGraphQuery'
import { useRbacRoleDetailsQuery } from 'hooks/useRbacRoleDetailsQuery'
import { useRbacSubjectPermissionsQuery } from 'hooks/useRbacSubjectPermissionsQuery'
import { RbacQueryWarningsAlert } from 'components/organisms/RbacQueryWarningsAlert'
import { layoutRbacGraph } from 'utils/rbacForceLayout'
import { layoutRbacGraphStar } from 'utils/rbacStarLayout'
import { getNavigationBaseFactoriesMapping, getRbacResourceHref, RBAC_NAVIGATION_QUERY } from 'utils/rbacResourceLink'
import { formatRbacQueryWarning } from 'utils/rbacWarnings'
import {
  buildRbacFlowModel,
  applyFocusToModel,
  applyStarSelectionToModel,
  filterGraphByOptions,
} from 'utils/rbacFlowAdapter'
import { NamespaceGroupNode, RbacEdge, RbacModalTitleLabel, RbacNodeCard } from './atoms'
import { RbacGraphToggles, RbacQueryForm, RbacRoleDetailsModalContent } from './molecules'
import { hasWildcard, toSortedOptions, decorateFlowModelWithResourceLabels } from './utils'
import {
  createDefaultRbacGraphSearchState,
  hasAnyRbacGraphSearchState,
  normalizeRbacGraphSearchState,
  parseRbacGraphSearchParams,
  serializeRbacGraphSearchParams,
  type TRbacGraphSearchState,
} from './utils/searchParams'
import { LEGEND, EMPTY_SELECTOR_SELECTION, ROLE_NODE_TYPES, SUBJECT_NODE_TYPES } from './constants'
import { Styled } from './styled'

type TRbacGraphMode = 'role' | 'subject'

type TRbacGraphInnerProps = TRbacGraphProps & {
  mode?: TRbacGraphMode
}

type TSubjectNode = TRbacNode & { type: TRbacSubjectKind }

export const nodeTypes: NodeTypes = { rbacCard: RbacNodeCard, namespaceGroup: NamespaceGroupNode }
export const edgeTypes: EdgeTypes = { rbacEdge: RbacEdge }

const TAB_VIEW_PARAM = 'view'
const MIN_CANVAS_HEIGHT = 180

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

const RbacGraphInner: FC<TRbacGraphInnerProps> = ({ clusterId, mode = 'role' }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { token } = theme.useToken()
  const { fitView } = useReactFlow()
  const isReverseMode = mode === 'subject'
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chromeRef = useRef<HTMLDivElement | null>(null)
  const initialSearchStateRef = useRef<TRbacGraphSearchState>()
  const appliedSearchParamsRef = useRef(searchParams.toString())
  const autoSubmitAttemptedRef = useRef(false)

  if (!initialSearchStateRef.current) {
    initialSearchStateRef.current = normalizeRbacGraphSearchState(
      parseRbacGraphSearchParams(searchParams, isReverseMode),
    )
  }

  const initialSearchState = initialSearchStateRef.current
  const [payload, setPayload] = useState<
    TRbacQueryPayload | TRbacReverseQueryPayload | TRbacSubjectsBySelectorGraphPayload
  >(() => initialSearchState.payload)
  const [options, setOptions] = useState<TRbacGraphOptions>(() => initialSearchState.options)
  const shouldFitViewAfterLayoutRef = useRef(false)
  const shouldFitViewAfterStarSwitchRef = useRef(false)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [starSelectedNodeId, setStarSelectedNodeId] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<TGraph | null>(null)
  const [stats, setStats] = useState<TRbacQueryResponse['stats']>()
  const [layouting, setLayouting] = useState(false)
  const [canvasHeight, setCanvasHeight] = useState(MIN_CANVAS_HEIGHT)
  const [baseModel, setBaseModel] = useState<TFlowModel | null>(null)
  const [detailsNodeId, setDetailsNodeId] = useState<string | null>(null)
  const [queryErrorMessage, setQueryErrorMessage] = useState<string | null>(null)
  const [queryWarnings, setQueryWarnings] = useState<TRbacQueryWarning[]>([])
  const [collapseSignal, setCollapseSignal] = useState(0)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const queryMutation = useRbacGraphQuery(clusterId)
  const reverseQueryMutation = useRbacReverseGraphQuery(clusterId)

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

  const selectedRoleNode = useMemo(() => {
    if (!graphData || !detailsNodeId) return null

    const node = graphData.nodes.find(item => item.id === detailsNodeId)

    if (!node || !ROLE_NODE_TYPES.has(node.type)) return null

    return node
  }, [detailsNodeId, graphData])

  const selectedSubjectNode = useMemo<TSubjectNode | null>(() => {
    if (!graphData || !detailsNodeId) return null

    const node = graphData.nodes.find(item => item.id === detailsNodeId)

    if (!node || !SUBJECT_NODE_TYPES.has(node.type)) return null

    return node as TSubjectNode
  }, [detailsNodeId, graphData])

  const roleDetailsQuery = useRbacRoleDetailsQuery({
    clusterId,
    node: selectedRoleNode,
    selector: payload.spec.selector,
    matchMode: payload.spec.matchMode,
    wildcardMode: payload.spec.wildcardMode,
    filterPhantomAPIs: payload.spec.filterPhantomAPIs,
  })

  const subjectDetailsPayload = useMemo<TRbacReverseQueryPayload | null>(() => {
    if (!selectedSubjectNode) return null

    return {
      spec: {
        subject: {
          kind: selectedSubjectNode.type,
          name: selectedSubjectNode.name,
          ...(selectedSubjectNode.type === 'ServiceAccount' && selectedSubjectNode.namespace
            ? { namespace: selectedSubjectNode.namespace }
            : {}),
        },
        selector: payload.spec.selector,
        matchMode: payload.spec.matchMode,
        wildcardMode: payload.spec.wildcardMode,
        directOnly: 'directOnly' in payload.spec ? payload.spec.directOnly : false,
        filterPhantomAPIs: payload.spec.filterPhantomAPIs,
      },
    }
  }, [payload.spec, selectedSubjectNode])

  const subjectDetailsQuery = useRbacSubjectPermissionsQuery({
    clusterId,
    payload: subjectDetailsPayload,
    enabled: Boolean(selectedSubjectNode),
  })

  const kindsWithVersion = useMemo(() => kindsData?.kindsWithVersion ?? [], [kindsData?.kindsWithVersion])

  const [selectorSelection, setSelectorSelection] = useState(() => initialSearchState.selectorSelection)
  const hasResourceFilters = Boolean(
    selectorSelection.apiGroups.length || selectorSelection.resources.length || selectorSelection.resourceNames.length,
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

  const currentSearchState = useMemo<TRbacGraphSearchState>(
    () => ({
      payload: payload as TRbacGraphSearchState['payload'],
      selectorSelection,
      options,
    }),
    [options, payload, selectorSelection],
  )

  const normalizedSearchState = useMemo(
    () => normalizeRbacGraphSearchState(currentSearchState, searchNormalizationOptions),
    [currentSearchState, searchNormalizationOptions],
  )

  const canonicalSearchParams = useMemo(() => {
    const nextSearchParams = serializeRbacGraphSearchParams(normalizedSearchState, searchNormalizationOptions)
    const activeView = searchParams.get(TAB_VIEW_PARAM)

    if (activeView) {
      nextSearchParams.set(TAB_VIEW_PARAM, activeView)
    }

    return nextSearchParams.toString()
  }, [normalizedSearchState, searchNormalizationOptions, searchParams])

  const applySearchState = useCallback((nextState: TRbacGraphSearchState) => {
    setPayload(nextState.payload)
    setSelectorSelection(nextState.selectorSelection)
    setOptions(nextState.options)
  }, [])

  const handleSelectorChange = useCallback(
    (sel: typeof selectorSelection, changedKey?: keyof typeof EMPTY_SELECTOR_SELECTION) => {
      applySearchState(
        normalizeRbacGraphSearchState(
          {
            ...currentSearchState,
            selectorSelection: sel,
            payload: {
              spec: {
                ...payload.spec,
                selector: sel,
              },
            } as TRbacGraphSearchState['payload'],
          },
          {
            ...searchNormalizationOptions,
            changedKey,
          },
        ),
      )
    },
    [applySearchState, currentSearchState, payload.spec, searchNormalizationOptions],
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
    if (!canApplySelectorConstraints) return

    if (JSON.stringify(currentSearchState) !== JSON.stringify(normalizedSearchState)) {
      applySearchState(normalizedSearchState)
    }
  }, [applySearchState, canApplySelectorConstraints, currentSearchState, normalizedSearchState])

  const clearGraphView = useCallback(() => {
    setFocusNodeId(null)
    setStarSelectedNodeId(null)
    setBaseModel(null)
    setGraphData(null)
    setStats(undefined)
    setQueryWarnings([])
    setDetailsNodeId(null)
    setNodes([])
    setEdges([])
  }, [setEdges, setNodes])

  const submitQuery = useCallback(
    (nextPayload: TRbacQueryPayload | TRbacReverseQueryPayload | TRbacSubjectsBySelectorGraphPayload) => {
      setCollapseSignal(prev => prev + 1)
      setQueryErrorMessage(null)
      setQueryWarnings([])
      const onSuccess = (data: TRbacQueryResponse) => {
        setQueryErrorMessage(null)
        setGraphData(data.graph)
        setStats(data.stats)
        setQueryWarnings(data.warnings ?? [])
        setFocusNodeId(null)
        setStarSelectedNodeId(null)
        setDetailsNodeId(null)
      }
      const onError = (error: unknown) => {
        clearGraphView()
        setQueryWarnings([])
        setQueryErrorMessage(getQueryErrorMessage(error))
      }

      if (isReverseMode) {
        reverseQueryMutation.mutate(nextPayload as TRbacSubjectsBySelectorGraphPayload, {
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
    [clearGraphView, isReverseMode, queryMutation, reverseQueryMutation],
  )

  const handleSubmit = useCallback(() => {
    submitQuery(payload)
  }, [payload, submitQuery])

  useEffect(() => {
    if (canonicalSearchParams === appliedSearchParamsRef.current) return

    appliedSearchParamsRef.current = canonicalSearchParams
    setSearchParams(canonicalSearchParams ? new URLSearchParams(canonicalSearchParams) : new URLSearchParams(), {
      replace: true,
    })
  }, [canonicalSearchParams, setSearchParams])

  useEffect(() => {
    if (autoSubmitAttemptedRef.current || !selectorMetadataSettled) return

    autoSubmitAttemptedRef.current = true

    if (!hasAnyRbacGraphSearchState(normalizedSearchState, searchNormalizationOptions)) return
    if (
      isReverseMode &&
      selectorSelection.apiGroups.length === 0 &&
      selectorSelection.resources.length === 0 &&
      selectorSelection.verbs.length === 0 &&
      selectorSelection.resourceNames.length === 0 &&
      selectorSelection.nonResourceURLs.length === 0
    )
      return

    submitQuery(normalizedSearchState.payload)
  }, [
    isReverseMode,
    normalizedSearchState,
    searchNormalizationOptions,
    selectorMetadataSettled,
    selectorSelection,
    submitQuery,
  ])

  const handleOptionsChange = useCallback(
    (nextOptions: TRbacGraphOptions) => {
      applySearchState(
        normalizeRbacGraphSearchState(
          {
            ...currentSearchState,
            options: nextOptions,
            payload: isReverseMode
              ? currentSearchState.payload
              : ({
                  spec: {
                    ...(currentSearchState.payload as TRbacQueryPayload).spec,
                    includePods: nextOptions.includePods,
                    includeWorkloads: nextOptions.includeWorkloads,
                  },
                } as TRbacQueryPayload),
          },
          searchNormalizationOptions,
        ),
      )
    },
    [applySearchState, currentSearchState, isReverseMode, searchNormalizationOptions],
  )

  const handlePayloadChange = useCallback(
    (nextPayload: TRbacQueryPayload | TRbacReverseQueryPayload | TRbacSubjectsBySelectorGraphPayload) => {
      applySearchState(
        normalizeRbacGraphSearchState(
          {
            ...currentSearchState,
            payload: nextPayload as TRbacGraphSearchState['payload'],
            selectorSelection: nextPayload.spec.selector,
          },
          searchNormalizationOptions,
        ),
      )
    },
    [applySearchState, currentSearchState, searchNormalizationOptions],
  )

  const handleReset = useCallback(() => {
    applySearchState(createDefaultRbacGraphSearchState(isReverseMode))
    setQueryErrorMessage(null)
    setQueryWarnings([])
    clearGraphView()
  }, [applySearchState, clearGraphView, isReverseMode])

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

      if (node.data?.nodeType && SUBJECT_NODE_TYPES.has(node.data.nodeType)) {
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

  const isLoading = queryMutation.isPending || reverseQueryMutation.isPending || layouting
  const nonResourceUrlsErrorMessage =
    typeof nonResourceUrlsError === 'string' ? nonResourceUrlsError : nonResourceUrlsError?.message
  const queryWarningMessages = useMemo(() => queryWarnings.map(formatRbacQueryWarning), [queryWarnings])
  const roleDetailsHref = useMemo(() => {
    if (!selectedRoleNode) return undefined

    return getRbacResourceHref({
      clusterId,
      node: {
        type: selectedRoleNode.type,
        name: selectedRoleNode.name,
        namespace: selectedRoleNode.type === 'Role' ? selectedRoleNode.namespace : undefined,
      },
      baseFactoriesMapping,
    })
  }, [baseFactoriesMapping, clusterId, selectedRoleNode])
  const subjectDetailsHref = useMemo(() => {
    if (!selectedSubjectNode) return undefined

    return getRbacResourceHref({
      clusterId,
      node: {
        type: selectedSubjectNode.type,
        name: selectedSubjectNode.name,
        namespace: selectedSubjectNode.namespace,
      },
      baseFactoriesMapping,
    })
  }, [baseFactoriesMapping, clusterId, selectedSubjectNode])
  const detailsToken = useMemo(
    () => ({
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
    }),
    [token],
  )

  useEffect(() => {
    const updateCanvasHeight = () => {
      const containerRect = containerRef.current?.getBoundingClientRect()
      const chromeHeight = chromeRef.current?.getBoundingClientRect().height ?? 0

      if (!containerRect) return

      const viewportHeight = window.innerHeight
      const nextHeight = Math.max(
        MIN_CANVAS_HEIGHT,
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
  }, [graphData, stats, kindsError, nonResourceUrlsError, queryWarnings, isLoading])

  return (
    <Styled.Container ref={containerRef}>
      <Styled.Chrome ref={chromeRef}>
        <Card size="small" styles={{ body: { padding: 0 } }}>
          <RbacQueryForm
            value={payload}
            queryMode={mode}
            selectorLoading={kindsLoading || nonResourceUrlsLoading}
            selectorOptions={selectorOptions}
            showRuntimeLimits={!isReverseMode}
            collapseSignal={collapseSignal}
            onSelectorChange={(patch, changedKey) =>
              handleSelectorChange({ ...selectorSelection, ...patch }, changedKey)
            }
            onChange={handlePayloadChange}
            onSubmit={handleSubmit}
            onReset={handleReset}
            loading={queryMutation.isPending || reverseQueryMutation.isPending}
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

        <RbacQueryWarningsAlert warnings={queryWarningMessages} style={{ marginTop: 8 }} />

        <Card size="small" styles={{ body: { padding: 0 } }} style={{ marginTop: 8 }}>
          <RbacGraphToggles value={options} onChange={handleOptionsChange} showRuntimeOptions={!isReverseMode} />
        </Card>

        {stats && (
          <Styled.StatsBar>
            <span>Roles: {stats.matchedRoles}</span>
            <span>Bindings: {stats.matchedBindings}</span>
            {stats.matchedSubjects !== undefined && <span>Subjects: {stats.matchedSubjects}</span>}
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
        <Styled.SpinContainer $height={canvasHeight}>
          <Spin tip="Computing layout..." />
        </Styled.SpinContainer>
      ) : !graphData ? (
        <Styled.EmptyState $height={canvasHeight}>
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
        open={Boolean(detailsNodeId)}
        title={
          selectedRoleNode ? (
            <RbacModalTitleLabel
              badgeId={`rbac-graph-modal-title-${selectedRoleNode.id}`}
              node={selectedRoleNode}
              href={roleDetailsHref}
            />
          ) : selectedSubjectNode ? (
            <RbacModalTitleLabel
              badgeId={`rbac-graph-modal-title-${selectedSubjectNode.id}`}
              node={selectedSubjectNode}
              href={subjectDetailsHref}
            />
          ) : (
            'RBAC details'
          )
        }
        onCancel={() => setDetailsNodeId(null)}
        footer={null}
        width={1400}
        centered
        destroyOnHidden
      >
        {!selectedRoleNode && !selectedSubjectNode ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No RBAC node is selected." />
        ) : selectedRoleNode && roleDetailsQuery.isLoading ? (
          <Styled.SpinContainer>
            <Spin tip="Loading role details..." />
          </Styled.SpinContainer>
        ) : selectedRoleNode && roleDetailsQuery.isError ? (
          <Alert
            type="error"
            message="Error while loading role details"
            description={getQueryErrorMessage(roleDetailsQuery.error)}
          />
        ) : selectedRoleNode && roleDetailsQuery.data ? (
          <RbacRoleDetailsModalContent
            data={roleDetailsQuery.data}
            kindsWithVersion={kindsWithVersion}
            token={detailsToken}
          />
        ) : selectedSubjectNode && subjectDetailsQuery.isLoading ? (
          <Styled.SpinContainer>
            <Spin tip="Loading subject permissions..." />
          </Styled.SpinContainer>
        ) : selectedSubjectNode && subjectDetailsQuery.isError ? (
          <Alert
            type="error"
            message="Error while loading subject permissions"
            description={getQueryErrorMessage(subjectDetailsQuery.error)}
          />
        ) : selectedSubjectNode && subjectDetailsQuery.data ? (
          <RbacRoleDetailsModalContent
            data={subjectDetailsQuery.data}
            kindsWithVersion={kindsWithVersion}
            token={detailsToken}
            showAssessment={false}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No RBAC details were returned for this node." />
        )}
      </Modal>
    </Styled.Container>
  )
}

export const RbacGraph: FC<TRbacGraphProps> = props => (
  <ReactFlowProvider>
    <RbacGraphInner {...props} mode="role" />
  </ReactFlowProvider>
)

export const RbacReverseGraph: FC<TRbacGraphProps> = props => (
  <ReactFlowProvider>
    <RbacGraphInner {...props} mode="subject" />
  </ReactFlowProvider>
)
