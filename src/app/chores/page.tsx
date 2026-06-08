"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { useRoomContext, ChoreItem } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";
import { PullToRefresh } from "@/components/PullToRefresh";

export default function ChoresPage() {
  const { showToast } = useToast();
  const { profile, roomId, userId, loading, initialized, chores, members, refetchChores, refetchAll, setChores } = useRoomContext();

  const [activeTab, setActiveTab] = useState<"Pending" | "Completed">("Pending");
  const [showModal, setShowModal] = useState(false);
  const [editingChore, setEditingChore] = useState<ChoreItem | null>(null);

  // Swipe to delete states
  const [swipedId, setSwipedId] = useState<string | number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Form states
  const [choreName, setChoreName] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");

  const roommates = members.filter((m) => m.id !== userId);

  useEffect(() => {
    if (profile) {
      setAssignee(profile.name);
    }
  }, [profile]);

  const toggleChore = async (chore: ChoreItem) => {
    // Optimistic update
    setChores(prev => prev.map(c => 
      c.id === chore.id ? {...c, done: !c.done} : c
    ))
    navigator.vibrate?.(10) // haptic

    try {
      const newDone = !chore.done;
      const { error } = await supabase
        .from('chores')
        .update({ done: newDone })
        .eq('id', chore.id);

      if (error) throw error;

      if (newDone) {
        await supabase.from('activity').insert({
          room_id: roomId,
          user_name: profile?.name || 'User',
          action: `completed ${chore.name}`
        });
        showToast('Chore completed!')
      }

      await refetchChores();
    } catch (err) {
      // Revert on failure
      setChores(prev => prev.map(c =>
        c.id === chore.id ? {...c, done: chore.done} : c
      ))
      showToast('Failed to update', 'error')
      console.error('Error toggling chore:', err);
    }
  };

  const handleStartEdit = (chore: ChoreItem) => {
    navigator.vibrate?.(10);
    const assigneeName = chore.profiles?.name || (chore.assignee === userId ? (profile?.name || "") : roommates[0]?.name || "");
    setEditingChore(chore);
    setChoreName(chore.name);
    setDueDate(chore.due_date);
    setAssignee(assigneeName);
    setShowModal(true);
  };

  const handleDeleteChore = async (choreId: string | number) => {
    navigator.vibrate?.(10);
    try {
      const { error } = await supabase
        .from('chores')
        .delete()
        .eq('id', choreId);

      if (error) throw error;
      showToast('Removed');
      setSwipedId(null);
      await refetchChores();
    } catch (err) {
      console.error('Error deleting chore:', err);
      showToast('Failed to remove', 'error');
    }
  };

  const handleAddChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choreName || !dueDate || !roomId || !userId) return;
    navigator.vibrate?.(10);

    try {
      // Get assignee profile id
      const { data: assigneeProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('room_id', roomId)
        .eq('name', assignee)
        .single();

      const targetAssigneeId = assigneeProfile?.id || userId;

      if (editingChore) {
        // Edit Mode
        const { error: updateError } = await supabase
          .from('chores')
          .update({
            name: choreName,
            assignee: targetAssigneeId,
            due_date: dueDate
          })
          .eq('id', editingChore.id);

        if (updateError) throw updateError;
        showToast('Chore updated');
      } else {
        // Create Mode
        const { error: insertError } = await supabase
          .from('chores')
          .insert({
            room_id: roomId,
            name: choreName,
            assignee: targetAssigneeId,
            due_date: dueDate,
            done: false
          });

        if (insertError) throw insertError;

        // Log activity
        await supabase.from('activity').insert({
          room_id: roomId,
          user_name: profile?.name || 'User',
          action: `added chore: ${choreName}`
        });
        showToast('Chore added');
      }

      await refetchChores();

      // Reset
      setChoreName("");
      setDueDate("");
      setAssignee(profile?.name || "");
      setEditingChore(null);
      setShowModal(false);
    } catch (err) {
      console.error('Error adding/editing chore:', err);
      showToast('Failed to save', 'error');
    }
  };

  const handleCancel = () => {
    setChoreName("");
    setDueDate("");
    setAssignee(profile?.name || "");
    setEditingChore(null);
    setShowModal(false);
  };

  if (loading && !initialized) {
    return (
      <main className="flex-1 flex flex-col bg-[#111118] min-h-screen" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
        <PageHeader title="Chores" showBack={false} />
        <div className="flex gap-2.5">
          <Skeleton height={38} borderRadius={999} />
          <Skeleton height={38} borderRadius={999} />
        </div>
        <div className="flex flex-col gap-3 mt-4">
          <Skeleton height={72} borderRadius={16} />
          <Skeleton height={72} borderRadius={16} />
          <Skeleton height={72} borderRadius={16} />
        </div>
        <BottomNav active="chores" />
      </main>
    );
  }

  const filteredChores = chores.filter((chore) =>
    activeTab === "Pending" ? !chore.done : chore.done
  );

  return (
    <main className="flex-1 flex flex-col bg-[#111118] min-h-screen relative" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
      <PullToRefresh onRefresh={() => refetchAll()}>
        <PageHeader title="Chores" showBack={false} />

        {/* Tabs Filter */}
        <section className="flex gap-2.5" style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => { navigator.vibrate?.(10); setActiveTab("Pending"); }}
            className={`flex-1 py-2 rounded-[999px] text-[13px] font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
              activeTab === "Pending"
                ? "bg-white/15 border border-white/30 text-white"
                : "bg-white/5 border border-white/10 text-white/40"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => { navigator.vibrate?.(10); setActiveTab("Completed"); }}
            className={`flex-1 py-2 rounded-[999px] text-[13px] font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
              activeTab === "Completed"
                ? "bg-white/15 border border-white/30 text-white"
                : "bg-white/5 border border-white/10 text-white/40"
            }`}
          >
            Completed
          </button>
        </section>

        {/* Chores List */}
        <section className="flex flex-col gap-[10px] mt-[16px]">
          {filteredChores.length === 0 ? (
            <div className="text-center text-white/40 py-16 text-sm">
              {activeTab === "Pending" ? "All clean! No pending chores." : "Nothing completed yet."}
            </div>
          ) : (
            filteredChores.map((chore) => {
              const isSwiped = swipedId === chore.id;
              const assigneeName = chore.profiles?.name || 'Unassigned';
              const avatarColor = chore.profiles?.avatar_color || '#3a3a4a';

              return (
                <div
                  key={chore.id}
                  className="relative overflow-hidden rounded-[18px] select-none"
                  onTouchStart={(e) => {
                    setTouchStartX(e.touches[0].clientX);
                    if (swipedId && swipedId !== chore.id) {
                      setSwipedId(null);
                    }
                  }}
                  onTouchMove={(e) => {
                    if (touchStartX === null) return;
                    const diffX = touchStartX - e.touches[0].clientX;
                    if (diffX > 50) {
                      setSwipedId(chore.id);
                    } else if (diffX < -50) {
                      setSwipedId(null);
                    }
                  }}
                  onTouchEnd={() => setTouchStartX(null)}
                >
                  {/* Delete slide trigger background */}
                  <div className="absolute inset-0 bg-white/[0.05] border border-white/[0.08] flex items-center justify-end pr-6 rounded-[18px]">
                    <button
                      onClick={() => handleDeleteChore(chore.id)}
                      className="bg-transparent border-0 text-white font-bold text-sm cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Foreground Card */}
                  <div
                    className="transition-transform duration-200 ease-out"
                    style={{
                      transform: isSwiped ? "translateX(-80px)" : "translateX(0)",
                    }}
                  >
                    <GlassCard className="flex items-center gap-[12px] p-[16px]">
                      <button
                        type="button"
                        onClick={() => toggleChore(chore)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center cursor-pointer transition-colors focus:outline-none ${
                          chore.done
                            ? "bg-white border-white text-[#111118]"
                            : "bg-transparent border-white/20"
                        }`}
                        aria-label={chore.done ? "Mark chore as pending" : "Mark chore as completed"}
                      >
                        {chore.done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>

                      <div className="flex flex-col min-w-0 gap-[4px]" onClick={() => handleStartEdit(chore)}>
                        <span
                          className={`font-bold text-[15px] truncate transition-all ${
                            chore.done
                              ? "text-white/35 line-through decoration-white/20"
                              : "text-white"
                          }`}
                        >
                          {chore.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                            style={{ background: avatarColor }}
                          >
                            {assigneeName[0].toUpperCase()}
                          </div>
                          <span className="text-white/40 text-[11px]">Assigned to {assigneeName}</span>
                        </div>
                      </div>

                      <div className="ml-auto text-right flex flex-col justify-center select-none" onClick={() => handleStartEdit(chore)}>
                        <span className="text-[11px] text-white/35">Due Date</span>
                        <span className="text-[13px] font-bold text-white/80 mt-0.5">{formatDate(chore.due_date)}</span>
                      </div>
                    </GlassCard>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </PullToRefresh>

      {/* Floating Add Chore Button */}
      <button
        onClick={() => { navigator.vibrate?.(10); setShowModal(true); }}
        style={{
          position: 'fixed',
          bottom: 'calc(110px + env(safe-area-inset-bottom))',
          right: 20,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50%',
          width: 52,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          zIndex: 40,
          color: 'white'
        }}
        aria-label="Add Chore"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Add / Edit Chore Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[8px]">
          <div className="absolute inset-0" onClick={() => { navigator.vibrate?.(10); handleCancel(); }} />

          <div className="relative w-full max-w-[430px] bg-[#111118]/95 rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-[40px] border-t border-white/[0.12]" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom) + 80px)", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 className="text-white font-bold text-[18px]">
              {editingChore ? "Edit Chore" : "Add New Chore"}
            </h3>

            <form onSubmit={handleAddChore} className="flex flex-col gap-4">
              {/* Chore Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Chore Name
                </label>
                <input
                  type="text"
                  placeholder="Clean the kitchen, Buy soap..."
                  value={choreName}
                  onChange={(e) => setChoreName(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-white/30 transition-colors text-[16px]"
                  required
                />
              </div>

              {/* Assignee */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Assignee
                </label>
                <div 
                  className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
                  style={{
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                  }}
                >
                  {members.map((m) => {
                    const isSelected = assignee === m.name;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => { navigator.vibrate?.(5); setAssignee(m.name); }}
                        className={`py-1.5 px-4 rounded-[999px] border-0 cursor-pointer text-[13px] font-medium whitespace-nowrap transition-colors focus:outline-none ${
                          isSelected
                            ? "bg-white/15 border border-white/30 text-white"
                            : "bg-white/5 border border-white/10 text-white/40"
                        }`}
                      >
                        {m.name} {m.id === userId && "(You)"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white outline-none focus:border-white/30 transition-colors text-[16px] color-scheme-dark"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full bg-white/12 text-white font-bold rounded-[12px] py-3.5 text-[15px] border border-white/20 hover:bg-white/18 transition-colors focus:outline-none cursor-pointer"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => { navigator.vibrate?.(10); handleCancel(); }}
                  className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none cursor-pointer mt-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav active="chores" />
    </main>
  );
}
