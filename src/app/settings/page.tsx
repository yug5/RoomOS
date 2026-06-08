'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRoomContext } from '@/lib/RoomContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import GlassCard from '@/components/GlassCard'
import { PullToRefresh } from '@/components/PullToRefresh'

const avatarColors = [
  '#3a3a4a', '#5c4d8a', '#2d6a4f', '#1d4e89',
  '#7d2e2e', '#6b4c2a', '#1a5f7a', '#4a4a2a',
  '#5a2d6a', '#2a4a5a'
]

export default function SettingsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const {
    profile,
    userId,
    loading,
    initialized,
    refetchProfile,
    refetchAll
  } = useRoomContext()

  const [editingName, setEditingName] = useState(false)
  const [editingUpi, setEditingUpi] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [upiVal, setUpiVal] = useState('')
  const [showMoodModal, setShowMoodModal] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  useEffect(() => {
    if (profile) {
      setNameVal(profile.name || '')
      setUpiVal(profile.upi_id || '')
    }
  }, [profile])

  if (loading && !initialized) {
    return (
      <div className="w-8 h-8 border-2 border-white/20 border-t-transparent rounded-full animate-spin mx-auto mt-20" />
    )
  }

  const saveField = async (field: 'name' | 'upi_id', value: string) => {
    if (!userId) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value.trim() })
        .eq('id', userId)
      if (error) throw error
      await refetchProfile()
      showToast(field === 'name' ? 'Name updated' : 'UPI ID updated')
    } catch (err) {
      console.error(err)
      showToast('Failed to update', 'error')
    }
  }

  const changeAvatarColor = async (color: string) => {
    if (!userId) return
    navigator.vibrate?.(10)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_color: color })
        .eq('id', userId)
      if (error) throw error
      await refetchProfile()
      showToast('Avatar updated')
    } catch (err) {
      console.error(err)
      showToast('Failed to update avatar', 'error')
    }
  }

  const handleMoodSelect = async (mood: string) => {
    if (!userId) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mood_status: mood })
        .eq('id', userId)
      if (error) throw error
      await refetchProfile()
      setShowMoodModal(false)
      showToast('Mood updated')
    } catch (err) {
      console.error(err)
      showToast('Failed to update mood', 'error')
    }
  }

  const handleSignOut = async () => {
    navigator.vibrate?.(10)
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const handleLeaveRoom = async () => {
    if (!userId) return
    navigator.vibrate?.(10)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ room_id: null })
        .eq('id', userId)
      if (error) throw error
      window.location.replace('/onboarding')
    } catch (err) {
      console.error(err)
      showToast('Failed to leave room', 'error')
    }
  }



  return (
    <main className="flex-1 flex flex-col bg-[#111118] min-h-screen relative" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
      <PullToRefresh onRefresh={() => refetchAll()}>
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => { navigator.vibrate?.(10); router.push('/profile'); }}
            className="p-1 bg-transparent border-0 focus:outline-none cursor-pointer text-white/60 hover:text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg select-none">Settings</h1>
          <div className="w-8" />
        </div>

        {/* Avatar color card */}
        <GlassCard className="p-5 flex flex-col gap-4" style={{ marginBottom: 16 }}>
          <h3 className="text-white/35 text-[11px] font-semibold tracking-wider uppercase">
            YOUR AVATAR
          </h3>
          <div className="flex flex-col items-center gap-2">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
              style={{ background: profile?.avatar_color || '#3a3a4a' }}
            >
              {(profile?.name || 'U')[0].toUpperCase()}
            </div>
            <span className="text-[12px] text-white/45">Choose avatar background color</span>
          </div>

          <div className="grid grid-cols-5 gap-2.5 mt-2">
            {avatarColors.map((color) => {
              const isSelected = profile?.avatar_color === color;
              return (
                <button
                  key={color}
                  onClick={() => changeAvatarColor(color)}
                  className="w-8 h-8 rounded-full border-0 cursor-pointer relative"
                  style={{ background: color }}
                >
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-white rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Profile details card */}
        <GlassCard className="p-5 flex flex-col" style={{ marginBottom: 16 }}>
          <h3 className="text-white/35 text-[11px] font-semibold tracking-wider uppercase mb-2">
            PROFILE DETAILS
          </h3>

          {/* Name Row */}
          <div className="flex flex-col gap-2 py-[14px]">
            <span className="text-[12px] text-white/45">Display Name</span>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/20 text-sm"
                  maxLength={15}
                />
                <button
                  onClick={() => { setEditingName(false); saveField('name', nameVal); }}
                  className="px-3 py-1.5 bg-white/12 hover:bg-white/18 text-white rounded-lg text-xs font-bold border-0 cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameVal(profile?.name || ''); }}
                  className="px-3 py-1.5 bg-white/5 text-white/50 rounded-lg text-xs border-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-white text-sm font-semibold">{profile?.name}</span>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-white/50 bg-transparent border-0 cursor-pointer"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div className="h-[1px] bg-white/[0.05] m-0" />

          {/* UPI ID Row */}
          <div className="flex flex-col gap-2 py-[14px]">
            <span className="text-[12px] text-white/45">UPI ID (for Settle Up)</span>
            {editingUpi ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={upiVal}
                  onChange={(e) => setUpiVal(e.target.value)}
                  className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/20 text-sm"
                  placeholder="username@bank"
                />
                <button
                  onClick={() => { setEditingUpi(false); saveField('upi_id', upiVal); }}
                  className="px-3 py-1.5 bg-white/12 hover:bg-white/18 text-white rounded-lg text-xs font-bold border-0 cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingUpi(false); setUpiVal(profile?.upi_id || ''); }}
                  className="px-3 py-1.5 bg-white/5 text-white/50 rounded-lg text-xs border-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-white text-sm font-semibold truncate max-w-[200px]">
                  {profile?.upi_id || 'Not set'}
                </span>
                <button
                  onClick={() => setEditingUpi(true)}
                  className="text-xs text-white/50 bg-transparent border-0 cursor-pointer"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div className="h-[1px] bg-white/[0.05] m-0" />

          {/* Mood Status Row */}
          <div className="flex justify-between items-center py-[14px]">
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] text-white/45">Your Status</span>
              <span className="text-white text-sm font-semibold">{profile?.mood_status || 'Available'}</span>
            </div>
            <button
              onClick={() => { navigator.vibrate?.(10); setShowMoodModal(true); }}
              className="text-xs text-white/50 bg-transparent border-0 cursor-pointer"
            >
              Update
            </button>
          </div>
        </GlassCard>

        {/* Danger zone card */}
        <GlassCard className="p-5 flex flex-col gap-[16px] border-red-900/30">
          <h3 className="text-red-400/60 text-[11px] font-semibold tracking-wider uppercase">
            DANGER ZONE
          </h3>
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 12,
              padding: '13px 16px',
              color: 'rgba(255,255,255,0.70)',
              fontSize: 14,
              fontWeight: 500,
              width: '100%',
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: 10
            }}
          >
            Logout
          </button>
          
          <div style={{ marginBottom: 8 }} />

          {showLeaveConfirm ? (
            <div className="flex flex-col gap-3 pt-3 border-t border-white/[0.05] animate-fade-in">
              <span className="text-xs text-red-300">Are you sure? You will lose access to all shared expenses, chores, and notes in this room.</span>
              <div className="flex gap-2">
                <button
                  onClick={handleLeaveRoom}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold border-0 cursor-pointer"
                >
                  Yes, Leave Room
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-2 bg-white/5 text-white/60 rounded-lg text-xs border-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              style={{
                color: 'rgba(255,100,100,0.65)',
                border: '1px solid rgba(255,100,100,0.15)',
                background: 'rgba(255,100,100,0.06)',
                borderRadius: 12,
                padding: '13px 16px',
                fontSize: 14,
                fontWeight: 500,
                width: '100%',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              Leave Room
            </button>
          )}
        </GlassCard>

        {/* Mood Modal */}
        {showMoodModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[8px]">
            <div className="absolute inset-0" onClick={() => setShowMoodModal(false)} />
            <div className="relative w-full max-w-[430px] bg-[#111118]/95 rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-[40px] border-t border-white/[0.12]" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom) + 80px)", maxHeight: "85vh", overflowY: "auto" }}>
              <h3 className="text-white font-bold text-[18px]">Set your mood</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {["Studying", "Sleeping", "Up for food", 
                  "Gaming", "Working", "Available",
                  "Do not disturb", "Out", "Chilling"].map((mood) => {
                  const isSelected = profile?.mood_status === mood;
                  return (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => { navigator.vibrate?.(10); handleMoodSelect(mood); }}
                      className="p-0 border-0 bg-transparent text-left cursor-pointer"
                    >
                      <GlassCard
                        className="p-[10px] text-center text-white text-[13px] font-medium transition-colors"
                        style={{
                          border: isSelected ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.10)",
                          background: isSelected ? "rgba(255, 255, 255, 0.15)" : "rgba(255,255,255,0.07)"
                        }}
                      >
                        {mood}
                      </GlassCard>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => { navigator.vibrate?.(10); setShowMoodModal(false); }}
                className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none cursor-pointer mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </PullToRefresh>
    </main>
  )
}
