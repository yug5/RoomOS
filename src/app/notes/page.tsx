"use client";

import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import BottomNav from "@/components/BottomNav";
import { Plus, X } from "lucide-react";

interface Note {
  id: number;
  text: string;
  time: string;
}

export default function NotesPage() {
  // Hardcoded default notes in state
  const [notes, setNotes] = useState<Note[]>([
    { id: 1, text: "Pay electricity bill before 15th", time: "2 mins ago" },
    { id: 2, text: "Exam on Monday — keep it quiet 🤫", time: "1 hour ago" },
    { id: 3, text: "Call landlord about hot water", time: "Yesterday" },
    { id: 4, text: "Buy detergent this week", time: "2 days ago" },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  const handleDelete = (id: number) => {
    setNotes(notes.filter((note) => note.id !== id));
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const newNote: Note = {
      id: Date.now(),
      text: noteText.trim(),
      time: "Just now",
    };

    setNotes([newNote, ...notes]);
    setNoteText("");
    setShowModal(false);
  };

  return (
    <main className="flex-1 flex flex-col gap-6 px-6 pt-5 pb-[120px] w-full relative">
      <PageHeader title="Notes" showBack={false} />

      {/* Masonry-style layout: CSS columns 1, gap 12px */}
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
                {note.time}
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
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-[#9b7fe8] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(155,127,232,0.4)] border-0 focus:outline-none z-40 active:scale-95 transition-transform"
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
                  className="w-full bg-[#9b7fe8] text-white font-bold rounded-[12px] py-3.5 text-[15px] border-0 hover:bg-[#886cd4] transition-colors focus:outline-none"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-center text-white/40 text-[13px] hover:text-white/60 transition-colors py-1 bg-transparent border-0 focus:outline-none"
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
