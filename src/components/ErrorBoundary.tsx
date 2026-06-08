'use client'
import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#111118',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 16
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.20)" strokeWidth={1.5} strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div style={{ 
            color: 'rgba(255,255,255,0.70)', 
            fontSize: 16, 
            fontWeight: 600,
            textAlign: 'center'
          }}>
            Something went wrong
          </div>
          <div style={{ 
            color: 'rgba(255,255,255,0.35)', 
            fontSize: 13,
            textAlign: 'center'
          }}>
            Please refresh the page
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              padding: '10px 24px',
              color: 'rgba(255,255,255,0.80)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: 8
            }}
          >
            Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
