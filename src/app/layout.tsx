'use client'
import { Inter } from 'next/font/google'
import './globals.css'
import { RoomProvider } from '@/lib/RoomContext'
import { ToastProvider } from '@/components/Toast'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { InstallPrompt } from '@/components/InstallPrompt'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isOnline, setIsOnline] = useState(true)
  
  const isPublicPage =
    pathname === '/login' ||
    pathname === '/onboarding' ||
    pathname?.startsWith('/join')

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const content = isPublicPage ? children : (
    <ErrorBoundary>
      <RoomProvider>{children}</RoomProvider>
    </ErrorBoundary>
  )

  return (
    <>
      {!isOnline && (
        <div style={{
          position: 'fixed', top: 12, left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255,80,80,0.12)',
          border: '1px solid rgba(255,80,80,0.20)',
          borderRadius: 999, padding: '6px 16px',
          color: 'rgba(255,255,255,0.7)', fontSize: 13,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 999, whiteSpace: 'nowrap'
        }}>
          No internet connection
        </div>
      )}
      <InstallPrompt />
      <div key={pathname} style={{ animation: 'pageFadeIn 0.15s ease-out' }}>
        {content}
      </div>
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#111118" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RoomOS" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body style={{ 
        background: '#111118',
        fontFamily: inter.style.fontFamily,
        margin: 0
      }}>
        <ToastProvider>
          <LayoutInner>{children}</LayoutInner>
        </ToastProvider>
      </body>
    </html>
  )
}
