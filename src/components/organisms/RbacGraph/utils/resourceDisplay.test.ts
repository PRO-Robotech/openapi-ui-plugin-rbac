import assert from 'node:assert/strict'
import test from 'node:test'
import { getUppercase, type TKindWithVersion } from '@prorobotech/openapi-k8s-toolkit'
import { resolveKindValue, resolveResourceDisplayValue, resolveResourcePresentation } from './resourceDisplay'

const kindsWithVersion: TKindWithVersion[] = [
  {
    group: 'operator.victoriametrics.com',
    kind: 'VLSingle',
    version: {
      version: 'v1beta1',
      groupVersion: 'operator.victoriametrics.com/v1beta1',
      preferred: true,
      namespaced: true,
      resource: 'vlsingles',
    },
  },
  {
    group: 'apps',
    kind: 'Deployment',
    version: {
      version: 'v1',
      groupVersion: 'apps/v1',
      preferred: true,
      namespaced: true,
      resource: 'deployments',
    },
  },
  {
    group: 'rbac.authorization.k8s.io',
    kind: 'Role',
    version: {
      version: 'v1',
      groupVersion: 'rbac.authorization.k8s.io/v1',
      preferred: true,
      namespaced: true,
      resource: 'roles',
    },
  },
  {
    group: 'example.com',
    kind: 'Policy',
    version: {
      version: 'v1',
      groupVersion: 'example.com/v1',
      preferred: true,
      namespaced: true,
      resource: 'policies',
    },
  },
  {
    group: 'other.example.com',
    kind: 'SecurityPolicy',
    version: {
      version: 'v1',
      groupVersion: 'other.example.com/v1',
      preferred: true,
      namespaced: true,
      resource: 'policies',
    },
  },
]

test('resolves exact plural within the provided api group', () => {
  const resolvedKind = resolveKindValue({
    apiGroups: ['operator.victoriametrics.com'],
    kindsWithVersion,
    value: 'vlsingles',
  })

  assert.equal(resolvedKind, 'VLSingle')
  assert.equal(getUppercase(resolvedKind), 'VLS')
})

test('resolves a globally unique plural without an api group', () => {
  assert.equal(
    resolveKindValue({
      kindsWithVersion,
      value: 'vlsingles',
    }),
    'VLSingle',
  )
})

test('keeps exact kind input stable and produces toolkit badge abbreviation', () => {
  const resolvedKind = resolveKindValue({
    kindsWithVersion,
    value: 'VLSingle',
  })

  assert.equal(resolvedKind, 'VLSingle')
  assert.equal(getUppercase(resolvedKind), 'VLS')
})

test('resolves the parent resource for subresources and preserves the suffix', () => {
  const presentation = resolveResourcePresentation({
    apiGroups: ['operator.victoriametrics.com'],
    kindsWithVersion,
    resource: 'vlsingles/status',
  })

  assert.equal(presentation.resolvedKind, 'VLSingle')
  assert.equal(presentation.displayValue, 'VLSingle')
  assert.equal(presentation.subresource, 'status')
  assert.equal(
    resolveResourceDisplayValue({
      apiGroups: ['operator.victoriametrics.com'],
      kindsWithVersion,
      value: 'vlsingles/status',
    }),
    'VLSingle/status',
  )
})

test('does not transform wildcard values or non-resource URLs into kinds', () => {
  assert.equal(
    resolveKindValue({
      kindsWithVersion,
      value: '*',
    }),
    '*',
  )
  assert.equal(
    resolveKindValue({
      kindsWithVersion,
      value: '/metrics',
    }),
    '/metrics',
  )
})

test('falls back to the original value for ambiguous plural matches and unknown values', () => {
  assert.equal(
    resolveKindValue({
      kindsWithVersion,
      value: 'policies',
    }),
    'policies',
  )
  assert.equal(
    resolveKindValue({
      kindsWithVersion,
      value: 'missing-resource',
    }),
    'missing-resource',
  )
})
