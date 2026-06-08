'use client'
import React, { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed or dismissed
    const wasDismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (wasDismissed) return

    // Check if already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  if (!showPrompt || dismissed) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(90px + env(safe-area-inset-bottom))',
      left: 16, right: 16,
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 18,
      padding: '16px 20px',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }}>
      {/* App icon placeholder */}
      <div style={{
        width: 44, height: 44,
        background: 'rgba(255,255,255,0.10)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.80)" strokeWidth={1.5} strokeLinecap="round">
          <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>
          Add RoomOS to home screen
        </div>
        <div style={{ 
          color: 'rgba(255,255,255,0.45)', 
          fontSize: 12, 
          marginTop: 2 
        }}>
          Works offline, feels like an app
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={handleInstall}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.20)',
            borderRadius: 8,
            padding: '6px 14px',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 12,
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}
