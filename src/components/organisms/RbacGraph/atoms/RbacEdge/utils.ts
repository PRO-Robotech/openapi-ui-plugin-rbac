import type { TRoutePoint } from 'utils/rbacForceLayout'

const CORNER_RADIUS = 10

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

export const getDistance = (start: TRoutePoint, end: TRoutePoint) => Math.hypot(end.x - start.x, end.y - start.y)

export const getRoundedPath = (points: TRoutePoint[]) => {
  if (points.length < 2) return ''

  let path = `M ${points[0].x},${points[0].y}`

  for (let i = 1; i < points.length; i += 1) {
    const current = points[i]
    const previous = points[i - 1]
    const next = points[i + 1]

    if (!next) {
      path += ` L ${current.x},${current.y}`
    } else {
      const incomingLength = getDistance(previous, current)
      const outgoingLength = getDistance(current, next)

      if (incomingLength === 0 || outgoingLength === 0) {
        path += ` L ${current.x},${current.y}`
      } else {
        const radius = Math.min(CORNER_RADIUS, incomingLength / 2, outgoingLength / 2)
        const entryX = current.x - ((current.x - previous.x) / incomingLength) * radius
        const entryY = current.y - ((current.y - previous.y) / incomingLength) * radius
        const exitX = current.x + ((next.x - current.x) / outgoingLength) * radius
        const exitY = current.y + ((next.y - current.y) / outgoingLength) * radius

        path += ` L ${entryX},${entryY} Q ${current.x},${current.y} ${exitX},${exitY}`
      }
    }
  }

  return path
}
