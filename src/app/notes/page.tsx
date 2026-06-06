"use client";

import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { Plus, X } from "lucide-react";
import { useRoomContext } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";

export default function NotesPage() {
  const { profile, roomId, userId, loading, notes, refetchNotes } = useRoomContext();

  const [showModal, setShowModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  const handleDelete = async (noteId: string | number) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);
      
      if (error) throw error;
      await refetchNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !roomId || !userId) return;

    try {
      const text = noteText.trim();
      const { error: insertError } = await supabase
        .from('notes')
        .insert({
          room_id: roomId,
          text: text,
          created_by: userId
        });

      if (insertError) throw insertError;

      // Log activity
      await supabase.from('activity').insert({
        room_id: roomId,
        user_name: profile?.name || 'User',
        action: `added a note 📝`
      });

      await refetchNotes();
      setNoteText("");
      setShowModal(false);
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 border-2 border-[#9b7fe8] border-t-transparent rounded-full animate-spin mx-auto mt-20" />
    );
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

  return (
    <main className="flex-1 flex flex-col gap-6 px-6 pt-5 pb-[120px] w-full relative">
      <PageHeader title="Notes" showBack={false} />

      {/* Masonry-style layout */}
      <section className="flex flex-col gap-3">
        {notes.length > 0 ? (
          notes.map((note) => (
            <GlassCard key={note.id} className="relative flex flex-col gap-3 p-5">
              {/* Delete Button top-right */}
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors bg-transparent border-0 p-1 cursor-pointer focus:outline-none"
                aria-label="Delete note"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Note Content */}
              <p className="text-white text-[15px] leading-relaxed pr-6 font-medium break-words whitespace-pre-wrap">
                {note.text}
              </p>

              {/* Timestamp */}
              <span className="text-white/35 text-[11px] select-none mt-1">
                {formatTime(note.created_at)}
              </span>
            </GlassCard>
          ))
        ) : (
          <div className="text-center text-white/40 py-8 text-sm">
            No notes found. Create one using the + button!
          </div>
        )}
      </section>

      {/* Floating Add Note Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-[#9b7fe8] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(155,127,232,0.4)] border-0 focus:outline-none z-40 active:scale-95 transition-transform cursor-pointer"
        aria-label="Add Note"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Note Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[4px]">
          {/* Backdrop click dismiss */}
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          
          <div className="relative w-full max-w-[430px] bg-[#1a1a2e] rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
            <h3 className="text-white font-bold text-[18px]">Add New Note</h3>

            <form onSubmit={handleAddNote} className="flex flex-col gap-4">
              {/* Note input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Write a note...
                </label>
                <textarea
                  placeholder="Type your reminder details here..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-[12px] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#9b7fe8]/50 transition-colors text-sm min-h-[120px] resize-none leading-relaxed"
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
      <BottomNav active="notes" />
    </main>
  );
}
