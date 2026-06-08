"use client";

import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { useRoomContext } from "@/lib/RoomContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";
import { PullToRefresh } from "@/components/PullToRefresh";

export default function NotesPage() {
  const { showToast } = useToast();
  const { profile, roomId, userId, loading, initialized, notes, refetchNotes, refetchAll } = useRoomContext();

  const [showModal, setShowModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  const handleDelete = async (noteId: string | number) => {
    navigator.vibrate?.(10);
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);
      
      if (error) throw error;
      showToast('Note deleted');
      await refetchNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
      showToast('Failed to delete', 'error');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !roomId || !userId) return;
    navigator.vibrate?.(10);

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
        action: `added a note`
      });

      showToast('Note saved');
      await refetchNotes();
      setNoteText("");
      setShowModal(false);
    } catch (err) {
      console.error('Error adding note:', err);
      showToast('Failed to save', 'error');
    }
  };

  if (loading && !initialized) {
    return (
      <main className="flex-1 flex flex-col bg-[#111118] min-h-screen" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
        <PageHeader title="Notes" showBack={false} />
        <div className="flex flex-col gap-3">
          <Skeleton height={110} borderRadius={16} />
          <Skeleton height={140} borderRadius={16} />
          <Skeleton height={90} borderRadius={16} />
        </div>
        <BottomNav active="notes" />
      </main>
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
    <main className="flex-1 flex flex-col bg-[#111118] relative" style={{ padding: '20px 20px 120px 20px', maxWidth: 430, margin: '0 auto' }}>
      <PullToRefresh onRefresh={() => refetchAll()}>
        <PageHeader title="Notes" showBack={false} />

        {/* Masonry-style layout */}
        <section className="flex flex-col gap-3">
          {notes.length > 0 ? (
            notes.map((note) => (
              <GlassCard key={note.id} className="p-4 flex flex-col gap-[8px] relative group">
                <p className="text-[14px] text-white/90 leading-relaxed font-medium">
                  {note.text}
                </p>
                <div className="flex justify-between items-center select-none">
                  <span className="text-[10px] text-white/30">
                    {formatTime(note.created_at)}
                  </span>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-white/20 hover:text-white/60 transition-colors p-1 rounded-md cursor-pointer border-0 bg-transparent focus:outline-none"
                    aria-label="Delete note"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </GlassCard>
            ))
          ) : (
            <section className="flex flex-col items-center justify-center py-20 text-center select-none animate-fade-in">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-white font-medium text-[15px] mt-4">Sticky board is empty</span>
              <span className="text-white/35 text-[13px] mt-1">Leave a digital note for your room</span>
            </section>
          )}
        </section>
      </PullToRefresh>

      {/* Floating Add Note Button */}
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
        aria-label="Add Note"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Add Note Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[8px]">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={() => { navigator.vibrate?.(10); setShowModal(false); }} />
          
          <div className="relative w-full max-w-[430px] bg-[#111118]/95 rounded-t-[24px] p-6 z-10 flex flex-col gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-[40px] border-t border-white/[0.12]" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom) + 80px)" }}>
            <h3 className="text-white font-bold text-[18px]">Leave a Note</h3>

            <form onSubmit={handleAddNote} className="flex flex-col gap-4">
              <textarea
                placeholder="Write your note here..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.10] rounded-[12px] px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-white/30 transition-colors text-[16px] h-28 resize-none"
                required
              />

              {/* Submit Buttons */}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full bg-white/12 text-white font-bold rounded-[12px] py-3.5 text-[15px] border border-white/20 hover:bg-white/18 transition-colors focus:outline-none cursor-pointer"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => { navigator.vibrate?.(10); setShowModal(false); }}
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
      <BottomNav active="notes" />
    </main>
  );
}
