'use client'
import { useState, createContext, useContext, useCallback } from 'react'

type ToastType = { id: string; message: string; type?: 'success' | 'error' }
type ToastContextType = { showToast: (message: string, type?: 'success'|'error') => void }

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const showToast = useCallback((message: string, type?: 'success'|'error') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 'calc(90px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        zIndex: 200,
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            background: toast.type === 'error' 
              ? 'rgba(255,80,80,0.15)' 
              : 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${toast.type === 'error' 
              ? 'rgba(255,80,80,0.25)' 
              : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 999,
            padding: '10px 20px',
            color: 'rgba(255,255,255,0.90)',
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            animation: 'toastIn 0.2s ease-out'
          }}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
