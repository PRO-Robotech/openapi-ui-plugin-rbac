import React, { FC, memo } from 'react'
import { getBezierPath, type EdgeProps } from '@xyflow/react'
import type { TRoutePoint } from 'utils/rbacForceLayout'
import { getAnchoredRoute, getRoundedPath } from './utils'

type TRbacEdgeData = {
  route?: TRoutePoint[]
}

type TRbacEdgeProps = EdgeProps & { data: TRbacEdgeData }

/* eslint-disable react/prop-types */
export const RbacEdge: FC<TRbacEdgeProps> = memo(props => {
  const route = (props.data as TRbacEdgeData | undefined)?.route
  const anchoredRoute =
    route && route.length >= 2
      ? getAnchoredRoute(route, { x: props.sourceX, y: props.sourceY }, { x: props.targetX, y: props.targetY })
      : undefined
  const routedPath = anchoredRoute && anchoredRoute.length >= 2 ? getRoundedPath(anchoredRoute) : ''
  const pathStyle = {
    ...props.style,
    strokeDasharray: props.animated ? props.style?.strokeDasharray || '8 6' : props.style?.strokeDasharray,
  }
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  })

  return (
    <path
      id={props.id}
      className="react-flow__edge-path"
      d={routedPath || edgePath}
      style={pathStyle}
      markerEnd={props.markerEnd}
    >
      {props.animated && (
        <animate attributeName="stroke-dashoffset" from="14" to="0" dur="0.7s" repeatCount="indefinite" />
      )}
    </path>
  )
})
