'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          window.location.replace('/login')
          return
        }

        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('room_id, name')
          .eq('id', session.user.id)
          .single()

        if (!profile) {
          // Create profile for Google user
          await supabase.from('profiles').insert({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name ||
                  session.user.email?.split('@')[0] || 'User',
            mood_status: 'Available',
            avatar_color: '#3a3a4a'
          })
          window.location.replace('/onboarding')
          return
        }

        // Check pending invite code from localStorage
        const pendingCode = localStorage.getItem('pendingInviteCode')
        if (pendingCode) {
          localStorage.removeItem('pendingInviteCode')
          window.location.replace(`/join/${pendingCode}`)
          return
        }

        if (!profile.room_id) {
          window.location.replace('/onboarding')
        } else {
          window.location.replace('/')
        }

      } catch (err) {
        console.error('Auth callback error:', err)
        window.location.replace('/login')
      }
    }

    handleCallback()
  }, [])

  return (
    <div style={{
      background: '#111118',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }}>
      <div style={{
        width: 28,
        height: 28,
        border: '2px solid rgba(255,255,255,0.10)',
        borderTop: '2px solid rgba(255,255,255,0.60)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{
        color: 'rgba(255,255,255,0.35)',
        fontSize: 13
      }}>
        Signing you in...
      </p>
    </div>
  )
}
