import type { TRbacNodeType } from 'localTypes/rbacGraph'

export const NODE_COLORS: Record<TRbacNodeType, string> = {
  Role: '#0f766e',
  ClusterRole: '#0f766e',
  RoleBinding: '#6366f1',
  ClusterRoleBinding: '#6366f1',
  aggregationRelation: '#c2410c',
  permission: '#2563eb',
  User: '#475569',
  Group: '#475569',
  ServiceAccount: '#475569',
  Pod: '#0ea5a4',
  PodOverflow: '#0ea5a4',
  Workload: '#7c3aed',
  WorkloadOverflow: '#7c3aed',
}

export const RULE_COUNT_NODE_TYPES = new Set<TRbacNodeType>([
  'Role',
  'ClusterRole',
  'RoleBinding',
  'ClusterRoleBinding',
])
