import { useState, type CSSProperties, type FC } from 'react'
import { Alert, Button } from 'antd'

type TRbacQueryWarningsAlertProps = {
  warnings: string[]
  style?: CSSProperties
}

const COLLAPSED_WARNING_COUNT = 1

export const RbacQueryWarningsAlert: FC<TRbacQueryWarningsAlertProps> = ({ warnings, style }) => {
  const [expanded, setExpanded] = useState(false)

  if (warnings.length === 0) {
    return null
  }

  const visibleWarnings = expanded ? warnings : warnings.slice(0, COLLAPSED_WARNING_COUNT)
  const hiddenCount = warnings.length - visibleWarnings.length

  return (
    <Alert
      type="warning"
      showIcon
      message="Query completed with warnings"
      description={
        <div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {visibleWarnings.map(message => (
              <li key={message}>{message}</li>
            ))}
          </ul>

          {warnings.length > COLLAPSED_WARNING_COUNT && (
            <Button
              type="link"
              size="small"
              style={{ height: 'auto', padding: 0, marginTop: 4 }}
              onClick={() => setExpanded(prev => !prev)}
            >
              {expanded ? 'Show less' : `Show ${hiddenCount} more`}
            </Button>
          )}
        </div>
      }
      style={style}
    />
  )
}
