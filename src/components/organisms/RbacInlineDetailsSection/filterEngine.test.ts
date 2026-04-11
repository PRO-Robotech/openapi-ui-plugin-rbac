import assert from 'node:assert/strict'
import test from 'node:test'
import type { TRbacRoleDetailsResponse } from 'localTypes/rbacGraph'
import { applyInlineFilters, computeAvailableOptions, EMPTY_RBAC_INLINE_FILTER } from './filterEngine'

const baseData: Pick<TRbacRoleDetailsResponse, 'resourceGroups' | 'nonResourceUrls'> = {
  resourceGroups: [
    {
      apiGroup: '',
      displayName: 'core (v1)',
      existsInApi: true,
      resources: [
        {
          resource: 'pods',
          kind: 'Pod',
          existsInApi: true,
          apiVerbs: ['get', 'list', 'watch'],
          resourceNames: ['api-pod'],
          verbs: ['get', 'list'],
          verbOrigins: {},
        },
      ],
    },
    {
      apiGroup: 'apps',
      displayName: 'apps',
      existsInApi: true,
      resources: [
        {
          resource: 'deployments',
          kind: 'Deployment',
          existsInApi: true,
          apiVerbs: ['get', 'patch'],
          resourceNames: ['frontend'],
          verbs: ['get', 'patch'],
          verbOrigins: {},
        },
        {
          resource: 'statefulsets',
          kind: 'StatefulSet',
          existsInApi: true,
          apiVerbs: ['get'],
          resourceNames: [],
          verbs: ['get'],
          verbOrigins: {},
        },
      ],
    },
  ],
  nonResourceUrls: [
    {
      url: '/metrics',
      verbs: ['get'],
      verbOrigins: {},
    },
    {
      url: '/healthz',
      verbs: ['get', 'post'],
      verbOrigins: {},
    },
  ],
}

test('returns only values contained in the current role details payload', () => {
  const options = computeAvailableOptions(baseData, EMPTY_RBAC_INLINE_FILTER)

  assert.deepEqual(options.apiGroups, ['', 'apps'])
  assert.deepEqual(options.resources, ['deployments', 'pods', 'statefulsets'])
  assert.deepEqual(options.resourceNames, ['api-pod', 'frontend'])
  assert.deepEqual(options.verbs, ['get', 'list', 'patch', 'post'])
  assert.deepEqual(options.nonResourceURLs, ['/healthz', '/metrics'])
})

test('narrows resource-side options based on the active resource filters', () => {
  const options = computeAvailableOptions(baseData, {
    ...EMPTY_RBAC_INLINE_FILTER,
    apiGroups: ['apps'],
  })

  assert.deepEqual(options.apiGroups, ['', 'apps'])
  assert.deepEqual(options.resources, ['deployments', 'statefulsets'])
  assert.deepEqual(options.resourceNames, ['frontend'])
  assert.deepEqual(options.verbs, ['get', 'patch'])
  assert.deepEqual(options.nonResourceURLs, [])
})

test('narrows non-resource options independently from resource-side values', () => {
  const options = computeAvailableOptions(baseData, {
    ...EMPTY_RBAC_INLINE_FILTER,
    nonResourceURLs: ['/healthz'],
  })

  assert.deepEqual(options.apiGroups, [])
  assert.deepEqual(options.resources, [])
  assert.deepEqual(options.resourceNames, [])
  assert.deepEqual(options.verbs, ['get', 'post'])
  assert.deepEqual(options.nonResourceURLs, ['/healthz', '/metrics'])
})

test('hides non-resource results when a resource-side filter is active', () => {
  const filtered = applyInlineFilters(
    {
      uid: '1',
      kind: 'ClusterRole',
      name: 'test',
      rules: [],
      resourceGroups: baseData.resourceGroups,
      nonResourceUrls: baseData.nonResourceUrls,
    },
    {
      ...EMPTY_RBAC_INLINE_FILTER,
      resources: ['deployments'],
    },
  )

  assert.equal(filtered.resourceGroups.length, 1)
  assert.deepEqual(filtered.resourceGroups[0].resources.map(resource => resource.resource), ['deployments'])
  assert.deepEqual(filtered.nonResourceUrls, [])
})

test('hides resource results when a non-resource filter is active', () => {
  const filtered = applyInlineFilters(
    {
      uid: '1',
      kind: 'ClusterRole',
      name: 'test',
      rules: [],
      resourceGroups: baseData.resourceGroups,
      nonResourceUrls: baseData.nonResourceUrls,
    },
    {
      ...EMPTY_RBAC_INLINE_FILTER,
      nonResourceURLs: ['/metrics'],
    },
  )

  assert.deepEqual(filtered.resourceGroups, [])
  assert.deepEqual(filtered.nonResourceUrls.map(permission => permission.url), ['/metrics'])
})
