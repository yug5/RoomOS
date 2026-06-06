"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { Check, Plus } from "lucide-react";
import { useRoomContext, ChoreItem } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";

export default function ChoresPage() {
  const { profile, roomId, userId, loading, chores, members, refetchChores } = useRoomContext();

  const [activeTab, setActiveTab] = useState<"Pending" | "Completed">("Pending");
  const [showModal, setShowModal] = useState(false);

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
          action: `completed ${chore.name} ✅`
        });
      }

      await refetchChores();
    } catch (err) {
      console.error('Error toggling chore:', err);
    }
  };

  const handleAddChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choreName || !dueDate || !roomId || !userId) return;

    try {
      // Get assignee profile id
      const { data: assigneeProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('room_id', roomId)
        .eq('name', assignee)
        .single();

      const { error: insertError } = await supabase
        .from('chores')
        .insert({
          room_id: roomId,
          name: choreName,
          assignee: assigneeProfile?.id || userId,
          due_date: dueDate,
          done: false
        });

      if (insertError) throw insertError;

      // Log activity
      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `added chore: ${choreName} ✅`
      });

      await refetchChores();

      // Reset
      setChoreName("");
      setDueDate("");
      setAssignee(profile?.name || "");
      setShowModal(false);
    } catch (err) {
      console.error('Error adding chore:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 border-2 border-[#9b7fe8] border-t-transparent rounded-full animate-spin mx-auto mt-20" />
    );
  }

  const filteredChores = chores.filter((chore) =>
    activeTab === "Pending" ? !chore.done : chore.done
  );

  return (
    <main className="flex-1 flex flex-col gap-6 px-6 pt-5 pb-[120px] w-full relative">
      <PageHeader title="Chores" showBack={false} />

      {/* Tabs Filter */}
      <section className="flex gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab("Pending")}
          className={`flex-1 py-2 px-4 rounded-[999px] text-sm font-semibold transition-colors border focus:outline-none cursor-pointer ${
            activeTab === "Pending"
              ? "bg-[#9b7fe8] border-[#9b7fe8] text-white"
              : "bg-transparent border-white/10 text-white/60 hover:text-white"
          }`}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Completed")}
          className={`flex-1 py-2 px-4 rounded-[999px] text-sm font-semibold transition-colors border focus:outline-none cursor-pointer ${
            activeTab === "Completed"
              ? "bg-[#9b7fe8] border-[#9b7fe8] text-white"
              : "bg-transparent border-white/10 text-white/60 hover:text-white"
          }`}
        >
          Completed
        </button>
      </section>

      {/* Chores List */}
      <section className="flex flex-col gap-3">
        {filteredChores.length > 0 ? (
          filteredChores.map((chore) => {
            const assigneeName = chore.profiles?.name || (chore.assignee === userId ? (profile?.name || "You") : "Roommate");
            
            return (
              <GlassCard key={chore.id} className="flex items-center gap-3 p-4">
                {/* Checkbox button */}
                <button
                  type="button"
                  onClick={() => toggleChore(chore)}
                  className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
                    chore.done
                      ? "bg-[#9b7fe8] border-[#9b7fe8] text-white"
                      : "border-white/20 bg-transparent"
                  }`}
                >
                  {chore.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                {/* Middle Info */}
                <div className="flex flex-col min-w-0">
                  <span 
                    className={`text-[15px] font-semibold truncate ${
                      chore.done ? "text-white/30 line-through" : "text-white"
                    }`}
                  >
                    {chore.name}
                  </span>
                  <span className="text-white/50 text-[12px] mt-0.5 select-none">
                    Assigned to {assigneeName} · Due {chore.due_date}
                  </span>
                </div>

                {/* Right Assignee Avatar */}
                <div className="ml-auto flex-shrink-0">
                  <div 
                    className="w-8 h-8 rounded-full bg-[#9b7fe8] flex items-center justify-center text-white font-bold text-xs select-none"
                    title={`Assigned to ${assigneeName}`}
                  >
                    {(assigneeName || "U")[0].toUpperCase()}
                  </div>
                </div>
              </GlassCard>
            );
          })
        ) : (
          <div className="text-center text-white/40 py-8 text-sm">
            No chores in this tab.
          </div>
        )}
      </section>

      {/* Floating Add Chore Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-[#9b7fe8] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(155,127,232,0.4)] border-0 focus:outline-none z-40 active:scale-95 transition-transform cursor-pointer"
        aria-label="Add Chore"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Chore Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[4px]">
          {/* Backdrop click dismiss */}
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-[430px] bg-[#1a1a2e] rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="text-white font-bold text-[18px]">Add New Chore</h3>

            <form onSubmit={handleAddChore} className="flex flex-col gap-4">
              {/* Chore Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Chore Name
                </label>
                <input
                  type="text"
                  placeholder="Wash Dishes, Clean Bathroom..."
                  value={choreName}
                  onChange={(e) => setChoreName(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
                  required
                />
              </div>

              {/* Assignee toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Assignee
                </label>
                <div className="flex bg-white/[0.06] p-1 rounded-[12px] border border-white/[0.12]">
                  <button
                    type="button"
                    onClick={() => setAssignee(profile?.name || "")}
                    className={`flex-1 py-2 rounded-[999px] text-sm font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                      assignee === profile?.name
                        ? "bg-[#9b7fe8] text-white"
                        : "bg-transparent text-white/60"
                    }`}
                  >
                    {profile?.name || "You"}
                  </button>
                  <button
                    type="button"
                    disabled={roommates.length === 0}
                    onClick={() => {
                      if (roommates.length > 0) {
                        setAssignee(roommates[0].name);
                      }
                    }}
                    className={`flex-1 py-2 rounded-[999px] text-sm font-semibold transition-colors border-0 focus:outline-none cursor-pointer ${
                      roommates.length > 0 && assignee === roommates[0].name
                        ? "bg-[#9b7fe8] text-white"
                        : "bg-transparent text-white/60 disabled:opacity-40"
                    }`}
                  >
                    {roommates[0]?.name || "Roommate"}
                  </button>
                </div>
              </div>

              {/* Due Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Due Date
                </label>
                <input
                  type="text"
                  placeholder="Today, Tomorrow, Monday..."
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-[15px] border-0 hover:bg-[#886cd4] transition-colors focus:outline-none cursor-pointer"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none cursor-pointer"
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
