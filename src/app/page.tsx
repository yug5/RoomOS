'use client'

import React, { useState, useEffect, useCallback } from "react";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { useRoomContext } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { X } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";

interface Poll {
  id: string;
  room_id: string;
  question: string;
  option_a: string;
  option_b: string;
  vote_a: string | null;
  vote_b: string | null;
  created_at: string;
}



const isCurrentMonth = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

export default function Home() {
  const { showToast } = useToast();
  const {
    profile,
    room,
    roomId,
    userId,
    loading,
    initialized,
    expenses,
    shoppingItems,
    chores,
    notes,
    activity,
    members,
    refetchProfile,
    refetchExpenses,
    refetchActivity,
    refetchAll
  } = useRoomContext();

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [dismissedMilestone, setDismissedMilestone] = useState(false);

  // Poll states
  const [poll, setPoll] = useState<Poll | null>(null);
  const [showNewPoll, setShowNewPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptionA, setPollOptionA] = useState("");
  const [pollOptionB, setPollOptionB] = useState("");
  const [creatingPoll, setCreatingPoll] = useState(false);

  // Quick Add Expense states
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickExpenseName, setQuickExpenseName] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState("Food");
  const [quickPaidBy, setQuickPaidBy] = useState("");
  const [savingQuickExpense, setSavingQuickExpense] = useState(false);
  const [quickSplitType, setQuickSplitType] = useState<'equal'|'percent'|'amount'>('equal');
  const [quickMemberSplits, setQuickMemberSplits] = useState<Record<string, number>>({});
  const [quickIsRecurring, setQuickIsRecurring] = useState(false);
  const [quickExpenseDate, setQuickExpenseDate] = useState(() => {
    const now = new Date()
    return now.toISOString().slice(0, 16)
  });

  const [quickNameSuggestions, setQuickNameSuggestions] = useState<string[]>([]);
  const [spotlessDismissed, setSpotlessDismissed] = useState(false);

  const pastNames = Array.from(new Set(expenses.map((e) => e.name))).slice(0, 15);

  const handleQuickNameChange = (val: string) => {
    setQuickExpenseName(val);
    if (val.length > 1) {
      const matches = pastNames.filter(n =>
        n.toLowerCase().startsWith(val.toLowerCase()) &&
        n.toLowerCase() !== val.toLowerCase()
      );
      setQuickNameSuggestions(matches.slice(0, 4));
    } else {
      setQuickNameSuggestions([]);
    }
  };

  useEffect(() => {
    if (userId) {
      setQuickPaidBy(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (showQuickAdd) {
      const initialSplits: Record<string, number> = {};
      members.forEach((m) => {
        initialSplits[m.id] = 0;
      });
      setQuickMemberSplits(initialSplits);
      setQuickSplitType("equal");
      setQuickIsRecurring(false);
      
      const now = new Date()
      setQuickExpenseDate(now.toISOString().slice(0, 16))
      setQuickNameSuggestions([])
    }
  }, [showQuickAdd, members]);

  const fetchPoll = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('polls')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1);
    setPoll(data?.[0] || null);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    fetchPoll();

    const channel = supabase.channel('polls-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'polls',
        filter: `room_id=eq.${roomId}`
      }, () => {
        fetchPoll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchPoll]);

  const handleMoodSelect = async (mood: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mood_status: mood })
        .eq('id', userId);
      if (error) throw error;
      await refetchProfile();
      setShowMoodModal(false);
      showToast("Mood updated");
    } catch (err) {
      console.error('Error setting mood:', err);
      showToast("Failed to update mood", "error");
    }
  };

  const handleVote = async (option: 'a' | 'b') => {
    if (!poll || !userId) return;
    const alreadyVotedA = poll.vote_a === userId;
    const alreadyVotedB = poll.vote_b === userId;
    if (alreadyVotedA || alreadyVotedB) return;

    if (option === 'a') {
      await supabase.from('polls')
        .update({ vote_a: userId })
        .eq('id', poll.id);
    } else {
      await supabase.from('polls')
        .update({ vote_b: userId })
        .eq('id', poll.id);
    }
    fetchPoll();
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || !pollOptionA.trim() ||
        !pollOptionB.trim() || !roomId) return;
    setCreatingPoll(true);
    await supabase.from('polls').insert({
      room_id: roomId,
      question: pollQuestion.trim(),
      option_a: pollOptionA.trim(),
      option_b: pollOptionB.trim(),
      vote_a: null,
      vote_b: null,
    });
    setPollQuestion('');
    setPollOptionA('');
    setPollOptionB('');
    setShowNewPoll(false);
    setCreatingPoll(false);
    fetchPoll();
  };

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return null;
    const member = members.find((m) => m.id === memberId);
    return member?.name || null;
  };

  // Quick Add Expense insertion
  const handleQuickAddExpense = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickExpenseName.trim() || !quickAmount.trim() || !roomId || !quickPaidBy) return;
    navigator.vibrate?.(10);

    try {
      const parsedAmount = parseFloat(quickAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return;

      if (quickSplitType === 'percent') {
        const totalPct = Object.values(quickMemberSplits).reduce((s, v) => s + v, 0);
        if (totalPct !== 100) {
          showToast('Percentages must equal 100%', 'error');
          return;
        }
      } else if (quickSplitType === 'amount') {
        const totalAmt = Object.values(quickMemberSplits).reduce((s, v) => s + v, 0);
        if (Math.abs(totalAmt - parsedAmount) > 0.01) {
          showToast('Amounts must equal total expense amount', 'error');
          return;
        }
      }

      const splits = members.map(m => ({
        user_id: m.id,
        amount: quickSplitType === 'equal' 
          ? parsedAmount / members.length
          : quickSplitType === 'percent'
          ? ((quickMemberSplits[m.id] || 0) / 100) * parsedAmount
          : (quickMemberSplits[m.id] || 0)
      }));

      setSavingQuickExpense(true);

      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          room_id: roomId,
          name: quickExpenseName.trim(),
          amount: parsedAmount,
          category: quickCategory,
          paid_by: quickPaidBy,
          is_recurring: quickIsRecurring,
          is_settled: false,
          splits: splits,
          expense_date: new Date(quickExpenseDate).toISOString()
        });

      if (insertError) throw insertError;

      // Insert activity log
      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `added ${quickExpenseName.trim()} expense`
      });

      showToast('Expense added');
      
      // Refetch
      await Promise.all([
        refetchExpenses(),
        refetchActivity()
      ]);

      // Reset & close
      setQuickExpenseName("");
      setQuickAmount("");
      setQuickCategory("Food");
      setQuickPaidBy(userId || "");
      setQuickIsRecurring(false);
      setShowQuickAdd(false);
    } catch (err) {
      console.error('Error adding quick expense:', err);
      showToast('Failed to add expense', 'error');
    } finally {
      setSavingQuickExpense(false);
    }
  };

  if (loading && !initialized) return (
    <div style={{
      background: '#111118',
      minHeight: '100vh',
      padding: '24px 20px 120px',
      maxWidth: 430,
      margin: '0 auto'
    }}>
      {/* Greeting */}
      <div style={{
        height: 13,
        width: 160,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 6,
        marginBottom: 8
      }} />
      {/* Room name */}
      <div style={{
        height: 28,
        width: 140,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 8,
        marginBottom: 16
      }} />
      {/* Pills row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={{
          height: 30, width: 140,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 999
        }} />
        <div style={{
          height: 30, width: 100,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 999
        }} />
      </div>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            minWidth: 110,
            height: 85,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 18,
            flexShrink: 0
          }} />
        ))}
      </div>
      {/* Room health card */}
      <div style={{
        height: 100,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 18,
        marginBottom: 16
      }} />
      {/* Poll card */}
      <div style={{
        height: 80,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 18,
        marginBottom: 16
      }} />
      {/* Activity card */}
      <div style={{
        height: 180,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 18
      }} />
    </div>
  )

  // Derived states from context
  const roommates = members.filter((m) => m.id !== userId);

  // Calculate Balance
  const unsettledExpenses = expenses.filter((e) => !e.is_settled);
  const roommateUnsettledExpenses = unsettledExpenses.filter((e) => e.paid_by !== userId);
  const memberCount = members.length || 2;
  const balance = roommateUnsettledExpenses.reduce((sum, e) => sum + e.amount / memberCount, 0);

  const unsettledCount = unsettledExpenses.length;
  const pendingShoppingCount = shoppingItems.filter((item) => !item.done).length;
  const pendingChoresCount = chores.filter((chore) => !chore.done).length;


  const activities = activity.slice(0, 5);

  // Greeting logic
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Good Morning' 
    : hour >= 12 && hour < 17 ? 'Good Afternoon'
    : hour >= 17 && hour < 21 ? 'Good Evening'
    : 'Good Night';

  // Roommate mood display
  const firstRoommate = roommates?.[0];
  const moodPillText = firstRoommate
    ? `${firstRoommate.name} is ${firstRoommate.mood_status || "Available"}`
    : "Invite your roommate";

  // Health Score Calculation
  const choreDeduction = Math.min(pendingChoresCount * 10, 40);
  const expenseDeduction = Math.min(unsettledCount * 10, 40);
  const shoppingDeduction = Math.min(pendingShoppingCount * 5, 20);
  const healthScore = Math.max(100 - choreDeduction - expenseDeduction - shoppingDeduction, 0);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  // Health Score subtitle
  const healthLabel = healthScore > 85 ? "Excellent state" : healthScore > 60 ? "Pretty organized" : "Need some cleanup";

  // Month Total Calculation
  const monthTotal = expenses
    .filter((e) => isCurrentMonth(e.created_at))
    .reduce((sum, e) => sum + e.amount, 0);

  // Milestones calculation
  const daysSince = room?.created_at
    ? Math.floor((Date.now() - new Date(room.created_at).getTime()) / 86400000)
    : 0;
  const milestones = [1, 7, 30, 100, 365];
  const currentMilestone = milestones.find((m) => daysSince === m);

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} mins ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  };

  const userVotedA = poll?.vote_a === userId;
  const userVotedB = poll?.vote_b === userId;
  const hasVoted = userVotedA || userVotedB;
  const voterAName = getMemberName(poll?.vote_a ?? null);
  const voterBName = getMemberName(poll?.vote_b ?? null);

  const pollInputClass =
    "w-full bg-white/[0.06] border border-white/10 rounded-[14px] px-4 py-[14px] text-white text-[16px] placeholder:text-white/25 outline-none focus:border-white/25 transition-colors";

  const allChoresDone = chores.length > 0 && 
    chores.every((c) => c.done)

  return (
    <main className="flex-1 flex flex-col bg-[#111118] min-h-screen relative" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
      <PullToRefresh onRefresh={() => refetchAll()}>
        {/* Subtle Radial Glow */}
        <div 
          className="pointer-events-none fixed"
          style={{
            top: '-200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '400px',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)',
            zIndex: 0
          }}
        />

        {/* Milestone Card */}
        {currentMilestone && !dismissedMilestone && (
          <GlassCard
            className="relative flex flex-col gap-1 p-5 select-none z-10"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.05)",
              boxShadow: "0 4px 24px rgba(255,255,255,0.02)"
            }}
          >
            <button
              type="button"
              onClick={() => setDismissedMilestone(true)}
              className="absolute top-4 right-4 text-white/40 hover:text-white/60 transition-colors bg-transparent border-0 p-1 cursor-pointer focus:outline-none"
              aria-label="Dismiss milestone"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-white font-bold text-[15px]">
              🎉 {currentMilestone} days as roommates!
            </h3>
            <p className="text-white/60 text-[13px]">
              That&apos;s worth celebrating
            </p>
          </GlassCard>
        )}

        {/* Spotless Banner */}
        {allChoresDone && !spotlessDismissed && (
          <div style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 18,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Sparkles SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.80)" strokeWidth={1.5} strokeLinecap="round">
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
                <path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/>
                <path d="M19 2l.5 1.5L21 4l-1.5.5L19 6l-.5-1.5L17 4l1.5-.5L19 2z"/>
              </svg>
              <div>
                <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>
                  Room is spotless
                </div>
                <div style={{ 
                  color: 'rgba(255,255,255,0.45)', 
                  fontSize: 12, 
                  marginTop: 2 
                }}>
                  All chores completed
                </div>
              </div>
            </div>
            {/* X button */}
            <button
              onClick={() => setSpotlessDismissed(true)}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                padding: 4
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}

        {/* Header Section */}
        <header className="flex flex-col items-start z-10 w-full" style={{ marginBottom: 20 }}>
          <div className="flex flex-col gap-[4px] w-full">
            <span className="text-[13px] text-white/45 font-normal">
              {greeting}, <span className="font-bold text-white">{profile?.name}</span>
            </span>
            <div className="flex items-center justify-between w-full">
              <h1 className="text-[22px] font-bold text-white leading-tight">
                {room?.name || "My Room"}
              </h1>
              <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[11px] text-white/50 font-medium select-none">
                ₹{monthTotal.toFixed(0)} this month
              </span>
            </div>
          </div>
        </header>

        {/* Mood+streak pills row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }} className="z-10">
          <button
            type="button"
            onClick={() => { navigator.vibrate?.(10); setShowMoodModal(true); }}
            className="inline-flex items-center cursor-pointer hover:bg-white/[0.12] transition-colors focus:outline-none text-left border-0"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '999px',
              padding: '6px 14px',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 mr-2 flex-shrink-0" />
            <span className="text-[12px] text-white/65 font-medium leading-none">
              {moodPillText}
            </span>
          </button>
          {profile && profile.streak_count && profile.streak_count > 0 ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 999,
              padding: '5px 12px',
              alignSelf: 'flex-start'
            }}>
              {/* Flame SVG */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,200,100,0.80)" strokeWidth={1.5} strokeLinecap="round">
                <path d="M12 2c0 0-5 4-5 9a5 5 0 0010 0c0-3-2-6-2-6s-1 3-3 3-2-2-2-2 2-1 2-4z"/>
              </svg>
              <span style={{ 
                color: 'rgba(255,255,255,0.60)', 
                fontSize: 12 
              }}>
                {profile.streak_count} day streak
              </span>
            </div>
          ) : null}
        </div>

        <section 
          className="select-none z-10 w-full"
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 4,
            marginBottom: 16,
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          {/* Balance Card */}
          <GlassCard className="flex flex-col gap-2 flex-shrink-0" style={{ minWidth: 120, padding: '14px 14px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5}>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-white/45 text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap">
                YOUR BALANCE
              </span>
              <span className="text-white font-bold text-[17px]">
                ₹{balance.toFixed(0)}
              </span>
            </div>
          </GlassCard>

          {/* Shopping Card */}
          <GlassCard className="flex flex-col gap-2 flex-shrink-0" style={{ minWidth: 120, padding: '14px 14px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5}>
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-white/45 text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap">
                SHOPPING
              </span>
              <span className="text-white font-bold text-[17px]">
                {pendingShoppingCount} {pendingShoppingCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          </GlassCard>

          {/* Chores Card */}
          <GlassCard className="flex flex-col gap-2 flex-shrink-0" style={{ minWidth: 120, padding: '14px 14px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5}>
              <path d="M9 11l3 3L22 4"/>
            </svg>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-white/45 text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap">
                PENDING CHORES
              </span>
              <span className="text-white font-bold text-[17px]">
                {pendingChoresCount} {pendingChoresCount === 1 ? 'chore' : 'chores'}
              </span>
            </div>
          </GlassCard>

          {/* Notes Card */}
          <GlassCard className="flex flex-col gap-2 flex-shrink-0" style={{ minWidth: 120, padding: '14px 14px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.50)" strokeWidth={1.5} strokeLinecap="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-white/45 text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap">
                NOTES
              </span>
              <span className="text-white font-bold text-[17px]">
                {notes.length > 0 ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}` : 'No notes'}
              </span>
            </div>
          </GlassCard>
        </section>

        {/* Room Health Score */}
        <section className="z-10" style={{ marginBottom: 16 }}>
          <GlassCard className="flex items-center justify-between p-5">
            <div className="flex flex-col gap-1">
              <span className="text-white/40 text-[10px] font-semibold tracking-wider uppercase">
                ROOM HEALTH
              </span>
              <span className="text-white font-bold text-[32px] leading-none mt-1">
                {healthScore}%
              </span>
              <span className="text-white/50 text-[12px] mt-1 select-none">
                {healthLabel}
              </span>
            </div>
            {/* Circular Progress Ring */}
            <div className="flex-shrink-0 select-none">
              <svg width="64" height="64" viewBox="0 0 64 64" 
                style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle
                  cx="32" cy="32" r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="4"
                />
                {/* Progress circle */}
                <circle
                  cx="32" cy="32" r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.70)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
            </div>
          </GlassCard>
        </section>

        {/* Quick Poll */}
        <section className="z-10" style={{ marginBottom: 16 }}>
          <GlassCard className="flex flex-col gap-4 p-5">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-bold text-[15px]">Quick Poll</h2>
              <button
                type="button"
                onClick={() => { navigator.vibrate?.(10); setShowNewPoll(true); setPoll(null); }}
                className="text-white/35 text-[12px] bg-transparent border-0 cursor-pointer focus:outline-none"
              >
                New
              </button>
            </div>

            {showNewPoll ? (
              <div className="flex flex-col">
                <input
                  type="text"
                  placeholder="What should we do tonight?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className={pollInputClass}
                />
                <div className="h-2" />
                <input
                  type="text"
                  placeholder="Option A"
                  value={pollOptionA}
                  onChange={(e) => setPollOptionA(e.target.value)}
                  className={pollInputClass}
                />
                <input
                  type="text"
                  placeholder="Option B"
                  value={pollOptionB}
                  onChange={(e) => setPollOptionB(e.target.value)}
                  className={`${pollInputClass} mt-2`}
                />
                <div className="h-3" />
                <button
                  type="button"
                  disabled={creatingPoll}
                  onClick={() => { navigator.vibrate?.(10); handleCreatePoll(); }}
                  className="w-full bg-white/10 border border-white/[0.18] rounded-[14px] py-[14px] text-white font-semibold text-[15px] focus:outline-none disabled:opacity-50"
                >
                  {creatingPoll ? "Creating..." : "Create Poll"}
                </button>
                {poll && (
                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(10); setShowNewPoll(false); }}
                    className="text-center text-white/30 text-[12px] py-1 mt-2 bg-transparent border-0 focus:outline-none cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : !poll ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeLinecap="round"
                  style={{ margin: '0 auto 8px', display: 'block' }}>
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                  No active poll
                </div>
                <button
                  onClick={() => setShowNewPoll(true)}
                  style={{
                    marginTop: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 999,
                    padding: '6px 16px',
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Create one
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <p className="text-white text-[15px] font-medium mb-3">
                  {poll.question}
                </p>
                <div className={`flex flex-col gap-2 w-full ${hasVoted ? "pointer-events-none" : ""}`}>
                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(10); handleVote('a'); }}
                    className="w-full flex items-center justify-between rounded-[14px] px-4 py-[14px] border text-left focus:outline-none cursor-pointer"
                    style={{
                      background: userVotedA ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
                      border: userVotedA ? "1px solid rgba(255,255,255,0.30)" : "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {userVotedA && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-white/70" aria-hidden="true">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth={1.5} fill="none" />
                        </svg>
                      )}
                      <span className="text-white text-[14px]">{poll.option_a}</span>
                    </span>
                    {voterAName && (
                      <span className="text-white/50 text-[12px] flex-shrink-0 ml-2">{voterAName}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(10); handleVote('b'); }}
                    className="w-full flex items-center justify-between rounded-[14px] px-4 py-[14px] border text-left focus:outline-none cursor-pointer"
                    style={{
                      background: userVotedB ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
                      border: userVotedB ? "1px solid rgba(255,255,255,0.30)" : "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {userVotedB && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-white/70" aria-hidden="true">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth={1.5} fill="none" />
                        </svg>
                      )}
                      <span className="text-white text-[14px]">{poll.option_b}</span>
                    </span>
                    {voterBName && (
                      <span className="text-white/50 text-[12px] flex-shrink-0 ml-2">{voterBName}</span>
                    )}
                  </button>
                </div>
                {!hasVoted && (
                  <p className="text-white/25 text-[11px] text-center mt-2">Tap to vote</p>
                )}
                {hasVoted && (
                  <p className="text-white/30 text-[11px] text-center mt-2">You voted</p>
                )}
              </div>
            )}
          </GlassCard>
        </section>

        {/* Recent Activity */}
        <section className="z-10" style={{ marginBottom: 16 }}>
          <GlassCard className="flex flex-col gap-4 p-5">
            <h2 className="text-white/40 text-[11px] font-semibold tracking-wider uppercase">
              RECENT ACTIVITY
            </h2>
            <div className="flex flex-col gap-[12px]">
              {activities.length > 0 ? (
                activities.map((act) => {
                  const member = members.find(m => m.name === act.user_name);
                  const avatarColor = member?.avatar_color || '#3a3a4a';
                  return (
                    <div key={act.id} className="flex items-center gap-[12px] py-[8px] border-b border-white/[0.05] last:border-b-0 last:pb-0 first:pt-0">
                      <div 
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 select-none"
                        style={{ background: avatarColor }}
                      >
                        {(act.user_name || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-xs text-white">
                          <span className="font-bold text-white">{act.user_name}</span>{" "}
                          <span className="text-white/80">{act.action}</span>
                        </p>
                        <span className="text-white/40 text-[10px] mt-0.5">
                          {formatTime(act.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', textAlign: 'center', padding: '16px' }} className="select-none">
                  No activity yet
                </div>
              )}
            </div>
          </GlassCard>
        </section>
      </PullToRefresh>

      {/* Floating Quick Add Button - Small Floating Pill */}
      <button
        onClick={() => { setShowQuickAdd(true); navigator.vibrate?.(10) }}
        style={{
          position: 'fixed',
          bottom: 'calc(100px + env(safe-area-inset-bottom))',
          right: 20,
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 999,
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          cursor: 'pointer',
          zIndex: 50
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.90)" strokeWidth={2.5} strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span style={{ 
          color: 'rgba(255,255,255,0.75)', 
          fontSize: 13, 
          fontWeight: 500 
        }}>
          Expense
        </span>
      </button>

      {/* Quick Add Bottom Sheet Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[8px]">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={() => { navigator.vibrate?.(10); setShowQuickAdd(false); }} />
          
          <div className="relative w-full max-w-[430px] bg-[#111118]/95 rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-[40px] border-t border-white/[0.12]" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom) + 80px)", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 className="text-white font-bold text-[18px]">Add New Expense</h3>

            <form onSubmit={handleQuickAddExpense} className="flex flex-col gap-4">
              {/* Expense Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Expense Name
                </label>
                <input
                  type="text"
                  placeholder="Pizza Night, Electricity..."
                  value={quickExpenseName}
                  onChange={(e) => handleQuickNameChange(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-white/30 transition-colors text-[16px]"
                  required
                />
                {/* Suggestions */}
                {quickNameSuggestions.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 6,
                    marginTop: 6 
                  }}>
                    {quickNameSuggestions.map(name => (
                      <button
                        type="button"
                        key={name}
                        onClick={() => {
                          setQuickExpenseName(name)
                          setQuickNameSuggestions([])
                          navigator.vibrate?.(8)
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 999,
                          padding: '4px 12px',
                          color: 'rgba(255,255,255,0.65)',
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Amount ₹
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-white/30 transition-colors text-[16px]"
                  required
                />
              </div>

              {/* Category selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Category
                </label>
                <div 
                  className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
                  style={{
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                  }}
                >
                  {["Food", "Groceries", "Utilities", "Internet", "Transport", "Rent", "Entertainment", "Household"].map((cat) => {
                    const isSelected = quickCategory === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => { navigator.vibrate?.(10); setQuickCategory(cat); }}
                        className={`py-1.5 px-4 rounded-[999px] border-0 cursor-pointer text-[13px] font-medium whitespace-nowrap transition-colors focus:outline-none ${
                          isSelected
                            ? "bg-white/15 border border-white/30 text-white"
                            : "bg-white/5 border border-white/10 text-white/40"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paid By selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Paid By</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {members.map((m) => {
                    const isSelected = quickPaidBy === m.id;
                    const isSelf = m.id === userId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { navigator.vibrate?.(5); setQuickPaidBy(m.id); }}
                        className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer border-0 ${
                          isSelected
                            ? 'bg-white/15 border border-white/30 text-white shadow-sm'
                            : 'bg-white/[0.05] border border-white/5 text-white/50 hover:bg-white/[0.08]'
                        }`}
                      >
                        {m.name} {isSelf && "(You)"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ 
                  color: 'rgba(255,255,255,0.45)', 
                  fontSize: 11, 
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={quickExpenseDate}
                  onChange={(e) => setQuickExpenseDate(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    color: 'rgba(255,255,255,0.90)',
                    fontSize: 16,
                    width: '100%',
                    outline: 'none',
                    colorScheme: 'dark'
                  }}
                />
              </div>

              {/* Split Selector pill tabs */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">Split Mode</label>
                <div className="flex bg-white/[0.06] p-1 rounded-[12px] border border-white/[0.12]">
                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(5); setQuickSplitType('equal'); }}
                    className={`flex-1 py-2 rounded-[999px] text-sm font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                      quickSplitType === 'equal'
                        ? 'bg-white/15 border border-white/30 text-white'
                        : 'bg-transparent text-white/40'
                    }`}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(5); setQuickSplitType('percent'); }}
                    className={`flex-1 py-2 rounded-[999px] text-sm font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                      quickSplitType === 'percent'
                        ? 'bg-white/15 border border-white/30 text-white'
                        : 'bg-transparent text-white/40'
                    }`}
                  >
                    Percent %
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigator.vibrate?.(5); setQuickSplitType('amount'); }}
                    className={`flex-1 py-2 rounded-[999px] text-sm font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                      quickSplitType === 'amount'
                        ? 'bg-white/15 border border-white/30 text-white'
                        : 'bg-transparent text-white/40'
                    }`}
                  >
                    Custom ₹
                  </button>
                </div>
              </div>

              {/* Custom Splits inputs */}
              {quickSplitType === 'equal' && (
                <div className="text-white/50 text-[13px] italic px-1">
                  Split equally — ₹{(parseFloat(quickAmount) ? (parseFloat(quickAmount) / members.length).toFixed(0) : "0")} each.
                </div>
              )}

              {quickSplitType === 'percent' && (
                <div className="flex flex-col gap-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-4">
                      <span className="text-white text-sm truncate">{m.name} {m.id === userId && "(You)"}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={quickMemberSplits[m.id] || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setQuickMemberSplits(prev => ({ ...prev, [m.id]: val }));
                          }}
                          placeholder="0"
                          className="w-20 bg-white/[0.06] border border-white/[0.10] rounded-[8px] px-3 py-1.5 text-white placeholder-white/20 text-center outline-none focus:border-white/30 text-sm"
                        />
                        <span className="text-white/60 text-sm">%</span>
                      </div>
                    </div>
                  ))}
                  <div className="text-white/40 text-[11px] text-right">
                    Total: {Object.values(quickMemberSplits).reduce((s, v) => s + v, 0)}% / 100%
                  </div>
                </div>
              )}

              {quickSplitType === 'amount' && (
                <div className="flex flex-col gap-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-4">
                      <span className="text-white text-sm truncate">{m.name} {m.id === userId && "(You)"}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/65 text-sm">₹</span>
                        <input
                          type="number"
                          value={quickMemberSplits[m.id] || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setQuickMemberSplits(prev => ({ ...prev, [m.id]: val }));
                          }}
                          placeholder="0.00"
                          className="w-24 bg-white/[0.06] border border-white/[0.10] rounded-[8px] px-3 py-1.5 text-white placeholder-white/20 text-center outline-none focus:border-white/30 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="text-white/40 text-[11px] text-right">
                    Total: ₹{Object.values(quickMemberSplits).reduce((s, v) => s + v, 0).toFixed(0)} / ₹{quickAmount || "0"}
                  </div>
                </div>
              )}

              {/* Recurring Switch */}
              <div className="flex items-center justify-between py-2 border-t border-b border-white/[0.05]">
                <span className="text-white text-sm">Recurring Monthly Expense</span>
                <input
                  type="checkbox"
                  checked={quickIsRecurring}
                  onChange={(e) => setQuickIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  disabled={savingQuickExpense}
                  className="w-full bg-white/12 text-white font-bold rounded-[12px] py-3.5 text-[15px] border border-white/20 hover:bg-white/18 transition-colors focus:outline-none cursor-pointer"
                >
                  {savingQuickExpense ? "Saving..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mood Status Bottom Sheet Modal */}
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

      {/* Floating Bottom Nav */}
      <BottomNav active="home" />
    </main>
  );
}
