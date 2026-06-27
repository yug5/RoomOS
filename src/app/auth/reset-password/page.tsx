'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleReset = async () => {
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#111118', minHeight: '100vh',
      padding: '24px', maxWidth: '430px', margin: '0 auto',
      display: 'flex', flexDirection: 'column', 
      justifyContent: 'center', alignItems: 'center'
    }}>
      <h1 style={{
        fontSize: 28, color: 'white', fontWeight: 'bold',
        marginBottom: 8, textAlign: 'center'
      }}>
        RoomOS
      </h1>
      <p style={{
        color: 'rgba(255,255,255,0.40)', fontSize: 14,
        marginBottom: 32, textAlign: 'center'
      }}>
        Set your new password
      </p>

      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: '100%', padding: '14px 16px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 14, color: 'white',
          fontSize: 16, marginBottom: 12, outline: 'none'
        }}
      />

      <input
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        style={{
          width: '100%', padding: '14px 16px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 14, color: 'white',
          fontSize: 16, marginBottom: 16, outline: 'none'
        }}
      />

      {error && (
        <p style={{
          color: 'rgba(255,100,100,0.85)', fontSize: 13,
          marginBottom: 12, textAlign: 'center'
        }}>
          {error}
        </p>
      )}

      {success && (
        <p style={{
          color: 'rgba(100,200,100,0.85)', fontSize: 13,
          marginBottom: 12, textAlign: 'center'
        }}>
          Password reset successful! Redirecting...
        </p>
      )}

      <button
        onClick={handleReset}
        disabled={loading}
        style={{
          width: '100%', padding: '14px',
          background: loading
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 14, color: 'white',
          fontSize: 15, fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </div>
  )
}
