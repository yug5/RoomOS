'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CACHE_KEYS = {
  profile: 'roomos_profile',
  room: 'roomos_room',
  expenses: 'roomos_expenses',
  shoppingItems: 'roomos_shopping',
  chores: 'roomos_chores',
  notes: 'roomos_notes',
  activity: 'roomos_activity',
  members: 'roomos_members',
  userId: 'roomos_userId',
  roomId: 'roomos_roomId',
}

const getCache = (key: string) => {
  try {
    const val = sessionStorage.getItem(key)
    return val ? JSON.parse(val) : null
  } catch { return null }
}

const setCache = (key: string, value: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

const clearCache = () => {
  try {
    Object.values(CACHE_KEYS).forEach(k => sessionStorage.removeItem(k))
  } catch {}
}

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
  avatar_color?: string | null;
  created_at?: string;
  rooms?: Room | null;
  streak_count?: number;
  streak_last_active?: string | null;
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
  expense_date?: string;
  splits?: { user_id: string; amount: number }[] | null;
  profiles?: {
    name: string;
    avatar_color?: string | null;
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
    avatar_color?: string | null;
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
  initialized: boolean
  refetchExpenses: () => Promise<void>
  refetchShopping: () => Promise<void>
  refetchChores: () => Promise<void>
  refetchNotes: () => Promise<void>
  refetchActivity: () => Promise<void>
  refetchProfile: () => Promise<void>
  refetchAll: () => Promise<void>
  setShoppingItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>
  setChores: React.Dispatch<React.SetStateAction<ChoreItem[]>>
  clearCache: () => void
}

const RoomContext = createContext<RoomContextType | null>(null)

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
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
  const [initialized, setInitialized] = useState(false)

  const refetchExpenses = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase.from('expenses')
      .select('*, profiles(name, avatar_color)')
      .eq('room_id', roomId)
      .order('expense_date', { ascending: false })
    setExpenses((data as ExpenseItem[]) || [])
    setCache(CACHE_KEYS.expenses, data || [])
  }, [roomId])

  const refetchShopping = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase.from('shopping_items')
      .select('*').eq('room_id', roomId)
      .order('created_at', { ascending: false })
    setShoppingItems((data as ShoppingItem[]) || [])
    setCache(CACHE_KEYS.shoppingItems, data || [])
  }, [roomId])

  const refetchChores = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase.from('chores')
      .select('*, profiles:assignee(name, avatar_color)').eq('room_id', roomId)
      .order('created_at', { ascending: false })
    setChores((data as ChoreItem[]) || [])
    setCache(CACHE_KEYS.chores, data || [])
  }, [roomId])

  const refetchNotes = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase.from('notes')
      .select('*').eq('room_id', roomId)
      .order('created_at', { ascending: false })
    setNotes((data as NoteItem[]) || [])
    setCache(CACHE_KEYS.notes, data || [])
  }, [roomId])

  const refetchActivity = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase.from('activity')
      .select('*').eq('room_id', roomId)
      .order('created_at', { ascending: false }).limit(20)
    setActivity((data as ActivityItem[]) || [])
    setCache(CACHE_KEYS.activity, data || [])
  }, [roomId])

  const refetchProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('profiles')
      .select('*, rooms(*)').eq('id', userId).single()
    if (data) {
      setProfile(data as Profile)
      setRoom(data.rooms as Room)
      setCache(CACHE_KEYS.profile, data)
      setCache(CACHE_KEYS.room, data.rooms)
      
      // Also refetch members to keep roommates list up to date
      if (data.room_id) {
        const { data: mem } = await supabase.from('profiles').select('*').eq('room_id', data.room_id)
        setMembers((mem as Profile[]) || [])
        setCache(CACHE_KEYS.members, mem || [])
      }
    }
  }, [userId])

  const silentRefresh = useCallback(async (
    rId: string, 
    uId: string
  ) => {
    try {
      // Verify session still valid
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        clearCache()
        router.push('/login')
        return
      }

      // Fetch fresh data in parallel
      const [
        profResult,
        expResult,
        shopResult,
        chrResult,
        ntsResult,
        actResult,
        memResult
      ] = await Promise.all([
        supabase.from('profiles')
          .select('*, rooms(*)')
          .eq('id', uId)
          .single(),
        supabase.from('expenses')
          .select('*, profiles(name, avatar_color)')
          .eq('room_id', rId)
          .order('expense_date', { ascending: false }),
        supabase.from('shopping_items')
          .select('*')
          .eq('room_id', rId)
          .order('created_at', { ascending: false }),
        supabase.from('chores')
          .select('*, profiles:assignee(name, avatar_color)')
          .eq('room_id', rId)
          .order('created_at', { ascending: false }),
        supabase.from('notes')
          .select('*')
          .eq('room_id', rId)
          .order('created_at', { ascending: false }),
        supabase.from('activity')
          .select('*')
          .eq('room_id', rId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('profiles')
          .select('*')
          .eq('room_id', rId)
      ])

      // Update state silently — no loading flash
      if (profResult.data) {
        setProfile(profResult.data as Profile)
        setRoom(profResult.data.rooms as Room)
        setCache(CACHE_KEYS.profile, profResult.data)
        setCache(CACHE_KEYS.room, profResult.data.rooms)
      }
      if (expResult.data) {
        setExpenses((expResult.data as ExpenseItem[]) || [])
        setCache(CACHE_KEYS.expenses, expResult.data)
      }
      if (shopResult.data) {
        setShoppingItems((shopResult.data as ShoppingItem[]) || [])
        setCache(CACHE_KEYS.shoppingItems, shopResult.data)
      }
      if (chrResult.data) {
        setChores((chrResult.data as ChoreItem[]) || [])
        setCache(CACHE_KEYS.chores, chrResult.data)
      }
      if (ntsResult.data) {
        setNotes((ntsResult.data as NoteItem[]) || [])
        setCache(CACHE_KEYS.notes, ntsResult.data)
      }
      if (actResult.data) {
        setActivity((actResult.data as ActivityItem[]) || [])
        setCache(CACHE_KEYS.activity, actResult.data)
      }
      if (memResult.data) {
        setMembers((memResult.data as Profile[]) || [])
        setCache(CACHE_KEYS.members, memResult.data)
      }

    } catch (err) {
      console.error('Silent refresh error:', err)
    }
  }, [router])

  const refetchAll = useCallback(async () => {
    if (!roomId || !userId) return
    await silentRefresh(roomId, userId)
  }, [roomId, userId, silentRefresh])

  const updateStreak = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data: prof } = await supabase
      .from('profiles')
      .select('streak_last_active, streak_count')
      .eq('id', userId)
      .single()
    
    if (!prof) return
    
    const last = prof.streak_last_active
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    if (last === today) return // already updated today
    
    const newStreak = last === yesterdayStr 
      ? (prof.streak_count || 0) + 1  // consecutive day
      : 1  // streak broken, restart
    
    await supabase.from('profiles')
      .update({ 
        streak_last_active: today, 
        streak_count: newStreak 
      })
      .eq('id', userId)
  }

  const handleClearCache = useCallback(() => {
    clearCache()
  }, [])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        // Check session cache first
        const cachedProfile = getCache(CACHE_KEYS.profile)
        const cachedRoom = getCache(CACHE_KEYS.room)
        const cachedUserId = getCache(CACHE_KEYS.userId)
        const cachedRoomId = getCache(CACHE_KEYS.roomId)

        if (
          cachedProfile && 
          cachedRoom && 
          cachedUserId && 
          cachedRoomId
        ) {
          // Load from cache instantly — app shows immediately
          setProfile(cachedProfile)
          setRoom(cachedRoom)
          setUserId(cachedUserId)
          setRoomId(cachedRoomId)
          setExpenses(getCache(CACHE_KEYS.expenses) || [])
          setShoppingItems(getCache(CACHE_KEYS.shoppingItems) || [])
          setChores(getCache(CACHE_KEYS.chores) || [])
          setNotes(getCache(CACHE_KEYS.notes) || [])
          setActivity(getCache(CACHE_KEYS.activity) || [])
          setMembers(getCache(CACHE_KEYS.members) || [])
          setInitialized(true)
          setLoading(false)

          // Quietly refresh in background
          silentRefresh(cachedRoomId, cachedUserId)
          return
        }

        // No cache — full load
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (!session || error) {
          setLoading(false)
          router.push('/login')
          return
        }

        const { data: prof } = await supabase
          .from('profiles')
          .select('*, rooms(*)')
          .eq('id', session.user.id)
          .single()

        if (!mounted) return

        if (!prof?.room_id) {
          setLoading(false)
          router.push('/onboarding')
          return
        }

        // Streak count update
        await updateStreak(session.user.id)

        // Refetch profile to get fresh streak data
        const { data: freshProf } = await supabase
          .from('profiles')
          .select('*, rooms(*)')
          .eq('id', session.user.id)
          .single()

        const activeProf = freshProf || prof

        // Fetch all data in parallel
        const [
          { data: exp },
          { data: shop },
          { data: chr },
          { data: nts },
          { data: act },
          { data: mem }
        ] = await Promise.all([
          supabase.from('expenses')
            .select('*, profiles(name, avatar_color)')
            .eq('room_id', activeProf.room_id)
            .order('expense_date', { ascending: false }),
          supabase.from('shopping_items')
            .select('*')
            .eq('room_id', activeProf.room_id)
            .order('created_at', { ascending: false }),
          supabase.from('chores')
            .select('*, profiles:assignee(name, avatar_color)')
            .eq('room_id', activeProf.room_id)
            .order('created_at', { ascending: false }),
          supabase.from('notes')
            .select('*')
            .eq('room_id', activeProf.room_id)
            .order('created_at', { ascending: false }),
          supabase.from('activity')
            .select('*')
            .eq('room_id', activeProf.room_id)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase.from('profiles')
            .select('*')
            .eq('room_id', activeProf.room_id)
        ])

        if (!mounted) return

        // Set state
        setProfile(activeProf)
        setRoom(activeProf.rooms)
        setRoomId(activeProf.room_id)
        setUserId(session.user.id)
        setExpenses((exp as ExpenseItem[]) || [])
        setShoppingItems((shop as ShoppingItem[]) || [])
        setChores((chr as ChoreItem[]) || [])
        setNotes((nts as NoteItem[]) || [])
        setActivity((act as ActivityItem[]) || [])
        setMembers((mem as Profile[]) || [])

        // Save everything to cache
        setCache(CACHE_KEYS.profile, activeProf)
        setCache(CACHE_KEYS.room, activeProf.rooms)
        setCache(CACHE_KEYS.userId, session.user.id)
        setCache(CACHE_KEYS.roomId, activeProf.room_id)
        setCache(CACHE_KEYS.expenses, exp || [])
        setCache(CACHE_KEYS.shoppingItems, shop || [])
        setCache(CACHE_KEYS.chores, chr || [])
        setCache(CACHE_KEYS.notes, nts || [])
        setCache(CACHE_KEYS.activity, act || [])
        setCache(CACHE_KEYS.members, mem || [])

        setInitialized(true)
        setLoading(false)

      } catch (err) {
        console.error('Init error:', err)
        if (mounted) {
          setLoading(false)
          router.push('/login')
        }
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          clearCache()
          router.push('/login')
        }
      }
    )

    return () => { 
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialized, router, silentRefresh])

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
      profile, room, roomId, userId, loading, initialized,
      expenses, shoppingItems, chores, notes, activity, members,
      refetchExpenses, refetchShopping, refetchChores,
      refetchNotes, refetchActivity, refetchProfile, refetchAll,
      setShoppingItems, setChores, clearCache: handleClearCache
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
