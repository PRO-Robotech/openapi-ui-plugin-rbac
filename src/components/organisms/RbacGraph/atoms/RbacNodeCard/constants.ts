import type { TRbacNodeType } from 'localTypes/rbacGraph'

export const NODE_COLORS: Record<TRbacNodeType, string> = {
  role: '#0f766e',
  clusterRole: '#0f766e',
  roleBinding: '#6366f1',
  clusterRoleBinding: '#6366f1',
  aggregationRelation: '#c2410c',
  permission: '#2563eb',
  pod: '#0ea5a4',
  podOverflow: '#0ea5a4',
  workload: '#7c3aed',
  workloadOverflow: '#7c3aed',
  subject: '#475569',
}

export const RULE_COUNT_NODE_TYPES = new Set<TRbacNodeType>([
  'role',
  'clusterRole',
  'roleBinding',
  'clusterRoleBinding',
])
