import React, { FC, PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

type TRbacResourceLinkProps = PropsWithChildren<{
  href?: string
  className?: string
}>

export const RbacResourceLink: FC<TRbacResourceLinkProps> = ({ href, className, children }) => {
  if (!href) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>
  }

  return (
    <Link className={className ?? 'ant-typography ant-typography-link'} to={href}>
      {children}
    </Link>
  )
}
