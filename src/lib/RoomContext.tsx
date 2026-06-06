'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  upi_id: string | null;
  created_at?: string;
  rooms?: Room | null;
}

export interface ExpenseItem {
  id: string | number;
  room_id: string;
  name: string;
  amount: number;
  category: string;
  paid_by: string;
  is_recurring: boolean;
  is_settled: boolean;
  created_at: string;
  profiles?: {
    name: string;
  } | null;
}

export interface ShoppingItem {
  id: string | number;
  room_id: string;
  name: string;
  done: boolean;
  created_at: string;
}

export interface ChoreItem {
  id: string | number;
  room_id: string;
  name: string;
  assignee: string;
  due_date: string;
  done: boolean;
  created_at: string;
  profiles?: {
    name: string;
  } | null;
}

export interface NoteItem {
  id: string | number;
  room_id: string;
  text: string;
  created_by: string;
  created_at: string;
}

export interface ActivityItem {
  id: string | number;
  room_id: string;
  user_name: string;
  action: string;
  created_at: string;
}

type RoomContextType = {
  profile: Profile | null
  room: Room | null
  roomId: string | null
  userId: string | null
  expenses: ExpenseItem[]
  shoppingItems: ShoppingItem[]
  chores: ChoreItem[]
  notes: NoteItem[]
  activity: ActivityItem[]
  members: Profile[]
  loading: boolean
  refetchExpenses: () => Promise<void>
  refetchShopping: () => Promise<void>
  refetchChores: () => Promise<void>
  refetchNotes: () => Promise<void>
  refetchActivity: () => Promise<void>
  refetchProfile: () => Promise<void>
}

const RoomContext = createContext<RoomContextType | null>(null)

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [chores, setChores] = useState<ChoreItem[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const isPublicRoute = pathname === '/login' || pathname === '/onboarding'

  const fetchAll = useCallback(async (rId: string) => {
    const [
      { data: exp },
      { data: shop },
      { data: chr },
      { data: nts },
      { data: act },
      { data: mem }
    ] = await Promise.all([
      supabase.from('expenses').select('*, profiles(name)')
        .eq('room_id', rId).order('created_at', { ascending: false }),
      supabase.from('shopping_items').select('*')
        .eq('room_id', rId).order('created_at', { ascending: false }),
      supabase.from('chores').select('*, profiles:assignee(name)')
        .eq('room_id', rId).order('created_at', { ascending: false }),
      supabase.from('notes').select('*')
        .eq('room_id', rId).order('created_at', { ascending: false }),
      supabase.from('activity').select('*')
        .eq('room_id', rId).order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('*').eq('room_id', rId)
    ])
    setExpenses((exp as ExpenseItem[]) || [])
    setShoppingItems((shop as ShoppingItem[]) || [])
    setChores((chr as ChoreItem[]) || [])
    setNotes((nts as NoteItem[]) || [])
    setActivity((act as ActivityItem[]) || [])
    setMembers((mem as Profile[]) || [])
  }, [])

  const refetchExpenses = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase.from('expenses')
      .select('*, profiles(name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
    setExpenses((data as ExpenseItem[]) || [])
  }, [roomId])

  const refetchShopping = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase.from('shopping_items')
      .select('*').eq('room_id', roomId)
      .order('created_at', { ascending: false })
    setShoppingItems((data as ShoppingItem[]) || [])
  }, [roomId])

  const refetchChores = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase.from('chores')
      .select('*, profiles:assignee(name)').eq('room_id', roomId)
      .order('created_at', { ascending: false })
    setChores((data as ChoreItem[]) || [])
  }, [roomId])

  const refetchNotes = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase.from('notes')
      .select('*').eq('room_id', roomId)
      .order('created_at', { ascending: false })
    setNotes((data as NoteItem[]) || [])
  }, [roomId])

  const refetchActivity = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase.from('activity')
      .select('*').eq('room_id', roomId)
      .order('created_at', { ascending: false }).limit(10)
    setActivity((data as ActivityItem[]) || [])
  }, [roomId])

  const refetchProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('profiles')
      .select('*, rooms(*)').eq('id', userId).single()
    if (data) {
      setProfile(data as Profile)
      setRoom(data.rooms as Room)
      
      // Also refetch members to keep roommates list up to date
      if (data.room_id) {
        const { data: mem } = await supabase.from('profiles').select('*').eq('room_id', data.room_id)
        setMembers((mem as Profile[]) || [])
      }
    }
  }, [userId])

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false)
      return
    }

    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          router.push('/login')
          return
        }
        
        const { data: prof, error: profError } = await supabase
          .from('profiles').select('*, rooms(*)')
          .eq('id', session.user.id).single()
        
        if (profError || !prof?.room_id) {
          router.push('/onboarding')
          return
        }

        setProfile(prof as Profile)
        setRoom(prof.rooms as Room)
        setRoomId(prof.room_id)
        setUserId(session.user.id)
        
        await fetchAll(prof.room_id)
        setLoading(false)
      } catch (err) {
        console.error('Error initializing RoomContext:', err)
        router.push('/login')
      }
    }
    init()
  }, [pathname, isPublicRoute, router, fetchAll])

  // Realtime subscriptions for all tables
  useEffect(() => {
    if (!roomId) return
    const channel = supabase.channel('room-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'expenses',
        filter: `room_id=eq.${roomId}`
      }, refetchExpenses)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'shopping_items',
        filter: `room_id=eq.${roomId}`
      }, refetchShopping)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chores',
        filter: `room_id=eq.${roomId}`
      }, refetchChores)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notes',
        filter: `room_id=eq.${roomId}`
      }, refetchNotes)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'activity',
        filter: `room_id=eq.${roomId}`
      }, refetchActivity)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'profiles',
        filter: `room_id=eq.${roomId}`
      }, refetchProfile)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, refetchExpenses, refetchShopping, refetchChores, refetchNotes, refetchActivity, refetchProfile])

  return (
    <RoomContext.Provider value={{
      profile, room, roomId, userId, loading,
      expenses, shoppingItems, chores, notes, activity, members,
      refetchExpenses, refetchShopping, refetchChores,
      refetchNotes, refetchActivity, refetchProfile
    }}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRoomContext() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoomContext must be used inside RoomProvider')
  return ctx
}
