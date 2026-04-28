import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import type { TRbacQueryResponse, TRbacReverseQueryPayload } from 'localTypes/rbacGraph'

export const useRbacReverseGraphQuery = (clusterId: string) =>
  useMutation({
    mutationFn: async (payload: TRbacReverseQueryPayload): Promise<TRbacQueryResponse> => {
      const { data } = await axios.post(
        `/api/clusters/${clusterId}/k8s/apis/rbacgraph.in-cloud.io/v1alpha1/subjectgraphreviews`,
        payload,
      )
      return {
        graph: data.status.graph,
        stats: {
          matchedRoles: data.status.matchedRoles,
          matchedBindings: data.status.matchedBindings,
        },
        resolvedSubjects: data.status.resolvedSubjects,
        warnings: data.status.warnings,
        knownGaps: data.status.knownGaps,
      }
    },
  })
