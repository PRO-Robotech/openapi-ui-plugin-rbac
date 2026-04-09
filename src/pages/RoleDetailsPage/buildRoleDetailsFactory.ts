/* eslint-disable max-lines-per-function */
import type { TFactoryDataK8s } from '@prorobotech/openapi-k8s-toolkit'
import { getRuntimeFactoryConfig, OPENAPI_UI_BASEPREFIX } from 'utils/runtimeConfig'
import type { TRoleDetailsPageComponentMap } from './RoleDetailsPage'

const API_GROUP = 'rbac.authorization.k8s.io'
const API_VERSION = 'v1'
const PLURAL = 'roles'

const LABELS_ICON =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj48ZyBjbGlwLXBhdGg9InVybCgjY2xpcDBfMTk1M18yNDAzNCkiPjxwYXRoIGQ9Ik0yMy40MTEgMTAuNTcxN0wyMi42MTgxIDIuMTk4NDRDMjIuNTc3OSAxLjc2NDUxIDIyLjIzMjQgMS40MjE2NSAyMS43OTg1IDEuMzc4NzlMMTMuNDI1MiAwLjU4NTkzOEgxMy40MTQ1QzEzLjMyODggMC41ODU5MzggMTMuMjYxOCAwLjYxMjcyMyAxMy4yMTEgMC42NjM2MTZMMC42NjcyIDEzLjIwNzRDMC42NDIzNjkgMTMuMjMyMSAwLjYyMjY2OSAxMy4yNjE2IDAuNjA5MjI3IDEzLjI5NEMwLjU5NTc4NiAxMy4zMjY0IDAuNTg4ODY3IDEzLjM2MTEgMC41ODg4NjcgMTMuMzk2MkMwLjU4ODg2NyAxMy40MzEzIDAuNTk1Nzg2IDEzLjQ2NiAwLjYwOTIyNyAxMy40OTg0QzAuNjIyNjY5IDEzLjUzMDggMC42NDIzNjkgMTMuNTYwMyAwLjY2NzIgMTMuNTg1TDEwLjQxMTggMjMuMzI5N0MxMC40NjI3IDIzLjM4MDYgMTAuNTI5NyAyMy40MDc0IDEwLjYwMiAyMy40MDc0QzEwLjY3NDMgMjMuNDA3NCAxMC43NDEzIDIzLjM4MDYgMTAuNzkyMiAyMy4zMjk3TDIzLjMzNiAxMC43ODU5QzIzLjM4OTUgMTAuNzI5NyAyMy40MTYzIDEwLjY1MiAyMy40MTEgMTAuNTcxN1pNMTAuNTk5MyAyMC42NDA0TDMuMzU2NDkgMTMuMzk3NUwxNC4wNjI3IDIuNjkxM0wyMC42Nzg4IDMuMzE4MDhMMjEuMzA1NiA5LjkzNDE1TDEwLjU5OTMgMjAuNjQwNFpNMTYuNTAwMiA1LjEzOTUxQzE1LjIwMTEgNS4xMzk1MSAxNC4xNDMxIDYuMTk3NTUgMTQuMTQzMSA3LjQ5NjY1QzE0LjE0MzEgOC43OTU3NiAxNS4yMDExIDkuODUzOCAxNi41MDAyIDkuODUzOEMxNy43OTkzIDkuODUzOCAxOC44NTc0IDguNzk1NzYgMTguODU3NCA3LjQ5NjY1QzE4Ljg1NzQgNi4xOTc1NSAxNy43OTkzIDUuMTM5NTEgMTYuNTAwMiA1LjEzOTUxWk0xNi41MDAyIDguMzUzOEMxNi4wMjYxIDguMzUzOCAxNS42NDMxIDcuOTcwNzYgMTUuNjQzMSA3LjQ5NjY1QzE1LjY0MzEgNy4wMjI1NSAxNi4wMjYxIDYuNjM5NTEgMTYuNTAwMiA2LjYzOTUxQzE2Ljk3NDMgNi42Mzk1MSAxNy4zNTc0IDcuMDIyNTUgMTcuMzU3NCA3LjQ5NjY1QzE3LjM1NzQgNy45NzA3NiAxNi45NzQzIDguMzUzOCAxNi41MDAyIDguMzUzOFoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvZz48ZGVmcz48Y2xpcFBhdGggaWQ9ImNsaXAwXzE5NTNfMjQwMzQiPjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0id2hpdGUiLz48L2NsaXBQYXRoPjwvZGVmcz48L3N2Zz4='
const ANNOTATIONS_ICON =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOSIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDE5IDI0IiBmaWxsPSJub25lIj48cGF0aCBkPSJNMTguNjA1NCA2LjAxNjA3TDEyLjg0MTEgMC4yNTE3ODZDMTIuNjgwNCAwLjA5MTA3MTUgMTIuNDYzNCAwIDEyLjIzNTcgMEgwLjg1NzE0M0MwLjM4MzAzNiAwIDAgMC4zODMwMzYgMCAwLjg1NzE0M1YyMy4xNDI5QzAgMjMuNjE3IDAuMzgzMDM2IDI0IDAuODU3MTQzIDI0SDE4QzE4LjQ3NDEgMjQgMTguODU3MSAyMy42MTcgMTguODU3MSAyMy4xNDI5VjYuNjI0MTFDMTguODU3MSA2LjM5NjQzIDE4Ljc2NjEgNi4xNzY3OSAxOC42MDU0IDYuMDE2MDdaTTE2Ljg4MDQgNy4wMTc4NkgxMS44MzkzVjEuOTc2NzlMMTYuODgwNCA3LjAxNzg2Wk0xNi45Mjg2IDIyLjA3MTRIMS45Mjg1N1YxLjkyODU3SDEwLjAxNzlWNy43MTQyOUMxMC4wMTc5IDguMDEyNjUgMTAuMTM2NCA4LjI5ODggMTAuMzQ3NCA4LjUwOTc4QzEwLjU1ODMgOC43MjA3NiAxMC44NDQ1IDguODM5MjkgMTEuMTQyOSA4LjgzOTI5SDE2LjkyODZWMjIuMDcxNFpNOS4yMTQyOSAxNC44MzkzSDQuMjg1NzJDNC4xNjc4NiAxNC44MzkzIDQuMDcxNDMgMTQuOTM1NyA0LjA3MTQzIDE1LjA1MzZWMTYuMzM5M0M0LjA3MTQzIDE2LjQ1NzEgNC4xNjc4NiAxNi41NTM2IDQuMjg1NzIgMTYuNTUzNkg5LjIxNDI5QzkuMzMyMTQgMTYuNTUzNiA5LjQyODU3IDE2LjQ1NzEgOS40Mjg1NyAxNi4zMzkzVjE1LjA1MzZDOS40Mjg1NyAxNC45MzU3IDkuMzMyMTQgMTQuODM5MyA5LjIxNDI5IDE0LjgzOTNaTTQuMDcxNDMgMTEuNDEwN1YxMi42OTY0QzQuMDcxNDMgMTIuODE0MyA0LjE2Nzg2IDEyLjkxMDcgNC4yODU3MiAxMi45MTA3SDE0LjU3MTRDMTQuNjg5MyAxMi45MTA3IDE0Ljc4NTcgMTIuODE0MyAxNC43ODU3IDEyLjY5NjRWMTEuNDEwN0MxNC43ODU3IDExLjI5MjkgMTQuNjg5MyAxMS4xOTY0IDE0LjU3MTQgMTEuMTk2NEg0LjI4NTcyQzQuMTY3ODYgMTEuMTk2NCA0LjA3MTQzIDExLjI5MjkgNC4wNzE0MyAxMS40MTA3WiIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+'

const buildRoleDetailsPath = (basePath: string, namespace: string) =>
  `${basePath}/roles/${encodeURIComponent(namespace)}/{chosenEntryValue}`

export const buildRoleDetailsFactory = ({
  clusterId,
  namespace,
  roleName,
  basePath,
}: {
  clusterId: string
  namespace: string
  roleName: string
  basePath: string
}): TFactoryDataK8s<TRoleDetailsPageComponentMap> => {
  const runtimeFactoryConfig = getRuntimeFactoryConfig()
  const endpoint = `/api/clusters/${clusterId}/k8s/apis/${API_GROUP}/${API_VERSION}/namespaces/${namespace}/${PLURAL}/${roleName}`
  const namespaceHref = `${OPENAPI_UI_BASEPREFIX}/${clusterId}/factory/namespace-details/v1/namespaces/${namespace}`

  return {
    key: 'role-details',
    effectiveReqIndexes: [0],
    sidebarTags: [`${API_GROUP}/${API_VERSION}/${PLURAL}`],
    withScrollableMainContentCard: false,
    urlsToFetch: [
      {
        apiGroup: API_GROUP,
        apiVersion: API_VERSION,
        cluster: clusterId,
        fieldSelector: `metadata.name=${roleName}`,
        namespace,
        plural: PLURAL,
      },
    ],
    data: [
      {
        type: 'antdFlex',
        data: { align: 'center', id: 'header-row', justify: 'space-between', style: { marginBottom: '24px' } },
        children: [
          {
            type: 'antdFlex',
            data: { align: 'center', gap: 6 },
            children: [
              {
                type: 'ResourceBadge',
                data: {
                  id: 'factory-resource-badge',
                  style: { fontSize: '20px' },
                  value: '{reqsJsonPath[0][".items.0.kind"]["-"]}',
                },
              },
              {
                type: 'DropdownRedirect',
                data: {
                  apiGroup: API_GROUP,
                  apiVersion: API_VERSION,
                  cluster: clusterId,
                  currentValue: "{reqsJsonPath[0]['.items.0.metadata.name']['Select item...']}",
                  id: 'resource-name-dropdown',
                  jsonPath: '.metadata.name',
                  namespace,
                  placeholder: 'Select item...',
                  plural: PLURAL,
                  popupMatchSelectWidth: 350,
                  redirectUrl: buildRoleDetailsPath(basePath, namespace),
                },
              },
              {
                type: 'CopyButton',
                data: {
                  copyText: "{reqsJsonPath[0]['.items.0.metadata.name']['-']}",
                  id: 'copy-resource-name',
                  successMessage: 'Name copied to clipboard.',
                  tooltip: "Copy {reqsJsonPath[0]['.items.0.kind']['-']} name",
                },
              },
            ],
          },
          {
            type: 'ActionsDropdown',
            data: {
              buttonText: 'Actions',
              id: 'resource-actions',
              actions: [
                {
                  type: 'edit',
                  props: {
                    apiGroup: API_GROUP,
                    apiVersion: API_VERSION,
                    baseprefix: OPENAPI_UI_BASEPREFIX,
                    cluster: clusterId,
                    icon: 'EditOutlined',
                    name: "{reqsJsonPath[0]['.items.0.metadata.name']['-']}",
                    namespace,
                    permissionContext: {
                      apiGroup: API_GROUP,
                      apiVersion: API_VERSION,
                      cluster: clusterId,
                      namespace,
                      plural: PLURAL,
                    },
                    plural: PLURAL,
                    text: 'Edit',
                  },
                },
                {
                  type: 'editLabels',
                  props: {
                    editModalWidth: 650,
                    endpoint,
                    icon: 'TagsOutlined',
                    jsonPathToLabels: '.items.0.metadata.labels',
                    maxEditTagTextLength: 35,
                    modalTitle: 'Edit Labels',
                    paddingContainerEnd: '24px',
                    pathToValue: '/metadata/labels',
                    permissionContext: {
                      apiGroup: API_GROUP,
                      apiVersion: API_VERSION,
                      cluster: clusterId,
                      namespace,
                      plural: PLURAL,
                    },
                    reqIndex: '0',
                    text: 'Edit Labels',
                  },
                },
                {
                  type: 'editAnnotations',
                  props: {
                    cols: [11, 11, 2],
                    editModalWidth: '800px',
                    endpoint,
                    icon: 'FileTextOutlined',
                    jsonPathToObj: '.items.0.metadata.annotations',
                    modalTitle: 'Edit Annotations',
                    pathToValue: '/metadata/annotations',
                    permissionContext: {
                      apiGroup: API_GROUP,
                      apiVersion: API_VERSION,
                      cluster: clusterId,
                      namespace,
                      plural: PLURAL,
                    },
                    reqIndex: '0',
                    text: 'Edit Annotations',
                  },
                },
                {
                  type: 'delete',
                  props: {
                    danger: true,
                    endpoint,
                    icon: 'DeleteOutlined',
                    name: "{reqsJsonPath[0]['.items.0.metadata.name']['-']}",
                    permissionContext: {
                      apiGroup: API_GROUP,
                      apiVersion: API_VERSION,
                      cluster: clusterId,
                      namespace,
                      plural: PLURAL,
                    },
                    redirectTo: `${OPENAPI_UI_BASEPREFIX}/${clusterId}/${namespace}/api-table/${API_GROUP}/${API_VERSION}/${PLURAL}`,
                    text: 'Delete',
                  },
                },
              ],
            },
          },
        ],
      },
      {
        type: 'antdTabs',
        data: {
          allowOpenInNewBrowserTab: true,
          defaultActiveKey: 'details',
          id: 'tabs-root',
          syncActiveKeyWithHash: true,
          items: [
            {
              key: 'details',
              label: 'Details',
              children: [
                {
                  type: 'antdFlex',
                  data: { gap: 24, id: 'details-stack', vertical: true },
                  children: [
                    {
                      type: 'antdRow',
                      data: { gutter: [24, 24] },
                      children: [
                        {
                          type: 'antdCol',
                          data: { span: 12, xl: 12, xs: 24 },
                          children: [
                            {
                              type: 'ContentCard',
                              data: { id: 'resource-info-card' },
                              children: [
                                {
                                  type: 'DefaultDiv',
                                  data: {
                                    id: 'resource-info-card-title',
                                    style: { alignItems: 'center', display: 'flex', gap: '12px', marginBottom: '12px' },
                                  },
                                  children: [
                                    {
                                      type: 'antdIcons',
                                      data: {
                                        iconName: 'InfoCircleOutlined',
                                        iconProps: {
                                          color: 'token.colorInfo',
                                          size: 24,
                                          style: { color: 'token.colorInfo', fontSize: 24 },
                                        },
                                        id: 'resource-info-icon',
                                      },
                                    },
                                    {
                                      type: 'parsedText',
                                      data: {
                                        id: 'resource-info-title-text',
                                        style: { fontSize: '16px', lineHeight: '24px' },
                                        text: "{reqsJsonPath[0]['.items.0.kind']['-']} Info",
                                      },
                                    },
                                  ],
                                },
                                {
                                  type: 'antdRow',
                                  data: { gutter: [24, 0] },
                                  children: [
                                    {
                                      type: 'antdCol',
                                      data: { id: 'resource-info-col-created', span: 8 },
                                      children: [
                                        {
                                          type: 'antdFlex',
                                          data: { gap: 4, vertical: true },
                                          children: [
                                            { type: 'antdText', data: { strong: true, text: 'Created' } },
                                            {
                                              type: 'parsedText',
                                              data: {
                                                formatter: 'timestamp',
                                                text: "{reqsJsonPath[0]['.items.0.metadata.creationTimestamp']['-']}",
                                              },
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    {
                                      type: 'antdCol',
                                      data: { id: 'resource-info-col-namespace', span: 8 },
                                      children: [
                                        {
                                          type: 'antdFlex',
                                          data: { gap: 4, vertical: true },
                                          children: [
                                            {
                                              type: 'antdText',
                                              data: { id: 'meta-namespace-label', strong: true, text: 'Namespace' },
                                            },
                                            {
                                              type: 'antdFlex',
                                              data: {
                                                align: 'center',
                                                direction: 'row',
                                                gap: 6,
                                                id: 'namespace-badge-link-row',
                                              },
                                              children: [
                                                {
                                                  type: 'ResourceBadge',
                                                  data: { id: 'namespace-resource-badge', value: 'Namespace' },
                                                },
                                                {
                                                  type: 'antdLink',
                                                  data: {
                                                    href: namespaceHref,
                                                    id: 'namespace-link',
                                                    text: '{reqsJsonPath[0][".items.0.metadata.namespace"]["-"]}',
                                                  },
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    {
                                      type: 'antdCol',
                                      data: { id: 'resource-info-col-ownerrefs', span: 8 },
                                      children: [
                                        {
                                          type: 'VisibilityContainer',
                                          data: {
                                            id: 'ds-init-containers-container',
                                            style: { margin: 0, padding: 0 },
                                            value: "{reqsJsonPath[0]['.items.0.metadata.ownerReferences']['-']}",
                                          },
                                          children: [
                                            {
                                              type: 'antdFlex',
                                              data: { gap: 8, id: 'ref-link-block', vertical: true },
                                              children: [
                                                {
                                                  type: 'antdText',
                                                  data: { id: 'meta-ref', strong: true, text: 'OwnerRef' },
                                                },
                                                {
                                                  type: 'OwnerRefs',
                                                  data: {
                                                    baseFactoryClusterSceopedAPIKey:
                                                      runtimeFactoryConfig.baseFactoryClusterSceopedAPIKey,
                                                    baseFactoryNamespacedAPIKey:
                                                      runtimeFactoryConfig.baseFactoryNamespacedAPIKey,
                                                    baseFactoryNamespacedBuiltinKey:
                                                      runtimeFactoryConfig.baseFactoryNamespacedBuiltinKey,
                                                    baseFactoryClusterSceopedBuiltinKey:
                                                      runtimeFactoryConfig.baseFactoryClusterSceopedBuiltinKey,
                                                    baseNavigationName: 'navigation',
                                                    baseNavigationPlural: 'navigations',
                                                    baseprefix: OPENAPI_UI_BASEPREFIX,
                                                    cluster: clusterId,
                                                    emptyArrayErrorText: '-',
                                                    errorText: 'error getting refs',
                                                    id: 'refs',
                                                    isNotRefsArrayErrorText: 'objects in arr are not refs',
                                                    jsonPathToArrayOfRefs: '.items.0.metadata.ownerReferences',
                                                    notArrayErrorText: 'refs on path are not arr',
                                                    reqIndex: '0',
                                                  },
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: 'antdCol',
                          data: { span: 12, xl: 12, xs: 24 },
                          children: [
                            {
                              type: 'ContentCard',
                              data: { id: 'metadata-card', title: 'Metadata', style: { marginBottom: '24px' } },
                              children: [
                                {
                                  type: 'DefaultDiv',
                                  data: {
                                    id: 'cards-container',
                                    style: {
                                      columnGap: 16,
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                      marginBottom: '16px',
                                      rowGap: 10,
                                    },
                                  },
                                  children: [
                                    {
                                      type: 'AggregatedCounterCard',
                                      data: {
                                        activeType: {
                                          props: {
                                            editModalWidth: 650,
                                            endpoint,
                                            inputLabel: '',
                                            jsonPathToLabels: '.items.0.metadata.labels',
                                            maxEditTagTextLength: 35,
                                            modalDescriptionText: '',
                                            modalTitle: 'Edit labels',
                                            notificationSuccessMessage: 'Updated successfully',
                                            notificationSuccessMessageDescription: 'Labels have been updated',
                                            paddingContainerEnd: '24px',
                                            pathToValue: '/metadata/labels',
                                            permissionContext: {
                                              apiGroup: API_GROUP,
                                              apiVersion: API_VERSION,
                                              cluster: clusterId,
                                              namespace,
                                              plural: PLURAL,
                                            },
                                            reqIndex: '0',
                                          },
                                          type: 'labels',
                                        },
                                        counter: {
                                          props: { jsonPathToObj: '.items.0.metadata.labels', reqIndex: '0' },
                                          type: 'key',
                                        },
                                        iconBase64Encoded: LABELS_ICON,
                                        id: 'labels-counter-card',
                                        text: 'Labels',
                                      },
                                    },
                                    {
                                      type: 'AggregatedCounterCard',
                                      data: {
                                        activeType: {
                                          props: {
                                            cols: [11, 11, 2],
                                            editModalWidth: '800px',
                                            endpoint,
                                            inputLabel: '',
                                            jsonPathToObj: '.items.0.metadata.annotations',
                                            modalDescriptionText: '',
                                            modalTitle: 'Edit annotations',
                                            notificationSuccessMessage: 'Updated successfully',
                                            notificationSuccessMessageDescription: 'Annotations have been updated',
                                            pathToValue: '/metadata/annotations',
                                            permissionContext: {
                                              apiGroup: API_GROUP,
                                              apiVersion: API_VERSION,
                                              cluster: clusterId,
                                              namespace,
                                              plural: PLURAL,
                                            },
                                            reqIndex: '0',
                                          },
                                          type: 'annotations',
                                        },
                                        counter: {
                                          props: { jsonPathToObj: '.items.0.metadata.annotations', reqIndex: '0' },
                                          type: 'key',
                                        },
                                        iconBase64Encoded: ANNOTATIONS_ICON,
                                        id: 'annotations-counter-card',
                                        text: 'Annotations',
                                      },
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    // {
                    //   type: 'antdRow',
                    //   data: { gutter: [24, 0] },
                    //   children: [
                    //     {
                    //       type: 'antdCol',
                    //       data: { span: 24 },
                    //       children: [
                    //         {
                    //           type: 'ContentCard',
                    //           data: { id: 'role-runtime-facts-card' },
                    //           children: [
                    //             {
                    //               type: 'DefaultDiv',
                    //               data: {
                    //                 id: 'role-info-card-title',
                    //                 style: { alignItems: 'center', display: 'flex', gap: '12px', marginBottom: '12px' },
                    //               },
                    //               children: [
                    //                 {
                    //                   type: 'antdIcons',
                    //                   data: {
                    //                     iconName: 'SafetyCertificateOutlined',
                    //                     iconProps: { size: 24, style: { color: 'token.colorInfo', fontSize: 24 } },
                    //                     id: 'role-info-icon',
                    //                   },
                    //                 },
                    //                 {
                    //                   type: 'antdText',
                    //                   data: {
                    //                     id: 'role-info-title-text',
                    //                     style: { fontSize: '16px', lineHeight: '24px' },
                    //                     text: 'Rules',
                    //                   },
                    //                 },
                    //               ],
                    //             },
                    //             {
                    //               type: 'EnrichedTable',
                    //               data: {
                    //                 baseprefix: OPENAPI_UI_BASEPREFIX,
                    //                 cluster: clusterId,
                    //                 customizationId: 'factory-k8s-rbac-rules',
                    //                 fieldSelector: { 'metadata.name': roleName },
                    //                 id: 'role-rules-table',
                    //                 k8sResourceToFetch: {
                    //                   apiGroup: API_GROUP,
                    //                   apiVersion: API_VERSION,
                    //                   namespace,
                    //                   plural: PLURAL,
                    //                 },
                    //                 pathToItems: '.items.0.rules',
                    //               },
                    //             },
                    //           ],
                    //         },
                    //       ],
                    //     },
                    //   ],
                    // },
                    {
                      type: 'RbacInlineDetailsSection',
                      data: {
                        clusterId,
                        kind: 'Role',
                        name: roleName,
                        namespace,
                        title: 'RBAC Details',
                      },
                    },
                  ],
                },
              ],
            },
            {
              key: 'yaml',
              label: 'YAML',
              children: [
                {
                  type: 'ContentCard',
                  data: { id: 'yaml-editor-card', style: { marginBottom: '24px' } },
                  children: [
                    {
                      type: 'YamlEditorSingleton',
                      data: {
                        apiGroup: API_GROUP,
                        apiVersion: API_VERSION,
                        cluster: clusterId,
                        id: 'yaml-editor',
                        isNameSpaced: true,
                        namespace,
                        pathToData: '.items.0',
                        permissionContext: {
                          apiGroup: API_GROUP,
                          apiVersion: API_VERSION,
                          cluster: clusterId,
                          namespace,
                          plural: PLURAL,
                        },
                        plural: PLURAL,
                        prefillValuesRequestIndex: 0,
                        substractHeight: 350,
                        type: 'api',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  } as unknown as TFactoryDataK8s<TRoleDetailsPageComponentMap>
}
