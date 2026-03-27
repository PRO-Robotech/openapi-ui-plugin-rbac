import type { TRoutePoint } from 'utils/rbacForceLayout'

export const appendPoint = (points: TRoutePoint[], point: TRoutePoint) => {
  const previous = points[points.length - 1]
  if (previous && previous.x === point.x && previous.y === point.y) return
  points.push(point)
}

export const getAnchoredRoute = (route: TRoutePoint[], source: TRoutePoint, target: TRoutePoint): TRoutePoint[] => {
  const anchoredPoints: TRoutePoint[] = []
  appendPoint(anchoredPoints, source)
  route.forEach(point => appendPoint(anchoredPoints, point))
  appendPoint(anchoredPoints, target)

  if (anchoredPoints.length === 2) {
    return anchoredPoints
  }

  return anchoredPoints.filter((point, index, points) => {
    if (index === 0 || index === points.length - 1) return true

    const previous = points[index - 1]
    const next = points[index + 1]
    const sameX = previous.x === point.x && point.x === next.x
    const sameY = previous.y === point.y && point.y === next.y

    return !sameX && !sameY
  })
}

export const getPolylinePath = (points: TRoutePoint[]) => {
  if (points.length < 2) return ''

  let path = `M ${points[0].x},${points[0].y}`

  for (let i = 1; i < points.length; i += 1) {
    const current = points[i]
    path += ` L ${current.x},${current.y}`
  }

  return path
}
