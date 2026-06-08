import React from 'react'

export function Skeleton({ 
  width, height, borderRadius = 8, className, style
}: { 
  width?: number | string
  height: number | string
  borderRadius?: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      width: width || '100%',
      height,
      borderRadius,
      background: 'rgba(255,255,255,0.06)',
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      ...style
    }} className={className} />
  )
}
