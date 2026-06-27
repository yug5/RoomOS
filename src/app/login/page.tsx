'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { signInWithGoogle, sendOTP, verifyOTP } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<'password'|'otp'>('password')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [needsName, setNeedsName] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [signupStep, setSignupStep] = useState<'details'|'verify'>('details')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupOtp, setSignupOtp] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

  // Forgot password states
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)

  const handleForgotPassword = async () => {
    setForgotError('')
    setForgotSuccess(false)
    setForgotLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim(),
        {
          redirectTo: `${window.location.origin}/auth/reset-password`
        }
      )

      if (error) {
        setForgotError(error.message)
      } else {
        setForgotSuccess(true)
        setTimeout(() => {
          setShowForgot(false)
          setForgotEmail('')
          setForgotSuccess(false)
        }, 3000)
      }
    } catch {
      setForgotError('Something went wrong')
    } finally {
      setForgotLoading(false)
    }
  }

  useEffect(() => {
    // Clear stale session on login page
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('room_id')
          .eq('id', session.user.id)
          .single()
        if (prof?.room_id) {
          window.location.replace('/')
        } else {
          window.location.replace('/onboarding')
        }
      }
    }
    check()
  }, [])

  // Password sign in (sign in only — signup uses separate flow)
  const handlePasswordAuth = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Wait a moment for session to persist
      await new Promise(r => setTimeout(r, 500))

      // Check if profile exists and has room
      const { data: prof } = await supabase
        .from('profiles')
        .select('room_id')
        .eq('id', data.user?.id)
        .single()

      const pendingCode = localStorage.getItem('pendingInviteCode')
      if (pendingCode) {
        localStorage.removeItem('pendingInviteCode')
        window.location.href = `/join/${pendingCode}`
      } else if (!prof?.room_id) {
        router.push('/onboarding')
      } else {
        // Force hard redirect
        window.location.href = '/'
      }
    } catch {
      setError('Sign in failed')
    }
    setLoading(false)
  }

  // Signup flow — Step 1: send OTP
  const handleSendSignupOTP = async () => {
    if (!signupName.trim() || !signupEmail || !signupPassword) {
      setError('Please fill all fields')
      return
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSignupLoading(true)
    setError('')

    // Send OTP to verify email is real
    const { error } = await supabase.auth.signInWithOtp({
      email: signupEmail,
      options: { shouldCreateUser: true }
    })

    if (error) { setError(error.message); setSignupLoading(false); return }

    setSignupStep('verify')
    setSignupLoading(false)
  }

  // Signup flow — Step 2: verify OTP and create account
  const handleVerifyAndCreate = async () => {
    if (!signupOtp || signupOtp.length < 6) return
    setSignupLoading(true)
    setError('')

    // Verify OTP first
    const { data, error: otpError } = await supabase.auth.verifyOtp({
      email: signupEmail,
      token: signupOtp,
      type: 'email'
    })

    if (otpError) {
      setError('Invalid code. Please try again.')
      setSignupLoading(false)
      return
    }

    if (data.user) {
      // OTP verified — now update password and create profile
      const { error: pwError } = await supabase.auth.updateUser({
        password: signupPassword
      })

      if (pwError) {
        setError(pwError.message)
        setSignupLoading(false)
        return
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          name: signupName.trim(),
          mood_status: 'Available',
          avatar_color: '#3a3a4a'
        })

      if (profileError) {
        setError(profileError.message)
        setSignupLoading(false)
        return
      }

      // Go to onboarding
      window.location.replace('/onboarding')
    }
    setSignupLoading(false)
  }

  // OTP flow
  const handleSendOTP = async () => {
    if (!email) return
    setLoading(true)
    setError('')
    const { error } = await sendOTP(email)
    if (error) { setError(error.message); setLoading(false); return }
    setOtpSent(true)
    setMessage('Check your email for a 6-digit code')
    setLoading(false)
  }

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 6) return
    setLoading(true)
    setError('')

    const { data, error } = await verifyOTP(email, otpCode)
    if (error) { setError(error.message); setLoading(false); return }

    if (data.user) {
      const { data: prof } = await supabase
        .from('profiles').select('room_id, name').eq('id', data.user.id).single()

      if (!prof) {
        // New user — ask for name first
        setNeedsName(true)
        setLoading(false)
        return
      }

      // Existing user — route normally
      const pendingCode = localStorage.getItem('pendingInviteCode')
      if (pendingCode) {
        localStorage.removeItem('pendingInviteCode')
        window.location.replace(`/join/${pendingCode}`)
      } else if (prof?.room_id) {
        window.location.replace('/')
      } else {
        window.location.replace('/onboarding')
      }
    }
    setLoading(false)
  }

  const handleCreateProfile = async () => {
    if (!newUserName.trim()) return
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.replace('/login'); return }

    await supabase.from('profiles').insert({
      id: session.user.id,
      name: newUserName.trim(),
      mood_status: 'Available',
      avatar_color: '#3a3a4a'
    })

    window.location.replace('/onboarding')
  }

  // Input style reused
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: '14px 16px',
    color: 'white',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box'
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: '14px',
    color: 'white',
    fontSize: 15,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1
  }

  if (showForgot) {
    return (
      <div style={{ 
        background: '#111118', minHeight: '100vh',
        padding: '24px', maxWidth: '430px', margin: '0 auto'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', 
          marginBottom: 24, gap: 12
        }}>
          <button
            onClick={() => setShowForgot(false)}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.60)',
              fontSize: 24, cursor: 'pointer'
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 22, color: 'white', margin: 0 }}>
            Reset Password
          </h1>
        </div>

        <p style={{
          color: 'rgba(255,255,255,0.50)', fontSize: 14,
          marginBottom: 24, lineHeight: 1.5
        }}>
          Enter your email and we will send you a link to reset your password
        </p>

        <input
          type="email"
          placeholder="your@email.com"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          style={{
            width: '100%', padding: '14px 16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 14, color: 'white',
            fontSize: 16, marginBottom: 16,
            outline: 'none'
          }}
        />

        {forgotError && (
          <p style={{
            color: 'rgba(255,100,100,0.85)',
            fontSize: 13, marginBottom: 12
          }}>
            {forgotError}
          </p>
        )}

        {forgotSuccess && (
          <p style={{
            color: 'rgba(100,200,100,0.85)',
            fontSize: 13, marginBottom: 12
          }}>
            Check your email for reset link
          </p>
        )}

        <button
          onClick={handleForgotPassword}
          disabled={forgotLoading || !forgotEmail.trim()}
          style={{
            width: '100%', padding: '14px',
            background: forgotLoading 
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 14, color: 'white',
            fontSize: 15, fontWeight: 600,
            cursor: forgotLoading ? 'default' : 'pointer',
            opacity: forgotLoading ? 0.6 : 1
          }}
        >
          {forgotLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </div>
    )
  }

  return (
    <div style={{
      background: '#111118',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 24px',
      maxWidth: 430,
      margin: '0 auto'
    }}>
      {/* Subtle glow */}
      <div style={{
        position: 'fixed', top: -150, left: '50%',
        transform: 'translateX(-50%)',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div style={{ width: '100%', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-0.5px'
          }}>
            RoomOS
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 14,
            marginTop: 6
          }}>
            Your digital home
          </div>
        </div>


        {/* Auth mode tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 999,
          padding: 4,
          marginBottom: 24,
          gap: 4
        }}>
          {(['password', 'otp'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => { setAuthMode(mode); setError(''); setOtpSent(false) }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 999,
                border: 'none',
                background: authMode === mode 
                  ? 'rgba(255,255,255,0.12)' 
                  : 'transparent',
                color: authMode === mode 
                  ? 'white' 
                  : 'rgba(255,255,255,0.35)',
                fontSize: 13,
                fontWeight: authMode === mode ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              {mode === 'password' ? 'Password' : 'Email OTP'}
            </button>
          ))}
        </div>

        {/* Google button - always visible */}
        <button
          onClick={() => signInWithGoogle()}
          style={{
            ...buttonStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 16,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)'
          }}
        >
          {/* Google SVG icon */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Password mode */}
        {authMode === 'password' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isSignUp ? (
              <>
                {/* Step indicator dots */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: signupStep === 'details' ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.20)'
                  }} />
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: signupStep === 'verify' ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.20)'
                  }} />
                </div>

                {signupStep === 'details' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendSignupOTP()}
                      style={inputStyle}
                    />
                    <button
                      onClick={handleSendSignupOTP}
                      disabled={signupLoading}
                      style={{ ...buttonStyle, marginTop: 4, cursor: signupLoading ? 'not-allowed' : 'pointer', opacity: signupLoading ? 0.6 : 1 }}
                    >
                      {signupLoading ? 'Sending code...' : 'Send Verification Code'}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.45)',
                      fontSize: 13
                    }}>
                      We sent a code to {signupEmail}
                    </div>
                    <input
                      type="number"
                      placeholder="6-digit code"
                      value={signupOtp}
                      onChange={e => setSignupOtp(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleVerifyAndCreate()}
                      style={{
                        ...inputStyle,
                        letterSpacing: '0.2em',
                        textAlign: 'center',
                        fontSize: 20
                      }}
                      maxLength={6}
                      autoFocus
                    />
                    <button
                      onClick={handleVerifyAndCreate}
                      disabled={signupLoading}
                      style={{ ...buttonStyle, marginTop: 4, cursor: signupLoading ? 'not-allowed' : 'pointer', opacity: signupLoading ? 0.6 : 1 }}
                    >
                      {signupLoading ? 'Creating account...' : 'Verify & Create Account'}
                    </button>
                    <button
                      onClick={() => { setSignupStep('details'); setSignupOtp(''); setError('') }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      Back
                    </button>
                  </>
                )}

                <button
                  onClick={() => { setIsSignUp(false); setError(''); setSignupStep('details'); setSignupOtp('') }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: '4px'
                  }}
                >
                  Already have an account? Sign in
                </button>
              </>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordAuth()}
                  style={inputStyle}
                />
                <button
                  onClick={handlePasswordAuth}
                  disabled={loading}
                  style={{ ...buttonStyle, marginTop: 4 }}
                >
                  {loading ? 'Please wait...' : 'Sign In'}
                </button>
                <button
                  onClick={() => { navigator.vibrate?.(10); setShowForgot(true); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.40)',
                    fontSize: 13,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    marginTop: 12,
                    fontFamily: 'inherit'
                  }}
                >
                  Forgot password?
                </button>
                <button
                  onClick={() => { setIsSignUp(true); setError('') }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: '4px'
                  }}
                >
                  Don&apos;t have an account? Sign up
                </button>
              </>
            )}
          </div>
        )}

        {/* OTP mode */}
        {authMode === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {needsName ? (
              <>
                <div style={{
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 13,
                  marginBottom: 4
                }}>
                  One last thing — what should we call you?
                </div>
                <input
                  type="text"
                  placeholder="Your name"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateProfile()}
                  style={inputStyle}
                  autoFocus
                />
                <button
                  onClick={handleCreateProfile}
                  disabled={loading || !newUserName.trim()}
                  style={{ ...buttonStyle, marginTop: 4 }}
                >
                  {loading ? 'Setting up...' : 'Continue'}
                </button>
              </>
            ) : otpSent ? (
              <>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  disabled
                />
                <input
                  type="number"
                  placeholder="6-digit code"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                  style={{
                    ...inputStyle,
                    letterSpacing: '0.2em',
                    textAlign: 'center',
                    fontSize: 20
                  }}
                  maxLength={6}
                />
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  style={{ ...buttonStyle, marginTop: 4 }}
                >
                  {loading ? 'Please wait...' : 'Verify Code'}
                </button>
                <button
                  onClick={() => { setOtpSent(false); setOtpCode(''); setMessage('') }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  Use different email
                </button>
              </>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  style={{ ...buttonStyle, marginTop: 4 }}
                >
                  {loading ? 'Please wait...' : 'Send Code'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 12,
            color: 'rgba(255,100,100,0.85)',
            fontSize: 13,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Message */}
        {message && !error && (
          <div style={{
            marginTop: 12,
            color: 'rgba(255,255,255,0.45)',
            fontSize: 13,
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
