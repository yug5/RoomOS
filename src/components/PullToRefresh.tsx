'use client'
import React, { useRef, useState } from 'react'

export function PullToRefresh({ 
  onRefresh, 
  children 
}: { 
  onRefresh: () => Promise<void>
  children: React.ReactNode 
}) {
  const startY = useRef(0)
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
      setPulling(true)
    }
  }

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (!pulling) return
    const diff = e.changedTouches[0].clientY - startY.current
    if (diff > 80 && window.scrollY === 0) {
      setPulling(false)
      setRefreshing(true)
      navigator.vibrate?.(15)
      await onRefresh()
      setRefreshing(false)
    } else {
      setPulling(false)
    }
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '100%' }}
    >
      {refreshing && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 0',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{
            width: 24, height: 24,
            border: '2px solid rgba(255,255,255,0.1)',
            borderTop: '2px solid rgba(255,255,255,0.6)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
        </div>
      )}
      {children}
    </div>
  )
}
