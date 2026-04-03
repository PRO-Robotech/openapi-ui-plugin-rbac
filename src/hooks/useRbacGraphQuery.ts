import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import type { TRbacQueryPayload, TRbacQueryResponse } from 'localTypes/rbacGraph'

export const useRbacGraphQuery = (clusterId: string) =>
  useMutation({
    mutationFn: async (payload: TRbacQueryPayload): Promise<TRbacQueryResponse> => {
      const { data } = await axios.post(
        `/api/clusters/${clusterId}/k8s/apis/rbacgraph.incloud.io/v1alpha1/rolegraphreviews`,
        payload,
      )
      return {
        graph: data.status.graph,
        stats: {
          matchedRoles: data.status.matchedRoles,
          matchedBindings: data.status.matchedBindings,
          matchedSubjects: data.status.matchedSubjects,
        },
      }
    },
  })
