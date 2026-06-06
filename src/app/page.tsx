'use client'

import React, { useState, useEffect, useCallback } from "react";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { useRoomContext } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";

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

export default function Home() {
  const {
    profile,
    room,
    roomId,
    userId,
    loading,
    expenses,
    shoppingItems,
    chores,
    notes,
    activity,
    members,
    refetchProfile
  } = useRoomContext();

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [dismissedMilestone, setDismissedMilestone] = useState(false);

  // Poll states
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");

  const fetchPoll = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setActivePoll(data[0]);
      setShowPollForm(false);
    } else {
      setActivePoll(null);
      setShowPollForm(true);
    }
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
    } catch (err) {
      console.error('Error setting mood:', err);
    }
  };

  const handleVoteA = async () => {
    if (!activePoll || !userId) return;
    try {
      const { error } = await supabase
        .from('polls')
        .update({ vote_a: userId })
        .eq('id', activePoll.id);
      if (error) throw error;
      await fetchPoll();
    } catch (err) {
      console.error('Error voting A:', err);
    }
  };

  const handleVoteB = async () => {
    if (!activePoll || !userId) return;
    try {
      const { error } = await supabase
        .from('polls')
        .update({ vote_b: userId })
        .eq('id', activePoll.id);
      if (error) throw error;
      await fetchPoll();
    } catch (err) {
      console.error('Error voting B:', err);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || !optionA.trim() || !optionB.trim() || !roomId) return;
    try {
      const { error } = await supabase
        .from('polls')
        .insert({
          room_id: roomId,
          question: pollQuestion.trim(),
          option_a: optionA.trim(),
          option_b: optionB.trim()
        });
      if (error) throw error;

      setPollQuestion("");
      setOptionA("");
      setOptionB("");
      await fetchPoll();
    } catch (err) {
      console.error('Error creating poll:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 border-2 border-[#9b7fe8] border-t-transparent rounded-full animate-spin mx-auto mt-20" />
    );
  }

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
  const totalNotesCount = notes.length;

  const activities = activity.slice(0, 5);

  // Greeting logic
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const greetingEmoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙';

  // Roommate mood display
  const firstRoommate = roommates?.[0];
  const moodPillText = firstRoommate
    ? `${firstRoommate.name} is ${firstRoommate.mood_status || "Available 👋"}`
    : "Invite your roommate 👋";

  // Health Score Calculation
  const choreDeduction = Math.min(pendingChoresCount * 10, 40);
  const expenseDeduction = Math.min(unsettledCount * 10, 40);
  const shoppingDeduction = Math.min(pendingShoppingCount * 5, 20);
  const healthScore = Math.max(100 - choreDeduction - expenseDeduction - shoppingDeduction, 0);

  // Health Score subtitle
  const healthLabel = healthScore > 85 ? "Excellent state ✨" : healthScore > 60 ? "Pretty organized 🏡" : "Need some cleanup 🧹";

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

  const countA = activePoll?.vote_a ? 1 : 0;
  const countB = activePoll?.vote_b ? 1 : 0;
  const userVotedA = activePoll?.vote_a === userId;
  const userVotedB = activePoll?.vote_b === userId;

  return (
    <main className="flex-1 flex flex-col gap-6 px-6 pt-5 pb-[120px] w-full relative">
      {/* Milestone Card */}
      {currentMilestone && !dismissedMilestone && (
        <GlassCard
          className="relative flex flex-col gap-1 p-5 select-none"
          style={{
            border: "1px solid rgba(155,127,232,0.4)",
            background: "rgba(155,127,232,0.08)"
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

      {/* Header Section */}
      <header className="flex flex-col items-start gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-white/60 font-medium">
            {greeting}, {profile?.name} {greetingEmoji}
          </span>
          <h1 className="text-[24px] font-bold text-white leading-tight">
            {room?.name || "My Room"} 👑
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowMoodModal(true)}
          className="inline-flex items-center px-3.5 py-1.5 rounded-[999px] border border-white/12 bg-white/[0.06] backdrop-blur-md cursor-pointer hover:bg-white/[0.12] transition-colors focus:outline-none text-left"
        >
          <span className="text-[13px] text-white/70 font-medium">
            {moodPillText}
          </span>
        </button>
      </header>

      {/* Summary Grid */}
      <section className="grid grid-cols-2 gap-[12px]">
        {/* Card 1: Balance */}
        <GlassCard className="flex flex-col justify-between items-start min-h-[110px] p-5">
          <span className="text-[28px]" role="img" aria-label="balance">💰</span>
          <div className="flex flex-col gap-0.5 mt-4">
            <span className="text-white/50 text-[12px]">Balance</span>
            <span className="text-white font-bold text-[16px]">
              {balance > 0 ? `₹${balance.toFixed(0)} pending` : "All settled ✅"}
            </span>
          </div>
        </GlassCard>

        {/* Card 2: Shopping */}
        <GlassCard className="flex flex-col justify-between items-start min-h-[110px] p-5">
          <span className="text-[28px]" role="img" aria-label="shopping">🛒</span>
          <div className="flex flex-col gap-0.5 mt-4">
            <span className="text-white/50 text-[12px]">Shopping</span>
            <span className="text-white font-bold text-[16px]">
              {pendingShoppingCount > 0 ? `${pendingShoppingCount} items left` : "All done ✅"}
            </span>
          </div>
        </GlassCard>

        {/* Card 3: Chores */}
        <GlassCard className="flex flex-col justify-between items-start min-h-[110px] p-5">
          <span className="text-[28px]" role="img" aria-label="chores">✅</span>
          <div className="flex flex-col gap-0.5 mt-4">
            <span className="text-white/50 text-[12px]">Chores</span>
            <span className="text-white font-bold text-[16px]">
              {pendingChoresCount > 0 ? `${pendingChoresCount} remaining` : "All done ✅"}
            </span>
          </div>
        </GlassCard>

        {/* Card 4: Notes */}
        <GlassCard className="flex flex-col justify-between items-start min-h-[110px] p-5">
          <span className="text-[28px]" role="img" aria-label="notes">📝</span>
          <div className="flex flex-col gap-0.5 mt-4">
            <span className="text-white/50 text-[12px]">Notes</span>
            <span className="text-white font-bold text-[16px]">
              {totalNotesCount > 0 ? `${totalNotesCount} notes` : "No notes"}
            </span>
          </div>
        </GlassCard>
      </section>

      {/* Quick Poll */}
      <section>
        <GlassCard className="flex flex-col gap-4 p-5">
          <div className="flex justify-between items-center">
            <h2 className="text-white font-bold text-[15px]">Quick Poll 🗳️</h2>
            <button
              type="button"
              onClick={() => setShowPollForm(true)}
              className="text-white/40 text-[12px] bg-transparent border-0 hover:text-white/60 cursor-pointer focus:outline-none"
            >
              New
            </button>
          </div>

          {!showPollForm && activePoll ? (
            <div className="flex flex-col gap-4">
              <p className="text-white text-[15px] font-medium leading-normal">
                {activePoll.question}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleVoteA}
                  className="flex-1 p-0 border-0 bg-transparent text-left cursor-pointer focus:outline-none"
                >
                  <GlassCard
                    className="p-3 text-center transition-colors flex flex-col items-center justify-center min-h-[60px]"
                    style={{
                      border: userVotedA ? "1px solid #9b7fe8" : "1px solid rgba(255,255,255,0.10)",
                      color: userVotedA ? "#9b7fe8" : "#ffffff"
                    }}
                  >
                    <span className="text-[13px] font-semibold">{activePoll.option_a}</span>
                    <span className="text-[11px] text-white/50 mt-1 select-none">
                      {countA} {countA === 1 ? 'vote' : 'votes'}
                    </span>
                  </GlassCard>
                </button>
                <button
                  type="button"
                  onClick={handleVoteB}
                  className="flex-1 p-0 border-0 bg-transparent text-left cursor-pointer focus:outline-none"
                >
                  <GlassCard
                    className="p-3 text-center transition-colors flex flex-col items-center justify-center min-h-[60px]"
                    style={{
                      border: userVotedB ? "1px solid #9b7fe8" : "1px solid rgba(255,255,255,0.10)",
                      color: userVotedB ? "#9b7fe8" : "#ffffff"
                    }}
                  >
                    <span className="text-[13px] font-semibold">{activePoll.option_b}</span>
                    <span className="text-[11px] text-white/50 mt-1 select-none">
                      {countB} {countB === 1 ? 'vote' : 'votes'}
                    </span>
                  </GlassCard>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreatePoll} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Should we order food tonight?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Option A"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Option B"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3 text-sm border-0 hover:bg-[#886cd4] transition-colors focus:outline-none cursor-pointer mt-1"
              >
                Create Poll
              </button>
              {activePoll && (
                <button
                  type="button"
                  onClick={() => setShowPollForm(false)}
                  className="text-center text-white/40 text-[12px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </form>
          )}
        </GlassCard>
      </section>

      {/* Room Health Score */}
      <section>
        <GlassCard className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1">
            <span className="text-white/40 text-[11px] font-semibold tracking-wider uppercase">
              ROOM HEALTH
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[#9b7fe8] font-bold text-[36px] leading-none">
                {healthScore}%
              </span>
              <span className="text-white/50 text-[13px]">
                {healthLabel}
              </span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-[4px] rounded-full overflow-hidden">
            <div
              className="bg-[#9b7fe8] h-full rounded-full"
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </GlassCard>
      </section>

      {/* Recent Activity */}
      <section>
        <GlassCard className="flex flex-col gap-4 p-5">
          <h2 className="text-white/40 text-[11px] font-semibold tracking-wider uppercase">
            RECENT ACTIVITY
          </h2>
          <div className="flex flex-col">
            {activities.length > 0 ? (
              activities.map((act) => (
                <div key={act.id} className="flex items-center gap-3 py-3 border-b border-white/6 last:border-b-0 last:pb-0 first:pt-0">
                  <div className="w-[36px] h-[36px] rounded-full bg-[#9b7fe8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
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
              ))
            ) : (
              <div className="text-center text-white/40 py-8 text-sm">
                No activity yet
              </div>
            )}
          </div>
        </GlassCard>
      </section>

      {/* Mood Status Bottom Sheet Modal */}
      {showMoodModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[4px]">
          <div className="absolute inset-0" onClick={() => setShowMoodModal(false)} />
          <div className="relative w-full max-w-[430px] bg-[#1a1a2e] rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="text-white font-bold text-[18px]">Set your mood</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {["Studying 📚", "Sleeping 😴", "Up for food 🍕", 
                "Gaming 🎮", "Working 💻", "Available 👋",
                "Do not disturb 🔕", "Out 🚶", "Chilling 😎"].map((mood) => {
                const isSelected = profile?.mood_status === mood;
                return (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => handleMoodSelect(mood)}
                    className="p-0 border-0 bg-transparent text-left cursor-pointer"
                  >
                    <GlassCard
                      className="p-[10px] text-center text-white text-[13px] font-medium transition-colors"
                      style={{
                        border: isSelected ? "1px solid #9b7fe8" : "1px solid rgba(255,255,255,0.10)",
                        background: isSelected ? "rgba(155, 127, 232, 0.08)" : "rgba(255,255,255,0.06)"
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
              onClick={() => setShowMoodModal(false)}
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
