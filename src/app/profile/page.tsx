"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { useRoomContext, ActivityItem, ShoppingItem } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";
import { Settings, Award, DollarSign, CheckSquare, ShoppingBag } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";

interface ExtendedShoppingItem extends ShoppingItem {
  created_by?: string | null;
}

const formatTime = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} days ago`;
};

const isCurrentMonth = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

export default function ProfilePage() {
  const router = useRouter();
  const {
    profile,
    room,
    userId,
    loading,
    initialized,
    refetchAll,
    members,
    expenses,
    chores,
    shoppingItems,
    activity
  } = useRoomContext();

  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'month' | 'overall'>('month');
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch all activities for leaderboard calculations without limit
  const [allActivities, setAllActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchAllActivities = async () => {
      if (!room?.id) return;
      try {
        const { data, error } = await supabase
          .from('activity')
          .select('*')
          .eq('room_id', room.id);
        if (!error && data) {
          setAllActivities(data);
        }
      } catch (err) {
        console.error("Failed to fetch all activities", err);
      }
    };
    fetchAllActivities();
  }, [room?.id]);

  const handleCopyCode = () => {
    if (!room?.invite_code) return;
    navigator.clipboard.writeText(room.invite_code);
    navigator.vibrate?.(10);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    if (!room?.invite_code) return;
    navigator.vibrate?.(10);
    const shareUrl = `${window.location.origin}/join/${room.invite_code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my room on RoomOS",
          text: `Join my room "${room.name}" on RoomOS!`,
          url: shareUrl
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  if (loading && !initialized) {
    return (
      <main className="flex-1 flex flex-col bg-[#111118] min-h-screen" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
        <PageHeader title="Profile" showBack={false} />
        <div className="w-8 h-8 border-2 border-white/20 border-t-transparent rounded-full animate-spin mx-auto mt-20" />
        <BottomNav active="profile" />
      </main>
    );
  }

  // Points computation
  const isMonth = leaderboardTab === 'month';
  const hasShoppingCreatedBy = shoppingItems.some(item => (item as ExtendedShoppingItem).created_by);

  const rankedList = members.map(m => {
    // Chores completed (done) and assigned to member
    const completedChores = chores.filter(c => c.done && c.assignee === m.id && (!isMonth || isCurrentMonth(c.created_at)));
    
    // Expenses logged: paid by member
    const loggedExpenses = expenses.filter(e => e.paid_by === m.id && (!isMonth || isCurrentMonth(e.created_at)));
    
    // Settle ups: from activity logs
    const settleUps = allActivities.filter(a => a.user_name === m.name && a.action === 'settled all expenses' && (!isMonth || isCurrentMonth(a.created_at)));
    
    // Activity logs: total activities
    const activityLogs = allActivities.filter(a => a.user_name === m.name && (!isMonth || isCurrentMonth(a.created_at)));

    // Active days: unique calendar days with activity
    const memberActivities = allActivities.filter(a => a.user_name === m.name && (!isMonth || isCurrentMonth(a.created_at)));
    const uniqueDays = new Set(
      memberActivities.map(a => new Date(a.created_at).toDateString())
    ).size;

    // Shopping items added
    const shoppingItemsCount = shoppingItems.filter(item => (item as ExtendedShoppingItem).created_by === m.id && (!isMonth || isCurrentMonth(item.created_at))).length;

    // Points logic
    const choresPoints = completedChores.length * 10;
    const expensesPoints = loggedExpenses.length * 5;
    const settleUpsPoints = settleUps.length * 15;
    const activityPoints = activityLogs.length * 3;
    const totalPoints = choresPoints + expensesPoints + settleUpsPoints + activityPoints;

    return {
      member: m,
      choresCount: completedChores.length,
      expensesCount: loggedExpenses.length,
      settleUpsCount: settleUps.length,
      activityCount: activityLogs.length,
      shoppingItemsCount,
      activeDaysCount: uniqueDays,
      totalPoints
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  const leaderTab = leaderboardTab;
  const calcPoints = (memberId: string, tab: 'month' | 'overall') => {
    const isM = tab === 'month';
    const m = members.find(mem => mem.id === memberId);
    if (!m) return 0;
    const completedChores = chores.filter(c => c.done && c.assignee === m.id && (!isM || isCurrentMonth(c.created_at)));
    const loggedExpenses = expenses.filter(e => e.paid_by === m.id && (!isM || isCurrentMonth(e.created_at)));
    const settleUps = allActivities.filter(a => a.user_name === m.name && a.action === 'settled all expenses' && (!isM || isCurrentMonth(a.created_at)));
    const activityLogs = allActivities.filter(a => a.user_name === m.name && (!isM || isCurrentMonth(a.created_at)));
    return completedChores.length * 10 + loggedExpenses.length * 5 + settleUps.length * 15 + activityLogs.length * 3;
  };
  const sortedMembers = [...members].sort((a, b) => calcPoints(b.id, leaderTab) - calcPoints(a.id, leaderTab));
  
  // Category rankings
  const choresRank = [...rankedList].sort((a, b) => b.choresCount - a.choresCount);
  const expensesRank = [...rankedList].sort((a, b) => b.expensesCount - a.expensesCount);
  const shoppingRank = [...rankedList].sort((a, b) => b.shoppingItemsCount - a.shoppingItemsCount);
  const settleUpsRank = [...rankedList].sort((a, b) => b.settleUpsCount - a.settleUpsCount);
  const activeDaysRank = [...rankedList].sort((a, b) => b.activeDaysCount - a.activeDaysCount);

  const roommates = members.filter((m) => m.id !== userId);
  const daysSince = room?.created_at
    ? Math.floor((Date.now() - new Date(room.created_at).getTime()) / 86400000)
    : 0;

  const maxPoints = Math.max(
    ...members.map((m: { id: string }) => calcPoints(m.id, leaderTab)), 1
  )

  return (
    <main className="flex-1 flex flex-col bg-[#111118] min-h-screen relative" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
      <PullToRefresh onRefresh={refetchAll}>
        {/* Header Container */}
        <div className="relative w-full">
          <PageHeader title="Profile" showBack={false} />
          <button
            onClick={() => { navigator.vibrate?.(10); router.push('/settings'); }}
            className="absolute right-0 top-1.5 p-1.5 text-white/60 hover:text-white transition-colors bg-transparent border-0 focus:outline-none cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

      {/* Profile Header Details */}
      <section className="flex flex-col items-center text-center animate-fade-in" style={{ marginBottom: 20 }}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-[0_4px_20px_rgba(255,255,255,0.05)] select-none"
          style={{ background: profile?.avatar_color || '#3a3a4a' }}
        >
          {(profile?.name || 'U')[0].toUpperCase()}
        </div>
        <div className="flex flex-col gap-[4px] mt-[12px]">
          <h2 className="text-white font-bold text-xl">{profile?.name}</h2>
          <span className="text-white/50 text-sm">{room?.name || "My Room"}</span>
        </div>
        
        {profile?.mood_status && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/10 select-none mt-[12px]">
            {profile.mood_status.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim()}
          </span>
        )}
      </section>

      {/* Invite Code Card */}
      <section className="flex flex-col items-center gap-2.5 w-full max-w-[340px] mx-auto" style={{ marginBottom: 16 }}>
        <div 
          onClick={handleCopyCode}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[999px] border border-white/12 bg-white/[0.06] backdrop-blur-md cursor-pointer hover:bg-white/[0.12] transition-colors select-none"
        >
          <span className="text-[12px] text-white/50 font-medium uppercase tracking-wider">Invite Code</span>
          <span className="text-[13px] text-white font-bold tracking-widest">{room?.invite_code || "N/A"}</span>
          <span className="text-[10px] text-[#2dd4bf] font-bold ml-1">
            {copied ? "Copied! ✓" : "Copy"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleShareLink}
          className="w-full bg-white/[0.08] border border-white/[0.15] rounded-[14px] py-3 px-4 text-white/85 font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer hover:bg-white/[0.12] active:scale-98 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {shareCopied ? "Link Copied! ✓" : "Share Invite Link"}
        </button>
      </section>

      <GlassCard className="p-5 flex flex-col gap-4" style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between">
          <h3 className="text-white/45 text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,220,100,0.80)" strokeWidth={1.5} strokeLinecap="round" className="flex-shrink-0">
              <polyline points="8 21 12 17 16 21"/>
              <line x1="12" y1="17" x2="12" y2="11"/>
              <path d="M6 3v8a6 6 0 0012 0V3"/>
              <line x1="4" y1="3" x2="20" y2="3"/>
            </svg> LEADERBOARD
          </h3>
          
          {/* Toggle pills */}
          <div className="flex bg-white/5 rounded-full p-0.5 border border-white/[0.08]">
            <button
              onClick={() => { navigator.vibrate?.(5); setLeaderboardTab('month'); }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                leaderboardTab === 'month'
                  ? 'bg-white/10 border border-white/20 text-white'
                  : 'text-white/40 bg-transparent border-transparent'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => { navigator.vibrate?.(5); setLeaderboardTab('overall'); }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                leaderboardTab === 'overall'
                  ? 'bg-white/10 border border-white/20 text-white'
                  : 'text-white/40 bg-transparent border-transparent'
              }`}
            >
              Overall
            </button>
          </div>
        </div>

        {/* Rankings list */}
        <div className="flex flex-col gap-[12px] mt-1">
          {sortedMembers.map((member: { id: string; name: string; avatar_color?: string | null }, index: number) => (
            <div key={member.id} style={{ marginBottom: 16 }}>
              
              {/* Name row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8
              }}>
                {/* Rank */}
                <span style={{
                  color: 'rgba(255,255,255,0.30)',
                  fontSize: 12,
                  width: 16,
                  flexShrink: 0
                }}>
                  {index + 1}
                </span>
                
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28,
                  borderRadius: '50%',
                  background: member.avatar_color || '#3a3a4a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: 11, fontWeight: 600 }}>
                    {member.name?.[0]?.toUpperCase()}
                  </span>
                </div>
                
                {/* Name */}
                <span style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 14,
                  fontWeight: 500,
                  flex: 1
                }}>
                  {member.name}
                  {member.id === userId && (
                    <span style={{ 
                      color: 'rgba(255,255,255,0.30)', 
                      fontSize: 12,
                      fontWeight: 400,
                      marginLeft: 4
                    }}>
                      (You)
                    </span>
                  )}
                </span>
                
                {/* Points */}
                <span style={{
                  color: 'rgba(255,255,255,0.70)',
                  fontSize: 14,
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  {calcPoints(member.id, leaderTab)} pts
                </span>
              </div>
              
              {/* Progress bar — FULL WIDTH under the row */}
              <div style={{
                width: '100%',
                height: 3,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 999,
                overflow: 'hidden',
                marginLeft: 0
              }}>
                <div style={{
                  height: '100%',
                  width: `${maxPoints > 0 
                    ? (calcPoints(member.id, leaderTab) / maxPoints) * 100 
                    : 0}%`,
                  background: 'rgba(255,255,255,0.45)',
                  borderRadius: 999,
                  transition: 'width 0.4s ease'
                }} />
              </div>
              
            </div>
          ))}
        </div>

        {/* View Category Details Trigger */}
        <button
          onClick={() => { navigator.vibrate?.(10); setShowDetailModal(true); }}
          className="w-full bg-white/[0.05] hover:bg-white/[0.08] active:scale-98 border border-white/10 rounded-[12px] py-2.5 text-center text-white/70 font-semibold text-[13px] transition-all cursor-pointer mt-2"
        >
          View Category Details
        </button>
      </GlassCard>

      {/* Roommates Card Section */}
      <section className="flex flex-col gap-3" style={{ marginBottom: 16 }}>
        {roommates.length === 0 ? (
          <GlassCard className="p-5 flex flex-col items-center justify-center text-center py-10">
            <h3 className="text-white/45 text-[11px] font-semibold tracking-wider uppercase mb-4 self-start">
              ROOMMATES
            </h3>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="mb-2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="text-white/40 font-medium text-[14px]">No roommates yet</span>
            <span className="text-white/25 text-[12px] mt-1">Share your invite link above</span>
          </GlassCard>
        ) : (
          <GlassCard className="p-5 flex flex-col gap-3">
            <h3 className="text-white/45 text-[11px] font-semibold tracking-wider uppercase mb-1">
              ROOMMATES
            </h3>
            <div className="flex flex-col gap-[16px]">
              {roommates.map((roommate, idx) => {
                const lastActivity = activity
                  .filter(a => a.user_name === roommate.name)
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                const lastSeen = lastActivity 
                  ? formatTime(lastActivity.created_at) 
                  : 'No activity yet';

                const expenseCount = expenses.filter(e => e.paid_by === roommate.id).length;
                const choreCount = chores.filter(c => c.assignee === roommate.id && c.done).length;

                return (
                  <React.Fragment key={roommate.id}>
                    {idx > 0 && <div className="h-[1px] bg-white/[0.08]" style={{ margin: '12px 0' }} />}
                    <div className="flex items-center gap-3.5 bg-white/[0.02] border border-white/[0.08] p-4 rounded-[16px] w-full">
                      {/* Left: Avatar */}
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 select-none"
                        style={{ background: roommate.avatar_color || '#3a3a4a' }}
                      >
                        {(roommate.name || 'U')[0].toUpperCase()}
                      </div>

                      {/* Middle: Details */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-white font-bold text-[15px] truncate">{roommate.name}</span>
                        <span className="text-white/50 text-[13px] mt-0.5 truncate">
                          {roommate.mood_status 
                            ? roommate.mood_status.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim()
                            : "Available"}
                        </span>
                        <span className="text-white/35 text-[11px] mt-0.5 select-none">Last seen {lastSeen}</span>
                      </div>

                      {/* Right: Stats */}
                      <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                        <span className="bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-[11px] text-white/45 font-medium whitespace-nowrap">
                          {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}
                        </span>
                        <span className="bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-[11px] text-white/45 font-medium whitespace-nowrap">
                          {choreCount} chore{choreCount === 1 ? '' : 's'} done
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="text-center text-white/30 text-[12px] font-medium mt-2 select-none">
              Roommates for {daysSince} days
            </div>
          </GlassCard>
        )}
      </section>

      {/* Category Rankings Detail View Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-[8px]">
          <div className="absolute inset-0" onClick={() => setShowDetailModal(false)} />
          <div className="relative w-full max-w-[430px] bg-[#111118]/95 rounded-t-[24px] p-6 z-10 flex flex-col gap-5 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] border-t border-white/[0.12]" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom) + 80px)", maxHeight: "85vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-[18px] flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" /> Category Leaders
              </h3>
              <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">
                {leaderboardTab === 'month' ? 'This Month' : 'Overall'}
              </span>
            </div>

            <div className="flex flex-col gap-6 mt-1">
              {/* Category 1: Chores completed */}
              <div className="flex flex-col gap-2">
                <h4 className="text-white/45 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" /> Chores Completed
                </h4>
                <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/[0.06] rounded-[16px] p-3">
                  {choresRank.map((r, i) => {
                    const isFirst = i === 0 && r.choresCount > 0;
                    return (
                      <div key={r.member.id} className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white/80">{r.member.name}</span>
                          {isFirst && <GoldMedalIcon className="w-4 h-4 flex-shrink-0" />}
                        </div>
                        <span className="text-white font-bold">{r.choresCount} completed</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category 2: Expenses logged */}
              <div className="flex flex-col gap-2">
                <h4 className="text-white/45 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Expenses Logged
                </h4>
                <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/[0.06] rounded-[16px] p-3">
                  {expensesRank.map((r, i) => {
                    const isFirst = i === 0 && r.expensesCount > 0;
                    return (
                      <div key={r.member.id} className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white/80">{r.member.name}</span>
                          {isFirst && <GoldMedalIcon className="w-4 h-4 flex-shrink-0" />}
                        </div>
                        <span className="text-white font-bold">{r.expensesCount} expenses</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category 3: Shopping Items Added */}
              <div className="flex flex-col gap-2">
                <h4 className="text-white/45 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" /> Shopping Items Added
                </h4>
                <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/[0.06] rounded-[16px] p-3">
                  {!hasShoppingCreatedBy ? (
                    <span className="text-white/30 text-xs italic py-1">Coming soon</span>
                  ) : (
                    shoppingRank.map((r, i) => {
                      const isFirst = i === 0 && r.shoppingItemsCount > 0;
                      return (
                        <div key={r.member.id} className="flex items-center justify-between text-sm py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white/80">{r.member.name}</span>
                            {isFirst && <GoldMedalIcon className="w-4 h-4 flex-shrink-0" />}
                          </div>
                          <span className="text-white font-bold">{r.shoppingItemsCount} items</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Category 4: Settle ups */}
              <div className="flex flex-col gap-2">
                <h4 className="text-white/45 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <RefreshCwIcon className="w-3.5 h-3.5" /> Settle ups
                </h4>
                <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/[0.06] rounded-[16px] p-3">
                  {settleUpsRank.map((r, i) => {
                    const isFirst = i === 0 && r.settleUpsCount > 0;
                    return (
                      <div key={r.member.id} className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white/80">{r.member.name}</span>
                          {isFirst && <GoldMedalIcon className="w-4 h-4 flex-shrink-0" />}
                        </div>
                        <span className="text-white font-bold">{r.settleUpsCount} settled</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category 5: Active days */}
              <div className="flex flex-col gap-2">
                <h4 className="text-white/45 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,200,100,0.80)" strokeWidth={1.5} strokeLinecap="round" className="flex-shrink-0">
                    <path d="M12 2c0 0-5 4-5 9a5 5 0 0010 0c0-3-2-6-2-6s-1 3-3 3-2-2-2-2 2-1 2-4z"/>
                  </svg> Active Days
                </h4>
                <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/[0.06] rounded-[16px] p-3">
                  {activeDaysRank.map((r, i) => {
                    const isFirst = i === 0 && r.activeDaysCount > 0;
                    return (
                      <div key={r.member.id} className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white/80">{r.member.name}</span>
                          {isFirst && <GoldMedalIcon className="w-4 h-4 flex-shrink-0" />}
                        </div>
                        <span className="text-white font-bold">{r.activeDaysCount} days</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => { navigator.vibrate?.(10); setShowDetailModal(false); }}
              className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1.5 bg-transparent border-0 focus:outline-none cursor-pointer mt-4"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      </PullToRefresh>

      {/* Floating Bottom Nav */}
      <BottomNav active="profile" />
    </main>
  );
}

// Compact helper icon since RefreshCw is not a default SVG in some versions or we want to be safe
function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function GoldMedalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="13" r="6" fill="url(#goldGrad)" stroke="#EAB308" strokeWidth="1.5" />
      <path d="M9 7L6 3H10L12 7" fill="url(#goldRibbon)" />
      <path d="M15 7L18 3H14L12 7" fill="url(#goldRibbon)" />
      <circle cx="12" cy="13" r="3" fill="#EAB308" />
      <text x="12" y="15" fill="#111118" fontSize="6.5" fontWeight="bold" textAnchor="middle">1</text>
      <defs>
        <linearGradient id="goldGrad" x1="6" y1="7" x2="18" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#CA8A04" />
          <stop offset="100%" stopColor="#854D0E" />
        </linearGradient>
        <linearGradient id="goldRibbon" x1="6" y1="3" x2="18" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
    </svg>
  );
}


