'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export interface Room {
  id: string;
  name: string;
  invite_code: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  name: string;
  room_id: string | null;
  mood_status: string | null;
  created_at?: string;
  rooms: Room | null;
}

export function useRoom() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          router.push('/login')
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, rooms(*)')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profileData) {
          router.push('/onboarding')
          return
        }

        if (!profileData.room_id) {
          router.push('/onboarding')
          return
        }

        setProfile(profileData as Profile)
        setRoom(profileData.rooms as Room)
        setRoomId(profileData.room_id)
        setUserId(session.user.id)
        setLoading(false)
      } catch (err) {
        console.error('Error in useRoom init:', err)
        router.push('/login')
      }
    }
    init()
  }, [router])

  return { profile, room, roomId, userId, loading }
}
